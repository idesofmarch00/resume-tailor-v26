"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileCheck2, X, FileText, Briefcase } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
  id: string;
  label: string;
  accept: Record<string, string[]>;
  hint: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  fallbackText: string;
  onFallbackChange: (text: string) => void;
  fallbackPlaceholder: string;
  icon: "document" | "briefcase";
}

export function FileUploader({
  id,
  label,
  accept,
  hint,
  file,
  onFileChange,
  fallbackText,
  onFallbackChange,
  fallbackPlaceholder,
  icon,
}: FileUploaderProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) {
        onFileChange(accepted[0]);
        onFallbackChange(""); // Clear text if file dropped
      }
    },
    [onFileChange, onFallbackChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: 1,
    multiple: false,
  });

  const Icon = icon === "document" ? FileText : Briefcase;

  return (
    <Card className="p-5 glass border-border/50 space-y-4">
      {/* Label */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">{label}</span>
        </div>
        {file && (
          <Badge
            variant="secondary"
            className="text-xs gap-1 cursor-pointer hover:bg-destructive/20 hover:text-destructive transition-colors"
            onClick={() => onFileChange(null)}
          >
            <X className="w-3 h-3" />
            Remove
          </Badge>
        )}
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        id={id}
        className={cn(
          "upload-border rounded-xl p-6 cursor-pointer transition-all duration-200 text-center min-h-[120px] flex flex-col items-center justify-center gap-3",
          isDragActive && "active",
          file && "border-emerald-500/40 bg-emerald-500/5"
        )}
      >
        <input {...getInputProps()} />

        {file ? (
          <>
            <FileCheck2 className="w-8 h-8 text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-emerald-400">{file.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </>
        ) : (
          <>
            <UploadCloud
              className={cn(
                "w-8 h-8 transition-colors",
                isDragActive ? "text-primary" : "text-muted-foreground"
              )}
            />
            <div>
              <p className="text-sm text-muted-foreground">
                {isDragActive ? (
                  <span className="text-primary font-medium">Drop it here</span>
                ) : (
                  <>
                    <span className="text-foreground font-medium">
                      Drag & drop
                    </span>{" "}
                    or click to upload
                  </>
                )}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">{hint}</p>
            </div>
          </>
        )}
      </div>

      {/* Fallback text area */}
      {!file && (
        <Textarea
          id={`${id}-text`}
          value={fallbackText}
          onChange={(e) => onFallbackChange(e.target.value)}
          placeholder={fallbackPlaceholder}
          className="min-h-[100px] text-sm bg-muted/30 border-border/50 resize-none focus:ring-primary/30 placeholder:text-muted-foreground/40"
        />
      )}
    </Card>
  );
}
