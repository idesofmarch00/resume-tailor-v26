"use client";

import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquarePlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContextFormProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
}

export function ContextForm({ value, onChange, className }: ContextFormProps) {
  return (
    <Card className={cn("p-5 glass border-border/50", className)}>
      <div className="flex items-center gap-2 mb-3">
        <MessageSquarePlus className="w-4 h-4 text-primary" />
        <span className="font-medium text-sm">Extra Context</span>
        <span className="text-xs text-muted-foreground">(optional)</span>
      </div>
      <Textarea
        id="extra-context"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Add anything you'd like the AI to know or emphasize:\n• Specific projects to highlight\n• Skills you want stressed\n• Exaggerations or white-lies you're comfortable with\n• Target seniority or team type`}
        className="min-h-[120px] text-sm bg-muted/30 border-border/50 resize-none focus:ring-primary/30 placeholder:text-muted-foreground/40 font-mono"
      />
      <p className="text-xs text-muted-foreground/50 mt-2">
        This context is injected verbatim into the AI prompt — be specific.
      </p>
    </Card>
  );
}
