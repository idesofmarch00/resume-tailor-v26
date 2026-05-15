# SETUP_GUIDE.md — Complete Setup & Execution Guide

> **Project:** resume-tailor-v26
> **Stack:** Next.js 16 · Tailwind CSS · shadcn/ui · Gemini 2.5 Pro · GitHub REST API
> **Last Updated:** May 15, 2026

---

## Required Environment Variables (Only 2 Secrets!)

> We replaced Google Custom Search API with **Gemini Search Grounding** — same API key, no extra credentials.

```env
GEMINI_API_KEY=          # Gemini 2.5 Pro (also powers company research via grounding)
GITHUB_PAT=              # GitHub PAT — read public repos (scope: public_repo)
GITHUB_USERNAME=         # Your GitHub username
NEXT_PUBLIC_APP_URL=     # http://localhost:3000 (dev) / https://your-domain.com (prod)
```

---

## Part 1: Get Your API Keys

### Token 1 — GEMINI_API_KEY

1. Go to: **https://aistudio.google.com/apikey**
2. Sign in with your Google account
3. Click **"Create API key"** (top right, blue button)
4. Select an existing Google Cloud project or click **"Create API key in new project"**
5. A dialog shows your key starting with `AIza...` — click the copy icon
6. Add to `.env.local`:
   ```
   GEMINI_API_KEY=AIzaSy...
   ```
> ✅ This single key powers both resume tailoring AND company research (via Gemini's built-in Google Search grounding)  
> ✅ Free tier includes Gemini 2.5 Pro access — no billing required to start

---

### Token 2 — GITHUB_PAT (Web App — Read Only)

1. Go to: **https://github.com/settings/tokens/new**  
   *(Profile → Settings → Developer settings → Personal access tokens → Tokens (classic))*
2. Fill in:
   - **Note:** `resume-tailor-v26-webapp`
   - **Expiration:** 90 days
3. Check these scopes only:
   - ✅ `public_repo` — read public repositories
   - ✅ `read:user` — read profile data
4. Click **"Generate token"** (green button at bottom)
5. **Copy immediately** — GitHub only shows it once
6. Add to `.env.local`:
   ```
   GITHUB_PAT=ghp_...
   GITHUB_USERNAME=idesofmarch00
   ```
> ✅ Read-only scope = if this key ever leaked, it can only read your public repos  
> ✅ This is different from the Antigravity MCP token — keep them separate

---

## Part 2: MCP Configuration for Antigravity

Adds GitHub MCP (for AI to manage repos) and Context7 (for live library docs) to Antigravity.

### File: `~/.gemini/antigravity/mcp_config.json`

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "YOUR_ANTIGRAVITY_MCP_PAT_HERE"
      }
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

**How to use Context7 in prompts:**
```
Create a Next.js 16 server action that reads a PDF. use context7
```

---

## Part 3: Scaffold the Next.js 16 App

```bash
# From inside the resume-tailor-v26 directory:

# Step 1: Initialize Next.js 16 (if starting fresh — skip if already done)
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --app \
  --import-alias "@/*" \
  --turbopack \
  --yes

# Step 2: Initialize shadcn/ui
npx shadcn@latest init
# When prompted: Style=Default, Base color=Neutral, CSS variables=Yes

# Step 3: Add shadcn components
npx shadcn@latest add button card textarea badge progress separator tabs tooltip

# Step 4: Install project dependencies
npm install \
  @google/generative-ai \
  pdf-parse \
  jspdf \
  docx \
  @monaco-editor/react \
  react-dropzone \
  lucide-react \
  next-themes \
  @types/pdf-parse

# Step 5: Run dev server (Turbopack — instant HMR)
npm run dev
# → http://localhost:3000
```

---

## Part 4: How Gemini Search Grounding Replaces Google Custom Search

Instead of:
- ~~`GOOGLE_API_KEY`~~
- ~~`GOOGLE_CSE_ID`~~
- ~~Separate Google Custom Search API call~~

We use Gemini's built-in grounding tool:

