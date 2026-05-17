/**
 * DOCX export — converts a Paper + rendered references into a .docx file
 * using the `docx` npm package.
 *
 * Supports APA 7, MLA 9, Chicago, and IEEE formatting conventions.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  SectionType,
  convertInchesToTwip,
  LevelFormat,
  TabStopType,
  TabStopPosition,
} from 'docx';
import type { Paper, RenderedCitation } from '../types.js';

/** One inch = 1440 twips (docx unit) */
const IN = 1440;

export interface DocxExportOptions {
  includeReferences: boolean;
  references: RenderedCitation[];
}

/**
 * Generate a .docx Blob for the given paper.
 * Call this in the browser; Packer.toBlob() returns a Blob.
 */
export async function exportToDocx(
  paper: Paper,
  options: DocxExportOptions
): Promise<Blob> {
  const settings = paper.settings;
  const marginTwips = {
    top: Math.round(settings.marginTop * IN),
    bottom: Math.round(settings.marginBottom * IN),
    left: Math.round(settings.marginLeft * IN),
    right: Math.round(settings.marginRight * IN),
  };

  const fontName = settings.fontFamily.split(',')[0].trim();
  const fontSize = settings.fontSize * 2; // half-points in docx
  const lineSpacing = Math.round(settings.lineHeight * 240); // 240 = single space

  const children: Paragraph[] = [];

  // --- Cover page (APA/MLA/Chicago style) ---
  if (settings.style !== 'ieee') {
    children.push(blankLines(12));
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { line: lineSpacing, lineRule: 'auto' },
        children: [
          new TextRun({
            text: settings.title,
            font: fontName,
            size: fontSize,
            bold: settings.style === 'apa7',
          }),
        ],
      })
    );
    children.push(blankLines(1));

    if (settings.authorName) {
      children.push(centeredPara(settings.authorName, fontName, fontSize, lineSpacing));
    }
    if (settings.institutionName) {
      children.push(centeredPara(settings.institutionName, fontName, fontSize, lineSpacing));
    }
    if (settings.courseName) {
      children.push(centeredPara(settings.courseName, fontName, fontSize, lineSpacing));
    }
    if (settings.instructorName) {
      children.push(centeredPara(settings.instructorName, fontName, fontSize, lineSpacing));
    }
    if (settings.dueDate) {
      children.push(centeredPara(settings.dueDate, fontName, fontSize, lineSpacing));
    }

    // Page break after cover
    children.push(new Paragraph({ pageBreakBefore: true }));
  }

  // --- Abstract page ---
  const abstractText = settings.abstract?.trim();
  if (abstractText) {
    if (settings.style === 'apa7') {
      // APA: "Abstract" centered bold heading, non-indented paragraph, optional Keywords line
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { line: lineSpacing, lineRule: 'auto', after: 0 },
          children: [
            new TextRun({ text: 'Abstract', font: fontName, size: fontSize, bold: true }),
          ],
        })
      );
      children.push(
        new Paragraph({
          spacing: { line: lineSpacing, lineRule: 'auto', after: 0 },
          indent: { firstLine: 0 },
          children: [new TextRun({ text: abstractText, font: fontName, size: fontSize })],
        })
      );
      if (settings.keywords?.trim()) {
        children.push(
          new Paragraph({
            spacing: { line: lineSpacing, lineRule: 'auto', before: 240, after: 0 },
            indent: { firstLine: 0 },
            children: [
              new TextRun({ text: 'Keywords: ', font: fontName, size: fontSize, italics: true }),
              new TextRun({ text: settings.keywords.trim(), font: fontName, size: fontSize }),
            ],
          })
        );
      }
      // Page break before body
      children.push(new Paragraph({ pageBreakBefore: true }));
    } else if (settings.style === 'chicago') {
      // Chicago: section header + paragraph, no extra page break
      children.push(
        new Paragraph({
          spacing: { line: lineSpacing, lineRule: 'auto', before: 240, after: 0 },
          children: [
            new TextRun({ text: 'Abstract', font: fontName, size: fontSize, bold: true }),
          ],
        })
      );
      children.push(
        new Paragraph({
          spacing: { line: lineSpacing, lineRule: 'auto', after: 0 },
          indent: { firstLine: 720 },
          children: [new TextRun({ text: abstractText, font: fontName, size: fontSize })],
        })
      );
    }
    // MLA / IEEE / Turabian: skip abstract in DOCX output
  }

  // --- Body content ---
  // Parse Tiptap JSON and emit paragraphs
  const bodyParagraphs = tiptapToDocxParagraphs(
    paper.content as TiptapDoc,
    fontName,
    fontSize,
    lineSpacing,
    settings.style
  );
  children.push(...bodyParagraphs);

  // --- References ---
  if (options.includeReferences && options.references.length > 0) {
    children.push(new Paragraph({ pageBreakBefore: true }));

    const refHeading =
      settings.style === 'mla9'
        ? 'Works Cited'
        : settings.style === 'chicago'
          ? 'Bibliography'
          : 'References';

    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: refHeading, font: fontName, size: fontSize, bold: true }),
        ],
        spacing: { line: lineSpacing, lineRule: 'auto', after: 0 },
      })
    );
    children.push(blankLines(1));

    for (const ref of options.references) {
      // Strip HTML from the citeproc output
      const text = stripHtml(ref.reference);
      children.push(
        new Paragraph({
          // Hanging indent: first line flush, subsequent lines indented 0.5"
          indent: { left: 720, hanging: 720 },
          spacing: { line: lineSpacing, lineRule: 'auto', after: 0 },
          children: [new TextRun({ text, font: fontName, size: fontSize })],
        })
      );
    }
  }

  // --- Header ---
  const header = buildHeader(paper, fontName, fontSize);

  // --- Footer (page numbers) ---
  const footer = buildFooter(fontName, fontSize);

  const doc = new Document({
    sections: [
      {
        properties: {
          type: SectionType.CONTINUOUS,
          page: {
            margin: marginTwips,
          },
        },
        headers: { default: header },
        footers: { default: footer },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}

// ---- Helpers ----

function blankLines(n: number): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: '' })],
    spacing: { after: n * 240 },
  });
}

