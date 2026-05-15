"use client";

import { TailoringStatus } from "@/types/resume";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

const STEPS: { key: TailoringStatus; label: string; description: string }[] = [
  { key: "parsing",        label: "Parsing",       description: "Extracting text from PDF" },
  { key: "researching",    label: "Researching",   description: "Gemini searching company info" },
  { key: "fetching-github",label: "GitHub",        description: "Fetching your public repos" },
  { key: "tailoring",      label: "Tailoring",     description: "Gemini writing your resume" },
  { key: "scoring",        label: "ATS Check",     description: "Scoring against JD keywords" },
  { key: "done",           label: "Done",          description: "Ready to download" },
];

const ORDER = STEPS.map((s) => s.key);

interface PipelineStatusProps {
  status: TailoringStatus;
  className?: string;
}

export function PipelineStatus({ status, className }: PipelineStatusProps) {
  const currentIndex = ORDER.indexOf(status);

  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <div className="flex items-start gap-0 min-w-max mx-auto justify-center">
        {STEPS.map((step, i) => {
          const isDone    = currentIndex > i || status === "done";
          const isActive  = ORDER[currentIndex] === step.key && status !== "done";
          const isError   = status === "error" && ORDER[currentIndex] === step.key;

          return (
            <div key={step.key} className="flex items-start">
              {/* Step */}
              <div className="flex flex-col items-center gap-1.5 w-24">
                {/* Icon */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                    isDone  && "step-done border-emerald-500/60 bg-emerald-500/20",
                    isActive && !isError && "step-active border-primary/60 bg-primary/20",
                    isError && "border-destructive/60 bg-destructive/20",
                    !isDone && !isActive && "step-idle"
                  )}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isActive ? (
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground/40" />
                  )}
                </div>

                {/* Label */}
                <div className="text-center">
                  <p className={cn(
                    "text-xs font-medium",
                    isDone  && "text-emerald-400",
                    isActive && "text-primary",
                    !isDone && !isActive && "text-muted-foreground/50"
                  )}>
                    {step.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground/40 leading-tight">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Connector */}
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-8 mt-4 rounded-full transition-all duration-500",
                    isDone ? "bg-emerald-500/40" : "bg-border/50"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
