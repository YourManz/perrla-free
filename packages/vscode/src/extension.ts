import * as vscode from "vscode";
import {
  formatInTextCitation,
  formatReferenceEntry,
  formatTitlePage,
} from "./formatters";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return the active document's citation style from workspace config. */
function getStyle(): string {
  return vscode.workspace
    .getConfiguration("perrla")
    .get<string>("style", "apa7");
}

/**
 * Find the byte offset of the `## References` section heading, or -1 if absent.
 * Returns the position of the line *after* the heading (where entries should go).
 */
function findReferencesSection(text: string): number {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s+References\s*$/i.test(lines[i])) {
      return i + 1; // line index after the heading
    }
  }
  return -1;
}

/**
 * Append a reference entry to the `## References` section, creating it if absent.
 */
async function appendReference(
  editor: vscode.TextEditor,
  entry: string
): Promise<void> {
  const doc = editor.document;
  const text = doc.getText();
  const lines = text.split("\n");
  const refLineIndex = findReferencesSection(text);

  await editor.edit((editBuilder) => {
    if (refLineIndex === -1) {
      // No References section — append at end of document
      const lastLine = doc.lineAt(doc.lineCount - 1);
      const endPos = lastLine.range.end;
      editBuilder.insert(endPos, `\n\n## References\n\n${entry}\n`);
    } else {
      // Insert right after the heading, before any existing entries
      const insertPos = new vscode.Position(refLineIndex, 0);
      // If the line after heading is blank, skip it to avoid double blank lines
      const afterHeading = lines[refLineIndex] ?? "";
      if (afterHeading.trim() === "") {
        const insertPos2 = new vscode.Position(refLineIndex + 1, 0);
        editBuilder.insert(insertPos2, `${entry}\n`);
      } else {
        editBuilder.insert(insertPos, `${entry}\n`);
      }
    }
  });
}

/**
 * Prompt for a single value via InputBox. Returns undefined if cancelled.
 */
async function prompt(
  placeHolder: string,
  prompt: string,
  value?: string
): Promise<string | undefined> {
  return vscode.window.showInputBox({ placeHolder, prompt, value });
}

// ---------------------------------------------------------------------------
// Source-type options (shared across commands)
// ---------------------------------------------------------------------------

const SOURCE_TYPES: vscode.QuickPickItem[] = [
  { label: "Article", description: "Magazine or general article" },
  { label: "Book", description: "Printed or e-book" },
  { label: "Website", description: "Webpage or online resource" },
  { label: "Journal", description: "Peer-reviewed journal article" },
  { label: "Thesis", description: "Dissertation or thesis" },
  { label: "Conference", description: "Conference paper or proceedings" },
  { label: "Newspaper", description: "Newspaper article" },
  { label: "Report", description: "Technical or government report" },
  { label: "Film", description: "Film or documentary" },
  { label: "Podcast", description: "Podcast episode" },
];

// IEEE reference counter (per session; resets on extension reload)
let ieeeCounter = 0;

// ---------------------------------------------------------------------------
// Command: perrla.setStyle
// ---------------------------------------------------------------------------

async function cmdSetStyle(): Promise<void> {
  const options: vscode.QuickPickItem[] = [
    { label: "APA 7th Edition", description: "apa7" },
    { label: "MLA 9th Edition", description: "mla9" },
    { label: "Chicago Author-Date", description: "chicago" },
    { label: "IEEE", description: "ieee" },
  ];

  const selected = await vscode.window.showQuickPick(options, {
    placeHolder: "Select a citation style",
    title: "PERRLA: Set Citation Style",
  });

  if (!selected || !selected.description) {
    return;
  }

  await vscode.workspace
    .getConfiguration("perrla")
    .update("style", selected.description, vscode.ConfigurationTarget.Workspace);

  vscode.window.showInformationMessage(
    `PERRLA citation style set to: ${selected.label}`
  );
}

// ---------------------------------------------------------------------------
// Command: perrla.insertCitation
// ---------------------------------------------------------------------------

async function cmdInsertCitation(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage("No active editor found.");
    return;
  }

  const style = getStyle();

  // Step 1: Pick source type
  const typeItem = await vscode.window.showQuickPick(SOURCE_TYPES, {
    placeHolder: "Select source type",
    title: "PERRLA: Insert Citation (1/4) — Source Type",
  });
  if (!typeItem) return;
  const sourceType = typeItem.label.toLowerCase();

  // Step 2: Author last name
  const author = await prompt(
    "e.g. Smith",
    "PERRLA: Insert Citation (2/4) — Author last name"
  );
  if (author === undefined) return;

  // Step 3: Year
  const year = await prompt(
    "e.g. 2023",
    "PERRLA: Insert Citation (3/4) — Publication year"
  );
  if (year === undefined) return;

  // Step 4: Title (for reference entry)
  const title = await prompt(
    "e.g. The Effects of Climate Change",
    "PERRLA: Insert Citation (4/4) — Title"
  );
  if (title === undefined) return;

  // IEEE counter bump
  if (style === "ieee") {
    ieeeCounter += 1;
  }

  // Format in-text citation
  const inText = formatInTextCitation(style, author, year, ieeeCounter);

  // Insert at cursor
  await editor.edit((editBuilder) => {
    editor.selections.forEach((selection) => {
      editBuilder.replace(selection, inText);
    });
  });

  // Build a minimal reference entry and append to References section
  const fields: Record<string, string> = { author, year, title };
  const entry = formatReferenceEntry(style, sourceType, fields);
  const prefix = style === "ieee" ? `[${ieeeCounter}] ` : "";
  await appendReference(editor, `${prefix}${entry}`);
}

