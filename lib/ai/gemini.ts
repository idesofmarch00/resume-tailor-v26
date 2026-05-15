// lib/ai/gemini.ts — Gemini client + helper functions
// NOTE: This file runs SERVER-SIDE ONLY (Server Actions / Route Handlers)

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const proModel = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

/**
 * Researches a company using Gemini with Google Search Grounding.
 * No Google Search API key needed — uses GEMINI_API_KEY only.
 */
export async function researchCompany(
  companyName: string,
  role: string
): Promise<string> {
  const prompt = `
Research the company "${companyName}" for a candidate applying as "${role}".

Provide a structured summary covering:
1. Primary engineering pain points or challenges they are currently facing
2. Core tech stack and architecture style (monolith/microservices/serverless/edge)
3. Engineering culture and values (what do their engineers care about?)
4. Top competitors and how ${companyName} differentiates technically
5. What they specifically look for in ${role} candidates (from job posts, engineering blogs)
6. Any recent engineering blog posts, open-source projects, or major technical decisions

Be specific. Focus on information useful for tailoring a resume.
  `.trim();

  const result = await proModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    tools: [{ googleSearchRetrieval: { dynamicRetrievalConfig: { mode: "MODE_DYNAMIC", dynamicThreshold: 0.7 } } }], // ← Live web search, no extra API key
  } as Parameters<typeof proModel.generateContent>[0]);

  return result.response.text();
}

/**
 * Extracts structured data from resume text.
 */
export async function parseResumeMetadata(resumeText: string): Promise<{
  candidateName: string;
  currentRole: string;
  skills: string[];
}> {
  const prompt = `
Extract from this resume text:
1. Full candidate name
2. Current/most recent role title
3. List of technical skills (max 20)

Return as JSON: { "candidateName": "...", "currentRole": "...", "skills": ["..."] }

Resume:
${resumeText.slice(0, 3000)}
  `.trim();

  const result = await proModel.generateContent(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse resume metadata");
  return JSON.parse(jsonMatch[0]);
}

/**
 * Parses JD text to extract role + company + skills.
 */
export async function parseJDMetadata(jdText: string): Promise<{
  roleTitle: string;
  companyName: string;
  keySkills: string[];
}> {
  const prompt = `
Extract from this job description:
1. Exact role/job title
2. Company name
3. Top 10 technical skills/requirements

Return as JSON: { "roleTitle": "...", "companyName": "...", "keySkills": ["..."] }

JD:
${jdText.slice(0, 3000)}
  `.trim();

  const result = await proModel.generateContent(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse JD metadata");
  return JSON.parse(jsonMatch[0]);
}

/**
 * Runs the ATS score check on the generated resume.
 * Returns score (0-100) + feedback.
 */
export async function checkATSScore(
  generatedResumeText: string,
  jdText: string,
  roleTitle: string,
  companyName: string
): Promise<{
  score: number;
  strengths: string[];
  improvements: string[];
  missingKeywords: string[];
}> {
  const prompt = `
You are an ATS (Applicant Tracking System) expert.
Score this resume (0-100) for the role of "${roleTitle}" at "${companyName}".

Resume:
${generatedResumeText.slice(0, 4000)}

Job Description:
${jdText.slice(0, 2000)}

Return JSON only (no markdown):
{
  "score": <number 0-100>,
  "strengths": ["...", "..."],
  "improvements": ["...", "..."],
  "missingKeywords": ["...", "..."]
}
  `.trim();

  const result = await proModel.generateContent(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse ATS score response");
  return JSON.parse(jsonMatch[0]);
}

export { proModel };
