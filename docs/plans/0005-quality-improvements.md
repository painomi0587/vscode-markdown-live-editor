---
title: Project Quality Improvements
trust: normal
responsiveness: relaxed
image_clarity: balanced
---

# 0005 — プロジェクト品質改善

## 概要

これまでの実装で蓄積した技術的課題と、今後の開発を安定させるための品質改善を実施する。
主に「再発防止」と「開発体験」の2軸で改善する。

## 背景

- `tableRole:'row'` の誤削除による列追加不能バグ（`5534ca7` → `9740b0e` で修正）が発生した。  
  この種の regression は **列・行操作の統合テスト** があれば CI で検出できた。
- Windows の `core.autocrlf=true` 環境で worktree を使うたびに Biome が CRLF→LF 変換を要求し、  
  lint:fix → commit が必要になる。`.gitattributes` を追加すれば防止できる。
- `extraHeaderSyncPlugin` は現状ユニットテストが皆無。バグ修正を重ねたが、  
  次の変更で regression を招くリスクが高い。

## タスク一覧

### T1 — `.gitattributes` 追加（LF 強制）

**目的**: Windows の `core.autocrlf=true` によるワークツリー CRLF 問題を根本解決する。

**実装**:
```
# .gitattributes
* text=auto eol=lf
*.png binary
*.jpg binary
*.gif binary
*.ico binary
```

**ファイル**: `.gitattributes`（新規）

---

### T2 — `extraHeaderSyncPlugin` ユニットテスト追加

**目的**: `extraHeaderSyncPlugin` の動作を保証するテストを追加し、  
  将来の変更が plugin の挙動を壊さないよう CI でガードする。

**カバーすべきケース**:
1. 列を追加したとき `extra_header_row` のセルが同期されること
2. 列を削除したとき `extra_header_row` のセルが同期されること
3. spanning cell（colspan > 1）がある行で列を追加したとき、  
   prosemirror-tables が colspan を拡張するケースで二重挿入が起きないこと
4. `extra_header_row` を持たない通常テーブルではプラグインが何もしないこと

**ファイル**: `test/unit/extraHeaderSyncPlugin.test.ts`（新規）

---

### T3 — `extendedTablePlugin.test.ts` に列追加退行テストを追加

**目的**: `tableRole:'row'` の誤削除バグ再発を防ぐ regression test を追加する。

**カバーすべきケース**:
1. `extra_header_row` を持つテーブルで `addColumnAfter` が no-op にならないこと  
   （`tableRole:'row'` が存在しないと `isInTable()` が false を返すため no-op になる）
2. `extra_header_row` を持つテーブルで `addColumnBefore` が no-op にならないこと
3. `tableRole:'row'` が `extra_header_row` スキーマに定義されていること（型レベルの保証）

**ファイル**: `test/unit/extendedTablePlugin.test.ts`（追記）

---

## 実装順序

T1（`.gitattributes`）→ T2（extraHeaderSyncPlugin テスト）→ T3（退行テスト）の順で実施。  
各タスクは独立しているため並列実装も可能。

## 完了条件

- [ ] `.gitattributes` が追加され、既存ファイルがすべて LF で管理されている
- [ ] `npm run test:unit` で T2/T3 のテストがすべて green
- [ ] `npm run lint && npm run check-types && npm run test:unit` がすべて通過
