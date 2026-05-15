"use client";

import { useState } from "react";
import { FileUploader } from "@/components/dashboard/FileUploader";
import { ContextForm } from "@/components/dashboard/ContextForm";
import { OutputPanel } from "@/components/dashboard/OutputPanel";
import { ATSScoreCard } from "@/components/dashboard/ATSScoreCard";
import { Header } from "@/components/layout/Header";
import { PipelineStatus } from "@/components/dashboard/PipelineStatus";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { TailoringResult, TailoringStatus } from "@/types/resume";

export default function DashboardPage() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [jdText, setJdText] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [status, setStatus] = useState<TailoringStatus>("idle");
  const [result, setResult] = useState<TailoringResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canTailor =
    (resumeFile || resumeText.trim()) &&
    (jdFile || jdText.trim()) &&
    status !== "parsing" &&
    status !== "researching" &&
    status !== "fetching-github" &&
    status !== "tailoring" &&
    status !== "scoring";

  const isLoading = [
    "parsing", "researching", "fetching-github", "tailoring", "scoring",
  ].includes(status);

  async function handleTailor() {
    setError(null);
    setResult(null);
    setStatus("parsing");

    try {
      const formData = new FormData();

      // Resume — prefer file, fall back to text
      if (resumeFile) {
        formData.append("resumeFile", resumeFile);
      } else {
        formData.append("resumeText", resumeText);
      }

      // JD — prefer file, fall back to text
      if (jdFile) {
        formData.append("jdFile", jdFile);
      } else {
        formData.append("jdText", jdText);
      }

      formData.append("extraContext", extraContext);

      // Call the API route (which runs the server action)
      const res = await fetch("/api/tailor", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Tailoring failed");
      }

      setStatus("tailoring");
      const data = await res.json();
      setStatus("scoring");

      // Short delay so user sees the scoring step
      await new Promise((r) => setTimeout(r, 400));

      setResult(data.data);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero */}
        <div className="text-center mb-10 animate-slide-up">
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            <span className="text-gradient">Resume Architect</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Upload your resume + JD. Gemini researches the company, mirrors
            the skills, injects impact — delivers a Senior/Lead-ready PDF in
            seconds.
          </p>
        </div>

        {/* Input Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Resume Upload */}
          <FileUploader
            id="resume-uploader"
            label="Your Resume"
            accept={{ "application/pdf": [".pdf"] }}
            hint="PDF only · parsed via pdf-parse"
            file={resumeFile}
            onFileChange={setResumeFile}
            fallbackText={resumeText}
            onFallbackChange={setResumeText}
            fallbackPlaceholder="Or paste your resume text here..."
            icon="document"
          />

          {/* JD Upload */}
          <FileUploader
            id="jd-uploader"
            label="Job Description"
            accept={{
              "application/pdf": [".pdf"],
              "image/*": [".png", ".jpg", ".jpeg", ".webp"],
            }}
            hint="PDF or Image (screenshot) · or paste text below"
            file={jdFile}
            onFileChange={setJdFile}
            fallbackText={jdText}
            onFallbackChange={setJdText}
            fallbackPlaceholder="Or paste the job description here..."
            icon="briefcase"
          />
        </div>

        {/* Extra Context */}
        <ContextForm
          value={extraContext}
          onChange={setExtraContext}
          className="mb-6"
        />

        {/* CTA */}
        <div className="flex justify-center mb-8">
          <Button
            id="tailor-btn"
            size="lg"
            onClick={handleTailor}
            disabled={!canTailor || isLoading}
            className="gap-2 px-10 py-6 text-lg font-semibold animate-pulse-glow glow-brand bg-primary hover:bg-primary/90 transition-all duration-300 rounded-xl"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Working…
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Tailor My Resume
              </>
            )}
          </Button>
        </div>

        {/* Pipeline Status */}
        {status !== "idle" && (
          <PipelineStatus status={status} className="mb-8" />
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm animate-slide-up">
            ⚠️ {error}
          </div>
        )}

        {/* Output */}
        {result && (
          <div className="space-y-6 animate-slide-up">
            {/* ATS Score */}
            <ATSScoreCard atsScore={result.atsScore} atsFeedback={result.atsFeedback} companyName={result.companyName} roleTitle={result.jdTitle} />

            {/* LaTeX Output + Downloads */}
            <OutputPanel result={result} />
          </div>
        )}
      </main>

      <footer className="border-t border-border/50 py-4 text-center text-xs text-muted-foreground">
        resume-tailor-v26 · Powered by Gemini 2.5 Pro · Personal Use
      </footer>
    </div>
  );
}
