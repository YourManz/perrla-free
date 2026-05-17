/**
 * Citation engine — wraps citeproc-js to format in-text citations and reference lists.
 *
 * citeproc-js expects:
 *   - A "sys" object with retrieveLocale() and retrieveItem() methods
 *   - A CSL style XML string
 *   - A list of CSL-JSON items
 *
 * We load CSL style XML from the /styles/ directory (imported as raw strings via Vite's
 * ?raw import) and locale XML from the locale files bundled with citeproc-js.
 */

import Cite from 'citeproc';
import type { CSLData, CitationStyle, InTextCitation, RenderedCitation, Source } from './types.js';

// CSL style XML — these are imported as raw strings by the bundler.
// In SvelteKit/Vite, use: import apaStyle from './styles/apa.csl?raw'
// We export a loader function so the web app can pass them in at runtime.

export interface StyleSet {
  apa7: string;
  mla9: string;
  chicago: string;
  ieee: string;
  turabian: string;
}

export interface LocaleSet {
  'en-US': string;
  [key: string]: string;
}

export class CitationEngine {
  private style: CitationStyle;
  private styles: StyleSet;
  private locales: LocaleSet;
  private citeproc: InstanceType<typeof Cite.Engine> | null = null;
  private itemStore: Map<string, CSLData> = new Map();

  constructor(styles: StyleSet, locales: LocaleSet) {
    this.styles = styles;
    this.locales = locales;
    this.style = 'apa7';
  }

  /**
   * Load sources and initialize/reinitialize citeproc with the given style.
   */
  load(sources: Source[], style: CitationStyle): void {
    this.style = style;
    this.itemStore.clear();

    for (const source of sources) {
      const csl = { ...source.cslData, id: source.id };
      this.itemStore.set(source.id, csl);
    }

    const sys = {
      retrieveLocale: (lang: string): string => {
        return this.locales[lang] ?? this.locales['en-US'] ?? '';
      },
      retrieveItem: (id: string): CSLData => {
        const item = this.itemStore.get(id);
        if (!item) throw new Error(`Citation item not found: ${id}`);
        return item;
      },
    };

    const styleXml = this.styles[style];
    if (!styleXml) throw new Error(`Unknown citation style: ${style}`);

    this.citeproc = new Cite.Engine(sys, styleXml);
    this.citeproc.updateItems(Array.from(this.itemStore.keys()));
  }

  /**
   * Format a single in-text citation.
   * Returns the formatted string, e.g. "(Smith, 2020, p. 42)"
   */
  formatInText(citation: InTextCitation): string {
    if (!this.citeproc) throw new Error('Engine not loaded — call load() first');

    const citationItem: { id: string; [key: string]: unknown } = {
      id: citation.sourceId,
    };
    if (citation.locator) {
      citationItem['locator'] = citation.locator;
      citationItem['label'] = citation.locatorLabel ?? 'page';
    }
    if (citation.prefix) citationItem['prefix'] = citation.prefix;
    if (citation.suffix) citationItem['suffix'] = citation.suffix;
    if (citation.suppressAuthor) citationItem['suppress-author'] = true;

    const result = this.citeproc.processCitationCluster(
      {
        citationItems: [citationItem],
        properties: { noteIndex: 0 },
      },
      [],
      []
    );

    // result[1] is array of [index, string, id]
    if (result && result[1] && result[1][0]) {
      return result[1][0][1] as string;
    }
    return '';
  }

  /**
   * Render all reference list entries for the currently loaded sources.
   * Returns an array of { sourceId, reference } with HTML-formatted entries.
   */
  formatReferences(): RenderedCitation[] {
    if (!this.citeproc) throw new Error('Engine not loaded — call load() first');

    const bibliography = this.citeproc.makeBibliography();
    if (!bibliography || !bibliography[1]) return [];

    const [bibMeta, entries] = bibliography;
    const ids: string[] = (bibMeta as { entry_ids?: string[][] }).entry_ids?.map(
      (e: string[]) => e[0]
    ) ?? [];

    return entries.map((html: string, i: number) => ({
      sourceId: ids[i] ?? '',
      inText: '', // filled in by formatInText when needed
      reference: html,
    }));
  }

  /**
   * Render references for a specific set of source IDs only.
   * Useful for "only show cited sources" mode.
   */
  formatReferencesFor(sourceIds: string[]): RenderedCitation[] {
    if (!this.citeproc) throw new Error('Engine not loaded — call load() first');
    this.citeproc.updateItems(sourceIds);
    const refs = this.formatReferences();
    // Restore full item list
    this.citeproc.updateItems(Array.from(this.itemStore.keys()));
    return refs;
  }
}

