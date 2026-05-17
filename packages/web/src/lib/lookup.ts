/**
 * API lookup helpers for autofilling citation fields from DOI, ISBN, or URL.
 */

import type { SourceFields } from '@perrla-free/core';

// ---------------------------------------------------------------------------
// DOI → CrossRef
// ---------------------------------------------------------------------------

interface CrossRefWork {
  title?: string[];
  author?: Array<{ family?: string; given?: string }>;
  'published-print'?: { 'date-parts'?: [[number, ...number[]]] };
  'published-online'?: { 'date-parts'?: [[number, ...number[]]] };
  'container-title'?: string[];
  volume?: string;
  issue?: string;
  page?: string;
  DOI?: string;
  publisher?: string;
}

interface CrossRefResponse {
  status: string;
  message: CrossRefWork;
}

/**
 * Fetch metadata by DOI from CrossRef API (no key needed, free).
 * URL: https://api.crossref.org/works/{doi}
 */
export async function lookupDOI(doi: string): Promise<Partial<SourceFields>> {
  // Strip common DOI URL prefixes
  const cleanDoi = doi
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .trim();

  const url = `https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': 'perrla-free/1.0 (mailto:support@perrla.com)' },
    });
  } catch {
    throw new Error('Network error — could not reach CrossRef');
  }

  if (res.status === 404) throw new Error('DOI not found');
  if (!res.ok) throw new Error(`CrossRef error: ${res.status}`);

  let data: CrossRefResponse;
  try {
    data = await res.json() as CrossRefResponse;
  } catch {
    throw new Error('Invalid response from CrossRef');
  }

  if (data.status !== 'ok' || !data.message) {
    throw new Error('DOI not found');
  }

  const w = data.message;
  const fields: Partial<SourceFields> = {};

  if (w.title?.length) fields.title = w.title[0];

  if (w.author?.length) {
    const a = w.author[0];
    if (a.family || a.given) {
      fields.authors = [a.family, a.given].filter(Boolean).join(', ');
    }
  }

  // Year from published-print, fallback to published-online
  const dateParts =
    w['published-print']?.['date-parts']?.[0] ??
    w['published-online']?.['date-parts']?.[0];
  if (dateParts?.[0]) {
    fields.year = String(dateParts[0]);
  }

  if (w['container-title']?.length) fields.journalTitle = w['container-title'][0];
  if (w.volume) fields.volume = w.volume;
  if (w.issue) fields.issue = w.issue;
  if (w.page) fields.pages = w.page;
  if (w.DOI) fields.doi = w.DOI;
  if (w.publisher) fields.publisher = w.publisher;

  return fields;
}

// ---------------------------------------------------------------------------
// ISBN → Open Library
// ---------------------------------------------------------------------------

interface OpenLibraryBook {
  title?: string;
  authors?: Array<{ name?: string }>;
  publish_date?: string;
  publishers?: Array<{ name?: string }>;
  number_of_pages?: number;
}

/**
 * Fetch metadata by ISBN from Open Library API (free, no key).
 * URL: https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data
 */
export async function lookupISBN(isbn: string): Promise<Partial<SourceFields>> {
  const cleanIsbn = isbn.replace(/[-\s]/g, '');
  const bibKey = `ISBN:${cleanIsbn}`;
  const url = `https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(bibKey)}&format=json&jscmd=data`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new Error('Network error — could not reach Open Library');
  }

  if (!res.ok) throw new Error(`Open Library error: ${res.status}`);

  let data: Record<string, OpenLibraryBook>;
  try {
    data = await res.json() as Record<string, OpenLibraryBook>;
  } catch {
    throw new Error('Invalid response from Open Library');
  }

  const book = data[bibKey];
  if (!book) throw new Error('ISBN not found');

  const fields: Partial<SourceFields> = {};

  if (book.title) fields.title = book.title;

  if (book.authors?.length) {
    const a = book.authors[0];
    if (a.name) fields.authors = a.name;
  }

  if (book.publish_date) {
    // Extract a 4-digit year from strings like "2020", "January 2020", "2020-01-15"
    const yearMatch = book.publish_date.match(/\b(1[5-9]\d{2}|2\d{3})\b/);
    if (yearMatch) fields.year = yearMatch[1];
  }

  if (book.publishers?.length) {
    const p = book.publishers[0];
    if (p.name) fields.publisher = p.name;
  }

  if (book.number_of_pages != null) {
    fields.pages = String(book.number_of_pages);
  }

  return fields;
}

// ---------------------------------------------------------------------------
// URL → page metadata via CORS proxy
// ---------------------------------------------------------------------------

/**
 * Fetch metadata from a URL using page title/meta tags via a CORS proxy.
 * Proxy: https://corsproxy.io/?{encodeURIComponent(url)}
 */
export async function lookupURL(url: string): Promise<Partial<SourceFields>> {
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;

  let res: Response;
  try {
    res = await fetch(proxyUrl);
  } catch {
    throw new Error('Network error — could not fetch the page');
  }

  if (!res.ok) throw new Error(`Could not fetch page: ${res.status}`);

  let html: string;
  try {
    html = await res.text();
  } catch {
    throw new Error('Could not parse page metadata');
  }

  const fields: Partial<SourceFields> = {};

  // Helper: extract a meta tag content
  function getMeta(nameAttr: string, property = false): string | undefined {
    const attr = property ? 'property' : 'name';
    const re = new RegExp(
      `<meta[^>]+${attr}=["']${nameAttr}["'][^>]+content=["']([^"']+)["']`,
      'i'
    );
    const alt = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${nameAttr}["']`,
      'i'
    );
    return (re.exec(html) ?? alt.exec(html))?.[1];
  }

  // Title: prefer og:title, then <title>
  const ogTitle = getMeta('og:title', true);
  const titleTagMatch = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
  fields.title = ogTitle ?? titleTagMatch?.[1]?.trim();

  // Author
  const author =
    getMeta('author') ??
    getMeta('article:author', true) ??
    getMeta('og:author', true);
  if (author) fields.authors = author;

  // URL
  fields.url = url;

  // Year — try various date meta tags, fall back to current year
  const dateStr =
    getMeta('article:published_time', true) ??
    getMeta('article:modified_time', true) ??
    getMeta('og:updated_time', true) ??
    getMeta('date') ??
    getMeta('DC.date') ??
    getMeta('pubdate');

  if (dateStr) {
    const yearMatch = dateStr.match(/\b(1[5-9]\d{2}|2\d{3})\b/);
    if (yearMatch) {
      fields.year = yearMatch[1];
    }
  }

  if (!fields.year) {
    fields.year = String(new Date().getFullYear());
  }

  if (!fields.title) throw new Error('Could not parse page metadata');

  return fields;
}
