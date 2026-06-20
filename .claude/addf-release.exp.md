---
name: addf-release-strategy
description: Markdown Live Editor Plus のリリース戦略（VS Code 拡張機能）
metadata:
  type: project
---

# リリース戦略 — Markdown Live Editor Plus

## バージョニング

- **方式**: semver (`MAJOR.MINOR.PATCH`)
- **更新ファイル**: `package.json` の `version` フィールド

## チェンジログ

- **ファイル**: `CHANGELOG.md`（Keep a Changelog 形式）
- リリース前に `## [vX.Y.Z] - YYYY-MM-DD` エントリを先頭に追記する

## プレリリースチェック

```bash
npm run compile && npm run test:all
```

失敗した場合はリリースを中断し、問題を修正してから再実行する。

## Git フロー

1. 作業ブランチでコミット（README / CHANGELOG / package.json 更新）
2. `main` ブランチにマージ（`--no-ff` 推奨）
3. `main` 上で `v{version}` タグを作成・push
4. タグ push が GitHub Actions `publish.yml` を起動し、VS Code Marketplace + OpenVSX へ自動 publish

```bash
git tag v{version}
git push origin main
git push origin v{version}
```

## Publish

- **手段**: GitHub Actions（`.github/workflows/publish.yml`）
- `v*` タグ push でトリガー
- Secrets: `VSCE_PAT`（VS Code Marketplace）、`OVSX_PAT`（OpenVSX）
- GitHub Release も自動作成（`--generate-notes`）

## 注意事項

- ローカルから `vsce publish` は **不可**（ネットワーク egress ポリシーでブロック）
- タグ push 後は GitHub Actions のログで publish 成功を確認すること