/**
 * Convert SourceFields (form data) to CSL-JSON.
 * This is called when the user saves a source.
 */
export function fieldsToCsl(
  id: string,
  type: string,
  fields: Record<string, string | undefined>
): CSLData {
  const csl: CSLData = { id, type: mapSourceTypeToCsl(type) };

  if (fields.title) csl.title = fields.title;
  if (fields.doi) csl.DOI = fields.doi;
  if (fields.url) csl.URL = fields.url;
  if (fields.isbn) csl.ISBN = fields.isbn;
  if (fields.issn) csl.ISSN = fields.issn;
  if (fields.publisher) csl.publisher = fields.publisher;
  if (fields.publisherPlace) csl['publisher-place'] = fields.publisherPlace;
  if (fields.volume) csl.volume = fields.volume;
  if (fields.issue) csl.issue = fields.issue;
  if (fields.pages) csl.page = fields.pages;
  if (fields.edition) csl.edition = fields.edition;
  if (fields.journalTitle) csl['container-title'] = fields.journalTitle;
  if (fields.bookTitle) csl['container-title'] = fields.bookTitle;
  if (fields.note) csl.note = fields.note;
  if (fields.abstract) csl.abstract = fields.abstract;
  if (fields.thesisType) csl.genre = fields.thesisType;
  if (fields.institution) csl.school = fields.institution;
  if (fields.conferenceName) csl.event = fields.conferenceName;
  if (fields.conferencePlace) csl['event-place'] = fields.conferencePlace;

  // Authors
  if (fields.authors) {
    csl.author = parseNameList(fields.authors);
  }
  if (fields.editors) {
    csl.editor = parseNameList(fields.editors);
  }

  // Date
  const year = fields.year ? parseInt(fields.year, 10) : undefined;
  const month = fields.month ? parseInt(fields.month, 10) : undefined;
  const day = fields.day ? parseInt(fields.day, 10) : undefined;
  if (year) {
    const dateParts: [number, number?, number?] = [year];
    if (month) dateParts.push(month);
    if (day && month) dateParts.push(day);
    csl.issued = { 'date-parts': [dateParts] };
  }

  // Access date for websites
  if (fields.urlAccessDate) {
    csl.accessed = { raw: fields.urlAccessDate };
  }

  return csl;
}

/** Parse "Last, First; Last, First" into CSL name objects */
function parseNameList(raw: string): import('./types.js').CSLName[] {
  if (!raw.trim()) return [];
  return raw.split(';').map((nameStr) => {
    const trimmed = nameStr.trim();
    if (!trimmed) return { literal: '' };

    // Check if it's "Last, First" format
    const commaIdx = trimmed.indexOf(',');
    if (commaIdx > -1) {
      return {
        family: trimmed.slice(0, commaIdx).trim(),
        given: trimmed.slice(commaIdx + 1).trim(),
      };
    }
    // Single word or organization
    return { literal: trimmed };
  });
}

function mapSourceTypeToCsl(type: string): string {
  const map: Record<string, string> = {
    article: 'article-journal',
    book: 'book',
    website: 'webpage',
    journal: 'article-journal',
    thesis: 'thesis',
    conference: 'paper-conference',
    newspaper: 'article-newspaper',
    report: 'report',
    film: 'motion_picture',
    podcast: 'broadcast',
    social_media: 'post-weblog',
    other: 'document',
  };
  return map[type] ?? 'document';
}

/**
 * Extract all cited source IDs from a Tiptap document JSON.
 * Walks the node tree looking for citation marks/nodes.
 */
export function extractCitedIds(doc: object): string[] {
  const ids = new Set<string>();
  function walk(node: Record<string, unknown>) {
    if (node.type === 'citation' && node.attrs) {
      const attrs = node.attrs as Record<string, unknown>;
      if (typeof attrs.sourceId === 'string') ids.add(attrs.sourceId);
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content as Record<string, unknown>[]) {
        walk(child);
      }
    }
    if (Array.isArray(node.marks)) {
      for (const mark of node.marks as Record<string, unknown>[]) {
        if (mark.type === 'citation' && mark.attrs) {
          const attrs = mark.attrs as Record<string, unknown>;
          if (typeof attrs.sourceId === 'string') ids.add(attrs.sourceId);
        }
      }
    }
  }
  walk(doc as Record<string, unknown>);
  return Array.from(ids);
}
