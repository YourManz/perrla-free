/**
 * Pure formatting functions for APA 7th, MLA 9th, Chicago, and IEEE citation styles.
 * No VS Code dependency — these can be unit-tested independently.
 */

// ---------------------------------------------------------------------------
// In-text / parenthetical citations
// ---------------------------------------------------------------------------

/**
 * Format an in-text citation.
 *
 * @param style   One of: apa7 | mla9 | chicago | ieee
 * @param author  Author last name
 * @param year    Publication year (4-digit string)
 * @param index   IEEE numbered reference index (1-based, required for ieee)
 */
export function formatInTextCitation(
  style: string,
  author: string,
  year: string,
  index?: number
): string {
  switch (style) {
    case "mla9":
      // MLA: (Smith 23) — page number used as year placeholder when page unknown
      return `(${author} ${year})`;
    case "chicago":
      // Chicago author-date: (Smith 2023)
      return `(${author} ${year})`;
    case "ieee":
      // IEEE numbered: [1]
      return `[${index ?? 1}]`;
    case "apa7":
    default:
      // APA 7th: (Smith, 2023)
      return `(${author}, ${year})`;
  }
}

// ---------------------------------------------------------------------------
// Full reference list entries
// ---------------------------------------------------------------------------

/**
 * Format a complete reference entry for the reference list.
 *
 * @param style   One of: apa7 | mla9 | chicago | ieee
 * @param type    Source type: article | book | website | journal | thesis |
 *                conference | newspaper | report | film | podcast
 * @param fields  Key/value map of source metadata
 */
export function formatReferenceEntry(
  style: string,
  type: string,
  fields: Record<string, string>
): string {
  switch (style) {
    case "mla9":
      return mlaReference(type, fields);
    case "chicago":
      return chicagoReference(type, fields);
    case "ieee":
      return ieeeReference(type, fields);
    case "apa7":
    default:
      return apaReference(type, fields);
  }
}

// ---------------------------------------------------------------------------
// Title page
// ---------------------------------------------------------------------------

/**
 * Generate a Markdown-formatted title page block.
 *
 * @param style   Citation style (affects title page layout)
 * @param fields  title | author | course | instructor | institution | date
 */
export function formatTitlePage(
  style: string,
  fields: Record<string, string>
): string {
  const { title = "", author = "", course = "", instructor = "", institution = "", date = "" } = fields;

  switch (style) {
    case "mla9":
      // MLA does not use a formal title page — produces a header block instead
      return [
        `${author}`,
        `${instructor}`,
        `${course}`,
        `${date}`,
        ``,
        `# ${title}`,
      ].join("\n");

    case "chicago":
      return [
        `<div style="text-align:center; margin-top: 33%;">`,
        ``,
        `# ${title}`,
        ``,
        `${author}`,
        ``,
        `${course}`,
        ``,
        `${instructor}`,
        ``,
        `${institution}`,
        ``,
        `${date}`,
        ``,
        `</div>`,
      ].join("\n");

    case "ieee":
      return [
        `# ${title}`,
        ``,
        `**Author:** ${author}`,
        `**Institution:** ${institution}`,
        `**Course:** ${course}`,
        `**Instructor:** ${instructor}`,
        `**Date:** ${date}`,
      ].join("\n");

    case "apa7":
    default:
      // APA 7th: running head, title block centred
      return [
        `---`,
        ``,
        `<div style="text-align:center; margin-top: 30%;">`,
        ``,
        `# ${title}`,
        ``,
        `${author}`,
        ``,
        `${institution}`,
        ``,
        `${course}: ${instructor}`,
        ``,
        `${date}`,
        ``,
        `</div>`,
        ``,
        `---`,
      ].join("\n");
  }
}

// ---------------------------------------------------------------------------
// Style-specific reference formatters (internal helpers)
// ---------------------------------------------------------------------------

