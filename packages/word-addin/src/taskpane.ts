import "./styles.css";

// =========================================================
// Types
// =========================================================

type CitationStyle = "apa" | "mla" | "chicago" | "ieee";
type SourceType = "book" | "journal" | "website" | "other";

interface Source {
  id: string;
  type: SourceType;
  authorLast: string;
  authorFirst: string;
  year: string;
  title: string;
  publisher: string;
  url: string;
  doi: string;
  pageNumber: string;
  /** IEEE index assigned when the source was added */
  ieeeIndex?: number;
}

// =========================================================
// Storage helpers
// =========================================================

const STORAGE_KEY_SOURCES = "perrla_free_sources";
const STORAGE_KEY_STYLE = "perrla_free_style";
const STORAGE_KEY_IEEE_COUNTER = "perrla_free_ieee_counter";

function loadSources(): Source[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SOURCES);
    return raw ? (JSON.parse(raw) as Source[]) : [];
  } catch {
    return [];
  }
}

function saveSources(sources: Source[]): void {
  localStorage.setItem(STORAGE_KEY_SOURCES, JSON.stringify(sources));
}

function loadStyle(): CitationStyle {
  return (localStorage.getItem(STORAGE_KEY_STYLE) as CitationStyle) ?? "apa";
}

function saveStyle(style: CitationStyle): void {
  localStorage.setItem(STORAGE_KEY_STYLE, style);
}

function nextIeeeIndex(): number {
  const current = parseInt(
    localStorage.getItem(STORAGE_KEY_IEEE_COUNTER) ?? "0",
    10
  );
  const next = current + 1;
  localStorage.setItem(STORAGE_KEY_IEEE_COUNTER, String(next));
  return next;
}

// =========================================================
// Citation formatters — pure functions
// =========================================================

/** Capitalise first letter of each word in a title (for MLA/Chicago) */
function toTitleCase(str: string): string {
  const minorWords = new Set([
    "a",
    "an",
    "the",
    "and",
    "but",
    "or",
    "for",
    "nor",
    "on",
    "at",
    "to",
    "by",
    "in",
    "of",
    "up",
    "as",
    "if",
    "so",
  ]);
  return str
    .toLowerCase()
    .split(" ")
    .map((word, i) =>
      i === 0 || !minorWords.has(word)
        ? word.charAt(0).toUpperCase() + word.slice(1)
        : word
    )
    .join(" ");
}

// ----------------------------------------------------------
// APA
// ----------------------------------------------------------

export function formatApaIntext(source: Source): string {
  const last = source.authorLast || "Author";
  const year = source.year || "n.d.";
  return `(${last}, ${year})`;
}

export function formatApaReference(source: Source): string {
  const last = source.authorLast || "Author";
  const firstInitial = source.authorFirst
    ? source.authorFirst.charAt(0).toUpperCase() + "."
    : "";
  const year = source.year || "n.d.";
  const title = source.title || "Untitled";
  const publisher = source.publisher;
  const doi = source.doi;
  const url = source.url;

  let ref = `${last}, ${firstInitial} (${year}). ${title}.`;

  if (publisher) ref += ` ${publisher}.`;
  if (doi) ref += ` https://doi.org/${doi}`;
  else if (url) ref += ` ${url}`;

  return ref.trim();
}

// ----------------------------------------------------------
// MLA
// ----------------------------------------------------------

export function formatMlaIntext(source: Source): string {
  const last = source.authorLast || "Author";
  const page = source.pageNumber;
  // MLA uses page number; fall back to year when page unknown
  return page ? `(${last} ${page})` : `(${last} ${source.year || "n.d."})`;
}

export function formatMlaReference(source: Source): string {
  const last = source.authorLast || "Author";
  const first = source.authorFirst || "";
  const author = first ? `${last}, ${first}` : last;
  const title = toTitleCase(source.title || "Untitled");
  const publisher = source.publisher;
  const year = source.year || "n.d.";
  const url = source.url;
  const doi = source.doi;

  let ref = `${author}. "${title}."`;
  if (publisher) ref += ` ${publisher},`;
  ref += ` ${year}.`;
  if (doi) ref += ` https://doi.org/${doi}`;
  else if (url) ref += ` ${url}`;

  return ref.trim();
}

// ----------------------------------------------------------
// Chicago (Author-Date)
// ----------------------------------------------------------

