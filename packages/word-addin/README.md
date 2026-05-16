# @perrla-free/word-addin

A Microsoft Word task pane add-in providing APA, MLA, Chicago, and IEEE citation formatting directly inside Word.

## Features

- **Citation Builder** — fill in author, year, title, publisher, URL, DOI and get a properly formatted in-text citation inserted at the cursor
- **Four citation styles** — APA 7th, MLA 9th, Chicago (Author-Date), IEEE
- **Reference Manager** — accumulate sources during a session and insert a complete References / Works Cited page with one click
- **Title Page inserter** — generate a formatted title page (title, author, course, instructor, institution, date) at the start of the document
- **Live preview** — see your in-text citation before inserting it
- **Persistent session** — sources survive page refreshes via `localStorage`

## Development

### Prerequisites

- Node 18+
- pnpm 9+

### Install & build

```bash
# from repo root
pnpm install

# build the add-in (output → packages/word-addin/dist/)
pnpm --filter @perrla-free/word-addin build

# start dev server with HTTPS on https://localhost:3000
pnpm --filter @perrla-free/word-addin dev
```

### Type-check only

```bash
pnpm --filter @perrla-free/word-addin typecheck
# or directly:
cd packages/word-addin && npx tsc --noEmit
```

## Sideloading in Word

### Word on the Web (easiest)

1. Go to [Word Online](https://www.office.com/launch/word) and open any document
2. **Insert** → **Office Add-ins** → **Upload My Add-in** → Browse
3. Select `packages/word-addin/manifest.xml`
4. The **PERRLA Free** button appears in the Home ribbon

### Word for Windows (Desktop)

1. Start the dev server: `pnpm --filter @perrla-free/word-addin dev`
2. Trust the self-signed certificate (navigate to `https://localhost:3000` in a browser and accept the cert)
3. Share the `packages/word-addin` folder on a network path, or use a local share:
   ```
   \\127.0.0.1\word-addin
   ```
4. In Word: **File** → **Options** → **Trust Center** → **Trust Center Settings** → **Trusted Add-in Catalogs**
5. Add the network path and tick **Show in Menu**
6. Restart Word, then **Insert** → **Office Add-ins** → **Shared Folder** → select PERRLA Free

### Word for Mac (Desktop)

1. Start the dev server
2. Copy `manifest.xml` to `~/Library/Containers/com.microsoft.Word/Data/Documents/wef/`
3. Restart Word — the add-in appears under **Insert** → **My Add-ins**

## Publishing

To publish for production, replace `https://localhost:3000` with your hosted URL in `manifest.xml`, then submit to AppSource or distribute `manifest.xml` directly via an IT policy.

## Architecture

```
src/taskpane.ts     Main logic — Office.onReady(), form handlers, Word.run() calls
src/index.html      Task pane shell — loaded in the Office iframe
src/styles.css      Office Fluent-inspired styles (Fabric palette, #0078d4)
manifest.xml        Office Add-in manifest — registers the add-in with Word
webpack.config.js   Bundles TS → dist/taskpane.js, dev server on :3000 with HTTPS
```

Citation formatting functions are pure and exported so they can be unit-tested independently of the Office runtime.
