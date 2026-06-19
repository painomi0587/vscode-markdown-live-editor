---
title: Markdown Table Auto-Formatter
trust: normal
responsiveness: relaxed
image_clarity: balanced
---

# 0003 — Markdown Table Auto-Formatter

## 概要

通常テキストエディタで Markdown ファイルを編集する際に、テーブルのセル幅を自動的に揃えるフォーマッタを追加する。
全角文字（日本語・中国語・韓国語等）はモノスペースフォントで 2 カラム幅を占めるため、表示幅ベースでパディングを計算する。

## 要件

- `|` を入力したタイミングで現在カーソルのあるテーブルブロックを整形する（OnTypeFormatting）
- 「フォーマットドキュメント」コマンドでドキュメント全体のテーブルを整形する（DocumentFormatting）
- 全角文字は幅 2 でカウントする
- セパレータ行の配置記号（`:---:`, `---:`, `:---`）を保持する
- コードブロック内のパイプ文字は整形しない
- 設定 `markdownLiveEditor.formatTableOnType`（boolean, default: true）で OnType 整形を無効化できる

## 実装ファイル

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `src/provider/tableFormatterProvider.ts` | 新規 | フォーマッタロジック + Provider クラス |
| `test/unit/tableFormatterProvider.test.ts` | 新規 | ユニットテスト |
| `src/extension.ts` | 変更 | Provider 登録 |
| `package.json` | 変更 | 設定項目追加 |

## アルゴリズム概要

1. **表示幅計算**: Unicode East Asian Width に基づき、全角文字を幅 2 でカウント
2. **テーブル検出**: `|` で始まる連続行をテーブルブロックとして扱う（コードブロック除外）
3. **列幅計算**: 各列の最大表示幅（セパレータは最小 3）を算出
4. **再レンダリング**: `| ${padded} | ${padded} |` 形式に統一

## 対象外

- WYSIWYG Milkdown エディタ内の整形（webview 側は対象外）
- 拡張テーブル構文（`^`/`:` rowspan/colspan）の特別扱い
