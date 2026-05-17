/**
 * Svelte stores — papers, sources, active paper, UI state.
 * All persistent state flows through storage.ts.
 */

import { writable, derived, get } from 'svelte/store';
import { v4 as uuid } from 'uuid';
import type {
  Paper,
  PaperListItem,
  Source,
  CitationStyle,
  PaperSettings,
  PaperType,
} from '@perrla-free/core';
import { DEFAULT_PAPER_SETTINGS, fieldsToCsl } from '@perrla-free/core';
import {
  savePaper,
  loadPaper,
  listPapers,
  deletePaper,
  saveToLibrary,
  getLibrarySources,
  removeFromLibrary as removeFromLibraryStorage,
  importSourceFromLibrary,
} from './storage.js';

// ---- State ----

/** All papers (list items only — no full content) */
export const paperList = writable<PaperListItem[]>([]);

/** Currently active paper (full document) */
export const activePaper = writable<Paper | null>(null);

/** ID of the active paper */
export const activePaperId = writable<string | null>(null);

/** Whether we're loading a paper */
export const isLoading = writable<boolean>(false);

/** UI state: which panel is open */
export type ActivePanel = 'papers' | 'citation-builder' | 'library' | 'settings';
export const activePanel = writable<ActivePanel>('papers');

/** ID of the source being edited (null = creating new) */
export const editingSourceId = writable<string | null>(null);

/** Whether the reference panel is visible */
export const refPanelVisible = writable<boolean>(true);

/** Current notification message */
export const notification = writable<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

/** Global source library — persists across all papers */
export const libraryStore = writable<Source[]>([]);

// ---- Derived ----

/** Current citation style from active paper */
export const currentStyle = derived(
  activePaper,
  ($paper) => $paper?.settings.style ?? 'apa7'
);

/** Current paper type from active paper */
export const currentPaperType = derived(
  activePaper,
  ($paper) => ($paper?.type ?? 'research') as PaperType
);

/** Sources from active paper */
export const sources = derived(
  activePaper,
  ($paper) => $paper?.sources ?? []
);

// ---- Actions ----

/** Load the paper list from IndexedDB */
export async function initStore(): Promise<void> {
  const items = await listPapers();
  paperList.set(items);
  await refreshLibrary();
}

/** Create a new blank paper */
export async function createPaper(
  title: string,
  style: CitationStyle = 'apa7',
  paperType: PaperType = 'research'
): Promise<Paper> {
  const now = Date.now();
  const paper: Paper = {
    id: uuid(),
    title,
    settings: {
      ...DEFAULT_PAPER_SETTINGS,
      style,
      title,
    },
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [] },
      ],
    },
    sources: [],
    type: paperType,
    createdAt: now,
    updatedAt: now,
  };

  await savePaper(paper);
  await refreshList();
  return paper;
}

/** Update the active paper's paper type */
export async function setPaperType(type: PaperType): Promise<void> {
  const paper = get(activePaper);
  if (!paper) return;
  await saveActivePaper({ type });
}

/** Open a paper by ID — loads full document from IndexedDB */
export async function openPaper(id: string): Promise<void> {
  isLoading.set(true);
  try {
    const paper = await loadPaper(id);
    if (!paper) throw new Error(`Paper not found: ${id}`);
    activePaper.set(paper);
    activePaperId.set(id);
  } finally {
    isLoading.set(false);
  }
}

/** Save the currently active paper */
export async function saveActivePaper(updates: Partial<Paper> = {}): Promise<void> {
  const paper = get(activePaper);
  if (!paper) return;

  const updated: Paper = {
    ...paper,
    ...updates,
    id: paper.id,
    updatedAt: Date.now(),
  };

  await savePaper(updated);
  activePaper.set(updated);
  await refreshList();
}

/** Update the active paper's content (Tiptap JSON) */
export async function updateContent(content: object): Promise<void> {
  await saveActivePaper({ content });
}

/** Update a paper setting */
export async function updateSettings(settings: Partial<PaperSettings>): Promise<void> {
  const paper = get(activePaper);
  if (!paper) return;
  await saveActivePaper({
    settings: { ...paper.settings, ...settings },
    title: settings.title ?? paper.title,
  });
}

/** Update the citation style */
export async function updateStyle(style: CitationStyle): Promise<void> {
  await updateSettings({ style });
}

/** Close the current paper */
export function closePaper(): void {
  activePaper.set(null);
  activePaperId.set(null);
}

/** Delete a paper */
export async function removePaper(id: string): Promise<void> {
  await deletePaper(id);
  const current = get(activePaperId);
  if (current === id) {
    closePaper();
  }
  await refreshList();
}

/** Add or update a source on the active paper */
export async function upsertSource(
  fields: Record<string, string | undefined>,
  type: string,
  existingId?: string
): Promise<Source> {
  const paper = get(activePaper);
  if (!paper) throw new Error('No active paper');

  const id = existingId ?? uuid();
  const now = Date.now();
  const cslData = fieldsToCsl(id, type, fields);

  const source: Source = {
    id,
    type: type as Source['type'],
    fields: fields as import('@perrla-free/core').SourceFields,
    cslData,
    createdAt: existingId ? (paper.sources.find((s) => s.id === id)?.createdAt ?? now) : now,
    updatedAt: now,
  };

  const sources = existingId
    ? paper.sources.map((s) => (s.id === id ? source : s))
    : [...paper.sources, source];

  await saveActivePaper({ sources });
  return source;
}

/** Remove a source from the active paper */
export async function removeSource(sourceId: string): Promise<void> {
  const paper = get(activePaper);
  if (!paper) return;
  await saveActivePaper({
    sources: paper.sources.filter((s) => s.id !== sourceId),
  });
}

// ---- Library actions ----

/** Refresh the library store from IndexedDB */
export async function refreshLibrary(): Promise<void> {
  libraryStore.set(await getLibrarySources());
}

/** Save a source to the global library and refresh */
export async function addToLibrary(source: Source): Promise<void> {
  await saveToLibrary(source);
  await refreshLibrary();
  notify('Source saved to library', 'success');
}

/** Remove a source from the global library and refresh */
export async function removeLibrarySource(sourceId: string): Promise<void> {
  await removeFromLibraryStorage(sourceId);
  await refreshLibrary();
}

/** Import a library source into the currently active paper */
export async function importLibrarySource(sourceId: string, paperId: string): Promise<Source> {
  const source = await importSourceFromLibrary(sourceId, paperId);
  // Reload the active paper so sources are in sync
  const paper = get(activePaper);
  if (paper && paper.id === paperId) {
    await openPaper(paperId);
  }
  await refreshList();
  notify('Source added to paper', 'success');
  return source;
}

/** Show a brief notification */
export function notify(
  message: string,
  type: 'success' | 'error' | 'info' = 'info',
  durationMs = 3000
): void {
  notification.set({ message, type });
  setTimeout(() => notification.set(null), durationMs);
}

// ---- Internals ----

async function refreshList(): Promise<void> {
  const items = await listPapers();
  paperList.set(items);
}
