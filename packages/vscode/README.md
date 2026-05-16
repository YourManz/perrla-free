# PERRLA Free — VS Code Extension

APA 7th, MLA 9th, Chicago, and IEEE citation formatting for Markdown academic papers, directly inside VS Code.

## What it does

- **Insert in-text citations** at the cursor — guided wizard for author, year, and title
- **Build complete reference entries** for all source types with full field prompts
- **Switch citation styles** per workspace with a Quick Pick menu
- **Generate a title page** inserted at the top of the document

All reference entries are automatically appended to a `## References` section at the end of the document (created if absent).

---

## Installation (VSIX)

1. In the repo root, build the extension:
   ```bash
   cd packages/vscode
   npm install
   npm run compile
   npx vsce package   # produces perrla-free-vscode-0.1.0.vsix
   ```
2. In VS Code: `Ctrl+Shift+P` → **Extensions: Install from VSIX…** → select the `.vsix` file.
3. Reload VS Code.

---

## Commands

All commands are available via `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS):

| Command | Description |
|---|---|
| **PERRLA: Set Citation Style** | Choose APA 7th, MLA 9th, Chicago, or IEEE for the current workspace |
| **PERRLA: Insert Citation** | 4-step wizard: source type → author → year → title. Inserts an in-text citation at the cursor and appends the reference entry |
| **PERRLA: Build Reference Entry** | Full field-by-field form for the chosen source type; appends a formatted reference entry |
| **PERRLA: Generate Title Page** | Prompts for title, author, course, instructor, institution, and date; inserts a formatted title page at the top of the document |

---

## Supported source types

Article, Book, Website, Journal, Thesis, Conference, Newspaper, Report, Film, Podcast

---

## Configuration

| Setting | Default | Options |
|---|---|---|
| `perrla.style` | `apa7` | `apa7`, `mla9`, `chicago`, `ieee` |

Set per-workspace via **PERRLA: Set Citation Style** or manually in `.vscode/settings.json`:

```json
{
  "perrla.style": "mla9"
}
```

---

## Citation format examples

| Style | In-text | Reference (Journal) |
|---|---|---|
| APA 7th | `(Smith, 2023)` | `Smith, J. (2023). Title. *Journal*, *5*(2), 10–20.` |
| MLA 9th | `(Smith 2023)` | `Smith, J. "Title." *Journal*, vol. 5, no. 2, 2023, pp. 10–20.` |
| Chicago | `(Smith 2023)` | `Smith, J. "Title." *Journal* 5, no. 2 (2023): 10–20.` |
| IEEE | `[1]` | `[1] J. Smith, "Title," *Journal*, vol. 5, no. 2, pp. 10–20, 2023.` |

---

## Part of the PERRLA Free monorepo

This extension complements the web-based formatter at `packages/web/`. The formatting logic lives in `packages/vscode/src/formatters.ts` with no VS Code dependency, making it easy to share or test independently.
