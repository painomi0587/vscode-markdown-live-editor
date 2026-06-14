---
title: Multi-Row Table Header
status: todo
trust: normal
responsiveness: relaxed
image_clarity: specific
---

# Plan 0002: Multi-Row Table Header

## 目的

`---` の前に複数行を並べることで2行以上の見出し行を持つテーブルを実現する。
colspan/rowspan との組み合わせも正しく動作させる。

## ユーザーが期待する構文

```markdown
| A | > | B | C |
| 1 | 2 | 1 | 1 |
|---|---|---|---|
| 1 | > | 3 | 4 |
| ^ | 5 | 6 | 5 |
| 7 | 8 | 9 | 6 |
```

- `---` より前のすべての行 → ヘッダー行（`<thead>` の `<tr>`）
- ヘッダー行内の `>` → colspan
- ヘッダー行内の `^` → rowspan（ヘッダー行間のみ。ヘッダー↔ボディ跨ぎは対象外）
- ボディの `>`/`^` → 既存実装のまま

## 現状の制約

| 制約 | 詳細 |
|---|---|
| remark-gfm | `---` 直前の1行のみをヘッダーと認識。2行前の行は別段落扱い |
| remark-extended-table | `i <= 1` ガードにより、ボディ行0でも `^` が使えない（ヘッダー↔ボディ跨ぎ rowspan 不可） |
| Milkdown GFM スキーマ | `table_header_row` は1つだけ想定 |
| extendedTableCellSchema | `table_header` ノードを未対応（colspan/rowspan attrs なし） |
| tableMergePlugin | `table_cell` のみ ⊠ ボタン対象 |

## 実装方針

### フェーズ A: マークダウン構文のパース（カスタム remark プラグイン）

remark-gfm が parse した結果を **post-process** して多行ヘッダーを復元する。

**アルゴリズム**:
1. remark-gfm + remark-extended-table 実行後の mdast テーブルノードを走査
2. テーブルの直前ノードが「テーブルと列数が一致するパラグラフ内の pipe 区切りテキスト」であれば、それを追加ヘッダー行として取り込む
3. 取り込んだ行は mdast の `table.children` 先頭に `{ type: 'tableRow', isHeader: true }` として挿入し、元のパラグラフノードを削除

> **補足**: remark-gfm は `---` 直前の1行のみをヘッダーとして `isHeader: true` にセットする。
> それより前の行はパラグラフとして直前のノードに落ちる。列数チェックで「追加ヘッダー候補」かどうかを判定できる。

**代替案: `===` 区切り構文**
`===` 行を "ヘッダー内区切り" として扱う独自 micromark 拡張を書く方法もあるが、
既存の remark-gfm と組み合わせる実装コストが高いためフェーズ A では採用しない。
フェーズ A の post-process 方式で要件を満たせない場合に検討する。

### フェーズ B: ProseMirror スキーマ拡張

- Milkdown の `tableSchema` を `extendSchema` で拡張し、`table_header_row` の複数格納を許可
- `extendedTableHeaderSchema` を新規作成（`tableHeaderSchema` に `colspan`/`rowspan` attrs を追加）
  - `parseMarkdown.match`: `node.type === 'tableCell' && !!node.isHeader`
  - `toMarkdown.runner`: colspan/rowspan を含めてシリアライズ

### フェーズ C: ヘッダー内 colspan/rowspan の処理

- `extendedTableMatchers.ts` に `isTableHeaderMarkdownNode` / `isTableHeaderProseNode` を追加
- `tableMergePlugin.ts`: `table_header` ノードも ⊠ ボタン対象に追加
- `view.ts` unmerge ハンドラ: `table_cell` に加え `table_header` にも対応
  - colspan unmerge: `table_header` ノードで置き換え
  - rowspan unmerge（ヘッダー行間のみ）: placeholder として `table_header` ノードを挿入

### フェーズ D: マークダウンへのシリアライズ

- `toMarkdown.runner` (フェーズ B) で複数 `table_header_row` を正しく出力
- 出力形式は「`---` より前に複数行」とし、remark-gfm がパースできる形に戻す
  （= フェーズ A の post-process と逆の変換）

### フェーズ E: エディタ UI

- ツールバーまたはコンテキストメニューに「ヘッダー行を追加」ボタンを追加
- 既存の ⊠ ボタンがヘッダーセルでも表示されるようにする（フェーズ C と連動）

## 実装ステップ

- [ ] フェーズ A: `multiRowHeaderPlugin.ts` を新規作成（post-process remark プラグイン）
  - [ ] パラグラフ→ヘッダー行変換ロジック（列数チェック付き）
  - [ ] remark-extended-table の colspan/rowspan を追加ヘッダー行にも適用
  - [ ] ユニットテスト（純粋関数として分離）
- [ ] フェーズ B: ProseMirror スキーマ拡張
  - [ ] `extendedTableHeaderSchema` 新規作成（colspan/rowspan attrs）
  - [ ] `tableSchema` 拡張で複数 `table_header_row` を許可
  - [ ] `view.ts` でスキーマ登録
- [ ] フェーズ C: ヘッダーセルの merge/unmerge 対応
  - [ ] `extendedTableMatchers.ts` に header 用 matcher を追加
  - [ ] `tableMergePlugin.ts` を `table_header` にも対応
  - [ ] `view.ts` unmerge ハンドラを `table_header` に対応
- [ ] フェーズ D: シリアライズ
  - [ ] `toMarkdown` で複数ヘッダー行を正しく出力
  - [ ] ラウンドトリップテスト（md → parse → serialize → md が一致）
- [ ] フェーズ E: エディタ UI
  - [ ] 「ヘッダー行を追加」UI
  - [ ] ヘッダーセルへの ⊠ ボタン表示
- [ ] lint / check-types / test:unit / smoke テスト PASS

## 懸念事項・未決定事項

- フェーズ A の「パラグラフ→ヘッダー行変換」は列数が一致しないケースのハンドリングが必要（列数不一致のパラグラフは変換しない）
- ヘッダー行間の rowspan (`^`) 対応: remark-extended-table の `i <= 1` ガードを回避する必要あり（ラッパーで上書きするか、フェーズ A で直接 rowspan を計算するか）
- ProseMirror の `table_header_row` 複数許可: Milkdown 内部の table 操作コマンド（行追加・削除など）が1行前提で実装されている可能性があり、既存機能の回帰リスクがある
