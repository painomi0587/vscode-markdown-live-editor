---
title: Extended Table Bug Fixes
status: in_progress
trust: normal
responsiveness: relaxed
image_clarity: specific
---

# Plan 0001: Extended Table Bug Fixes

## 目的

拡張テーブル機能（colspan/rowspan構文・セル結合解除）のバグ修正と、テスト基盤の修正。

## 対象

- `src/view/view.ts` — unmerge ロジック
- `src/view/extendedTablePlugin.ts` — スキーマ定義
- `test/unit/extendedTablePlugin.test.ts` — テスト設計誤り
- `tsconfig.test.json` — moduleResolution の非互換

## バグ一覧

### Bug 1 (HIGH): colspan unmerge のセル順序逆転
- **場所**: `view.ts:804`
- **症状**: `[...extraCells, emptyCell]` → 元コンテンツが最後のセルに入る
- **修正**: `[emptyCell, ...extraCells]`

### Bug 2 (MEDIUM): rowspan unmerge の position drift
- **場所**: `view.ts` rowspan ループ
- **症状**: rowspan > 2 のとき、後続行への placeholder 挿入位置が前の挿入で
  ずれているのに `tr.mapping.map()` していないため、誤位置に挿入される
- **修正**: 各行の `insertPos` を `tr.mapping.map(computedPos)` でマップ

### Bug 3 (CRITICAL): テストランナー全滅
- **場所**: `tsconfig.test.json`
- **症状**: `"moduleResolution": "bundler"` → コンパイル後 import に `.js` なし
  → Node v22 ESM ローダーが全テスト `ERR_MODULE_NOT_FOUND` で失敗
- **修正**: `"module": "CommonJS"`, `"moduleResolution": "Node"` に変更

### Bug 4 (MEDIUM): extendedTablePlugin.test.ts の設計誤り
- **場所**: `test/unit/extendedTablePlugin.test.ts`
- **症状**: `plugin.schema` はエディタ初期化後にのみ設定される。
  テストは undefined を参照している。また Milkdown は ESM-only なので
  CommonJS テストランナーでロードできない。
- **修正**: match 述語を `extendedTablePlugin.ts` から pure helper として export し、
  テストはその helper のみをインポート（Milkdown 不要）

## 実装ステップ

- [x] tsconfig.test.json を CommonJS に修正
- [x] extendedTableMatchers.ts を新規作成 (pure matchers)
- [x] extendedTablePlugin.ts から matchers を再エクスポート
- [x] extendedTablePlugin.test.ts を match 述語のみテストするよう書き換え
- [x] view.ts: colspan unmerge のセル順序を修正 (Bug 1)
- [x] view.ts: rowspan unmerge の position mapping を修正 (Bug 2)
- [x] lint PASS / check-types PASS / test:unit 43/43 PASS

status: completed
