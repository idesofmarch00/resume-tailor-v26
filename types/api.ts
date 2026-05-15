// types/api.ts — API route request/response types

export interface TailorAPIRequest {
  resumeBase64: string;  // PDF as base64
  jdBase64?: string;     // JD image as base64 (optional)
  jdText?: string;       // JD as plain text (alternative)
  extraContext: string;
}

export interface TailorAPIResponse {
  success: boolean;
  data?: {
    latex: string;
    candidateName: string;
    jdTitle: string;
    companyName: string;
    outputFileName: string;
    atsScore: number;
    atsFeedback: {
      strengths: string[];
      improvements: string[];
      missingKeywords: string[];
    };
  };
  error?: string;
}

export interface OverleafAPIRequest {
  latex: string;
  fileName: string;
}

export interface OverleafAPIResponse {
  success: boolean;
  overleafUrl?: string;
  error?: string;
}
