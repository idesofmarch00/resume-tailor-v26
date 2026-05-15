import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Resume Architect — AI-Powered Senior/Lead Resume Tailor",
  description:
    "Transform your master resume into an ATS-optimized, recruiter-ready document for Senior/Lead Frontend roles. Powered by Gemini 2.5 Pro.",
  keywords: ["resume", "AI", "ATS", "frontend", "senior engineer", "lead engineer", "job application"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <TooltipProvider delayDuration={200}>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
