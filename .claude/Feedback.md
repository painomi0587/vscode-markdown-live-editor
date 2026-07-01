# Process Feedback

開発プロセスの振り返りと改善を記録する。

## 記録方法

タスク完了時や問題発生時に、以下のいずれかのセクションに追記する。

## オーナーフィードバック

## 問題の記録

### 2026-07-01: git tag の push がリモート環境から実行不可
- このリモート実行環境の git リレー（`http://local_proxy@127.0.0.1:<port>/git/...`）は branch の push は通すが、`git push origin v1.0.3` のような tag push は `HTTP 403` で拒否される（ネットワークエラーではなくポリシー拒否のため再試行しても無駄）
- GitHub MCP ツールセットにも tag/release を直接作成するツールが存在しない（`create_branch` はあるが `create_tag` / `create_release` 相当がない）
- `.github/workflows/publish.yml` は `on: push: tags: ['v*']` で発火する設計のため、tag を push できないとこの環境からは Marketplace/OpenVSX への自動公開を発火できない
- **対処**: バージョン番号・CHANGELOG・main への反映はエージェントが実施し、実際の `v*` タグ作成（または GitHub の Release 作成 UI）はオーナー自身が行う運用とする

## 改善アクション

## 完了済み

### 2026-06-16: vscode 拡張リリース用の GitHub Actions ワークフローを追加する（任意）
- `.github/workflows/publish.yml` として実装済み。`v*` タグ push 時に `vsce publish` / `ovsx publish` / GitHub Release 作成を実行する
- PAT は `VSCE_PAT` / `OVSX_PAT` として GitHub repository secret に登録されている前提
