"use client";

import { ATSFeedback } from "@/types/resume";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertCircle, XCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ATSScoreCardProps {
  atsScore: ATSFeedback;
  companyName: string;
  roleTitle: string;
}

export function ATSScoreCard({ atsScore, companyName, roleTitle }: ATSScoreCardProps) {
  const { score, strengths, improvements, missingKeywords } = atsScore;

  const scoreColor =
    score >= 80
      ? "text-emerald-400"
      : score >= 70
      ? "text-amber-400"
      : "text-red-400";

  const progressColor =
    score >= 80
      ? "[&>div]:bg-emerald-500"
      : score >= 70
      ? "[&>div]:bg-amber-500"
      : "[&>div]:bg-red-500";

  const scoreLabel =
    score >= 80 ? "Strong Match" : score >= 70 ? "Good Match" : "Needs Work";

  return (
    <Card className="p-6 glass border-border/50 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm">ATS Score Check</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {roleTitle} at {companyName}
          </p>
        </div>

        {/* Big Score */}
        <div className="text-right">
          <div className={cn("text-4xl font-bold tabular-nums", scoreColor)}>
            {score}
          </div>
          <div className="text-xs text-muted-foreground">/ 100</div>
          <Badge
            variant="secondary"
            className={cn(
              "mt-1 text-xs",
              score >= 80 && "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
              score >= 70 && score < 80 && "bg-amber-500/15 text-amber-400 border-amber-500/30",
              score < 70 && "bg-red-500/15 text-red-400 border-red-500/30"
            )}
          >
            {scoreLabel}
          </Badge>
        </div>
      </div>

      {/* Progress bar */}
      <Progress
        value={score}
        className={cn("h-2 mb-6 bg-muted/50", progressColor)}
      />

      {/* Three columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Strengths */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium mb-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Strengths
          </div>
          {strengths.slice(0, 4).map((s, i) => (
            <p key={i} className="text-xs text-muted-foreground leading-relaxed">
              · {s}
            </p>
          ))}
        </div>

        {/* Improvements */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-amber-400 text-xs font-medium mb-2">
            <AlertCircle className="w-3.5 h-3.5" />
            Improvements
          </div>
          {improvements.slice(0, 4).map((s, i) => (
            <p key={i} className="text-xs text-muted-foreground leading-relaxed">
              · {s}
            </p>
          ))}
        </div>

        {/* Missing Keywords */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-red-400 text-xs font-medium mb-2">
            <XCircle className="w-3.5 h-3.5" />
            Missing Keywords
          </div>
          <div className="flex flex-wrap gap-1.5">
            {missingKeywords.slice(0, 8).map((kw, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="text-[10px] bg-red-500/10 text-red-400 border-red-500/20"
              >
                {kw}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
