import "./styles.css";

import type { CitationStyle, Paper, Source } from "@perrla-free/core/types";
import {
  loadSources as engineLoadSources,
  formatInText,
  getFormattedReferences,
} from "./citation-service.js";
import {
  getPapers,
  getActivePaperId,
  setActivePaperId,
  getStyle,
  saveStyle,
  getTab,
  saveTab,
  importPaperFromFile,
  removePaper,
  type TabName,
} from "./storage.js";
import {
  insertTextAtCursor,
  insertReferencesPage,
  applyDocumentFormatting,
  insertApaTitlePage,
  insertApaRunningHead,
  getRefHeading,
  type TitlePageFields,
} from "./word-api.js";
import { lookupDOI, lookupISBN, lookupURL } from "./lookup.js";

// =========================================================
// Status bar
// =========================================================

let statusTimeout: ReturnType<typeof setTimeout> | null = null;

function showStatus(message: string, type: "success" | "error" | "info" = "info"): void {
  const bar = document.getElementById("status-bar")!;
  bar.textContent = message;
  bar.className = `status-bar status-${type}`;
  bar.classList.remove("hidden");
  if (statusTimeout) clearTimeout(statusTimeout);
  statusTimeout = setTimeout(() => {
    bar.classList.add("hidden");
  }, 4000);
}

// =========================================================
// Tab management
// =========================================================

function showTab(name: TabName): void {
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.add("hidden"));
  document.querySelectorAll(".tab").forEach((t) => {
    t.classList.remove("active");
    (t as HTMLElement).setAttribute("aria-selected", "false");
  });

  const panel = document.getElementById(`tab-${name}`);
  const tab = document.querySelector<HTMLElement>(`[data-tab="${name}"]`);
  if (panel) panel.classList.remove("hidden");
  if (tab) {
    tab.classList.add("active");
    tab.setAttribute("aria-selected", "true");
  }

  saveTab(name);
}

// =========================================================
// Papers tab
// =========================================================

function renderPaperList(): void {
  const papers = getPapers();
  const list = document.getElementById("paper-list")!;
  const empty = document.getElementById("paper-empty")!;
  const activeId = getActivePaperId();

  list.innerHTML = "";

  if (papers.length === 0) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  for (const paper of papers) {
    const isActive = paper.id === activeId;
    const row = document.createElement("div");
    row.className = `item-row${isActive ? " item-row--active" : ""}`;
    row.innerHTML = `
      <div class="item-info">
        <span class="item-title">${escHtml(paper.title)}</span>
        <span class="item-meta">${paper.settings.style.toUpperCase()} · ${paper.sources.length} source${paper.sources.length !== 1 ? "s" : ""}</span>
      </div>
      <div class="item-actions">
        <button class="btn btn-sm btn-primary btn-activate" data-id="${paper.id}" type="button">
          ${isActive ? "Active" : "Activate"}
        </button>
        <button class="btn btn-sm btn-danger btn-remove" data-id="${paper.id}" type="button">✕</button>
      </div>
    `;

    row.querySelector<HTMLButtonElement>(".btn-activate")!.addEventListener("click", () => {
      activatePaper(paper);
    });
    row.querySelector<HTMLButtonElement>(".btn-remove")!.addEventListener("click", () => {
      if (!confirm(`Remove "${paper.title}"?`)) return;
      removePaper(paper.id);
      renderPaperList();
      if (isActive) {
        renderCitationsTab(null);
      }
      showStatus("Paper removed", "info");
    });

    list.appendChild(row);
  }
}

function activatePaper(paper: Paper): void {
  setActivePaperId(paper.id);
  const style = paper.settings.style as CitationStyle;
  saveStyle(style);

  const formatStyleEl = document.getElementById("format-style") as HTMLSelectElement;
  if (formatStyleEl) formatStyleEl.value = style;
  updateRunningHeadVisibility(style);

  engineLoadSources(paper.sources, style);
  renderPaperList();
  renderCitationsTab(paper);
  showTab("citations");
  showStatus(`"${paper.title}" is now active`, "success");
}

// =========================================================
// Citations tab
// =========================================================

function renderCitationsTab(paper: Paper | null): void {
  const banner = document.getElementById("active-paper-banner")!;
  const nameEl = document.getElementById("active-paper-name")!;
  const noPaper = document.getElementById("citations-no-paper")!;
  const sourceList = document.getElementById("source-list")!;
  const emptySources = document.getElementById("citations-empty")!;
  const quickCite = document.getElementById("quick-cite")!;
  const refsSection = document.getElementById("insert-refs-section")!;

  if (!paper) {
    banner.classList.add("hidden");
    noPaper.classList.remove("hidden");
    sourceList.innerHTML = "";
    emptySources.classList.add("hidden");
    quickCite.classList.add("hidden");
    refsSection.style.display = "none";
    return;
  }

  banner.classList.remove("hidden");
  nameEl.textContent = paper.title;
  noPaper.classList.add("hidden");
  quickCite.classList.remove("hidden");
  refsSection.style.display = "";

  renderSourceList(paper.sources);
}

