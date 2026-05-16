# @perrla-free/electron

Electron desktop wrapper for PERRLA Free. Loads the SvelteKit web app and adds native capabilities: file system access, native menus, and DOCX/PDF export via system dialogs.

## Development

The Electron app expects the SvelteKit dev server to be running on port 5173. Start both in separate terminals:

**Terminal 1 — SvelteKit dev server:**

```bash
cd packages/web
pnpm dev
```

**Terminal 2 — Electron:**

```bash
cd packages/electron
pnpm dev
```

`pnpm dev` compiles TypeScript to `out/` and then launches Electron pointing at `http://localhost:5173`. DevTools open automatically in this mode.

## Production build

First build the SvelteKit app, then package Electron:

```bash
# From repo root
pnpm build            # builds packages/core and packages/web

# Then from packages/electron
pnpm dist             # runs electron-builder, outputs to dist/
```

electron-builder picks up `out/**/*` (compiled Electron main/preload) and `../web/build/**/*` (SvelteKit output). In production the app loads `file://` pointing at the bundled `web/build/index.html`.

## Platform notes

| Platform | Output format | Notes |
|----------|---------------|-------|
| macOS    | `.dmg`        | Code-signing requires an Apple Developer certificate for distribution outside the App Store. Set `CSC_LINK` / `CSC_KEY_PASSWORD` env vars or configure `mac.identity` in `electron-builder.yml`. |
| Windows  | NSIS installer `.exe` | No extra signing required for local use; Authenticode certificate needed for SmartScreen bypass in distribution. |
| Linux    | AppImage      | Portable, no install needed. Run `chmod +x *.AppImage && ./*.AppImage`. |

## native API — `window.perrlaDesktop`

The preload script exposes `window.perrlaDesktop` to the SvelteKit renderer:

```typescript
window.perrlaDesktop.saveFile(defaultName, content, filters)
  // Opens a system Save dialog and writes content to the chosen path.
  // Returns the saved path or null if cancelled.

window.perrlaDesktop.openFile(filters)
  // Opens a system Open dialog and reads the chosen file.
  // Returns { path, content } or null if cancelled.

window.perrlaDesktop.showSaveDialog(options)
  // Raw save dialog — returns path without writing. Use for export flows
  // where the renderer writes the bytes itself.

window.perrlaDesktop.showOpenDialog(options)
  // Raw open dialog — returns string[] of selected paths or null.

window.perrlaDesktop.platform
  // "darwin" | "win32" | "linux" — useful for platform-specific UI hints.

window.perrlaDesktop.onMenuAction(callback)
  // Subscribe to native menu actions ("file:new", "file:save", etc.).
  // Returns an unsubscribe function.
```

## Menu actions

Menu items send string action names via `window.perrlaDesktop.onMenuAction`. Handle them in your SvelteKit app:

| Action | Trigger |
|--------|---------|
| `file:new` | File → New Paper |
| `file:open` | File → Open Paper |
| `file:save` | File → Save |
| `file:saveAs` | File → Save As |
| `file:exportDocx` | File → Export DOCX |
| `file:exportPdf` | File → Export PDF |
| `file:exportMarkdown` | File → Export Markdown |
| `view:toggleSidebar` | View → Toggle Sidebar |
| `view:toggleReferences` | View → Toggle References Panel |
| `help:about` | Help → About |
