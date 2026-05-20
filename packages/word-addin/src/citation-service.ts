import { CitationEngine } from "@perrla-free/core/engine";
import type { Source, CitationStyle } from "@perrla-free/core/types";
import { STYLES, LOCALES } from "./csl-bundle.js";

let engine: CitationEngine | null = null;

function getEngine(): CitationEngine {
  if (!engine) {
    engine = new CitationEngine(STYLES, LOCALES);
  }
  return engine;
}

export function loadSources(sources: Source[], style: CitationStyle): void {
  getEngine().load(sources, style);
}

export function formatInText(sourceId: string): string {
  try {
    return getEngine().formatInText({ sourceId });
  } catch {
    return `[${sourceId}]`;
  }
}

export function getFormattedReferences(): string[] {
  try {
    return getEngine()
      .formatReferences()
      .map((r) => stripHtml(r.reference));
  } catch {
    return [];
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}
