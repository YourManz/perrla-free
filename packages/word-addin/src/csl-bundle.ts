// Webpack asset/source rule imports these as raw strings at bundle time.
// See csl.d.ts for TypeScript module declarations.

import apa7 from "../../web/static/styles/apa7.csl";
import mla9 from "../../web/static/styles/mla9.csl";
import chicago from "../../web/static/styles/chicago-author-date.csl";
import ieee from "../../web/static/styles/ieee.csl";
import turabian from "../../web/static/styles/turabian-author-date.csl";
import vancouver from "../../web/static/styles/vancouver.csl";
import harvard from "../../web/static/styles/harvard-cite-them-right.csl";
import locale from "../../web/static/locales/locales-en-US.xml";

export const STYLES = {
  apa7,
  mla9,
  chicago,
  ieee,
  turabian,
  vancouver,
  harvard,
};

export const LOCALES: Record<string, string> = { "en-US": locale };
