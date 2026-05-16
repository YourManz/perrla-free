# perrla-free

Free, open-source clone of [PERRLA](https://www.perrla.com/) — a web-based academic paper formatter.

Write papers in a rich text editor with proper academic formatting (margins, fonts, double-spacing). Add citations in APA 7, MLA 9, Chicago 17, or IEEE. Export to DOCX, PDF, or Markdown. All data is stored locally in your browser using IndexedDB — no account, no server, no tracking.

## Features

- Rich text editor with 8.5×11 page simulation (Times New Roman 12pt, 1-inch margins, double-spaced)
- Citation styles: APA 7th, MLA 9th, Chicago 17th (author-date), IEEE
- Automatic reference list formatted by citeproc-js (same engine as Zotero)
- In-text citation builder — journal, book, website, conference, thesis, and more
- Export: DOCX (docx npm package), PDF (browser print), Markdown
- Import/export as `.perrla` JSON files for backup and portability
- 100% local — no backend, no auth, works offline after first load

## Tech stack

| Layer | Package |
|---|---|
| App framework | SvelteKit (static adapter — SPA mode) |
| Editor | Tiptap 2 (ProseMirror-based) |
| Citation engine | citeproc-js |
| Storage | localforage (IndexedDB) |
| DOCX export | docx |
| PDF export | Browser print API |
| Package manager | pnpm workspaces |

## Monorepo structure

```
perrla-free/
├── packages/
│   ├── core/          # Citation engine, data models, CSL wrappers, export logic
│   └── web/           # SvelteKit app
```

## Getting started

**Requirements:** Node 18+, pnpm 9+

```bash
# Install pnpm if you don't have it
npm install -g pnpm

# Install all dependencies
pnpm install

# Start the dev server
pnpm dev
```

Open http://localhost:5173 in your browser.

## Build for production

```bash
pnpm build
```

Output goes to `packages/web/build/`. Deploy as a static site to Cloudflare Pages, GitHub Pages, Vercel, Netlify, etc.

### GitHub Pages deployment

1. Push to GitHub
2. Add this workflow at `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install
      - run: pnpm build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: packages/web/build
```

3. Enable GitHub Pages in repo Settings → Pages → Source: `gh-pages` branch

## CSL style files

Citation styles are standard CSL XML files in `packages/web/static/styles/`. You can swap in any CSL style from the [Zotero style repository](https://www.zotero.org/styles) — just drop it in that folder and add the style name to the selector in `StyleSelector.svelte`.

The locale file at `packages/web/static/locales/locales-en-US.xml` is the standard citeproc-js en-US locale. More locales are available from the [citeproc-js locale repository](https://github.com/citation-style-language/locales).

## License

MIT — free to use, modify, and redistribute.

## Roadmap

- [ ] In-text citation insertion from the editor toolbar (insert citation mark at cursor)
- [ ] DOI/URL autofill — paste a DOI or URL and auto-populate the source form
- [ ] More citation styles (Turabian, Vancouver, Harvard)
- [ ] Word count and character count
- [ ] Multiple author institutions per paper
- [ ] Collaborative editing (optional, would require a backend)
- [ ] Footnote/endnote support (Chicago notes-bibliography style)
