/**
 * Core data models for perrla-free
 */

export type CitationStyle = 'apa7' | 'mla9' | 'chicago' | 'ieee' | 'turabian';

export type PaperType = 'research' | 'discussion' | 'reference_list' | 'annotated_bibliography';

export type SourceType =
  | 'article'
  | 'book'
  | 'website'
  | 'journal'
  | 'thesis'
  | 'conference'
  | 'newspaper'
  | 'report'
  | 'film'
  | 'podcast'
  | 'social_media'
  | 'other';

/**
 * CSL-JSON representation of a source — this is what citeproc-js consumes.
 * We store both our own Source record and the CSL data so we can re-render
 * references any time the style changes without losing our internal structure.
 */
export interface CSLData {
  id: string;
  type: string;
  title?: string;
  author?: CSLName[];
  editor?: CSLName[];
  issued?: CSLDate;
  accessed?: CSLDate;
  URL?: string;
  DOI?: string;
  ISBN?: string;
  ISSN?: string;
  publisher?: string;
  'publisher-place'?: string;
  'container-title'?: string; // journal or book title for chapters
  volume?: string;
  issue?: string;
  page?: string;
  edition?: string;
  'collection-title'?: string;
  'number-of-pages'?: string;
  genre?: string; // thesis type
  school?: string;
  event?: string; // conference name
  'event-place'?: string;
  abstract?: string;
  keyword?: string;
  note?: string;
  [key: string]: unknown;
}

export interface CSLName {
  family?: string;
  given?: string;
  literal?: string; // for orgs: "World Health Organization"
  suffix?: string;
  'non-dropping-particle'?: string;
  'dropping-particle'?: string;
}

export interface CSLDate {
  'date-parts'?: [[number, number?, number?]]; // [[YYYY, MM?, DD?]]
  raw?: string;
  literal?: string;
}

/**
 * A source/reference that the user has added to a paper.
 */
export interface Source {
  id: string; // UUID
  type: SourceType;
  /** Human-readable fields for the form UI — these mirror what the user typed */
  fields: SourceFields;
  /** Full CSL-JSON for citeproc — derived from fields when the source is saved */
  cslData: CSLData;
  /** Optional research notes attached to this source */
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

/** Flat string fields used in the citation builder form */
export interface SourceFields {
  // Authors / editors — stored as "Last, First; Last, First" strings for easy editing
  authors?: string;
  editors?: string;
  title?: string;
  // Container
  journalTitle?: string;
  bookTitle?: string;
  edition?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  // Publication
  publisher?: string;
  publisherPlace?: string;
  year?: string;
  month?: string;
  day?: string;
  // Identifiers
  doi?: string;
  url?: string;
  urlAccessDate?: string;
  isbn?: string;
  issn?: string;
  // Academic
  thesisType?: string;
  institution?: string;
  // Conference
  conferenceName?: string;
  conferencePlace?: string;
  // Misc
  abstract?: string;
  note?: string;
  [key: string]: string | undefined;
}

/**
 * An in-text citation marker embedded in the document.
 * Stored as node attributes in the Tiptap JSON.
 */
export interface InTextCitation {
  sourceId: string;
  locator?: string; // page number, chapter, etc.
  locatorLabel?: string; // "page", "chapter", etc.
  prefix?: string; // "see also"
  suffix?: string; // text after the citation
  suppressAuthor?: boolean; // for (2023) style when author already in sentence
}

/**
 * Paper formatting settings.
 */
export interface PaperSettings {
  style: CitationStyle;
  title: string;
  authorName?: string;
  institutionName?: string;
  courseName?: string;
  instructorName?: string;
  dueDate?: string;
  runningHead?: string; // APA only
  abstract?: string;   // optional abstract text (APA, Chicago)
  keywords?: string;   // optional keywords line after abstract (APA)
  // Typography
  fontFamily: string;
  fontSize: number; // pt
  lineHeight: number; // multiplier, e.g. 2.0
  marginTop: number; // inches
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
}

export const DEFAULT_PAPER_SETTINGS: PaperSettings = {
  style: 'apa7',
  title: 'Untitled Paper',
  fontFamily: 'Times New Roman, serif',
  fontSize: 12,
  lineHeight: 2.0,
  marginTop: 1,
  marginBottom: 1,
  marginLeft: 1,
  marginRight: 1,
};

/**
 * A complete paper document.
 */
export interface Paper {
  id: string; // UUID
  title: string;
  settings: PaperSettings;
  /** Tiptap document JSON */
  content: object;
  /** All sources attached to this paper */
  sources: Source[];
  /** Paper format type — defaults to 'research' */
  type?: PaperType;
  createdAt: number;
  updatedAt: number;
}

/** Minimal paper record for listing — no full content or sources */
export interface PaperListItem {
  id: string;
  title: string;
  style: CitationStyle;
  sourceCount: number;
  updatedAt: number;
  createdAt: number;
}

/** Result of rendering a citation through citeproc */
export interface RenderedCitation {
  sourceId: string;
  inText: string; // "(Smith, 2020)" or "[1]" or "Smith (2020)"
  reference: string; // Full formatted reference entry (HTML)
}

/** Export options */
export interface ExportOptions {
  format: 'docx' | 'pdf' | 'markdown';
  includeTitle: boolean;
  includeCoverPage: boolean; // APA/MLA style cover page
  includeAbstract: boolean;
  includeReferences: boolean;
}
