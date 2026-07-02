# Markdown Live Editor Plus

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A WYSIWYG Markdown editor for Visual Studio Code with extended table support including colspan, rowspan, and multi-row headers.
Fork of [Markdown Live Editor](https://github.com/ishiij-dev/vscode-markdown-live-editor) by ishiij-dev.

## Installation

Launch VS Code Quick Open (`Ctrl+P`), paste the following command, and press enter.

```
ext install painomi0587.markdown-live-editor-plus
```

## Features

- **WYSIWYG editing** — Edit Markdown visually with [Milkdown](https://milkdown.dev/) (ProseMirror-based)
- **Bidirectional sync** — Changes in the visual editor update the source file, and vice versa
- **GFM support** — Tables, task lists, strikethrough, footnotes
- **Extended table syntax** — `>` for colspan, `^` for rowspan, multi-row headers
- **Cell merge/unmerge** — Merge cells via `>` / `^` syntax; click ⊠ to unmerge
- **Table auto-formatting** — Tables are aligned automatically when typing `|` (full-width character aware)
- **Paste CSV/TSV as table** — Paste tab- or comma-separated data (e.g. copied from a spreadsheet) to convert it into a GFM table
- **Selection toolbar** — Select text to show Bold, Italic, Strikethrough, Code, and Link buttons
- **Link tooltip** — Hover over links to preview URL with edit/delete actions
- **In-editor Find** — Search inside the webview editor with match highlights and keyboard navigation
- **Heading folding** — Collapse and expand sections by heading in the editor
- **Outline panel** — Heading hierarchy in the Explorer sidebar with click-to-scroll navigation and drag-to-reorder sections
- **Syntax highlighting** — Code blocks with language-aware highlighting via [highlight.js](https://highlightjs.org/)
- **Mermaid diagrams** — Live preview of `mermaid` code blocks
- **KaTeX math** — Inline `$...$` and block `$$...$$` math rendering
- **GitHub Alerts** — `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]`
- **Slash commands** — Type `/` to insert headings, lists, tables, code blocks, math, mermaid diagrams, and more
- **Emoji shortcodes** — `:smile:` → 😄, `:rocket:` → 🚀
- **Relative image paths** — Display local images referenced with relative paths
- **Image paste & drop** — Paste from the clipboard or drop image files to save them next to the document (configurable folder) and insert a relative-path link
- **Custom CSS** — Inject your own styles via settings
- **Theme integration** — Adapts to light, dark, and high-contrast themes

## Extended Table Syntax

Use `>` to merge with the right cell (colspan) and `^` to merge with the upper cell (rowspan):

```markdown
| A | B | C |
|---|---|---|
| 1 | > | 3 |
| ^ | 5 | 6 |
| 7 | 8 | 9 |
```

To unmerge, click the ⊠ button that appears when your cursor is inside a merged cell.

## Usage

### Opening the Editor

| Method | How |
|--------|-----|
| **Command Palette** | `Ctrl+Shift+P` → `Markdown Live Editor: Open with Markdown Live Editor` |
| **Keyboard shortcut** | `Ctrl+Shift+Alt+M` (Mac: `Cmd+Shift+Alt+M`) while editing a `.md` file |
| **Explorer context menu** | Right-click a `.md` file → *Open with Markdown Live Editor* |
| **Editor tab context menu** | Right-click the tab of an open `.md` file |

## License

[MIT](LICENSE)

## Credits

Based on [vscode-markdown-live-editor](https://github.com/ishiij-dev/vscode-markdown-live-editor) by [ishiij-dev](https://github.com/ishiij-dev), licensed under MIT.