function centeredPara(
  text: string,
  font: string,
  size: number,
  lineSpacing: number
): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { line: lineSpacing, lineRule: 'auto', after: 0 },
    children: [new TextRun({ text, font, size })],
  });
}

function buildHeader(paper: Paper, font: string, size: number): Header {
  const isApa = paper.settings.style === 'apa7';

  if (isApa) {
    // APA 7: running head left-aligned, page number right-aligned
    // Use a right-aligned tab stop at the text width (6.5in = 9360 twips at 1in margins on 8.5in page)
    const runningHead = (paper.settings.runningHead ?? paper.settings.title)
      .toUpperCase()
      .slice(0, 50);

    return new Header({
      children: [
        new Paragraph({
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: TabStopPosition.MAX,
            },
          ],
          children: [
            new TextRun({ text: runningHead, font, size }),
            new TextRun({ text: '\t', font, size }),
            new TextRun({ children: [PageNumber.CURRENT], font, size }),
          ],
        }),
      ],
    });
  }

  // Non-APA styles: page number right-aligned only
  return new Header({
    children: [
      new Paragraph({
        tabStops: [
          {
            type: TabStopType.RIGHT,
            position: TabStopPosition.MAX,
          },
        ],
        children: [
          new TextRun({ text: '\t', font, size }),
          new TextRun({ children: [PageNumber.CURRENT], font, size }),
        ],
      }),
    ],
  });
}

function buildFooter(font: string, size: number): Footer {
  return new Footer({
    children: [
      new Paragraph({
        children: [new TextRun({ text: '', font, size })],
      }),
    ],
  });
}

