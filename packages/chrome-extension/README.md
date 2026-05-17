# PERRLA Free — Reference Capture (Chrome Extension)

A Manifest V3 Chrome extension that lets students capture bibliographic references from any research website and save them to a local library. References can be exported as APA, MLA, Chicago, or IEEE citations and pasted directly into the PERRLA Free Citation Builder.

---

## What It Does

- **Captures metadata automatically** — reads `<title>`, OpenGraph tags, Schema.org JSON-LD, and Dublin Core meta tags to pre-fill the reference form.
- **Detects DOIs** — scans meta tags and `doi.org` links so journal articles are identified instantly.
- **Stores references locally** — everything is saved in `chrome.storage.local`; no account or server needed.
- **Formats citations on demand** — copy any saved reference as APA 7, MLA 9, Chicago (author-date), or IEEE with one click.
- **Exports your full library** — "Export All" copies every saved reference in your chosen style to the clipboard.

---

## Loading the Extension (Developer / Unpacked Mode)

This extension has no build step — it runs as plain HTML/CSS/JS.

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the `packages/chrome-extension` folder inside this repository.
5. The **PERRLA Free** extension icon (bookmark) appears in your toolbar.

> **Tip:** Pin the extension to your toolbar by clicking the puzzle-piece icon → pin button next to PERRLA Free.

---

## Using the Extension

### Capturing a Reference

1. Navigate to any research page (journal article, web page, news article, etc.).
2. Click the PERRLA Free icon in your toolbar.
3. The **Current Page** tab opens with metadata pre-filled.
4. Review and correct any fields as needed.
5. Click **Save to Library**.

### Managing Saved References

Switch to the **Saved** tab to:

- See all captured references sorted by date saved.
- Copy individual citations as **APA** or **MLA** with one click.
- **Remove** any reference you no longer need.
- **Export All** to copy your entire library formatted in your chosen citation style.

### Settings

In the **Current Page** tab, click **Settings** to choose:

- **Default Citation Style** — APA 7, MLA 9, Chicago, or IEEE (used by "Export All").
- **Default Source Type** — pre-selects Website or Journal for new captures.

---

## Exporting into PERRLA Free

The extension stores references locally. To bring them into the PERRLA Free web app:

1. Go to the **Saved** tab and click **Export All** (or copy individual APA/MLA citations).
2. Open the PERRLA Free web app and navigate to **Citation Builder**.
3. Paste the copied text into the manual-entry field.

> A future sync API will automate this step — for now, copy-paste is the bridge.

---

## Supported Metadata Sources

| Field | Sources checked |
|-------|----------------|
| Title | `<title>`, `og:title`, `meta[name=title]` |
| Author | `meta[name=author]`, `article:author`, `DC.creator`, `citation_author` |
| Year | `article:published_time`, `og:updated_time`, `citation_publication_date`, `DC.date`, Schema.org `datePublished` |
| Publisher | `og:site_name`, `meta[name=publisher]`, domain name (fallback) |
| DOI | `meta[name=citation_doi]`, `doi.org` links, Schema.org JSON-LD |
| Journal | `meta[name=citation_journal_title]`, `prism.publicationName` |

---

## File Structure

```
packages/chrome-extension/
├── manifest.json        Manifest V3 declaration
├── background.js        Service worker — storage CRUD
├── content.js           Injected into pages — metadata extractor
├── popup/
│   ├── popup.html       Extension popup UI
│   ├── popup.js         Popup controller
│   └── popup.css        Styles (Inter font, --accent: #2563eb)
├── icons/
│   └── README.txt       How to generate PNG icons from the SVG logo
└── README.md            This file
```

---

## Development Notes

- No npm, no bundler, no TypeScript — loads directly as an unpacked extension.
- No external CDN dependencies — fully self-contained.
- `chrome.storage.local` is used (not `chrome.storage.sync`) to avoid the 102 KB sync quota.
- The extension is intentionally excluded from `pnpm-workspace.yaml` — it has no `package.json`.
- To reload after editing a file: go to `chrome://extensions` → click the refresh icon on the PERRLA Free card.
