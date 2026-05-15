import { Cpu, FileText } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-4 max-w-7xl h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-sm tracking-tight">
            Resume<span className="text-primary">Architect</span>
          </span>
          <span className="hidden sm:block text-xs text-muted-foreground border border-border/50 rounded-full px-2 py-0.5">
            v26
          </span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Gemini 2.5 Pro
          </span>
          <a
            href="https://github.com/idesofmarch00/resume-tailor-v26"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:block">Docs</span>
          </a>
        </div>
      </div>
    </header>
  );
}