export function formatChicagoIntext(source: Source): string {
  const last = source.authorLast || "Author";
  const year = source.year || "n.d.";
  return `(${last} ${year})`;
}

export function formatChicagoReference(source: Source): string {
  const last = source.authorLast || "Author";
  const first = source.authorFirst || "";
  const author = first ? `${last}, ${first}` : last;
  const title = toTitleCase(source.title || "Untitled");
  const publisher = source.publisher;
  const year = source.year || "n.d.";
  const doi = source.doi;
  const url = source.url;

  let ref = `${author}. "${title}."`;
  if (publisher) ref += ` ${publisher},`;
  ref += ` ${year}.`;
  if (doi) ref += ` https://doi.org/${doi}`;
  else if (url) ref += ` ${url}`;

  return ref.trim();
}

// ----------------------------------------------------------
// IEEE
// ----------------------------------------------------------

export function formatIeeeIntext(source: Source): string {
  const idx = source.ieeeIndex ?? 1;
  return `[${idx}]`;
}

export function formatIeeeReference(source: Source): string {
  const idx = source.ieeeIndex ?? 1;
  const firstInitial = source.authorFirst
    ? source.authorFirst.charAt(0).toUpperCase() + "."
    : "";
  const last = source.authorLast || "Author";
  const title = source.title || "Untitled";
  const publisher = source.publisher;
  const year = source.year || "n.d.";
  const doi = source.doi;
  const url = source.url;

  let ref = `[${idx}] ${firstInitial} ${last}, "${title},"`;
  if (publisher) ref += ` ${publisher},`;
  ref += ` ${year}.`;
  if (doi) ref += ` DOI: ${doi}`;
  else if (url) ref += ` [Online]. Available: ${url}`;

  return ref.trim();
}

// ----------------------------------------------------------
// Dispatch by style
// ----------------------------------------------------------

export function formatIntext(style: CitationStyle, source: Source): string {
  switch (style) {
    case "apa":
      return formatApaIntext(source);
    case "mla":
      return formatMlaIntext(source);
    case "chicago":
      return formatChicagoIntext(source);
    case "ieee":
      return formatIeeeIntext(source);
  }
}

export function formatReference(style: CitationStyle, source: Source): string {
  switch (style) {
    case "apa":
      return formatApaReference(source);
    case "mla":
      return formatMlaReference(source);
    case "chicago":
      return formatChicagoReference(source);
    case "ieee":
      return formatIeeeReference(source);
  }
}

// =========================================================
// Word document helpers
// =========================================================

async function insertTextAtCursor(text: string): Promise<void> {
  await Word.run(async (context) => {
    const selection = context.document.getSelection();
    selection.insertText(text, Word.InsertLocation.replace);
    await context.sync();
  });
}

async function insertReferencesPage(
  style: CitationStyle,
  sources: Source[]
): Promise<void> {
  if (sources.length === 0) return;

  await Word.run(async (context) => {
    const body = context.document.body;

    // Insert a page break then the heading
    body.insertBreak(Word.BreakType.page, Word.InsertLocation.end);

    const headingText =
      style === "ieee"
        ? "References"
        : style === "mla"
        ? "Works Cited"
        : "References";

    const heading = body.insertParagraph(headingText, Word.InsertLocation.end);
    heading.styleBuiltIn = Word.BuiltInStyleName.heading1;

    // Insert each reference entry
    for (const source of sources) {
      const refText = formatReference(style, source);
      const para = body.insertParagraph(refText, Word.InsertLocation.end);
      // Hanging indent via paragraph format
      para.leftIndent = 36; // 0.5 inch in points
      para.firstLineIndent = -36;
    }

    await context.sync();
  });
}

async function insertTitlePage(fields: {
  title: string;
  author: string;
  course: string;
  instructor: string;
  institution: string;
  date: string;
}): Promise<void> {
  await Word.run(async (context) => {
    const body = context.document.body;

    // Insert at start — go to beginning then work down
    const lines: Array<{ text: string; style: Word.BuiltInStyleName | null }> =
      [
        { text: "\n\n\n", style: null },
        { text: fields.title || "Paper Title", style: Word.BuiltInStyleName.title },
        { text: "\n", style: null },
        { text: fields.author || "Author Name", style: Word.BuiltInStyleName.subtitle },
        { text: fields.course, style: null },
        { text: fields.instructor, style: null },
        { text: fields.institution, style: null },
        { text: fields.date, style: null },
      ];

    // Insert a page break after existing content then build title block
    // We prepend to the document body by inserting at start
    body.insertBreak(Word.BreakType.page, Word.InsertLocation.start);

    let insertAt: Word.InsertLocation.start | Word.InsertLocation.end =
      Word.InsertLocation.start;

    for (const line of lines) {
      if (!line.text || !line.text.trim()) continue;
      const para = body.insertParagraph(
        line.text.trim(),
        insertAt
      );
      para.alignment = Word.Alignment.centered;
      if (line.style) {
        para.styleBuiltIn = line.style;
      }
      // After the first insertion, move to inserting after our last paragraph
      // We flip to end so subsequent paragraphs don't reverse order
      insertAt = Word.InsertLocation.end;
    }

    await context.sync();
  });
}

