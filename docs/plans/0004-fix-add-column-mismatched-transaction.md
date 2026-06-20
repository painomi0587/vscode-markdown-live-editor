---
title: Fix "mismatched transaction" when adding column to multi-row header table
status: done
trust: normal
responsiveness: relaxed
image_clarity: specific
---

# Plan 0004 — Fix "mismatched transaction" on addColumnAfter with extra_header_row

## バグの再現条件

- `extra_header_row` を持つテーブル（複数ヘッダー）で
- GFM ヘッダー行に `^`（rowspan covered セル、`colspan=0`）が存在する状態で
- WYSIWYG エディタの「列を右に追加」ボタンを押す

エラー: `RangeError: Applying a mismatched transaction`

## 根本原因

`extra_header_row` が `tableRole: 'row'` を持つため、`prosemirror-tables` の `TableMap` がこの行を通常の行として処理する。

一方、covered placeholder セル（`^`）は `colspan=0` に設定されている（fixTables 膨張防止のため commit 133ee78 で追加）。`TableMap` が `colspan=0` のセルを 0 幅と判断し、`table_header_row` の実効列数が `extra_header_row` より少なく見える。

```
extra_header_row:    A(cs=1) | B(cs=1,rs=2) | A(cs=1) | B(cs=1)  → 4列
table_header_row:    A(cs=1) | ^(cs=0)      | A(cs=1) | B(cs=1)  → 3列 ← ずれ
```

`addColumnAfter` はこの不整合な `TableMap` を使って挿入位置を計算するため、トランザクションが実際のドキュメント構造と合わず "mismatched transaction" が発生する。

## 修正方針

### Step 1: `extra_header_row` から `tableRole: 'row'` を除去

`TableMap`（と `fixTables`）が `extra_header_row` を無視するようにする。
これにより covered セルを `colspan=1` に戻しても fixTables 膨張が起きなくなる。

```typescript
// extendedTablePlugin.ts — extraHeaderRowSchema
export const extraHeaderRowSchema = $nodeSchema('extra_header_row', () => ({
    content: '(table_header)*',
    // tableRole: 'row' を削除 → TableMap から見えなくなる
    isolating: true,
    ...
}));
```

### Step 2: covered セルを `colspan=1` に戻す

`TableMap` が `extra_header_row` を見なくなるため、`table_header_row` の covered セルは `colspan=1` でも fixTables に膨張されない。

```typescript
// extendedTablePlugin.ts — extendedTableHeaderSchema.parseMarkdown.runner
const colspan = (node.colspan as number) || 1;  // covered ? 0 から戻す
```

### Step 3: `appendTransaction` プラグインで extra_header_row の列を同期

`tableRole: 'row'` を外すと `addColumnAfter` / `deleteColumn` が `extra_header_row` を更新しなくなる。
`appendTransaction` プラグインで、テーブル本体（`table_header_row` 基準）と `extra_header_row` の列数差を検出し自動補完する。

```typescript
// 新規ファイル: src/view/extraHeaderSyncPlugin.ts
new Plugin({
    appendTransaction(transactions, _oldState, newState) {
        if (transactions.every(tr => !tr.docChanged)) return null;
        const tr = newState.tr;
        let modified = false;

        newState.doc.descendants((table, tablePos) => {
            if (table.type.name !== 'table') return;

            // table_header_row の列数を基準にする
            let targetCols = 0;
            table.forEach((row) => {
                if (row.type.name === 'table_header_row') {
                    targetCols = row.childCount;
                }
            });
            if (targetCols === 0) return;

            // extra_header_row の列数と差異があれば補完 or 削除
            table.forEach((row, rowOffset) => {
                if (row.type.name !== 'extra_header_row') return;
                const rowPos = tablePos + 1 + rowOffset;
                const diff = targetCols - row.childCount;
                if (diff === 0) return;

                if (diff > 0) {
                    // 列が増えた → 末尾にセルを追加
                    const { table_header, paragraph } = newState.schema.nodes;
                    const insertPos = tr.mapping.map(rowPos + row.nodeSize - 1);
                    for (let i = 0; i < diff; i++) {
                        tr.insert(insertPos, table_header.create({}, paragraph.create()));
                    }
                } else {
                    // 列が減った → 末尾のセルを削除
                    for (let i = 0; i < -diff; i++) {
                        const lastChild = row.child(row.childCount - 1 - i);
                        const lastChildOffset = row.nodeSize - 1 - lastChild.nodeSize * (i + 1);
                        const from = tr.mapping.map(rowPos + lastChildOffset);
                        tr.delete(from, from + lastChild.nodeSize);
                    }
                }
                modified = true;
            });
        });

        return modified ? tr : null;
    }
});
```

### Step 4: テスト

- 単一ヘッダー行のテーブルに列追加 → 既存動作を壊さない
- `extra_header_row` あり・covered セルあり (`^`) で列追加 → エラーなし、extra_header_row にも列が増える
- colspan あり (`>`) のテーブルで列追加 → 正常
- 列削除も同様

## 注意事項

- `appendTransaction` 内でポジション計算を行うため、複数の `extra_header_row` が存在する場合は上から順に処理し `tr.mapping.map()` で位置ズレを補正する
- 削除列が末尾以外の場合（任意位置の列削除）は Step 3 の実装が不十分。列インデックスのマッピングが必要な場合は別途対応する
- `extra_header_row` の `tableRole` を除去すると `prosemirror-tables` の他の機能（セル選択範囲の計算等）が影響を受ける可能性がある。既存テストで回帰を確認すること

## 実装ファイル

| ファイル | 変更 |
|---|---|
| `src/view/extendedTablePlugin.ts` | `extraHeaderRowSchema` の `tableRole` 削除、`coveredColspan` attr 追加（colspan=0 は維持）|
| `src/view/extraHeaderSyncPlugin.ts` | 新規: appendTransaction プラグイン（PluginKey+metadata ガード付き）|
| `src/view/view.ts` | `extraHeaderSyncPlugin` の登録、`buildTableLayout` の `coveredColspan` 対応 |
| `test/unit/extendedTablePlugin.test.ts` | coveredColspan ロジックのユニットテスト追加 |

## 実装と計画のギャップ

当初計画では covered セルを `colspan=1` に戻す（Step 2）としていたが、実際には `colspan=0` を維持した。
理由: `colspan=1` にすると prosemirror-tables の `findWidth()` が covered cell を二重カウントし、
行追加（addRowAfter）時に `"No cell with offset X found"` RangeError が発生することが実装中に判明した。

代わりに `coveredColspan` 属性を追加して ProseMirror モデル上の colspan（=0）と
シリアライズ用の visual colspan（=coveredColspan）を分離した。
詳細: `docs/knowhow/prosemirror-tables-findwidth-covered-cells.md`
