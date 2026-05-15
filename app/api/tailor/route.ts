import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { fetchPublicRepos, formatReposForPrompt } from "@/services/github";
import { TAILORING_SYSTEM_PROMPT } from "@/lib/ai/prompts";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

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
      const pdfParse = (await import("pdf-parse")).default;
      const buffer = Buffer.from(await resumeFile.arrayBuffer());
      const parsed = await pdfParse(buffer);
      resumeText = parsed.text;
    }

    // Step 1b: Parse JD — PDF or image via Gemini Vision
    if (jdFile) {
      if (jdFile.type === "application/pdf") {
        const pdfParse = (await import("pdf-parse")).default;
        const buffer = Buffer.from(await jdFile.arrayBuffer());
        const parsed = await pdfParse(buffer);
        jdText = parsed.text;
      } else {
        // Image — use Gemini Vision to extract text
        const bytes = await jdFile.arrayBuffer();
        const base64 = Buffer.from(bytes).toString("base64");
        const visionResult = await model.generateContent([
          { inlineData: { mimeType: jdFile.type, data: base64 } },
          { text: "Extract all text from this job description image. Return only the text, no formatting." },
        ]);
        jdText = visionResult.response.text();
      }
    }

    if (!resumeText || !jdText) {
      return NextResponse.json({ error: "Resume and JD are required" }, { status: 400 });
    }

    // Step 2: Extract candidate name + JD metadata
    const metaResult = await model.generateContent(
      `Extract from this resume the candidate's full name. Return JSON only: {"candidateName": "..."}\n\nResume:\n${resumeText.slice(0, 2000)}`
    );
    let candidateName = "Candidate";
    try {
      const metaText = metaResult.response.text();
      const match = metaText.match(/\{[\s\S]*\}/);
      if (match) candidateName = JSON.parse(match[0]).candidateName ?? "Candidate";
    } catch {}

    const jdMetaResult = await model.generateContent(
      `Extract from this JD. Return JSON only: {"roleTitle":"...","companyName":"..."}\n\nJD:\n${jdText.slice(0, 2000)}`
    );
    let roleTitle = "Software Engineer";
    let companyName = "the Company";
    try {
      const jdMetaText = jdMetaResult.response.text();
      const match = jdMetaText.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        roleTitle = parsed.roleTitle ?? roleTitle;
        companyName = parsed.companyName ?? companyName;
      }
    } catch {}

    // Step 3: Company research via Gemini Search Grounding
    let companyResearch = "No research available";
    try {
      const researchResult = await model.generateContent({
        contents: [{
          role: "user",
          parts: [{ text: `Research "${companyName}" for a candidate applying as "${roleTitle}". Summarize: 1) engineering pain points 2) tech stack 3) culture 4) competitors 5) what they look for in ${roleTitle} candidates. Be specific.` }]
        }],
        tools: [{ googleSearch: {} }],
      } as Parameters<typeof model.generateContent>[0]);
      companyResearch = researchResult.response.text();
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

    const tailorResult = await model.generateContent(tailoringPrompt);
    let latex = tailorResult.response.text()
      .replace(/^```latex\n?/i, "").replace(/\n?```$/i, "").trim();

    // Step 6: ATS Score
    const atsPrompt = `You are an ATS expert. Score this resume (0-100) for "${roleTitle}" at "${companyName}".\n\nResume:\n${latex.slice(0,4000)}\n\nJD:\n${jdText.slice(0,2000)}\n\nReturn JSON only:\n{"score":0,"strengths":[],"improvements":[],"missingKeywords":[]}`;
    const atsResult = await model.generateContent(atsPrompt);
    let atsScore = { score: 75, strengths: [], improvements: [], missingKeywords: [] };
    try {
      const atsText = atsResult.response.text();
      const match = atsText.match(/\{[\s\S]*\}/);
      if (match) atsScore = JSON.parse(match[0]);
    } catch {}

    // Auto-revise if < 70
    if (atsScore.score < 70) {
      const revisionPrompt = `${tailoringPrompt}\n\nATS score was ${atsScore.score}/100. Missing: ${atsScore.missingKeywords?.join(", ")}. Revise to include these. Return RAW LaTeX only.`;
      const revResult = await model.generateContent(revisionPrompt);
      latex = revResult.response.text().replace(/^```latex\n?/i, "").replace(/\n?```$/i, "").trim();
      const atsResult2 = await model.generateContent(atsPrompt.replace(latex.slice(0,200), ""));
      try {
        const t = atsResult2.response.text();
        const m = t.match(/\{[\s\S]*\}/);
        if (m) atsScore = JSON.parse(m[0]);
      } catch {}
    }

    const year = new Date().getFullYear();
    const outputFileName = `${candidateName.replace(/\s+/g,"_")}_${roleTitle.replace(/\s+/g,"")}_${year}`;

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
