# Changelog

All notable changes to Markdown Live Editor will be documented in this file.

## [Unreleased]

### Fixed

- Fixed a spurious left-alignment (`:---`) being written into a newly inserted table column — the base editor schema defaulted a cell's `alignment` to `"left"`, so columns created by "add column" round-tripped as left-aligned instead of unaligned (`---`). Affected every table, and was especially visible when editing tables with merged (colspan/rowspan) cells. Explicit alignments set by the user are still preserved.

## [1.0.1] - 2026-06-22

### Fixed

- Fixed table formatter incorrectly expanding a lone `-` in a data cell into `---` (separator dashes) — separator detection is now row-level: a row is treated as a separator only when all its cells match the separator pattern

## [1.0.0] - 2026-06-20

### Added

- Multi-row table header support — tables can now have multiple header rows using `^` rowspan syntax
- Table auto-formatting — Markdown tables are automatically aligned when typing `|`; full-width characters counted as width 2 (`markdownLiveEditor.formatTableOnType` setting)

### Fixed

- Fixed TableMap corruption when adding rows or columns to multi-row header tables
- Fixed mismatched transaction when adding a column to a multi-row header table
- Fixed `tableRole:'row'` being stripped from `extra_header_row`, which caused column operations to silently no-op
- Fixed extra empty column appearing when using vertical rowspan in multi-row headers
- Fixed duplicate rowspan marker insertion alongside existing covered placeholder cells

### Changed

- First stable release — all core extended table features implemented and tested
- Cleaned up README with complete feature list

## [0.1.13] - 2026-06-19

### Fixed

- Fixed extra empty column appearing when adding vertical rowspan to multi-row table headers — `prosemirror-tables`' `findWidth` was double-counting a column because the extra-header-row cell's `rowspan` contribution and the GFM header's covered placeholder cell were both counted; covered cells now carry `colspan=0` so they don't inflate the computed table width

## [0.1.12] - 2026-06-18

### Fixed

- Fixed extra empty column appearing when a multi-row header cell uses rowspan (`^`) — the serializer was inserting a duplicate rowspan marker alongside the existing covered placeholder cell

## [0.1.11] - 2026-06-18

### Fixed

- Fixed crash (`Invalid content for node type table_cell`) when unmerging cells — placeholder cells now always include a paragraph node as required by the schema

## [0.1.10] - 2026-06-18

### Fixed

- Fixed `\^` and `\>` escape sequences not being normalized when saving — table cell merge markers are now written back as plain `^` and `>` instead of escaped versions

## [0.1.9] - 2026-06-16

### Fixed

- Unified `>` colspan syntax across all table row types — extra header rows now use `| > | A |` (placeholder **before** the spanning cell), consistent with body rows and the standard GFM header row
- Standard GFM header row colspan is now preserved on save (previously lost due to remark-extended-table skipping i=0 during serialization)

## [0.1.1] - 2026-05-29

### Fixed

- Fixed Extended table syntax (colspan/rowspan) not working with LF line endings — now properly supports LF, CRLF, and CR line endings

## [0.6.2] - 2026-04-20

### Added

- Added GitHub Sponsors funding configuration via `.github/FUNDING.yml`
- Added a `Support` section in README with a GitHub Sponsors link

### Changed

- Updated `dompurify` from `3.3.2` to `3.4.0` (dependabot)

## [0.6.1] - 2026-04-13

### Added

- Added `markdownLiveEditor.syncDebugLogs` setting and `Markdown Live Editor: Copy Sync Debug Info` command for sync/IME troubleshooting
- Added host/view sync debug aggregation so copied diagnostics include both extension-host and webview events
- Added unit test coverage for shared hash utility, visual-line update decision helper, and search hotkey wiring

### Changed

- Refactored webview editor code by splitting large `view.ts` responsibilities into focused modules (`searchPanel`, `visualLineNumbers`, shared helpers)
- Made sync debug logging toggle apply immediately to already-open editor panels without requiring reopen

### Fixed

- Fixed CSS `noDescendingSpecificity` lint warnings in search export row and highlight selector blocks

## [0.6.0] - 2026-04-12

### Added

- Added optional `markdownLiveEditor.visualLineNumbers` setting to show a left gutter with visual line references
- Added row-level numbering support for headings, paragraphs with hard breaks, list items, table rows, code blocks, and expanded frontmatter rows
- Added unit test coverage for visual line-number helper logic (row deduplication and line counting utilities)

### Changed

- Simplified line-reference behavior by consolidating on `visualLineNumbers`
- Clarified soft-wrap vs hard-break behavior for visual line numbering in README

### Fixed

- Stabilized visual line numbering while scrolling to keep row numbers consistent
- Reduced overlapping line-number rendering around inline-heavy content (for example, math and footnotes)
- Improved sync handling to defer host-driven updates while the editor has focus

## [0.5.3] - 2026-04-08

### Fixed

