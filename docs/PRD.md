# PRD: AI Resume Architect — resume-tailor-v26

> **Status:** v1 (Personal Use) | **Last Updated:** May 15, 2026  
> **Stack:** Next.js 16 (App Router) · Tailwind CSS · shadcn/ui · Gemini 2.5 Pro

---

## 1. Objective

Build a high-stakes, AI-powered resume tailoring tool that transforms a master resume into an ATS-optimized, recruiter-ready document for Senior/Lead Frontend roles. Designed initially for personal use with a scalable foundation for multi-user SaaS.

---

## 2. Core Functional Requirements

### A. Input Engine
- **Resume Input:** PDF Upload (parsed via `pdf-parse`) OR plain-text paste OR raw LaTeX paste
- **JD Input:** Image/PDF upload OR plain-text paste
- **Extra Context Field:** Free-form text for custom details, exaggerations, or project-specific data
- **Candidate Name:** Auto-extracted from uploaded resume via Gemini; editable by user

### B. The "Architect" Logic (Gemini 2.5 Pro)
- **Company Research:** Gemini 2.5 Pro with **Google Search grounding** enabled — researches company tech stack, culture, pain points, engineering blogs, and competitors in a single AI call (no separate Google Search API needed)
- **Skill Mirroring:** Cross-reference JD skills with GitHub repos (via GitHub REST API using stored PAT) and resume text
- **Quantifiable Injection:** Convert vague duties to numbers ("100k+ downloads," "30% faster builds")
- **ATS Score Check:** Second Gemini call post-generation to score (0–100) + provide actionable feedback

### C. Formatting & Output
- **Files:** Generate `.pdf` (jsPDF) and `.docx` (docx library)
- **LaTeX:** Return raw LaTeX; display in Monaco Editor; allow copy
- **Naming Convention:** `[Name]_[Role]_[CurrentYear].pdf` — name auto-extracted from resume
- **Style:** Black text, white background. Headers: 12pt. Body: 10pt. No colors, no borders, no bullet points (straight-line style)
- **Overleaf Sync:**
  - v1: Generate `.zip` + provide "Open in Overleaf" button (creates a new project — works for free accounts)
  - v2 (future): Overleaf Git integration for paid accounts

---

## 3. Tech Stack (v1 — Personal)

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Theme | Dark mode only |
| AI — Tailoring | Gemini 2.5 Pro (`gemini-2.5-pro`) |
| AI — Company Research | Gemini 2.5 Pro with **Google Search grounding** (built-in, no extra API key) |
| PDF Parse | `pdf-parse` |
| PDF Generate | `jsPDF` |
| DOCX Generate | `docx` |
| LaTeX Editor | Monaco Editor (`@monaco-editor/react`) |
| GitHub Integration | GitHub REST API v3 (PAT stored server-side in `.env.local`) |
| Overleaf | "Open in Overleaf" API (free, v1) |
| State (client) | React `useState` / `useReducer` |
| Deployment | Vercel |

---

## 4. Gemini Search Grounding — How It Replaces Google Custom Search

Instead of a separate Google Custom Search API call, we use Gemini's native **Google Search grounding** feature:

```typescript
// lib/ai/gemini.ts
const result = await model.generateContent({
  contents: [{ role: "user", parts: [{ text: companyResearchPrompt }] }],
  tools: [{ googleSearch: {} }],  // ← This enables live web search
});
```

- **Same API key** (`GEMINI_API_KEY`) — no extra credentials
- Gemini searches the web in real-time and cites sources
- Returns structured company pain points, tech stack, culture notes

---

## 5. Scalability Roadmap (Structure Only — Not Coded in v1)

### Auth (Future)
- BetterAuth (primary) with GitHub OAuth + Google OAuth
- Folder: `app/(auth)/` already scaffolded

### Database (Future — Pick One)
- **Option A:** Convex (real-time, works great with BetterAuth + Stripe)
- **Option B:** Supabase + Prisma
- Folders: `convex/` and `prisma/` directories scaffolded

### Payments (Future)
- Stripe (subscriptions: Free tier / Pro tier)
- Folder: `app/(billing)/` scaffolded

### API Layer (Future)
- GraphQL via Hasura or Pothos + tRPC as alternative
- Folder: `app/api/graphql/` scaffolded

---

## 6. Folder Structure

```
resume-tailor-v26/
├── README.md
├── .env.local.example
├── .env.local                         ← NEVER commit
├── .gitignore
│
├── docs/                              ← All project documentation
│   ├── PRD.md
│   ├── agents.md
│   ├── TAILORING_PROMPT.md
│   └── SETUP_GUIDE.md
│
├── app/
│   ├── (auth)/                        ← [FUTURE] Login, signup
│   │   └── .gitkeep
│   ├── (billing)/                     ← [FUTURE] Stripe checkout
│   │   └── .gitkeep
│   ├── (dashboard)/
│   │   └── page.tsx                   ← Main dashboard
│   ├── api/
│   │   ├── tailor/route.ts
│   │   ├── github/route.ts
│   │   ├── overleaf/route.ts
│   │   └── graphql/                   ← [FUTURE]
│   │       └── .gitkeep
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── ui/                            ← shadcn/ui components
│   ├── dashboard/
│   │   ├── FileUploader.tsx
│   │   ├── ContextForm.tsx
│   │   ├── OutputPanel.tsx
│   │   ├── ATSScoreCard.tsx
│   │   └── OverleafSync.tsx
│   └── layout/
│       ├── Header.tsx
│       └── ThemeProvider.tsx
│
├── lib/
│   ├── actions/
│   │   ├── tailor.ts                  ← Main orchestrator (Server Action)
│   │   ├── github.ts                  ← GitHub REST API
│   │   └── overleaf.ts                ← Overleaf zip + link
│   ├── ai/
│   │   ├── gemini.ts                  ← Gemini client + grounding helper
│   │   └── prompts.ts                 ← All prompt templates
│   ├── parsers/
│   │   ├── pdf.ts
│   │   └── image.ts
│   ├── generators/
│   │   ├── pdf.ts
│   │   └── docx.ts
│   └── utils.ts
│
├── services/
│   ├── github.ts
│   ├── overleaf.ts
│   └── gemini.ts
│
├── types/
│   ├── resume.ts
│   ├── github.ts
│   └── api.ts
│
├── hooks/
│   ├── useFileUpload.ts
│   ├── useResumeState.ts
│   └── useOverleaf.ts
│
├── store/                             ← [FUTURE] Zustand / Jotai
│   └── .gitkeep
├── convex/                            ← [FUTURE] Convex schema
│   └── .gitkeep
└── prisma/                            ← [FUTURE] Prisma schema
    └── .gitkeep
```
