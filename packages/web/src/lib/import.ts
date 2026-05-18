/**
 * RIS and BibTeX import parsers.
 * Both return Source[] — callers decide whether to add to a paper or the library.
 */

import type { Source, SourceType } from '@perrla-free/core';

function makeId(): string {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// RIS
// ---------------------------------------------------------------------------

const RIS_TYPE_MAP: Record<string, SourceType> = {
  JOUR: 'article',
  JFULL: 'article',
  ABST: 'article',
  BOOK: 'book',
  CHAP: 'book',
  THES: 'thesis',
  CONF: 'conference',
  CPAPER: 'conference',
  NEWS: 'newspaper',
  RPRT: 'report',
  ELEC: 'website',
  WEB: 'website',
  MPCT: 'film',
  SOUND: 'podcast',
  BLOG: 'website',
  SOCIAL: 'social_media',
};

export function parseRIS(text: string): Source[] {
  const sources: Source[] = [];
  const records = text.split(/\n(?=TY\s*-)/g).filter((r) => r.trim());

  for (const record of records) {
    const tags: Record<string, string[]> = {};
    for (const line of record.split('\n')) {
      const m = line.match(/^([A-Z][A-Z0-9])\s+-\s*(.*)/);
      if (!m) continue;
      const [, tag, value] = m;
      if (!tags[tag]) tags[tag] = [];
      tags[tag].push(value.trim());
    }

    if (!tags['TY']) continue;
    const risType = tags['TY'][0].trim();
    const type: SourceType = RIS_TYPE_MAP[risType] ?? 'other';

    // Authors: AU and A1 tags are "Last, First" or "Last, First, Suffix"
    const authorTags = [...(tags['AU'] ?? []), ...(tags['A1'] ?? [])];
    const authors = authorTags.join('; ');

    const year = (tags['PY'] ?? tags['Y1'] ?? [])[0]?.match(/\d{4}/)?.[0] ?? '';

    const source: Source = {
      id: makeId(),
      type,
      fields: {
        title: (tags['T1'] ?? tags['TI'] ?? [])[0] ?? '',
        authors,
        year,
        journalTitle: (tags['JO'] ?? tags['JF'] ?? tags['J1'] ?? [])[0] ?? '',
        bookTitle: (tags['BT'] ?? tags['T3'] ?? [])[0] ?? '',
        volume: (tags['VL'] ?? [])[0] ?? '',
        issue: (tags['IS'] ?? [])[0] ?? '',
        pages: (tags['SP'] ?? [])[0]
          ? `${tags['SP'][0]}${tags['EP']?.[0] ? `–${tags['EP'][0]}` : ''}`
          : '',
        publisher: (tags['PB'] ?? [])[0] ?? '',
        publisherPlace: (tags['CY'] ?? [])[0] ?? '',
        doi: (tags['DO'] ?? tags['M3'] ?? [])[0] ?? '',
        url: (tags['UR'] ?? [])[0] ?? '',
        abstract: (tags['AB'] ?? tags['N2'] ?? [])[0] ?? '',
        note: (tags['N1'] ?? [])[0] ?? '',
      },
      cslData: { id: '', type: '' },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    sources.push(source);
  }

  return sources;
}

// ---------------------------------------------------------------------------
// BibTeX
// ---------------------------------------------------------------------------

const BIBTEX_TYPE_MAP: Record<string, SourceType> = {
  article: 'article',
  book: 'book',
  inbook: 'book',
  incollection: 'book',
  inproceedings: 'conference',
  conference: 'conference',
  phdthesis: 'thesis',
  mastersthesis: 'thesis',
  techreport: 'report',
  misc: 'other',
  unpublished: 'other',
  online: 'website',
  electronic: 'website',
};

function extractBibTeXEntries(text: string): Array<{ type: string; fields: Record<string, string> }> {
  const entries: Array<{ type: string; fields: Record<string, string> }> = [];
  // Strip comments
  text = text.replace(/%[^\n]*/g, '');

  const entryRe = /@(\w+)\s*\{([^@]*)\}/gs;
  let m: RegExpExecArray | null;

  while ((m = entryRe.exec(text)) !== null) {
    const entryType = m[1].toLowerCase();
    if (entryType === 'string' || entryType === 'preamble' || entryType === 'comment') continue;

    const body = m[2];
    const fields: Record<string, string> = {};

    // Extract field = {value} or field = "value" or field = number
    const fieldRe = /(\w+)\s*=\s*(?:\{((?:[^{}]|\{[^{}]*\})*)\}|"([^"]*)"|(\d+))/g;
    let fm: RegExpExecArray | null;
    while ((fm = fieldRe.exec(body)) !== null) {
      const key = fm[1].toLowerCase();
      const value = (fm[2] ?? fm[3] ?? fm[4] ?? '').replace(/\s+/g, ' ').trim();
      // Strip LaTeX braces from value
      fields[key] = value.replace(/[{}]/g, '');
    }

    entries.push({ type: entryType, fields });
  }

  return entries;
}

function parseBibTeXAuthors(raw: string): string {
  return raw
    .split(/\s+and\s+/i)
    .map((name) => {
      name = name.trim();
      // "Last, First" already — return as-is
      if (name.includes(',')) return name;
      // "First Last" — reverse to "Last, First"
      const parts = name.split(/\s+/);
      if (parts.length < 2) return name;
      const last = parts.pop()!;
      return `${last}, ${parts.join(' ')}`;
    })
    .join('; ');
}

export function parseBibTeX(text: string): Source[] {
  const entries = extractBibTeXEntries(text);
  const sources: Source[] = [];

  for (const { type: entryType, fields } of entries) {
    const type: SourceType = BIBTEX_TYPE_MAP[entryType] ?? 'other';

    const yearStr = fields['year'] ?? '';
    const pagesRaw = fields['pages'] ?? '';
    const pages = pagesRaw.replace(/--|-/g, '–');

    const source: Source = {
      id: makeId(),
      type,
      fields: {
        title: fields['title'] ?? '',
        authors: fields['author'] ? parseBibTeXAuthors(fields['author']) : '',
        editors: fields['editor'] ? parseBibTeXAuthors(fields['editor']) : '',
        year: yearStr,
        journalTitle: fields['journal'] ?? '',
        bookTitle: fields['booktitle'] ?? '',
        volume: fields['volume'] ?? '',
        issue: fields['number'] ?? '',
        pages,
        publisher: fields['publisher'] ?? '',
        publisherPlace: fields['address'] ?? '',
        doi: fields['doi'] ?? '',
        url: fields['url'] ?? '',
        abstract: fields['abstract'] ?? '',
        note: fields['note'] ?? '',
        edition: fields['edition'] ?? '',
        isbn: fields['isbn'] ?? '',
        issn: fields['issn'] ?? '',
      },
      cslData: { id: '', type: '' },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    sources.push(source);
  }

  return sources;
}
