# resume-tailor-v26

> **AI Resume Architect — Senior/Lead Edition**  
> Built with Next.js 16 · Tailwind CSS · shadcn/ui · Gemini 2.5 Pro · Dark Mode

---

## What It Does

Transforms your master resume into an ATS-optimized, recruiter-ready document for Senior/Lead Frontend roles in seconds.

**Pipeline:**
1. Upload your Resume (PDF) + Job Description (Image/PDF or text)
2. Add any extra context
3. Gemini researches the company and tailors your resume with quantifiable impact, leadership language, and ATS-targeted keywords
4. Download as PDF or DOCX — or open directly in Overleaf

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| AI | Gemini 2.5 Pro (tailoring + company research via grounding) |
| PDF Parse | `pdf-parse` |
| PDF Generate | `jsPDF` |
| DOCX Generate | `docx` |
| LaTeX Editor | Monaco Editor |
| State (v1) | React `useState` / `useReducer` |

---

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/idesofmarch00/resume-tailor-v26.git
cd resume-tailor-v26

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.local.example .env.local
# Fill in your keys (see docs/SETUP_GUIDE.md)

# 4. Run development server
npm run dev
```

App runs at `http://localhost:3000`

---

## Documentation

| File | Purpose |
|------|---------|
| [`docs/PRD.md`](docs/PRD.md) | Product Requirements Document |
| [`docs/agents.md`](docs/agents.md) | Agent pipeline + AI rules |
| [`docs/TAILORING_PROMPT.md`](docs/TAILORING_PROMPT.md) | Gemini system prompts |
| [`docs/SETUP_GUIDE.md`](docs/SETUP_GUIDE.md) | Developer setup + token guide |

---

## Scalability Roadmap

- **Auth:** BetterAuth + GitHub/Google OAuth
- **Database:** Convex (real-time) or Supabase + Prisma
- **Payments:** Stripe subscriptions
- **API:** GraphQL (Hasura / Pothos)

> v1 is personal-use only. Multi-user SaaS structure is pre-scaffolded but not implemented.

---

## License

MIT — Personal use. See `LICENSE`.