// ---------------------------------------------------------------------------
// Command: perrla.buildReference
// ---------------------------------------------------------------------------

async function cmdBuildReference(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage("No active editor found.");
    return;
  }

  const style = getStyle();

  // Pick source type first
  const typeItem = await vscode.window.showQuickPick(SOURCE_TYPES, {
    placeHolder: "Select source type",
    title: "PERRLA: Build Reference Entry — Source Type",
  });
  if (!typeItem) return;
  const sourceType = typeItem.label.toLowerCase();

  // Collect fields based on source type
  const fields: Record<string, string> = {};

  const commonFields: Array<[string, string, string]> = [
    ["author", "e.g. Smith, J.", "Author (Last, First)"],
    ["year", "e.g. 2023", "Year of publication"],
    ["title", "e.g. The Effects of Climate Change", "Title"],
  ];

  const extraFields: Record<string, Array<[string, string, string]>> = {
    article: [
      ["journal", "e.g. Nature", "Journal / Magazine name"],
      ["volume", "e.g. 12", "Volume"],
      ["issue", "e.g. 3", "Issue / Number"],
      ["pages", "e.g. 45–67", "Pages"],
    ],
    book: [
      ["publisher", "e.g. Oxford University Press", "Publisher"],
      ["city", "e.g. New York", "City of publication"],
    ],
    website: [
      ["siteName", "e.g. BBC News", "Site name"],
      ["url", "e.g. https://…", "URL"],
      ["accessed", "e.g. May 10, 2024", "Date accessed"],
    ],
    journal: [
      ["journal", "e.g. Journal of Psychology", "Journal name"],
      ["volume", "e.g. 5", "Volume"],
      ["issue", "e.g. 2", "Issue"],
      ["pages", "e.g. 100–115", "Pages"],
      ["doi", "e.g. 10.1234/abc", "DOI (without https://doi.org/)"],
    ],
    thesis: [
      ["degree", "e.g. Doctoral dissertation", "Degree type"],
      ["institution", "e.g. University of Toronto", "Institution"],
      ["database", "e.g. ProQuest Dissertations", "Database (optional)"],
    ],
    conference: [
      ["conference", "e.g. ICML 2023", "Conference name"],
      ["pages", "e.g. 200–210", "Pages"],
      ["publisher", "e.g. IEEE", "Publisher"],
    ],
    newspaper: [
      ["newspaper", "e.g. The Globe and Mail", "Newspaper name"],
      ["date", "e.g. March 15, 2023", "Full date"],
      ["pages", "e.g. A1", "Page(s)"],
    ],
    report: [
      ["reportNumber", "e.g. Report No. 42", "Report number"],
      ["institution", "e.g. World Health Organization", "Issuing institution"],
      ["url", "e.g. https://…", "URL"],
    ],
    film: [
      ["director", "e.g. Nolan, C.", "Director"],
      ["studio", "e.g. Warner Bros.", "Studio / Distributor"],
    ],
    podcast: [
      ["podcast", "e.g. The Daily", "Podcast series name"],
      ["network", "e.g. The New York Times", "Network or platform"],
      ["url", "e.g. https://…", "Episode URL"],
      ["date", "e.g. April 1, 2023", "Date"],
    ],
  };

  const allFields = [...commonFields, ...(extraFields[sourceType] ?? [])];

  for (const [key, placeholder, promptText] of allFields) {
    const value = await prompt(placeholder, `PERRLA: Build Reference — ${promptText}`);
    if (value === undefined) return; // cancelled
    if (value.trim()) {
      fields[key] = value.trim();
    }
  }

  if (style === "ieee") {
    ieeeCounter += 1;
  }

  const entry = formatReferenceEntry(style, sourceType, fields);
  const prefix = style === "ieee" ? `[${ieeeCounter}] ` : "";
  await appendReference(editor, `${prefix}${entry}`);

  vscode.window.showInformationMessage("Reference entry added to References section.");
}

// ---------------------------------------------------------------------------
// Command: perrla.generateTitlePage
// ---------------------------------------------------------------------------

async function cmdGenerateTitlePage(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage("No active editor found.");
    return;
  }

  const style = getStyle();

  const fieldDefs: Array<[string, string, string]> = [
    ["title", "e.g. The Impact of Social Media on Youth", "Paper title"],
    ["author", "e.g. Kobe Neilson", "Author full name"],
    ["course", "e.g. COMM 1234", "Course name / number"],
    ["instructor", "e.g. Dr. Jane Smith", "Instructor name"],
    ["institution", "e.g. BCIT", "Institution / university"],
    ["date", "e.g. May 16, 2026", "Submission date"],
  ];

  const fields: Record<string, string> = {};
  for (const [key, placeholder, promptText] of fieldDefs) {
    const value = await prompt(placeholder, `PERRLA: Title Page — ${promptText}`);
    if (value === undefined) return;
    fields[key] = value.trim();
  }

  const titlePageText = formatTitlePage(style, fields);

  // Insert at the very beginning of the document
  await editor.edit((editBuilder) => {
    const startPos = new vscode.Position(0, 0);
    editBuilder.insert(startPos, `${titlePageText}\n\n`);
  });

  vscode.window.showInformationMessage("Title page inserted at top of document.");
}

// ---------------------------------------------------------------------------
// Extension lifecycle
// ---------------------------------------------------------------------------

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("perrla.setStyle", cmdSetStyle),
    vscode.commands.registerCommand("perrla.insertCitation", cmdInsertCitation),
    vscode.commands.registerCommand("perrla.buildReference", cmdBuildReference),
    vscode.commands.registerCommand("perrla.generateTitlePage", cmdGenerateTitlePage)
  );
}

export function deactivate(): void {
  // nothing to clean up
}