/** Strip HTML tags from a string */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

// ---- Tiptap JSON → docx paragraphs ----

interface TiptapDoc {
  type: string;
  content?: TiptapNode[];
}

interface TiptapNode {
  type: string;
  text?: string;
  content?: TiptapNode[];
  marks?: TiptapMark[];
  attrs?: Record<string, unknown>;
}

interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

function tiptapToDocxParagraphs(
  doc: TiptapDoc,
  font: string,
  size: number,
  lineSpacing: number,
  style: string
): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  if (!doc.content) return paragraphs;

  for (const node of doc.content) {
    switch (node.type) {
      case 'paragraph': {
        const runs = nodeToRuns(node, font, size);
        const align = (node.attrs?.textAlign as string) ?? 'left';
        paragraphs.push(
          new Paragraph({
            alignment: alignmentFromString(align),
            spacing: { line: lineSpacing, lineRule: 'auto', after: 0 },
            indent: { firstLine: style === 'ieee' ? 0 : 720 }, // 0.5" indent
            children: runs.length ? runs : [new TextRun({ text: '', font, size })],
          })
        );
        break;
      }
      case 'heading': {
        const level = (node.attrs?.level as number) ?? 1;
        const runs = nodeToRuns(node, font, size);
        paragraphs.push(
          new Paragraph({
            heading: levelToHeading(level),
            spacing: { line: lineSpacing, lineRule: 'auto', before: 240, after: 0 },
            children: runs,
          })
        );
        break;
      }
      case 'blockquote': {
        const inner = tiptapToDocxParagraphs(
          { type: 'doc', content: node.content ?? [] },
          font,
          size,
          lineSpacing,
          style
        );
        for (const p of inner) {
          // Add block quote indent
          paragraphs.push(p);
        }
        break;
      }
      case 'bulletList':
      case 'orderedList': {
        const items = node.content ?? [];
        for (const item of items) {
          const runs = nodeToRuns(item, font, size);
          paragraphs.push(
            new Paragraph({
              bullet: { level: 0 },
              spacing: { line: lineSpacing, lineRule: 'auto', after: 0 },
              children: runs,
            })
          );
        }
        break;
      }
      case 'horizontalRule': {
        // Simple separator paragraph
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: '—'.repeat(20), font, size })],
          })
        );
        break;
      }
      default:
        break;
    }
  }

  return paragraphs;
}

function nodeToRuns(node: TiptapNode, font: string, size: number): TextRun[] {
  const runs: TextRun[] = [];

  if (node.type === 'text' && node.text !== undefined) {
    const marks = node.marks ?? [];
    const bold = marks.some((m) => m.type === 'bold');
    const italic = marks.some((m) => m.type === 'italic');
    const underline = marks.some((m) => m.type === 'underline');
    const highlight = marks.some((m) => m.type === 'highlight');

    runs.push(
      new TextRun({
        text: node.text,
        font,
        size,
        bold,
        italics: italic,
        underline: underline ? {} : undefined,
        highlight: highlight ? 'yellow' : undefined,
      })
    );
  } else if (node.content) {
    for (const child of node.content) {
      runs.push(...nodeToRuns(child, font, size));
    }
  }

  return runs;
}

function alignmentFromString(align: string): (typeof AlignmentType)[keyof typeof AlignmentType] {
  switch (align) {
    case 'center':
      return AlignmentType.CENTER;
    case 'right':
      return AlignmentType.RIGHT;
    case 'justify':
      return AlignmentType.JUSTIFIED;
    default:
      return AlignmentType.LEFT;
  }
}

function levelToHeading(level: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
  switch (level) {
    case 1:
      return HeadingLevel.HEADING_1;
    case 2:
      return HeadingLevel.HEADING_2;
    case 3:
      return HeadingLevel.HEADING_3;
    default:
      return HeadingLevel.HEADING_4;
  }
}
