declare module 'citeproc' {
  interface CSLItem {
    id: string;
    type: string;
    [key: string]: unknown;
  }

  type CitationItem = { id: string; [key: string]: unknown };

  interface CitationCluster {
    citationItems: CitationItem[];
    properties: { noteIndex: number };
  }

  type BibliographyMeta = {
    entry_ids?: string[][];
    [key: string]: unknown;
  };

  type BibliographyResult = [BibliographyMeta, string[]];

  class Engine {
    constructor(
      sys: {
        retrieveLocale: (lang: string) => string;
        retrieveItem: (id: string) => CSLItem;
      },
      style: string
    );

    updateItems(ids: string[]): void;

    processCitationCluster(
      citation: CitationCluster,
      citationsPre: unknown[],
      citationsPost: unknown[]
    ): [unknown, Array<[number, string, string]>];

    makeBibliography(): BibliographyResult | false;
  }

  export = { Engine };
}
