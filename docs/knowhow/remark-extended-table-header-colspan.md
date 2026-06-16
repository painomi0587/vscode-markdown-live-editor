# remark-extended-table: ヘッダー行の colspan が serialize で消える問題と対処

## 問題

`remark-extended-table` の `to-markdown.js` にある table ハンドラはループを `i = 1` から始める。
これは「GFM のヘッダー行（`i=0`）は remark-gfm 側が処理する」という分業が理由だが、
その結果、**ヘッダー行の colspan が serialize 時に `>` マーカーとして出力されない**。
ファイル保存 → 再読み込みのたびにヘッダー行の colspan が失われる。

## 対処: カスタム table ハンドラで全行を処理する

`mdast-util-gfm-table` の `gfmTableToMarkdown()` が返す `handlers.table` を取得し、
自前の `customTableHandler` でラップして **`i=0` を含む全行** を処理する。

```typescript
import { gfmTableToMarkdown } from 'mdast-util-gfm-table';

const _rawGfmExt = gfmTableToMarkdown() as unknown as {
    handlers?: { table?: (n: AnyTable, p: unknown, c: unknown, s: unknown) => string };
};
if (typeof _rawGfmExt.handlers?.table !== 'function') {
    throw new Error('mdast-util-gfm-table internal API changed: handlers.table not found');
}
const _gfmTableHandler = _rawGfmExt.handlers.table;
```

カスタムハンドラをモジュールレベルでキャッシュし、remark プラグインの `toMarkdownExtensions` に登録する。
`remarkMultiRowHeader` を `remarkExtendedTable` より後に登録すれば同じキーで上書きできる。

## `>` の方向と remark-extended-table の慣例

`remark-extended-table` では `>` は**右のセルが colspan を持つ**ことを示すプレースホルダー:

```
| > | A | B |   →  A(colspan=2), B(colspan=1)
```

つまり `>` は**スパンするセルの左**に置く。独自プラグインで `>` を扱う場合は必ずこの方向に揃える。
逆向き（`| A | > |`）で実装すると serialize と parse の方向が不一致になり、ラウンドトリップで壊れる。

## ヘッダー行の `node.align` 同期

`customTableHandler` が `i=0` で colspan セルを splice 挿入するとき、
`node.align` も同じ位置に `null` を挿入しないと align 列数がずれる。

```typescript
if (i === 0 && node.align) node.align.splice(j, 0, null);
```

## API 安定性ガード

`gfmTableToMarkdown` の内部 `handlers.table` はパブリック API ではない。
モジュール初期化時に `typeof handlers.table !== 'function'` をチェックし、
変わっていたら `throw` して即座に気付けるようにする（サイレント劣化より明示的クラッシュが良い）。