- Pinned `@types/vscode` to `1.75.0` to align with `engines.vscode` (`^1.75.0`) and fix VS Code Marketplace publish validation

## [0.5.2] - 2026-04-08

### Added

- Added VS Code for the Web support with a `browser` extension entry and web extension bundle output

### Changed

- Replaced extension-host `Buffer` usage with `TextDecoder` / `TextEncoder` for web compatibility
- Updated dependency lockfile to resolve high-severity npm audit findings in production dependencies

## [0.5.1] - 2026-03-30

### Changed

- Updated Milkdown packages to `7.20.0` for editor dependency maintenance
- Updated `typescript` to `6.0.2` in devDependencies

## [0.5.0] - 2026-03-15

### Added

- Heading folding support in the webview editor
- Fold/expand toggle buttons on headings
- Keyboard toggle support (`Enter` / `Space`) for heading fold controls

### Changed

- Improved fold toggle target detection to be robust against nested heading toggle DOM structures

## [0.4.0] - 2026-03-14

### Added

- Styled HTML export for the current editor view
- Export actions in the in-editor panel:
  - Copy HTML to clipboard
  - Export HTML file
- Command Palette entry: `Markdown Live Editor: Export HTML`

### Changed

- Added README usage section for HTML export

### Fixed

- Sanitized exported HTML snapshots by removing executable tags and dangerous attributes/URLs

## [0.3.1] - 2026-03-13

### Added

- In-editor Replace actions in the search panel:
  - Replace current match
  - Replace all matches
- `Ctrl/Cmd+H` shortcut to open/toggle Replace row

### Changed

- Updated README with search/replace shortcut guidance
- Improved PR/process documentation for quality tracking

## [0.3.0] - 2026-03-09

### Added

- In-editor Find panel in the webview (`Ctrl/Cmd+F`)
- Match navigation with `Enter`, `F3`, `Ctrl/Cmd+G`, and reverse navigation with `Shift` variants
- Search result highlights with active match styling
- No-results visual feedback in the search input

### Changed

- Refactor search logic into modular search state utilities for better testability
- Keep find panel count and no-results state synchronized on document updates
- Improve active match reveal behavior with centered smooth scrolling

## [0.2.1] - 2026-03-02

### Changed

- Lower minimum VS Code engine version from `^1.109.0` to `^1.75.0` for Cursor editor compatibility
- Add OpenVSX Registry publish step to release workflow

## [0.2.0] - 2026-03-02

### Added

- YAML Frontmatter support — `---` blocks are recognized and displayed as a collapsible block
- Click-to-expand: click the "Frontmatter" header to reveal YAML content
- Editable: edit frontmatter directly in the WYSIWYG view via textarea
- Round-trip safe: frontmatter content is preserved exactly during serialization

## [0.1.0] - 2026-02-28

### Added

- Word and character count in the status bar
- Selection count display when text is selected (e.g. Words: 10/123 | Chars: 30/456)
- Auto-update on document edits and selection changes
- Status bar auto-hides when editor is not active

## [0.0.6] - 2026-02-26

### Added

- Outline panel in Explorer sidebar — displays heading hierarchy (H1–H6) as a TreeView
- Click-to-scroll: click any heading in the outline to smooth-scroll the editor to that position
- Auto-update: outline refreshes on document edits and tab switches
- Panel auto-hides when Markdown Live Editor is not active

## [0.0.5] - 2026-02-25

### Added

- Floating selection toolbar — select text to show Bold, Italic, Strikethrough, Code, and Link buttons
- Link tooltip — hover over links to preview URL with edit/delete actions
- Custom link edit tooltip that always positions above the text (bypasses floating-ui flip)

### Fixed

- Link edit tooltip no longer flips below the text when space is limited above
- Tooltip focus handling: avoid unnecessary focus calls when tooltip is not visible

## [0.0.4] - 2026-02-24

### Added

- Relative path image display in the editor (resolves local images via webview URI)
- Error fallback display for missing images
- Workspace root access for images in parent directories

## [0.0.3] - 2026-02-24

### Added

- Slash commands — type `/` to insert headings, lists, tables, code blocks, math, mermaid diagrams, and more
- Keyboard navigation (Arrow keys, Enter, Escape) and text filtering in slash menu

## [0.0.2] - 2026-02-24

### Changed

- CI: exclude devDependencies from npm audit

## [0.0.1] - 2026-02-21

### Added

- WYSIWYG Markdown editing with Milkdown (ProseMirror-based)
- Bidirectional sync between visual editor and source file
- GFM support: tables, task lists, strikethrough, footnotes
- Syntax highlighting for code blocks via highlight.js (27 languages)
- Mermaid diagram live preview (lazy-loaded separate bundle)
- KaTeX math rendering (inline `$...$` and block `$$...$$`)
- GitHub Alerts (`[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]`)
- Emoji shortcodes (`:smile:`, `:rocket:`, etc.)
- Custom CSS injection via `markdownLiveEditor.customCss` setting
- VS Code theme integration (light/dark/high-contrast)
