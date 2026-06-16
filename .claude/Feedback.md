# Process Feedback

開発プロセスの振り返りと改善を記録する。

## 記録方法

タスク完了時や問題発生時に、以下のいずれかのセクションに追記する。

## オーナーフィードバック

## 問題の記録

### 2026-06-16: vsce publish がリモート環境から実行不可
- リモート実行環境のネットワーク egress ポリシーが `marketplace.visualstudio.com` への接続をブロックする
- `.vsix` のビルドは成功するが publish の HTTP リクエストが通らない
- **対処**: ローカルマシンから `npx @vscode/vsce publish -p <PAT>` を実行するか、GitHub Actions ワークフローを追加して tag push 時に自動 publish する

## 改善アクション

### 2026-06-16: vscode 拡張リリース用の GitHub Actions ワークフローを追加する（任意）
- `.github/workflows/release.yml` を作成し、`v*` タグ push 時に `vsce publish` を実行
- PAT を GitHub repository secret に登録して使う

## 完了済み
