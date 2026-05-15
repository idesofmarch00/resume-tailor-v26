import { NextRequest, NextResponse } from "next/server";
import jsPDF from "jspdf";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from "docx";

// ── LaTeX Parser ─────────────────────────────────────────────
interface Section {
  heading: string;
  lines: string[];
}

function parseLatex(latex: string): Section[] {
  const sections: Section[] = [];
  let currentSection: Section = { heading: "", lines: [] };

  // Strip LaTeX preamble (everything before \begin{document})
  const docMatch = latex.match(/\\begin\{document\}([\s\S]*)\\end\{document\}/);
  const body = docMatch ? docMatch[1] : latex;

  const lines = body.split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Skip pure LaTeX commands
    if (/^\\(documentclass|usepackage|begin|end|pagestyle|thispagestyle|vspace|hspace|noindent|newpage|clearpage|setlength|renewcommand|fancyhead|fancyfoot|lhead|rhead)\b/.test(line)) continue;
    if (/^\\(geometry|hypersetup|titleformat|titlespacing)\b/.test(line)) continue;
    if (line === "\\maketitle") continue;

    // Skip LaTeX comments
    if (line.startsWith("%")) continue;

    // Section headers
    const sectionMatch = line.match(/\\section\*?\{(.+?)\}/);
    if (sectionMatch) {
      if (currentSection.heading || currentSection.lines.length) {
        sections.push(currentSection);
      }
      currentSection = { heading: sectionMatch[1], lines: [] };
      continue;
    }

    // Subsection headers → treat as bold line
    const subMatch = line.match(/\\subsection\*?\{(.+?)\}/);
    if (subMatch) {
      currentSection.lines.push(`**${subMatch[1]}**`);
      continue;
    }

    // Clean LaTeX formatting from line
    let cleaned = line
      .replace(/\\textbf\{([^}]*)\}/g, "$1")
      .replace(/\\textit\{([^}]*)\}/g, "$1")
      .replace(/\\emph\{([^}]*)\}/g, "$1")
      .replace(/\\underline\{([^}]*)\}/g, "$1")
      .replace(/\\href\{[^}]*\}\{([^}]*)\}/g, "$1")
      .replace(/\\url\{([^}]*)\}/g, "$1")
      .replace(/\\item\s*/g, "• ")
      .replace(/\\\\$/g, "")
      .replace(/\\\\/g, "")
      .replace(/\\hfill/g, "  —  ")
      .replace(/\$\|\$/g, "|") // Convert $|$ to |
      .replace(/\\\$/g, "$")
      .replace(/\\&/g, "&")
      .replace(/\\%/g, "%")
      .replace(/\\#/g, "#")
      .replace(/\{|\}/g, "")
      .replace(/~/, " ")
      .replace(/\\[a-zA-Z]+/g, "") // Remove remaining commands
      .trim();

    if (cleaned.length > 0) {
      currentSection.lines.push(cleaned);
    }
  }

  // Push last section
  if (currentSection.heading || currentSection.lines.length) {
    sections.push(currentSection);
  }

  return sections;
}

// ── PDF Generation ───────────────────────────────────────────
function generatePDF(sections: Section[], fileName: string): Buffer {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 50;
  const marginRight = 50;
  const maxWidth = pageWidth - marginLeft - marginRight;
  let y = 50;

  const checkPageBreak = (needed: number) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + needed > pageHeight - 50) {
      doc.addPage();
      y = 50;
    }
  };

  for (const section of sections) {
    if (section.heading) {
      checkPageBreak(30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(section.heading.toUpperCase(), marginLeft, y);
      y += 4;
      // Underline
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(marginLeft, y, pageWidth - marginRight, y);
      y += 14;
    }

    for (const line of section.lines) {
      const isBold = line.startsWith("**") && line.endsWith("**");
      const text = isBold ? line.slice(2, -2) : line;

      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);

      const wrapped = doc.splitTextToSize(text, maxWidth);
      const lineHeight = 14;
      checkPageBreak(wrapped.length * lineHeight);

      for (const wLine of wrapped) {
        doc.text(wLine, marginLeft, y);
        y += lineHeight;
      }
      y += 2; // Small gap between entries
    }

    y += 8; // Gap between sections
  }

  // Return as Buffer
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}

// ── DOCX Generation ──────────────────────────────────────────
async function generateDOCX(sections: Section[]): Promise<Buffer> {
  const docSections: Paragraph[] = [];

  for (const section of sections) {
    if (section.heading) {
      docSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.heading.toUpperCase(),
              bold: true,
              size: 24, // 12pt
              font: "Calibri",
              color: "000000",
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 80 },
          border: {
            bottom: {
              style: BorderStyle.SINGLE,
              size: 1,
              color: "000000",
            },
          },
        })
      );
    }

    for (const line of section.lines) {
      const isBold = line.startsWith("**") && line.endsWith("**");
      const text = isBold ? line.slice(2, -2) : line;

      docSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text,
              bold: isBold,
              size: 20, // 10pt
              font: "Calibri",
              color: "000000",
            }),
          ],
          spacing: { after: 60 },
          alignment: AlignmentType.LEFT,
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,    // 0.5 inch
              bottom: 720,
              left: 720,
              right: 720,
            },
          },
        },
        children: docSections,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

// ── Route Handler ────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { type, latex, fileName } = await req.json();

    if (!type || !latex || !fileName) {
      return NextResponse.json(
        { error: "type, latex, and fileName are required" },
        { status: 400 }
      );
    }

    const sections = parseLatex(latex);

    if (type === "pdf") {
      const pdfBuffer = generatePDF(sections, fileName);
      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${fileName}.pdf"`,
        },
      });
    }

    if (type === "docx") {
      const docxBuffer = await generateDOCX(sections);
      return new NextResponse(new Uint8Array(docxBuffer), {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${fileName}.docx"`,
        },
      });
    }

    return NextResponse.json(
      { error: 'type must be "pdf" or "docx"' },
      { status: 400 }
    );
  } catch (err) {
    console.error("Download route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Download failed" },
      { status: 500 }
    );
  }
}
