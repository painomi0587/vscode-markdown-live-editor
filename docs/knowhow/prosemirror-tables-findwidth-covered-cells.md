---
title: prosemirror-tables findWidth() が covered cells を二重カウントする問題と coveredColspan 対処
created: 2026-06-20
last_verified: 2026-06-20
depends_on:
  - file: src/view/extendedTablePlugin.ts
  - file: node_modules/prosemirror-tables/dist/index.js
status: active
---

# prosemirror-tables findWidth() が covered cells を二重カウントする問題と coveredColspan 対処

## 問題

`prosemirror-tables` の `findWidth(table)` は全行の colspan 合計を計算して最大値を返す。
`extra_header_row` に rowspan セルで覆われた covered cell（`^` プレースホルダー）が `colspan=1` で存在すると、
その列が親セル（rowspan）側と covered cell 側で**二重カウント**される。

例: 2列テーブルで H1(rowspan=2, colspan=1) がある場合
- `extra_header_row` の covered cell を `colspan=1` にすると findWidth=3（本来は2）
- 幅が3になった TableMap で `positionAt(row, 2, table)` を呼ぶと無効な位置が返る
- `findCell(pos)` が `"No cell with offset X found"` で RangeError を投げる
- これは行追加（addRowAfter）などのコマンドが `CellSelection.rowSelection` を使うときに発生する

## 対処: covered cells に colspan=0 を設定する

covered cell の ProseMirror model 上の `colspan` を `0` に設定すると `findWidth()` がその列をスキップする。
ただし `colspan=0` はシリアライズ時に `>` マーカー数の計算に使えない。

→ **`coveredColspan` 属性を追加して visual width を分離保存する。**

### extendedTableHeaderSchema での実装

```typescript
attrs: {
    colspan: { default: 1 },      // PM model 上は covered ? 0 : origColspan
    coveredColspan: { default: 1 }, // visual width (covered ? origColspan : 1)
    covered: { default: false },
    ...
}
```

**parseMarkdown.runner**:
```typescript
const origColspan = (node.colspan as number) || 1;
const colspan = covered ? 0 : origColspan;
const coveredColspan = covered ? origColspan : 1;
state.openNode(type, { alignment, colspan, rowspan, covered, coveredColspan });
```

**toMarkdown.runner**: covered cell の serialize には `coveredColspan` を使う
```typescript
colspan: node.attrs.covered ? node.attrs.coveredColspan : node.attrs.colspan,
```

**preTableRow serialization**: `>` マーカー数の計算にも `coveredColspan` を使う
```typescript
const cs = cell.attrs.covered
    ? ((cell.attrs.coveredColspan as number) ?? 1)
    : ((cell.attrs.colspan as number) ?? 1);
for (let k = 1; k < cs; k++) parts.push('>');
```

**toDOM**: `colspan=0` は DOM に出力しない（`0 > 1` が false のため自動的に省略される）。
covered 判定は `data-covered` 属性で行う。`coveredColspan > 1` の場合は `data-covered-colspan` を出力。

**parseDOM.getAttrs**: `data-covered` を見て covered を判定し、`data-covered-colspan` または `domColspan` から `coveredColspan` を復元する。

## buildTableLayout の対応 (view.ts)

`buildTableLayout` 内でも `|| 1` による暗黙変換があり、covered cell の列送りが `coveredColspan` ではなく `1` になる。
`coveredColspan > 1` のケース（colspan=2 の rowspan セルで覆われた covered cell）で
後続セルの `startColumn` がずれ、unmerge UI の `coveredInRange` フィルタが誤セルを対象にする。

修正: covered cell に対しては `coveredColspan` を使って列を進める。
```typescript
const colspan = cell.attrs.covered
    ? (cell.attrs.coveredColspan as number) || 1
    : (cell.attrs.colspan as number) || 1;
```

## 注意点・制約

- `colspan=0` は ProseMirror schema として有効だが、prosemirror-tables の `fixTables` は
  `extra_header_row` を `tableRole:'row'` なしで定義していれば無視してくれる（この前提に依存）
- `extra_header_row` に `tableRole:'row'` を設定すると `fixTables` が colspan=0 を「1」に補正して
  "mismatched transaction" を引き起こす（別バグ、Plan 0004 の前半で対処済み）
- `multiRowHeaderPlugin.ts` の covered cell 生成（Line 258-264）では `colspan: cs` を設定しているが、
  スキーマの `parseMarkdown.runner` 側で `covered ? 0 : cs` に変換するので生成側は変更不要

## 参照

- `src/view/extendedTablePlugin.ts` — 実装箇所
- `node_modules/prosemirror-tables/dist/index.js` L181-203 — `findWidth` の実装
- `node_modules/prosemirror-tables/dist/index.js` L117-180 — `computeMap` の実装
- `test/unit/extendedTablePlugin.test.ts` — coveredColspan ロジックのユニットテスト
