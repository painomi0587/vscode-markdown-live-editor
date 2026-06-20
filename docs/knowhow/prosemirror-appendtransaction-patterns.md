---
title: ProseMirror appendTransaction の実装パターン（無限ループガード・複数位置補正）
created: 2026-06-20
last_verified: 2026-06-20
depends_on:
  - file: src/view/extraHeaderSyncPlugin.ts
status: active
---

# ProseMirror appendTransaction の実装パターン

## 無限ループガード

`appendTransaction` が `tr` を返すと、それ自体が新たなトランザクションとしてサイクルをトリガーする。
条件次第では無限ループになる。**PluginKey + getMeta/setMeta** で防ぐ。

```typescript
import { Plugin, PluginKey } from '@milkdown/prose/state';

const myPluginKey = new PluginKey('myPlugin');

new Plugin({
    key: myPluginKey,
    appendTransaction(transactions, _old, newState) {
        if (transactions.every((tr) => !tr.docChanged)) return null;
        // 自プラグインが生成したトランザクションは再処理しない
        if (transactions.some((tr) => tr.getMeta(myPluginKey))) return null;

        const tr = newState.tr;
        let modified = false;
        // ... 変更処理 ...
        if (modified) {
            tr.setMeta(myPluginKey, true); // 自プラグイン産であることをマーク
            return tr;
        }
        return null;
    },
});
```

`docChanged` ガードだけでは不十分。同じプラグインが生成したトランザクションを
`getMeta` で識別してスキップするのがより安全。

## 複数ステップの位置補正 (tr.mapping.map)

1つの `appendTransaction` 内で複数の挿入/削除を行う場合、
先行ステップによるオフセットずれを `tr.mapping.map(rawPos)` で補正する。

```typescript
// rawPos は newState.doc 上の素の位置（変換前）
// tr.mapping は「これまでに追加したすべてのステップ」の累積マッピング
const mappedPos = tr.mapping.map(rawPos);
tr.insert(mappedPos, newNode);

// 削除の場合（逆順ループで位置補正が効く）
for (let i = N - 1; i >= 0; i--) {
    const cellPos = tr.mapping.map(rawCellPos[i]);
    tr.delete(cellPos, cellPos + node.child(i).nodeSize);
}
```

逆順ループで削除する場合、後ろから消していけば前の削除のオフセットが後ろの位置に影響しないが、
`tr.mapping` を使えば任意順序でも正しい位置が得られる。

## oldState 上の位置引き当ての限界

`appendTransaction(transactions, oldState, newState)` での oldState 参照:

```typescript
// newState.doc.descendants で得た tablePos を oldState に使うのは原則誤り。
// 同一トランザクションで先に別テーブルが挿入されていると tablePos がずれる。
const oldTable = oldState.doc.nodeAt(tablePos);  // ← 位置ずれのリスクあり
```

正確には `transactions[0].mapping.invert().map(tablePos)` で oldState 上の位置を求める。
ただし「null または型違いのとき early return」という防御があれば、
単テーブル・単操作の一般ケースは問題なく動作する（型チェックで外れた場合は no-op になるだけ）。
コメントで限界を文書化しておく。

## 参照

- `src/view/extraHeaderSyncPlugin.ts` — 実装例
- ProseMirror ドキュメント: State > Plugin > appendTransaction
