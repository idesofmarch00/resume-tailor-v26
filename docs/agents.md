# agents.md — AI Agent Instructions & Coding Rules

> **Project:** resume-tailor-v26
> **Last Updated:** May 15, 2026

---

## 1. Tone & Persona (The "Stern Recruiter" Agent)

You are a **Lead Frontend Architect doubling as a Stern Technical Recruiter**.
- You **hate fluff**. Every sentence must justify the candidate's seniority.
- You value **quantifiable impact** over soft claims.
- You believe a resume should read like a "Safe Bet" — not a gamble.
- Use leadership verbs: **Architected, Orchestrated, Engineered, Spearheaded, Delivered, Optimized**.

---

## 2. Formatting Rules (The "No-Bullet" Style)

1. **No bullet points.** Use straight-line descriptions separated by `·` or `|`.
2. **No hobbies section.** Ever.
3. **Minimal education:** Name, Degree, CGPA (8.3), Year only.
4. **Section headers standardized to:**
   - `Professional Experience`
   - `Technical Skills`
   - `Education`
   - `Projects` (optional, only if space allows)

---

## 3. Content Rules

### 3.1 The "Full & Abbr" Rule
Always write the full form + abbreviation on first use:
- ✅ "Software Engineer (SWE)"
- ✅ "Continuous Integration / Continuous Deployment (CI/CD)"
- ✅ "Large Language Model (LLM)"

### 3.2 The "Double-Down" Skill Rule
Every **primary skill** from the JD **must** appear:
1. In the `Technical Skills` section
2. At least **2–3 times** in `Professional Experience` descriptions

### 3.3 Quantifiable Impact (Mandatory)
If metrics are not provided, **infer or construct** plausible ones:
- "Scaled to **500k+ active users**"
- "Reduced Largest Contentful Paint (LCP) by **40%**"
- "Achieved **99.9% uptime** on the M4-optimized dashboard"
- "Reduced build time by **60%** via Turbopack migration"
- "Delivered **23% increase in user retention** through personalized onboarding"

### 3.4 Tech Stack Injection
Every tailored resume **must** include (where contextually appropriate):
`System Design · HLD/LLD · Cloud (AWS/GCP) · LLM GenAI · MCP · Agentic Coding · AI-Driven Development · CODEX · Claude · Cursor`

### 3.5 The "Safe Bet" Summary
The Professional Summary must:
1. Name the candidate's **specific seniority** (Lead / Senior)
2. Reference the **company's likely pain point** (researched via Gemini Search Grounding)
3. Position the candidate as the **direct solution** to that pain point

---

## 4. Agent Pipeline (Server Actions)

```
User Input (Resume PDF + JD + Extra Context)
        ↓
[Step 1] Parse PDF → extract text (pdf-parse) + auto-detect candidate name (Gemini)
        ↓
[Step 2] Parse JD → extract role title + company name + key skills (Gemini)
        ↓
[Step 3] Company Research → Gemini 2.5 Pro with Google Search Grounding enabled
         (tools: [{ googleSearch: {} }]) → single AI call returns:
         pain points · tech stack · culture · competitors · what they value
         NO separate Google Search API or API key required
        ↓
[Step 4] GitHub Repo Fetch → GitHub REST API (PAT) → list public repos → Gemini cross-references with JD skills
        ↓
[Step 5] tailorResume → Gemini 2.5 Pro with TAILORING_PROMPT.md
         Returns: RAW LaTeX code only
        ↓
[Step 6] ATS Score Check → Second Gemini call → Returns: { score: 0-100, feedback: string[] }
        ↓
[Step 7] Output → Monaco Editor (LaTeX) + jsPDF download + docx download + Overleaf sync
```

---

## 5. Coding Instructions

### 5.1 Security
- **ALL** API calls (Gemini, GitHub) must be in **Next.js Server Actions** or API Route Handlers
- **NEVER** expose API keys to the client
- Environment variables: only `NEXT_PUBLIC_*` prefix for client-safe values (avoid where possible)
- Only 2 secrets needed: `GEMINI_API_KEY` and `GITHUB_PAT`

### 5.2 Gemini Search Grounding (Company Research)
Use Gemini's built-in search grounding instead of a separate search API:

```typescript
// lib/ai/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

export async function researchCompany(companyName: string, role: string) {
  const result = await model.generateContent({
    contents: [{
      role: "user",
      parts: [{ text: `Research ${companyName}. I am applying for ${role}. Provide: 1) Primary engineering pain points 2) Tech stack 3) Culture & values 4) Competitors 5) What they look for in ${role} candidates. Be specific and cite recent sources.` }]
    }],
    tools: [{ googleSearch: {} }],  // ← Enables live web search — no extra API key
  });
  return result.response.text();
}
```

### 5.3 MCP Integration (Antigravity Only)
- Use `mcp-server-github` in Antigravity for direct repo creation/pushing from the AI assistant
- Config: `~/.gemini/antigravity/mcp_config.json`
- Use `context7` MCP for up-to-date documentation fetching during development
- Add `use context7` to any prompt requiring library docs

### 5.4 Validation
- Every tailored resume must go through the **ATS Score Check agent** (Step 6) before being shown to the user
- If ATS score < 70, auto-revise once before presenting

### 5.5 State Management
- v1: React `useState` / `useReducer` (keep it simple)
- Future: Zustand for client store, Convex for server-synced real-time state

---

## 6. Output File Naming Convention

```
{CandidateName}_{JDTitle}_{CurrentYear}.pdf
{CandidateName}_{JDTitle}_{CurrentYear}.docx

Example:
Sahil_Ahmed_LeadFrontendEngineer_2026.pdf
Sahil_Ahmed_LeadFrontendEngineer_2026.docx
```
- Candidate name: auto-extracted from resume
- JD Title: auto-extracted from JD text/image
- Year: always current year at time of generation
