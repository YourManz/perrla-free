/**
 * PDF export — uses the browser's built-in print API via a hidden iframe.
 * This avoids the html2canvas pixelation issues and produces text-selectable PDFs.
 *
 * For environments that need programmatic PDF blobs (e.g. server-side),
 * the jsPDF + html2canvas path is also available as exportToPdfBlob().
 */

import type { Paper, RenderedCitation } from '../types.js';

export interface PdfExportOptions {
  includeReferences: boolean;
  references: RenderedCitation[];
}

/**
 * Trigger browser print dialog with the paper formatted as a print-ready HTML page.
 * The browser renders it as a PDF when the user selects "Save as PDF".
 *
 * This is the preferred PDF path — it produces text-selectable, high-quality output.
 */
export function exportToPdfPrint(paper: Paper, options: PdfExportOptions): void {
  const html = buildPrintHtml(paper, options);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    throw new Error('Could not access iframe document for PDF export');
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  // Wait for fonts/styles to load then print
  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    // Remove after a delay to allow print dialog to open
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 2000);
  };
}

/**
 * Build a complete print-ready HTML document from the paper.
 */
function buildPrintHtml(paper: Paper, options: PdfExportOptions): string {
  const s = paper.settings;
  const fontFamily = s.fontFamily;
  const fontSize = `${s.fontSize}pt`;
  const lineHeight = s.lineHeight;
  const margin = `${s.marginTop}in ${s.marginRight}in ${s.marginBottom}in ${s.marginLeft}in`;

  const refHeading =
    s.style === 'mla9' ? 'Works Cited' : s.style === 'chicago' ? 'Bibliography' : 'References';

  const refsHtml =
    options.includeReferences && options.references.length > 0
      ? `
      <div class="page-break"></div>
      <h1 class="ref-heading">${refHeading}</h1>
      <div class="references">
        ${options.references.map((r) => `<p class="ref-entry">${r.reference}</p>`).join('\n')}
      </div>
    `
      : '';

  const runningHead =
    s.style === 'apa7'
      ? (s.runningHead ?? s.title.toUpperCase().slice(0, 50))
      : s.title.slice(0, 50);

  // Extract body HTML from Tiptap JSON
  const bodyHtml = tiptapToHtml(paper.content as Record<string, unknown>);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(paper.title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman:ital,wght@0,400;0,700;1,400;1,700&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: ${fontFamily};
      font-size: ${fontSize};
      line-height: ${lineHeight};
      color: #000;
      background: #fff;
    }

    @page {
      size: 8.5in 11in;
      margin: ${margin};
      @top-right {
        content: "${escapeHtml(runningHead)}  " counter(page);
        font-family: ${fontFamily};
        font-size: ${fontSize};
      }
    }

    .page-break { page-break-after: always; }

    /* Cover page */
    .cover {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 85vh;
      text-align: center;
    }
    .cover h1 { font-size: ${fontSize}; font-weight: bold; margin-bottom: 1em; }
    .cover p { font-size: ${fontSize}; margin-bottom: 0.2em; }

    /* Body */
    .body { counter-reset: page 2; }

    p {
      text-indent: 0.5in;
      margin-bottom: 0;
      text-align: left;
    }

    h1, h2, h3 {
      text-indent: 0;
      font-size: ${fontSize};
      font-weight: bold;
      text-align: center;
      margin-top: 1em;
      margin-bottom: 0;
    }

    h2 { text-align: left; font-style: italic; }
    h3 { text-align: left; font-style: italic; font-weight: normal; }

    /* References */
    .ref-heading {
      text-align: center;
      font-weight: bold;
      margin-bottom: 1em;
    }

    .ref-entry {
      text-indent: -0.5in;
      padding-left: 0.5in;
      margin-bottom: 0;
    }

    blockquote {
      margin-left: 0.5in;
      margin-right: 0;
      text-indent: 0;
    }

    /* Print specifics */
    @media print {
      body { -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="cover">
    <h1>${escapeHtml(paper.title)}</h1>
    ${s.authorName ? `<p>${escapeHtml(s.authorName)}</p>` : ''}
    ${s.institutionName ? `<p>${escapeHtml(s.institutionName)}</p>` : ''}
    ${s.courseName ? `<p>${escapeHtml(s.courseName)}</p>` : ''}
    ${s.instructorName ? `<p>${escapeHtml(s.instructorName)}</p>` : ''}
    ${s.dueDate ? `<p>${escapeHtml(s.dueDate)}</p>` : ''}
  </div>

  <div class="body">
    ${bodyHtml}
    ${refsHtml}
  </div>
</body>
</html>`;
}

/** Convert Tiptap JSON to HTML string */
function tiptapToHtml(doc: Record<string, unknown>): string {
  if (!doc || !Array.isArray(doc.content)) return '';
  return (doc.content as Record<string, unknown>[]).map(nodeToHtml).join('\n');
}

function nodeToHtml(node: Record<string, unknown>): string {
  switch (node.type) {
    case 'paragraph': {
      const inner = childrenToHtml(node);
      const align = (node.attrs as Record<string, string> | undefined)?.textAlign ?? 'left';
      return `<p style="text-align:${align}">${inner || '&nbsp;'}</p>`;
    }
    case 'heading': {
      const level = (node.attrs as Record<string, number> | undefined)?.level ?? 1;
      const inner = childrenToHtml(node);
      return `<h${level}>${inner}</h${level}>`;
    }
    case 'bulletList':
    case 'orderedList': {
      const tag = node.type === 'bulletList' ? 'ul' : 'ol';
      const items = ((node.content as Record<string, unknown>[]) ?? [])
        .map((item) => `<li>${childrenToHtml(item)}</li>`)
        .join('');
      return `<${tag}>${items}</${tag}>`;
    }
    case 'listItem':
      return childrenToHtml(node);
    case 'blockquote':
      return `<blockquote>${childrenToHtml(node)}</blockquote>`;
    case 'hardBreak':
      return '<br>';
    case 'horizontalRule':
      return '<hr>';
    case 'text': {
      const marks = (node.marks as Record<string, unknown>[]) ?? [];
      let text = escapeHtml((node.text as string) ?? '');
      if (marks.some((m) => m.type === 'bold')) text = `<strong>${text}</strong>`;
      if (marks.some((m) => m.type === 'italic')) text = `<em>${text}</em>`;
      if (marks.some((m) => m.type === 'underline')) text = `<u>${text}</u>`;
      if (marks.some((m) => m.type === 'highlight')) text = `<mark>${text}</mark>`;
      return text;
    }
    default:
      return childrenToHtml(node);
  }
}

function childrenToHtml(node: Record<string, unknown>): string {
  const children = node.content as Record<string, unknown>[] | undefined;
  return (children ?? []).map(nodeToHtml).join('');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
