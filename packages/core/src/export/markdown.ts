/**
 * Markdown export — converts Tiptap JSON to clean Markdown.
 * Includes a formatted reference list at the end.
 */

import type { Paper, RenderedCitation } from '../types.js';

export interface MarkdownExportOptions {
  includeReferences: boolean;
  references: RenderedCitation[];
  includeYamlFrontmatter: boolean;
}

/**
 * Convert a Paper to a Markdown string.
 */
export function exportToMarkdown(paper: Paper, options: MarkdownExportOptions): string {
  const parts: string[] = [];

  // YAML frontmatter
  if (options.includeYamlFrontmatter) {
    const s = paper.settings;
    parts.push('---');
    parts.push(`title: "${paper.title}"`);
    parts.push(`citation_style: ${s.style}`);
    if (s.authorName) parts.push(`author: "${s.authorName}"`);
    if (s.institutionName) parts.push(`institution: "${s.institutionName}"`);
    if (s.courseName) parts.push(`course: "${s.courseName}"`);
    if (s.dueDate) parts.push(`date: "${s.dueDate}"`);
    parts.push('---');
    parts.push('');
  }

  // Title
  parts.push(`# ${paper.title}`);
  parts.push('');

  // Body
  const body = tiptapToMarkdown(paper.content as Record<string, unknown>);
  parts.push(body);

  // References
  if (options.includeReferences && options.references.length > 0) {
    parts.push('');
    parts.push('---');
    parts.push('');

    const refHeading =
      paper.settings.style === 'mla9'
        ? 'Works Cited'
        : paper.settings.style === 'chicago'
          ? 'Bibliography'
          : 'References';

    parts.push(`## ${refHeading}`);
    parts.push('');

    for (const ref of options.references) {
      const text = stripHtml(ref.reference);
      // Hanging indent in Markdown isn't standard but we can use a definition list pattern
      parts.push(text);
      parts.push('');
    }
  }

  return parts.join('\n');
}

/**
 * Trigger a browser download of the Markdown content.
 */
export function downloadMarkdown(paper: Paper, options: MarkdownExportOptions): void {
  const md = exportToMarkdown(paper, options);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFilename(paper.title)}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ---- Tiptap → Markdown ----

function tiptapToMarkdown(doc: Record<string, unknown>): string {
  if (!Array.isArray(doc.content)) return '';
  return (doc.content as Record<string, unknown>[])
    .map((n) => nodeToMd(n, 0))
    .join('\n\n');
}

function nodeToMd(node: Record<string, unknown>, depth: number): string {
  switch (node.type) {
    case 'paragraph': {
      const text = inlineToMd(node);
      return text || '';
    }
    case 'heading': {
      const level = (node.attrs as Record<string, number> | undefined)?.level ?? 1;
      const hashes = '#'.repeat(level);
      return `${hashes} ${inlineToMd(node)}`;
    }
    case 'bulletList': {
      const items = (node.content as Record<string, unknown>[]) ?? [];
      return items.map((item) => `- ${listItemToMd(item)}`).join('\n');
    }
    case 'orderedList': {
      const items = (node.content as Record<string, unknown>[]) ?? [];
      return items.map((item, i) => `${i + 1}. ${listItemToMd(item)}`).join('\n');
    }
    case 'blockquote': {
      const inner = tiptapToMarkdown({
        type: 'doc',
        content: node.content ?? [],
      } as Record<string, unknown>);
      return inner
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
    }
    case 'horizontalRule':
      return '---';
    case 'hardBreak':
      return '  \n';
    default:
      return inlineToMd(node);
  }
}

function listItemToMd(item: Record<string, unknown>): string {
  const children = (item.content as Record<string, unknown>[]) ?? [];
  return children.map((n) => inlineToMd(n)).join(' ');
}

function inlineToMd(node: Record<string, unknown>): string {
  if (node.type === 'text') {
    const marks = (node.marks as Record<string, unknown>[]) ?? [];
    let text = (node.text as string) ?? '';
    if (marks.some((m) => m.type === 'bold')) text = `**${text}**`;
    if (marks.some((m) => m.type === 'italic')) text = `*${text}*`;
    if (marks.some((m) => m.type === 'underline')) text = `<u>${text}</u>`;
    return text;
  }
  const children = (node.content as Record<string, unknown>[]) ?? [];
  return children.map(inlineToMd).join('');
}

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

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9\-_\s]/gi, '').replace(/\s+/g, '-').slice(0, 80) || 'paper';
}
