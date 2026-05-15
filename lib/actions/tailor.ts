// lib/actions/tailor.ts — Main orchestrator Server Action
"use server";

import { TailoringResult, TailoringStatus } from "@/types/resume";
import { researchCompany, parseResumeMetadata, parseJDMetadata, checkATSScore, proModel } from "@/lib/ai/gemini";
import { fetchPublicRepos, formatReposForPrompt } from "@/services/github";
import { TAILORING_SYSTEM_PROMPT } from "@/lib/ai/prompts";

export async function tailorResume(formData: FormData): Promise<TailoringResult> {
  // Step 1: Extract inputs
  const resumeText = formData.get("resumeText") as string;
  const jdText = formData.get("jdText") as string;
  const extraContext = formData.get("extraContext") as string;

  if (!resumeText || !jdText) {
    throw new Error("Resume text and Job Description are required");
  }

  // Step 2: Parse resume + JD metadata
  const [resumeMeta, jdMeta] = await Promise.all([
    parseResumeMetadata(resumeText),
    parseJDMetadata(jdText),
  ]);

  // Step 3: Company research via Gemini Search Grounding (no Google API key needed)
  const companyResearch = await researchCompany(jdMeta.companyName, jdMeta.roleTitle);

  // Step 4: Fetch GitHub repos
  let githubData = "No GitHub data available";
  try {
    const repos = await fetchPublicRepos();
    githubData = formatReposForPrompt(repos);
  } catch (e) {
    console.warn("GitHub fetch failed, continuing without repo data:", e);
  }

  // Step 5: Build tailoring prompt + call Gemini
  const tailoringPrompt = TAILORING_SYSTEM_PROMPT
    .replace("{{CANDIDATE_NAME}}", resumeMeta.candidateName)
    .replace("{{JD_TITLE}}", jdMeta.roleTitle)
    .replace("{{COMPANY_NAME}}", jdMeta.companyName)
    .replace("{{RESUME_TEXT}}", resumeText)
    .replace("{{JD_TEXT}}", jdText)
    .replace("{{USER_CONTEXT}}", extraContext || "None provided")
    .replace("{{GITHUB_DATA}}", githubData)
    .replace("{{COMPANY_RESEARCH}}", companyResearch);

  const tailorResult = await proModel.generateContent(tailoringPrompt);
  let latex = tailorResult.response.text();

  // Clean up: strip any markdown code fences if Gemini wrapped LaTeX in them
  latex = latex.replace(/^```latex\n?/i, "").replace(/\n?```$/i, "").trim();

  // Step 6: ATS Score Check
  let atsResult = await checkATSScore(latex, jdText, jdMeta.roleTitle, jdMeta.companyName);

  // Auto-revise if score < 70
  if (atsResult.score < 70) {
    const revisionPrompt = `${tailoringPrompt}\n\nATS REVISION NEEDED (score was ${atsResult.score}/100):\nMissing keywords: ${atsResult.missingKeywords.join(", ")}\nImprovements needed: ${atsResult.improvements.join("; ")}\n\nRevise the LaTeX to address these issues. Return RAW LaTeX only.`;
    const revisionResult = await proModel.generateContent(revisionPrompt);
    latex = revisionResult.response.text().replace(/^```latex\n?/i, "").replace(/\n?```$/i, "").trim();
    atsResult = await checkATSScore(latex, jdText, jdMeta.roleTitle, jdMeta.companyName);
  }

  const currentYear = new Date().getFullYear();
  const safeName = resumeMeta.candidateName.replace(/\s+/g, "_");
  const safeRole = jdMeta.roleTitle.replace(/\s+/g, "");
  const outputFileName = `${safeName}_${safeRole}_${currentYear}`;

  return {
    latex,
    candidateName: resumeMeta.candidateName,
    jdTitle: jdMeta.roleTitle,
    companyName: jdMeta.companyName,
    year: currentYear,
    atsScore: atsResult,
    outputFileName,
  };
}