```typescript
// lib/ai/gemini.ts
const result = await model.generateContent({
  contents: [{ role: "user", parts: [{ text: companyResearchPrompt }] }],
  tools: [{ googleSearch: {} }],  // ← Live web search, same GEMINI_API_KEY
});
```

**Benefits:**
- ✅ No extra API keys
- ✅ No extra billing setup
- ✅ Better results (Gemini synthesizes + summarizes search results)
- ✅ Grounding citations included in response

---

## Part 5: Overleaf Integration (v1 — Free, No API Key)

The "Open in Overleaf" button:
1. Server generates a `.zip` file containing `main.tex`
2. Zip is temporarily served via `/api/overleaf` route
3. User is redirected to: `https://www.overleaf.com/docs?snip_uri={url_to_zip}`
4. Overleaf opens a new project pre-loaded with the resume

**No Overleaf API key needed.** Works for free accounts.

Future (v2): If user has a paid Overleaf account, use Overleaf's Git remote integration.

---

## Part 6: Deploy to Vercel

```bash
npm i -g vercel
vercel

# Set env vars in Vercel dashboard:
# vercel.com/idesofmarch00/resume-tailor-v26/settings/environment-variables
# Required: GEMINI_API_KEY, GITHUB_PAT, GITHUB_USERNAME, NEXT_PUBLIC_APP_URL
```

---

## Part 7: Codex Execution Prompts

Run these **sequentially** in OpenAI Codex:

**Prompt 1 — Scaffold:**
```
Initialize a Next.js 16 app using the App Router with TypeScript, Tailwind CSS v4, and Turbopack. 
Initialize shadcn/ui with Neutral color scheme. Dark mode forced (no toggle). 
Use @/* import alias.
```

**Prompt 2 — Dashboard UI:**
```
Create a dark-mode dashboard at app/(dashboard)/page.tsx with:
1. Drag-and-drop PDF uploader for resume (react-dropzone)
2. Drag-and-drop Image/PDF uploader for job description
3. Large textarea for "Extra Context"
4. "Tailor My Resume" CTA button
5. Monaco Editor for LaTeX output
6. Download PDF + DOCX buttons
7. "Open in Overleaf" button
8. ATS Score Card (score 0-100 + strengths/improvements/missing keywords)
Use shadcn/ui. Premium dark UI, glassmorphism accents.
```

**Prompt 3 — Server Actions:**
```
Build tailorResume server action in lib/actions/tailor.ts:
1. Parse PDF (pdf-parse)
2. Extract candidate name + JD details via Gemini
3. Fetch GitHub public repos (GitHub REST API, GITHUB_PAT env var)
4. Research company via Gemini with tools: [{ googleSearch: {} }] (NO Google Search API needed)
5. Call Gemini 2.5 Pro with TAILORING_PROMPT from docs/TAILORING_PROMPT.md
6. Run ATS score check (second Gemini call, returns JSON)
7. Return { latex, atsScore, atsFeedback, candidateName, jdTitle }
All in Server Actions — never expose keys to client.
```

**Prompt 4 — File Generators:**
```
Build lib/generators/pdf.ts (jsPDF) and lib/generators/docx.ts (docx library).
Rules: 12pt headers, 10pt body, black text, no colors.
File naming: {CandidateName}_{JDTitle}_{CurrentYear}.pdf/.docx
Parse LaTeX output to extract sections before generating.
```

**Prompt 5 — Overleaf:**
```
Build Overleaf integration in lib/actions/overleaf.ts.
Generate .zip with main.tex from LaTeX output.
Serve temporarily via /api/overleaf/route.ts.
Redirect to https://www.overleaf.com/docs?snip_uri={zip_url}.
```

---

## File Inventory

| File | Location | Purpose |
|------|----------|---------|
| `README.md` | `/` | GitHub landing page |
| `PRD.md` | `docs/` | Product requirements |
| `agents.md` | `docs/` | Agent pipeline + rules |
| `TAILORING_PROMPT.md` | `docs/` | Gemini system prompts |
| `SETUP_GUIDE.md` | `docs/` | This file |
| `.env.local.example` | `/` | Safe template (committed) |
| `.env.local` | `/` | Secrets (NEVER committed) |