function apaReference(type: string, f: Record<string, string>): string {
  const author = f.author ? `${f.author}, ` : "";
  const year = f.year ? `(${f.year}). ` : "";
  const title = f.title ? `${f.title}. ` : "";

  switch (type) {
    case "book":
      return `${author}${year}*${f.title ?? ""}*. ${f.publisher ?? ""}${f.publisher ? "." : ""}`;

    case "journal":
    case "article": {
      const journal = f.journal ? `*${f.journal}*` : "";
      const volume = f.volume ? `, *${f.volume}*` : "";
      const issue = f.issue ? `(${f.issue})` : "";
      const pages = f.pages ? `, ${f.pages}` : "";
      const doi = f.doi ? ` https://doi.org/${f.doi}` : "";
      return `${author}${year}${title}${journal}${volume}${issue}${pages}.${doi}`;
    }

    case "website": {
      const url = f.url ? ` ${f.url}` : "";
      const retrieved = f.retrieved ? ` Retrieved ${f.retrieved}, from` : "";
      return `${author}${year}*${f.title ?? ""}*.${retrieved}${url}`;
    }

    case "thesis":
      return `${author}${year}*${f.title ?? ""}* [${f.degree ?? "Doctoral dissertation"}, ${f.institution ?? ""}]. ${f.database ?? ""}`;

    case "conference": {
      const conference = f.conference ? `*${f.conference}*` : "";
      const pages = f.pages ? `, ${f.pages}` : "";
      return `${author}${year}${title}In ${conference}${pages}. ${f.publisher ?? ""}`;
    }

    case "newspaper": {
      const newspaper = f.newspaper ?? f.journal ?? "";
      return `${author}${year}${title}*${newspaper}*${f.pages ? `, ${f.pages}` : ""}.`;
    }

    case "report":
      return `${author}${year}*${f.title ?? ""}* (${f.reportNumber ?? "Report"}). ${f.institution ?? ""}. ${f.url ?? ""}`;

    case "film":
      return `${f.director ?? ""}. (Director). (${f.year ?? ""}). *${f.title ?? ""}* [Film]. ${f.studio ?? ""}.`;

    case "podcast":
      return `${author}${year}${title}[Audio podcast episode]. In *${f.podcast ?? ""}*. ${f.network ?? ""} ${f.url ?? ""}`;

    default:
      return `${author}${year}${title}`;
  }
}

function mlaReference(type: string, f: Record<string, string>): string {
  const author = f.author ? `${f.author}. ` : "";
  const title = f.title ?? "";

  switch (type) {
    case "book":
      return `${author}*${title}*. ${f.publisher ?? ""}, ${f.year ?? ""}.`;

    case "journal":
    case "article": {
      const journal = f.journal ? `*${f.journal}*` : "";
      const volume = f.volume ? `, vol. ${f.volume}` : "";
      const issue = f.issue ? `, no. ${f.issue}` : "";
      const year = f.year ? `, ${f.year}` : "";
      const pages = f.pages ? `, pp. ${f.pages}` : "";
      return `${author}"${title}." ${journal}${volume}${issue}${year}${pages}.`;
    }

    case "website": {
      const site = f.siteName ? `*${f.siteName}*` : "";
      const accessed = f.accessed ? ` Accessed ${f.accessed}.` : "";
      return `${author}"${title}." ${site}, ${f.url ?? ""}.${accessed}`;
    }

    case "thesis":
      return `${author}*${title}*. ${f.year ?? ""}. ${f.institution ?? ""}, ${f.degree ?? "PhD dissertation"}.`;

    case "conference":
      return `${author}"${title}." *${f.conference ?? ""}*, ${f.year ?? ""}, pp. ${f.pages ?? ""}.`;

    case "newspaper":
      return `${author}"${title}." *${f.newspaper ?? f.journal ?? ""}*, ${f.date ?? f.year ?? ""}${f.pages ? `, p. ${f.pages}` : ""}.`;

    case "film":
      return `*${title}*. Directed by ${f.director ?? ""}, ${f.studio ?? ""}, ${f.year ?? ""}.`;

    case "podcast":
      return `${author}"${title}." *${f.podcast ?? ""}*, ${f.network ?? ""}, ${f.date ?? f.year ?? ""}${f.url ? `, ${f.url}` : ""}.`;

    default:
      return `${author}"${title}." ${f.year ?? ""}.`;
  }
}

