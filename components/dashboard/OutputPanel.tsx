"use client";

import dynamic from "next/dynamic";
import { TailoringResult } from "@/types/resume";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  FileText,
  ExternalLink,
  Copy,
  Check,
  Code2,
} from "lucide-react";
import { useState } from "react";

// Lazy-load Monaco to avoid SSR issues
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] flex items-center justify-center animate-shimmer rounded-lg" />
  ),
});

interface OutputPanelProps {
  result: TailoringResult;
}

export function OutputPanel({ result }: OutputPanelProps) {
  const [copied, setCopied] = useState(false);
  const [overleafLoading, setOverleafLoading] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(result.latex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDownloadPDF() {
    const res = await fetch("/api/tailor/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "pdf", latex: result.latex, fileName: result.outputFileName }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.outputFileName}.pdf`;
    a.click();
  }

  async function handleDownloadDOCX() {
    const res = await fetch("/api/tailor/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "docx", latex: result.latex, fileName: result.outputFileName }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.outputFileName}.docx`;
    a.click();
  }

  async function handleOverleaf() {
    setOverleafLoading(true);
    try {
      // Create a hidden form to POST directly to Overleaf
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "https://www.overleaf.com/docs";
      form.target = "_blank";

      const snipInput = document.createElement("input");
      snipInput.type = "hidden";
      snipInput.name = "snip";
      snipInput.value = result.latex;

      form.appendChild(snipInput);
      document.body.appendChild(form);
      form.submit();

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(form);
      }, 1000);
    } finally {
      setOverleafLoading(false);
    }
  }

  return (
    <Card className="p-6 glass border-border/50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Code2 className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm">Generated Resume</h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs font-mono">
              {result.outputFileName}
            </Badge>
            <Badge
              variant="secondary"
              className="text-xs bg-primary/10 text-primary border-primary/20"
            >
              LaTeX
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            id="copy-latex-btn"
            variant="secondary"
            size="sm"
            onClick={handleCopy}
            className="gap-1.5 text-xs"
          >
            {copied ? (
              <><Check className="w-3.5 h-3.5 text-emerald-400" /> Copied</>
            ) : (
              <><Copy className="w-3.5 h-3.5" /> Copy LaTeX</>
            )}
          </Button>

          <Button
            id="download-pdf-btn"
            variant="secondary"
            size="sm"
            onClick={handleDownloadPDF}
            className="gap-1.5 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            PDF
          </Button>

          <Button
            id="download-docx-btn"
            variant="secondary"
            size="sm"
            onClick={handleDownloadDOCX}
            className="gap-1.5 text-xs"
          >
            <FileText className="w-3.5 h-3.5" />
            DOCX
          </Button>

          <Button
            id="overleaf-sync-btn"
            size="sm"
            onClick={handleOverleaf}
            disabled={overleafLoading}
            className="gap-1.5 text-xs bg-[#4DB346] hover:bg-[#3da336] text-white border-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {overleafLoading ? "Opening…" : "Open in Overleaf"}
          </Button>
        </div>
      </div>

      {/* Monaco Editor */}
      <Tabs defaultValue="editor" className="w-full">
        <TabsList className="mb-3 bg-muted/30">
          <TabsTrigger value="editor" className="text-xs">LaTeX Editor</TabsTrigger>
          <TabsTrigger value="raw" className="text-xs">Raw Text</TabsTrigger>
        </TabsList>

        <TabsContent value="editor">
          <div className="rounded-xl overflow-hidden border border-border/50 monaco-editor-container">
            <MonacoEditor
              height="500px"
              language="latex"
              value={result.latex}
              theme="vs-dark"
              options={{
                readOnly: false,
                fontSize: 13,
                minimap: { enabled: false },
                lineNumbers: "on",
                wordWrap: "on",
                scrollBeyondLastLine: false,
                padding: { top: 16, bottom: 16 },
                fontFamily: "'Geist Mono', 'Fira Code', monospace",
                fontLigatures: true,
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="raw">
          <pre className="h-[500px] overflow-auto p-4 rounded-xl bg-muted/20 border border-border/50 text-xs text-muted-foreground font-mono whitespace-pre-wrap leading-relaxed">
            {result.latex}
          </pre>
        </TabsContent>
      </Tabs>

      {/* Info footer */}
      <p className="text-xs text-muted-foreground/40 mt-3 text-center">
        Compiled LaTeX → "Open in Overleaf" creates a new project · PDF/DOCX downloaded locally
      </p>
    </Card>
  );
}