function renderSourceList(sources: Source[]): void {
  const list = document.getElementById("source-list")!;
  const empty = document.getElementById("citations-empty")!;
  list.innerHTML = "";

  if (sources.length === 0) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  for (const source of sources) {
    const title = source.fields.title ?? "(No title)";
    const authorYear = [
      source.fields.authors?.split(";")[0]?.trim(),
      source.fields.year,
    ].filter(Boolean).join(", ");

    const row = document.createElement("div");
    row.className = "item-row";
    row.innerHTML = `
      <div class="item-info">
        <span class="item-title">${escHtml(title)}</span>
        <span class="item-meta">${escHtml(authorYear)}</span>
      </div>
      <button class="btn btn-sm btn-primary" data-source-id="${source.id}" type="button">Insert</button>
    `;

    row.querySelector<HTMLButtonElement>("button")!.addEventListener("click", async () => {
      try {
        const citation = formatInText(source.id);
        await insertTextAtCursor(citation);
        showStatus(`Inserted ${citation}`, "success");
      } catch (err) {
        showStatus(`Insert failed: ${err}`, "error");
      }
    });

    list.appendChild(row);
  }
}

// =========================================================
// Quick cite (DOI / ISBN / URL lookup)
// =========================================================

async function handleLookup(): Promise<void> {
  const input = (document.getElementById("quick-doi") as HTMLInputElement).value.trim();
  if (!input) {
    showStatus("Enter a DOI, ISBN, or URL", "error");
    return;
  }

  const btn = document.getElementById("btn-lookup") as HTMLButtonElement;
  btn.disabled = true;
  btn.textContent = "Looking up…";

  try {
    let fields;
    if (input.startsWith("http") || input.startsWith("www")) {
      fields = await lookupURL(input.startsWith("www") ? `https://${input}` : input);
    } else if (/^\d{3}-\d|^\d{9}X?$/i.test(input.replace(/-/g, ""))) {
      fields = await lookupISBN(input);
    } else {
      fields = await lookupDOI(input);
    }

    (document.getElementById("qc-authors") as HTMLInputElement).value = fields.authors ?? "";
    (document.getElementById("qc-title") as HTMLInputElement).value = fields.title ?? "";
    (document.getElementById("qc-year") as HTMLInputElement).value = fields.year ?? "";
    document.getElementById("quick-preview")!.classList.remove("hidden");
    showStatus("Metadata found — review and insert", "success");
  } catch (err) {
    showStatus(`Lookup failed: ${err}`, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Lookup";
  }
}

// =========================================================
// Format tab helpers
// =========================================================

function updateRunningHeadVisibility(style: CitationStyle): void {
  const section = document.getElementById("running-head-section")!;
  if (style === "apa7") {
    section.classList.remove("hidden");
  } else {
    section.classList.add("hidden");
  }
}

// =========================================================
// UI initialisation
// =========================================================

function initUI(): void {
  // Tab bar
  document.querySelectorAll<HTMLButtonElement>(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      showTab(tab.dataset.tab as TabName);
    });
  });

  // Papers tab: import button
  const fileInput = document.getElementById("file-input") as HTMLInputElement;
  document.getElementById("btn-import")!.addEventListener("click", () => {
    fileInput.click();
  });
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      const paper = await importPaperFromFile(file);
      renderPaperList();
      showStatus(`Imported "${paper.title}"`, "success");
    } catch (err) {
      showStatus(`Import failed: ${err}`, "error");
    } finally {
      fileInput.value = "";
    }
  });

  // Citations tab: quick-cite lookup
  document.getElementById("btn-lookup")!.addEventListener("click", handleLookup);
  document.getElementById("quick-doi")!.addEventListener("keydown", (e) => {
    if ((e as KeyboardEvent).key === "Enter") handleLookup();
  });

  // Citations tab: quick-cite insert
  document.getElementById("btn-qc-insert")!.addEventListener("click", async () => {
    const authors = (document.getElementById("qc-authors") as HTMLInputElement).value.trim();
    const title = (document.getElementById("qc-title") as HTMLInputElement).value.trim();
    const year = (document.getElementById("qc-year") as HTMLInputElement).value.trim();
    if (!authors && !title) {
      showStatus("Fill in at least authors or title", "error");
      return;
    }
    const lastName = authors.split(";")[0]?.split(",")[0]?.trim() ?? "Unknown";
    const citation = year ? `(${lastName}, ${year})` : `(${lastName})`;
    try {
      await insertTextAtCursor(citation);
      document.getElementById("quick-preview")!.classList.add("hidden");
      showStatus(`Inserted ${citation}`, "success");
    } catch (err) {
      showStatus(`Insert failed: ${err}`, "error");
    }
  });

  // Citations tab: insert references page
  document.getElementById("btn-insert-refs")!.addEventListener("click", async () => {
    try {
      const refs = getFormattedReferences();
      if (refs.length === 0) {
        showStatus("No references to insert", "error");
        return;
      }
      const style = getStyle();
      await insertReferencesPage(getRefHeading(style), refs);
      showStatus("References page inserted", "success");
    } catch (err) {
      showStatus(`Insert failed: ${err}`, "error");
    }
  });

  // Format tab: style selector
  const formatStyleEl = document.getElementById("format-style") as HTMLSelectElement;
  formatStyleEl.value = getStyle();
  updateRunningHeadVisibility(getStyle());
  formatStyleEl.addEventListener("change", () => {
    const style = formatStyleEl.value as CitationStyle;
    saveStyle(style);
    updateRunningHeadVisibility(style);
    // Reload sources with new style if a paper is active
    const activeId = getActivePaperId();
    if (activeId) {
      const paper = getPapers().find((p) => p.id === activeId);
      if (paper) engineLoadSources(paper.sources, style);
    }
  });

  // Format tab: apply formatting
  document.getElementById("btn-apply-format")!.addEventListener("click", async () => {
    const style = formatStyleEl.value as CitationStyle;
    try {
      await applyDocumentFormatting(style);
      showStatus("Document formatting applied", "success");
    } catch (err) {
      showStatus(`Formatting failed: ${err}`, "error");
    }
  });

  // Format tab: insert title page
  document.getElementById("btn-insert-title")!.addEventListener("click", async () => {
    const title = (document.getElementById("tp-title") as HTMLInputElement).value.trim();
    if (!title) {
      showStatus("Enter a paper title", "error");
      return;
    }
    const fields: TitlePageFields = {
      title,
      author: (document.getElementById("tp-author") as HTMLInputElement).value.trim(),
      course: (document.getElementById("tp-course") as HTMLInputElement).value.trim(),
      instructor: (document.getElementById("tp-instructor") as HTMLInputElement).value.trim(),
      institution: (document.getElementById("tp-institution") as HTMLInputElement).value.trim(),
      date: (document.getElementById("tp-date") as HTMLInputElement).value.trim(),
    };
    try {
      await insertApaTitlePage(fields);
      showStatus("Title page inserted", "success");
    } catch (err) {
      showStatus(`Insert failed: ${err}`, "error");
    }
  });

  // Format tab: running head
  document.getElementById("btn-running-head")!.addEventListener("click", async () => {
    const text = (document.getElementById("rh-text") as HTMLInputElement).value.trim();
    const isStudent = (document.getElementById("rh-student") as HTMLInputElement).checked;
    if (!text && !isStudent) {
      showStatus("Enter running head text", "error");
      return;
    }
    try {
      await insertApaRunningHead(text, isStudent);
      showStatus("Running head inserted", "success");
    } catch (err) {
      showStatus(`Insert failed: ${err}`, "error");
    }
  });

  // Restore active paper state
  const activeId = getActivePaperId();
  if (activeId) {
    const paper = getPapers().find((p) => p.id === activeId);
    if (paper) {
      engineLoadSources(paper.sources, paper.settings.style as CitationStyle);
      renderCitationsTab(paper);
      const formatStyleEl2 = document.getElementById("format-style") as HTMLSelectElement;
      formatStyleEl2.value = paper.settings.style;
      updateRunningHeadVisibility(paper.settings.style as CitationStyle);
    } else {
      renderCitationsTab(null);
    }
  } else {
    renderCitationsTab(null);
  }

  renderPaperList();

  // Restore last tab
  showTab(getTab());
}

// =========================================================
// Utility
// =========================================================

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// =========================================================
// Entry point
// =========================================================

Office.onReady((info) => {
  if (info.host !== Office.HostType.Word) {
    document.getElementById("app")!.innerHTML =
      '<p style="padding:16px;color:#c00">This add-in only works in Microsoft Word.</p>';
    return;
  }
  initUI();
});
