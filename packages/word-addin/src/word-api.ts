import type { CitationStyle } from "@perrla-free/core/types";

export interface TitlePageFields {
  title: string;
  author: string;
  course: string;
  instructor: string;
  institution: string;
  date: string;
}

export async function insertTextAtCursor(text: string): Promise<void> {
  await Word.run(async (context) => {
    const range = context.document.getSelection();
    range.insertText(text, Word.InsertLocation.replace);
    await context.sync();
  });
}

export async function insertReferencesPage(
  headingText: string,
  refs: string[]
): Promise<void> {
  await Word.run(async (context) => {
    const body = context.document.body;
    body.insertBreak(Word.BreakType.page, Word.InsertLocation.end);

    const heading = body.insertParagraph(headingText, Word.InsertLocation.end);
    heading.alignment = Word.Alignment.centered;
    heading.font.bold = true;
    heading.font.name = "Times New Roman";
    heading.font.size = 12;
    heading.lineSpacing = 24;

    body.insertParagraph("", Word.InsertLocation.end);

    for (const ref of refs) {
      const para = body.insertParagraph(ref, Word.InsertLocation.end);
      para.font.name = "Times New Roman";
      para.font.size = 12;
      para.lineSpacing = 24;
      para.leftIndent = 36;
      para.firstLineIndent = -36;
    }

    await context.sync();
  });
}

export async function applyDocumentFormatting(
  _style: CitationStyle
): Promise<void> {
  await Word.run(async (context) => {
    const body = context.document.body;
    const pars = body.paragraphs;
    pars.load("items");
    await context.sync();

    for (const par of pars.items) {
      par.font.name = "Times New Roman";
      par.font.size = 12;
      par.lineSpacing = 24;
    }

    if (Office.context.requirements.isSetSupported("WordApi", "1.6")) {
      const sections = context.document.sections;
      sections.load("items");
      await context.sync();
      const section = sections.items[0];
      section.pageSetup.topMargin = 72;
      section.pageSetup.bottomMargin = 72;
      section.pageSetup.leftMargin = 72;
      section.pageSetup.rightMargin = 72;
    }

    await context.sync();
  });
}

export async function insertApaTitlePage(
  fields: TitlePageFields
): Promise<void> {
  await Word.run(async (context) => {
    const body = context.document.body;
    const startRange = body.getRange(Word.RangeLocation.start);

    startRange.insertBreak(Word.BreakType.page, Word.InsertLocation.before);

    const metaLines = [
      fields.institution,
      fields.course,
      fields.instructor,
      fields.date,
    ].filter(Boolean);

    for (let i = metaLines.length - 1; i >= 0; i--) {
      const p = startRange.insertParagraph(metaLines[i], Word.InsertLocation.before);
      p.alignment = Word.Alignment.centered;
      p.font.name = "Times New Roman";
      p.font.size = 12;
      p.lineSpacing = 24;
    }

    if (fields.author) {
      const p = startRange.insertParagraph(fields.author, Word.InsertLocation.before);
      p.alignment = Word.Alignment.centered;
      p.font.name = "Times New Roman";
      p.font.size = 12;
      p.lineSpacing = 24;
    }

    const titlePar = startRange.insertParagraph(fields.title, Word.InsertLocation.before);
    titlePar.alignment = Word.Alignment.centered;
    titlePar.font.bold = true;
    titlePar.font.name = "Times New Roman";
    titlePar.font.size = 12;
    titlePar.lineSpacing = 24;

    for (let i = 0; i < 12; i++) {
      const blank = startRange.insertParagraph("", Word.InsertLocation.before);
      blank.font.name = "Times New Roman";
      blank.font.size = 12;
      blank.lineSpacing = 24;
    }

    await context.sync();
  });
}

export async function insertApaRunningHead(
  runningHead: string,
  isStudentPaper: boolean
): Promise<void> {
  await Word.run(async (context) => {
    const sections = context.document.sections;
    sections.load("items");
    await context.sync();
    const section = sections.items[0];
    section.set({ differentFirstPageHeaderFooter: true });

    const header = section.getHeader("Default");
    header.clear();

    const headText = isStudentPaper
      ? "\t"
      : runningHead.toUpperCase().slice(0, 50) + "\t";

    const para = header.paragraphs.add();
    para.insertText(headText, Word.InsertLocation.replace);

    // Insert PAGE field via OOXML for broad compatibility
    para.insertOoxml(
      '<w:r xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        '<w:fldChar w:fldCharType="begin"/></w:r>' +
        '<w:r xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        "<w:instrText> PAGE </w:instrText></w:r>" +
        '<w:r xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        '<w:fldChar w:fldCharType="end"/></w:r>',
      Word.InsertLocation.end
    );

    await context.sync();
  });
}

export function getRefHeading(style: string): string {
  if (style === "mla9") return "Works Cited";
  if (style === "chicago" || style === "turabian") return "Bibliography";
  return "References";
}