// =========================================================
// UI helpers
// =========================================================

let statusTimer: ReturnType<typeof setTimeout> | null = null;

function showStatus(
  message: string,
  type: "success" | "error" | "info" = "info"
): void {
  const bar = document.getElementById("status-bar");
  if (!bar) return;

  bar.textContent = message;
  bar.className = `status-bar status-${type}`;
  bar.classList.remove("hidden");

  if (statusTimer) clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    bar.classList.add("hidden");
  }, 3000);
}

function readFormSource(): Source {
  return {
    id: `src-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: (
      document.getElementById("source-type") as HTMLSelectElement
    ).value as SourceType,
    authorLast: (
      document.getElementById("author-last") as HTMLInputElement
    ).value.trim(),
    authorFirst: (
      document.getElementById("author-first") as HTMLInputElement
    ).value.trim(),
    year: (document.getElementById("pub-year") as HTMLInputElement).value.trim(),
    title: (document.getElementById("title") as HTMLInputElement).value.trim(),
    publisher: (
      document.getElementById("publisher") as HTMLInputElement
    ).value.trim(),
    url: (document.getElementById("url-field") as HTMLInputElement).value.trim(),
    doi: (document.getElementById("doi-field") as HTMLInputElement).value.trim(),
    pageNumber: (
      document.getElementById("page-number") as HTMLInputElement
    ).value.trim(),
  };
}

function currentStyle(): CitationStyle {
  return (document.getElementById("citation-style") as HTMLSelectElement)
    .value as CitationStyle;
}

function updateRefCountBadge(count: number): void {
  const badge = document.getElementById("ref-count");
  if (badge) badge.textContent = String(count);
}

function setRefsButtonState(count: number): void {
  const insertBtn = document.getElementById(
    "btn-insert-refs"
  ) as HTMLButtonElement;
  const clearBtn = document.getElementById(
    "btn-clear-refs"
  ) as HTMLButtonElement;
  insertBtn.disabled = count === 0;
  clearBtn.disabled = count === 0;
}

function renderReferenceList(): void {
  const sources = loadSources();
  const style = currentStyle();
  const container = document.getElementById("reference-list");
  if (!container) return;

  updateRefCountBadge(sources.length);
  setRefsButtonState(sources.length);

  if (sources.length === 0) {
    container.innerHTML =
      '<p class="empty-state">No sources saved yet. Fill in the form above and click "Save Source".</p>';
    return;
  }

  container.innerHTML = "";
  sources.forEach((src) => {
    const item = document.createElement("div");
    item.className = "reference-item";
    item.dataset["sourceId"] = src.id;

    const textSpan = document.createElement("span");
    textSpan.className = "reference-item-text";
    textSpan.textContent = formatReference(style, src);

    const removeBtn = document.createElement("button");
    removeBtn.className = "reference-item-remove";
    removeBtn.title = "Remove source";
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => {
      removeSource(src.id);
    });

    item.appendChild(textSpan);
    item.appendChild(removeBtn);
    container.appendChild(item);
  });
}

function removeSource(id: string): void {
  const sources = loadSources().filter((s) => s.id !== id);
  saveSources(sources);
  renderReferenceList();
  showStatus("Source removed.", "info");
}

function updateCitationPreview(): void {
  const source = readFormSource();
  const style = currentStyle();
  const preview = document.getElementById("citation-preview");
  const previewText = document.getElementById("citation-preview-text");

  if (!preview || !previewText) return;

  if (!source.authorLast && !source.title) {
    preview.classList.add("hidden");
    return;
  }

  // For IEEE we need a dummy index for preview
  if (style === "ieee" && !source.ieeeIndex) {
    const sources = loadSources();
    source.ieeeIndex = sources.length + 1;
  }

  previewText.textContent = formatIntext(style, source);
  preview.classList.remove("hidden");
}

// =========================================================
// Office.onReady — wire everything up
// =========================================================

Office.onReady((info) => {
  if (info.host !== Office.HostType.Word) {
    showStatus("This add-in requires Microsoft Word.", "error");
    return;
  }

  initUI();
});

function initUI(): void {
  // Restore saved style
  const styleSelect = document.getElementById(
    "citation-style"
  ) as HTMLSelectElement;
  styleSelect.value = loadStyle();

  // Style change — save + re-render
  styleSelect.addEventListener("change", () => {
    saveStyle(currentStyle());
    renderReferenceList();
    updateCitationPreview();

    // Show/hide page field depending on style
    const pageGroup = document.getElementById("page-field-group");
    if (pageGroup) {
      pageGroup.style.display = currentStyle() === "mla" ? "" : "none";
    }
  });

  // Hide page field for non-MLA styles on init
  const pageGroup = document.getElementById("page-field-group");
  if (pageGroup) {
    pageGroup.style.display = loadStyle() === "mla" ? "" : "none";
  }

  // Live preview on any form change
  const formInputs = document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
    "#section-builder input, #section-builder select"
  );
  formInputs.forEach((el) => {
    el.addEventListener("input", updateCitationPreview);
  });

  // Insert Citation button
  document
    .getElementById("btn-insert-citation")
    ?.addEventListener("click", async () => {
      const source = readFormSource();
      const style = currentStyle();

      if (!source.authorLast) {
        showStatus("Please enter at least an author last name.", "error");
        return;
      }

      // For IEEE, assign the next index
      if (style === "ieee") {
        source.ieeeIndex = nextIeeeIndex();
      }

      const citation = formatIntext(style, source);

      try {
        await insertTextAtCursor(citation);
        showStatus(`Inserted: ${citation}`, "success");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        showStatus(`Error inserting citation: ${message}`, "error");
      }
    });

  // Save Source button
  document
    .getElementById("btn-add-source")
    ?.addEventListener("click", () => {
      const source = readFormSource();
      const style = currentStyle();

      if (!source.authorLast && !source.title) {
        showStatus("Please fill in at least the author or title.", "error");
        return;
      }

      if (style === "ieee") {
        source.ieeeIndex = nextIeeeIndex();
      }

      const sources = loadSources();
      sources.push(source);
      saveSources(sources);
      renderReferenceList();
      showStatus("Source saved to reference list.", "success");
    });

  // Insert References button
  document
    .getElementById("btn-insert-refs")
    ?.addEventListener("click", async () => {
      const sources = loadSources();
      const style = currentStyle();

      if (sources.length === 0) {
        showStatus("No sources saved.", "error");
        return;
      }

      try {
        await insertReferencesPage(style, sources);
        showStatus("References page inserted.", "success");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        showStatus(`Error: ${message}`, "error");
      }
    });

  // Clear All button
  document
    .getElementById("btn-clear-refs")
    ?.addEventListener("click", () => {
      if (!confirm("Clear all saved sources? This cannot be undone.")) return;
      saveSources([]);
      localStorage.removeItem(STORAGE_KEY_IEEE_COUNTER);
      renderReferenceList();
      showStatus("All sources cleared.", "info");
    });

  // Insert Title Page button
  document
    .getElementById("btn-insert-title-page")
    ?.addEventListener("click", async () => {
      const fields = {
        title: (document.getElementById("paper-title") as HTMLInputElement)
          .value.trim(),
        author: (document.getElementById("paper-author") as HTMLInputElement)
          .value.trim(),
        course: (document.getElementById("paper-course") as HTMLInputElement)
          .value.trim(),
        instructor: (
          document.getElementById("paper-instructor") as HTMLInputElement
        ).value.trim(),
        institution: (
          document.getElementById("paper-institution") as HTMLInputElement
        ).value.trim(),
        date: (document.getElementById("paper-date") as HTMLInputElement)
          .value.trim(),
      };

      if (!fields.title) {
        showStatus("Please enter a paper title.", "error");
        return;
      }

      try {
        await insertTitlePage(fields);
        showStatus("Title page inserted at document start.", "success");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        showStatus(`Error: ${message}`, "error");
      }
    });

  // Initial render
  renderReferenceList();
  updateCitationPreview();
}
