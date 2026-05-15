import { NextRequest, NextResponse } from "next/server";
import { fetchPublicRepos, formatReposForPrompt } from "@/services/github";
import { TAILORING_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { generateWithFallback } from "@/lib/ai/provider";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

// ── PDF Text Extraction ──────────────────────────────────────

async function extractPdfText(data: Buffer): Promise<string> {
  const uint8 = new Uint8Array(data);
  const doc = await pdfjs.getDocument({ data: uint8, verbosity: 0 }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .filter((item: any) => "str" in item)
      .map((item: any) => item.str)
      .join(" ");
    pages.push(text);
    page.cleanup();
  }
  await doc.destroy();
  return pages.join("\n\n");
}

// ── Helper: generate text with fallback ──────────────────────

async function ai(prompt: string): Promise<string> {
  const { text } = await generateWithFallback({ prompt });
  return text;
}

async function aiWithSearch(prompt: string): Promise<string> {
  const { text } = await generateWithFallback({ prompt, searchGrounding: true });
  return text;
}

async function aiVision(
  parts: (string | { inlineData: { mimeType: string; data: string } })[]
): Promise<string> {
  const { text } = await generateWithFallback({ prompt: parts });
  return text;
}

// ── Route Handler ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    let resumeText = formData.get("resumeText") as string ?? "";
    const resumeFile = formData.get("resumeFile") as File | null;
    let jdText = formData.get("jdText") as string ?? "";
    const jdFile = formData.get("jdFile") as File | null;
    const extraContext = formData.get("extraContext") as string ?? "";

    // Step 1: Parse resume PDF if file provided
    if (resumeFile) {
      const buffer = Buffer.from(await resumeFile.arrayBuffer());
      resumeText = await extractPdfText(buffer);
    }

    // Step 1b: Parse JD — PDF or image via Vision
    if (jdFile) {
      if (jdFile.type === "application/pdf") {
        const buffer = Buffer.from(await jdFile.arrayBuffer());
        jdText = await extractPdfText(buffer);
      } else {
        // Image — use Vision to extract text
        const bytes = await jdFile.arrayBuffer();
        const base64 = Buffer.from(bytes).toString("base64");
        jdText = await aiVision([
          { inlineData: { mimeType: jdFile.type, data: base64 } },
          "Extract all text from this job description image. Return only the text, no formatting.",
        ]);
      }
    }

    if (!resumeText || !jdText) {
      return NextResponse.json({ error: "Resume and JD are required" }, { status: 400 });
    }

    // Step 2: Extract candidate name + JD metadata
    const metaRaw = await ai(
      `Extract from this resume the candidate's full name. Return JSON only: {"candidateName": "..."}\n\nResume:\n${resumeText.slice(0, 2000)}`
    );
    let candidateName = "Candidate";
    try {
      const match = metaRaw.match(/\{[\s\S]*\}/);
      if (match) candidateName = JSON.parse(match[0]).candidateName ?? "Candidate";
    } catch { }

    const jdMetaRaw = await ai(
      `Extract from this JD. Return JSON only: {"roleTitle":"...","companyName":"..."}\n\nJD:\n${jdText.slice(0, 2000)}`
    );
    let roleTitle = "Software Engineer";
    let companyName = "the Company";
    try {
      const match = jdMetaRaw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        roleTitle = parsed.roleTitle ?? roleTitle;
        companyName = parsed.companyName ?? companyName;
      }
    } catch { }

    // Step 3: Company research via search grounding (Gemini) or plain prompt (OpenAI fallback)
    let companyResearch = "No research available";
    try {
      companyResearch = await aiWithSearch(
        `Research "${companyName}" for a candidate applying as "${roleTitle}". Summarize: 1) engineering pain points 2) tech stack 3) culture 4) competitors 5) what they look for in ${roleTitle} candidates. Be specific.`
      );
    } catch (e) {
      console.warn("Company research failed:", e);
    }

    // Step 4: GitHub repos
    let githubData = "No GitHub data";
    try {
      const repos = await fetchPublicRepos();
      githubData = formatReposForPrompt(repos);
    } catch (e) {
      console.warn("GitHub fetch failed:", e);
    }

    // Step 5: Tailor resume
    const tailoringPrompt = TAILORING_SYSTEM_PROMPT
      .replace("{{CANDIDATE_NAME}}", candidateName)
      .replace("{{JD_TITLE}}", roleTitle)
      .replace("{{COMPANY_NAME}}", companyName)
      .replace("{{RESUME_TEXT}}", resumeText.slice(0, 8000))
      .replace("{{JD_TEXT}}", jdText.slice(0, 4000))
      .replace("{{USER_CONTEXT}}", extraContext || "None")
      .replace("{{GITHUB_DATA}}", githubData)
      .replace("{{COMPANY_RESEARCH}}", companyResearch.slice(0, 3000));

    const tailorRaw = await ai(tailoringPrompt);
    let latex = tailorRaw
      .replace(/^```latex\n?/i, "").replace(/\n?```$/i, "").trim();

    // Step 6: ATS Score
    const atsPrompt = `You are an ATS expert. Score this resume (0-100) for "${roleTitle}" at "${companyName}".\n\nResume:\n${latex.slice(0, 4000)}\n\nJD:\n${jdText.slice(0, 2000)}\n\nReturn JSON only:\n{"score":0,"strengths":[],"improvements":[],"missingKeywords":[]}`;
    const atsRaw = await ai(atsPrompt);
    let atsScore = { score: 75, strengths: [] as string[], improvements: [] as string[], missingKeywords: [] as string[] };
    try {
      const match = atsRaw.match(/\{[\s\S]*\}/);
      if (match) atsScore = JSON.parse(match[0]);
    } catch { }

    // Auto-revise if < 70
    if (atsScore.score < 70) {
      const revisionPrompt = `${tailoringPrompt}\n\nATS score was ${atsScore.score}/100. Missing: ${atsScore.missingKeywords?.join(", ")}. Revise to include these. Return RAW LaTeX only.`;
      const revRaw = await ai(revisionPrompt);
      latex = revRaw.replace(/^```latex\n?/i, "").replace(/\n?```$/i, "").trim();
      const ats2Raw = await ai(atsPrompt.replace(latex.slice(0, 200), ""));
      try {
        const m = ats2Raw.match(/\{[\s\S]*\}/);
        if (m) atsScore = JSON.parse(m[0]);
      } catch { }
    }

    const year = new Date().getFullYear();
    const outputFileName = `${candidateName.replace(/\s+/g, "_")}_${roleTitle.replace(/\s+/g, "")}_${year}`;

    return NextResponse.json({
      success: true,
      data: {
        latex,
        candidateName,
        jdTitle: roleTitle,
        companyName,
        year,
        outputFileName,
        atsScore: atsScore.score,
        atsFeedback: {
          score: atsScore.score,
          strengths: atsScore.strengths ?? [],
          improvements: atsScore.improvements ?? [],
          missingKeywords: atsScore.missingKeywords ?? [],
        },
      },
    });

  } catch (err) {
    console.error("Tailor API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
