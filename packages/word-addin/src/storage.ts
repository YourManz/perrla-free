import type { CitationStyle, Paper } from "@perrla-free/core/types";

const K = {
  papers: "pf_addin_v1_papers",
  activeId: "pf_addin_v1_active_id",
  style: "pf_addin_v1_style",
  tab: "pf_addin_v1_tab",
} as const;

export type TabName = "papers" | "citations" | "format";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getPapers(): Paper[] {
  return read<Paper[]>(K.papers, []);
}

export function savePapers(papers: Paper[]): void {
  write(K.papers, papers);
}

export function getActivePaperId(): string | null {
  return localStorage.getItem(K.activeId);
}

export function setActivePaperId(id: string): void {
  localStorage.setItem(K.activeId, id);
}

export function getStyle(): CitationStyle {
  return read<CitationStyle>(K.style, "apa7");
}

export function saveStyle(style: CitationStyle): void {
  write(K.style, style);
}

export function getTab(): TabName {
  return read<TabName>(K.tab, "papers");
}

export function saveTab(tab: TabName): void {
  write(K.tab, tab);
}

export async function importPaperFromFile(file: File): Promise<Paper> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("File is not valid JSON");
  }

  const p = parsed as Record<string, unknown>;
  if (!p.title || !Array.isArray(p.sources) || !p.settings) {
    throw new Error("Not a valid .perrla file");
  }

  const paper = {
    ...(parsed as Paper),
    id: crypto.randomUUID(),
    content: {},
    updatedAt: Date.now(),
  } as Paper;

  const papers = getPapers().filter((x) => x.title !== paper.title);
  papers.unshift(paper);
  savePapers(papers);

  return paper;
}

export function removePaper(id: string): void {
  const papers = getPapers().filter((p) => p.id !== id);
  savePapers(papers);
  if (getActivePaperId() === id) {
    localStorage.removeItem(K.activeId);
  }
}