function chicagoReference(type: string, f: Record<string, string>): string {
  const author = f.author ? `${f.author}. ` : "";
  const year = f.year ? `${f.year}. ` : "";
  const title = f.title ?? "";

  switch (type) {
    case "book":
      return `${author}*${title}*. ${f.city ?? ""}: ${f.publisher ?? ""}, ${f.year ?? ""}.`;

    case "journal":
    case "article": {
      const journal = f.journal ? `*${f.journal}*` : "";
      const volume = f.volume ? ` ${f.volume}` : "";
      const issue = f.issue ? `, no. ${f.issue}` : "";
      const year2 = f.year ? ` (${f.year})` : "";
      const pages = f.pages ? `: ${f.pages}` : "";
      return `${author}"${title}." ${journal}${volume}${issue}${year2}${pages}.`;
    }

    case "website": {
      const accessed = f.accessed ? ` Accessed ${f.accessed}.` : "";
      return `${author}"${title}." ${f.siteName ?? ""}. ${f.url ?? ""}.${accessed}`;
    }

    case "thesis":
      return `${author}"${title}." ${f.degree ?? "PhD diss."}, ${f.institution ?? ""}, ${f.year ?? ""}.`;

    case "conference":
      return `${author}"${title}." Paper presented at ${f.conference ?? ""}, ${f.location ?? ""}, ${f.date ?? f.year ?? ""}.`;

    case "newspaper":
      return `${author}"${title}." *${f.newspaper ?? f.journal ?? ""}*, ${f.date ?? f.year ?? ""}${f.pages ? `, ${f.pages}` : ""}.`;

    case "film":
      return `${f.director ?? ""}. *${title}*. ${f.studio ?? ""}, ${f.year ?? ""}.`;

    case "podcast":
      return `${author}"${title}." *${f.podcast ?? ""}*. Podcast audio, ${f.date ?? f.year ?? ""}. ${f.url ?? ""}`;

    default:
      return `${author}${year}"${title}."`;
  }
}

function ieeeReference(type: string, f: Record<string, string>): string {
  // IEEE uses numbered references; formatting uses abbreviated given names
  const author = f.author ?? "Unknown Author";
  const year = f.year ? `, ${f.year}` : "";
  const title = f.title ?? "";

  switch (type) {
    case "book":
      return `${author}, *${title}*. ${f.city ?? ""}: ${f.publisher ?? ""}${year}.`;

    case "journal":
    case "article": {
      const journal = f.journal ? `*${f.journal}*` : "";
      const volume = f.volume ? `, vol. ${f.volume}` : "";
      const issue = f.issue ? `, no. ${f.issue}` : "";
      const pages = f.pages ? `, pp. ${f.pages}` : "";
      return `${author}, "${title}," ${journal}${volume}${issue}${pages}${year}.`;
    }

    case "website":
      return `${author}, "${title}." ${f.url ?? ""}. (Accessed: ${f.accessed ?? f.year ?? ""}).`;

    case "thesis":
      return `${author}, "${title}," ${f.degree ?? "Ph.D. dissertation"}, ${f.institution ?? ""}${year}.`;

    case "conference": {
      const conference = f.conference ?? "";
      const pages = f.pages ? `, pp. ${f.pages}` : "";
      return `${author}, "${title}," in *${conference}*${pages}${year}.`;
    }

    case "newspaper":
      return `${author}, "${title}," *${f.newspaper ?? f.journal ?? ""}*${year}${f.pages ? `, p. ${f.pages}` : ""}.`;

    case "film":
      return `${f.director ?? ""} (Director), *${title}* [Film]. ${f.studio ?? ""}${year}.`;

    case "podcast":
      return `${author}, "${title}," *${f.podcast ?? ""}*, ${f.url ?? ""}${year}.`;

    default:
      return `${author}, "${title}"${year}.`;
  }
}
