/**
 * IndexedDB persistence via localforage.
 * All paper data is stored locally — no server, no auth.
 */

import localforage from 'localforage';
import type { Paper, PaperListItem } from '@perrla-free/core';

// Two stores: one for full paper content, one for lightweight list items
const paperStore = localforage.createInstance({
  name: 'perrla-free',
  storeName: 'papers',
  description: 'Full paper documents',
});

const listStore = localforage.createInstance({
  name: 'perrla-free',
  storeName: 'paper-list',
  description: 'Paper list items (no full content)',
});

/** Persist a complete paper. Also updates the list store. */
export async function savePaper(paper: Paper): Promise<void> {
  await paperStore.setItem(paper.id, paper);
  await listStore.setItem(paper.id, paperToListItem(paper));
}

/** Load a full paper by ID. Returns null if not found. */
export async function loadPaper(id: string): Promise<Paper | null> {
  return paperStore.getItem<Paper>(id);
}

/** List all papers (lightweight, no content). Sorted by updatedAt desc. */
export async function listPapers(): Promise<PaperListItem[]> {
  const items: PaperListItem[] = [];
  await listStore.iterate<PaperListItem, void>((value) => {
    items.push(value);
  });
  return items.sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Delete a paper by ID. */
export async function deletePaper(id: string): Promise<void> {
  await paperStore.removeItem(id);
  await listStore.removeItem(id);
}

/** Export a paper as a .perrla JSON file download. */
export function exportToFile(paper: Paper): void {
  const json = JSON.stringify(paper, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFilename(paper.title)}.perrla`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Import a paper from a .perrla JSON file. */
export async function importFromFile(file: File): Promise<Paper> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text) as Paper;

        // Minimal validation
        if (!data.id || !data.title || !data.content) {
          throw new Error('Invalid .perrla file — missing required fields');
        }

        // Assign a new ID to avoid collisions
        const imported: Paper = {
          ...data,
          id: crypto.randomUUID(),
          title: data.title + ' (imported)',
          updatedAt: Date.now(),
        };

        await savePaper(imported);
        resolve(imported);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/** Clear all data — useful for debugging */
export async function clearAll(): Promise<void> {
  await paperStore.clear();
  await listStore.clear();
}

// ---- Helpers ----

function paperToListItem(paper: Paper): PaperListItem {
  return {
    id: paper.id,
    title: paper.title,
    style: paper.settings.style,
    sourceCount: paper.sources.length,
    updatedAt: paper.updatedAt,
    createdAt: paper.createdAt,
  };
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9\-_\s]/gi, '').replace(/\s+/g, '-').slice(0, 80) || 'paper';
}
