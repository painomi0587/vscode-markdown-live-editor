# Knowhow Index

> 自動生成。`/addf-knowhow-index reindex` で再生成できる。

## Claude Code 設定・運用

| ファイル | 要約 | キーワード |
|---|---|---|
| [ADDF/claude-md-at-mention.md](ADDF/claude-md-at-mention.md) | CLAUDE.md の @FileName メンション展開の仕組みと使い分け | @展開, メンション, クオート, ネスト展開, CLAUDE.md, インライン展開, ファイル参照, ブートシーケンス |
| [ADDF/ignore-file-strategy.md](ADDF/ignore-file-strategy.md) | .gitignore / .claudeignore / .git/info/exclude の役割分けと運用戦略 | .gitignore, .claudeignore, .git/info/exclude, respectGitignore, settings.json, settings.local.json, Glob, Grep, ファイル除外 |

## Markdown / remark プラグイン

| ファイル | 要約 | キーワード |
|---|---|---|
| [remark-extended-table-header-colspan.md](remark-extended-table-header-colspan.md) | remark-extended-table が i=0（GFM ヘッダー行）を serialize でスキップする問題と、customTableHandler による対処 | remark-extended-table, colspan, serialize, gfmTableToMarkdown, handlers.table, > マーカー, align 同期, API ガード |

## ProseMirror / Milkdown

| ファイル | 要約 | キーワード |
|---|---|---|
| [prosemirror-tables-findwidth-covered-cells.md](prosemirror-tables-findwidth-covered-cells.md) | prosemirror-tables の findWidth() が covered cells を二重カウントする問題と coveredColspan 属性による対処 | prosemirror-tables, findWidth, TableMap, covered, colspan=0, coveredColspan, extra_header_row, RangeError, buildTableLayout |
| [prosemirror-appendtransaction-patterns.md](prosemirror-appendtransaction-patterns.md) | appendTransaction の無限ループガード（PluginKey + getMeta/setMeta）と複数ステップ位置補正（tr.mapping.map）の実装パターン | appendTransaction, PluginKey, getMeta, setMeta, tr.mapping.map, 無限ループ, 位置補正 |
