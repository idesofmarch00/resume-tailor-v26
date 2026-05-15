// types/resume.ts — Core resume data types

export interface ResumeInput {
  rawText: string;
  candidateName: string;
  fileName: string;
}

export interface JDInput {
  rawText: string;
  roleTitle: string;
  companyName: string;
  keySkills: string[];
}

export interface TailoringRequest {
  resume: ResumeInput;
  jd: JDInput;
  extraContext: string;
  githubUsername?: string;
}

export interface ATSFeedback {
  score: number; // 0–100
  strengths: string[];
  improvements: string[];
  missingKeywords: string[];
}

export interface TailoringResult {
  latex: string;
  candidateName: string;
  jdTitle: string;
  companyName: string;
  year: number;
  atsScore: ATSFeedback;
  outputFileName: string; // e.g. Sahil_Ahmed_LeadFrontendEngineer_2026
}

export type TailoringStatus =
  | "idle"
  | "parsing"
  | "researching"
  | "fetching-github"
  | "tailoring"
  | "scoring"
  | "done"
  | "error";
