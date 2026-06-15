# 進捗表

## 運用ルール

### タスク開始時
1. `.claude/Feedback.md` を読み、前回の改善アクションで未対応のものがあれば考慮する
2. 以下の手順で Markdown チェックリストを作成する
   1. 1ショットで作業できる範囲にサブタスクを分割する
   2. 並行作業できる粒度でさらに分割する
   3. 各サブタスクにテスト作成・統合テスト・Lint・ビルドが必要か検討し、必要なら追加する
   4. 必要に応じて 2.1〜2.3 を再帰的に適用する

### 作業中
3. サブタスク着手時に `- [x]` でチェックしていく。並列可能なタスクはコンテナオーケストレーションを利用する
   - Plan の曖昧さで確信が持てないときは CLAUDE.md「迷ったときの作法（7割共有原則）」に従う（閾値割れなら `.claude/Questions.md` に質問を置いてタスクを切り替える）
   - 長大なタスクでは、サブタスク完了時点でブランチ `checkpoint/<phase>-<N>` を切ってよい。別方針を試すときは checkpoint から `alt/` を分岐する
3.5. **日記を書く（代替わり引き継ぎ）**（「3.5」は後続の番号参照を壊さないための意図的な枝番）: resume・compaction・`/loop` の次イテレーションで起きる「小さな代替わり」のたびに、次の代の自分（同僚でもあり、寝て起きたあとの自分でもある）が状況に入れるよう、タスクの「#### 日記」セクションにエントリーを書く
   - **書くタイミング**: サブタスク完了時 / 重要な判断をした直後 / 計画を変更したとき / コンテキストが長くなり compaction を予感したとき
   - **書式（4項目）**（時刻 HH:MM は省略可）:
     ```
     ##### YYYY-MM-DD HH:MM — <出来事の一行>
     **やったこと**: <完了した作業と判断の要約>
     **今の見立て**: <現状認識。確信度があれば記す>
     **次の自分へ**: <次に着手すべきこと・先に確認すべきこと>
     **気になっていること**: <未解決の不確実性・前提・違和感。なければ「なし」>
     ```
   - 「日記」という語彙の意図（「遺書」を使わない理由）は `docs/guides/development-process.md` 参照
   - ブランチ checkpoint が「何がコミットされたか（事実）」を残すのに対し、日記は「なぜそうしたか・次に何を考えていたか（文脈）」を残す。両方で前任者の靴に履き替えられる
   - 日記の自動生成フックは導入しない。書くこと自体が思考の整理であり、次の自分への手紙として人格を持って書く
4. 実装フェーズの最終サブタスク完了時、以下の知見を `/addf-knowhow` で記録する（既存 knowhow の更新も含む）:
   - **コーディング知見**: 実装中に発見した再利用可能なパターン、落とし穴、技術的判断とその根拠
   - **分かれ道の目印**: 差し戻し・やり直し・想定外の判断が発生したサブタスクがあれば、使用したスキルの `.exp.md`「🔀 分かれ道の目印」にも追記する（書式: `.claude/templates/ExperienceTemplate.md`。失敗の告白ではなく、意思決定が枝分かれしたポイントと次に同じ分岐に立ったときの選び方を道標として書く）

### エージェント起動時の共通ルール
- エージェントチーム（TeamCreate）やサブエージェント（Agent）を作成するとき、各エージェントへのプロンプトに **最初に `/addf-knowhow-index` を実行する** よう指示を含めること
- これにより各エージェントがプロジェクトの知見ベースを把握した状態で作業を開始できる

### タスク完了時 — 品質検証

4. プロジェクトのビルド・Lint・テストコマンドを実行する
   - **失敗した場合 → 実装に差し戻す**。原因分析 → 修正 → 再実行
5. `addf-code-review-agent` でコードレビューを実施する
   - 通常タスクは単体（ペルソナなし）で起動する
   - **マイルストーン・リリース直前・`mode: critical` 宣言時・unattended 自走時（`/addf-mode unattended`）**は、ペルソナ並列（視点ずらしレビュー）を起動する。起動前に `.claude/agents/addf-code-review-agent.md` を読み、ペルソナ定義に従うこと
   - ペルソナ並列の集約: 同一箇所・同一原因の指摘は1件にまとめてペルソナを列挙する。**2ペルソナ以上が独立に指摘した項目は重要度を1段上げる**（コンセンサス補正）
6. `addf-contribution-agent` で ADD フレームワークへのコントリビューション候補を検出する
7. レビュー指摘への対応:
   - **Critical/High**: 必ずこのフェーズ内で修正する（先送り禁止）
   - **Medium**: 原則修正。先送りする場合は独立計画を起こす
   - **Low/Info**: Plan に記録し、必要に応じて独立計画で対応
   - **バグ分離**: 発見されたバグが現在のプランと関心事が異なる場合は、修正せずに新しいプラン（`docs/plans/`）を書き起こし、`TODO.md` に追加するのみで現在のプランを完了させる
   - 修正後、ビルド・Lint・テストを再実行して通過を確認する
8. 品質ゲートで得た知見を `/addf-knowhow` で記録する:
   - **品質ゲート知見**: レビューエージェントが検出したパターン（セキュリティ、コード品質、分離パターン違反等）のうち、他のタスクでも再発しうるもの

#### ノウハウ蓄積

9. 投入されたタスクのPlanに実装完了状況を反映する
10. タスク全体の総括知見を `/addf-knowhow` で記録する:
    - **タスク総括**: 計画と実装のギャップ、想定外だった点、次回同種タスクへの教訓。コーディング・品質ゲートで既に記録した知見と重複しないこと

#### フィードバック記録

11. `.claude/Feedback.md` にPlan, TODO, Progress推進エンジンの問題の記録・改善アクションを追記する。反映済みの項目は削除する
12. `.claude/Feedback.md` にプロジェクト進行上の問題の記録・改善アクションを追記する。反映済みの項目は削除する
13. Progress 推進エンジン自体に関するフィードバック・ノウハウがあれば、テンプレート（`.claude/templates/ProgressTemplate.md`）の改善案を `.claude/Feedback.md` に記録する

#### アーカイブとコミット

14. `.claude/Progresses/YYYY-MM-DD-プラン名.md` にリネームして移動し、`.claude/templates/ProgressTemplate.md` から新規の Progress.md を作成する
15. コミットする

---

## タスク

### 現在のタスク: Plan 0002 — Multi-Row Table Header

#### サブタスクチェックリスト

- [x] `src/view/multiRowHeaderPlugin.ts` 新規作成（remarkMultiRowHeader プラグイン）
- [x] `src/view/extendedTableMatchers.ts` 更新（isTableHeaderMarkdownNode / isTableHeaderProseNode 追加、isTableCellMarkdownNode を header 除外に修正）
- [x] `src/view/extendedTablePlugin.ts` 更新（extendedTableHeaderSchema / extraHeaderRowSchema / multiRowTableSchema / extendedTableRowSchema / extendedTableHeaderRowSchema / multiRowHeaderPlugin 追加）
- [x] `src/view/tableMergePlugin.ts` 更新（table_header セルも merge 対象に）
- [x] `src/view/view.ts` 更新（新スキーマ登録、unmerge ハンドラを table_header 対応に）
- [x] processColspan バグ修正（`>` は右のセルではなく左のセルに colspan を付与）
- [x] `test/unit/multiRowHeaderPlugin.test.ts` 新規作成（12テスト PASS）
- [x] `tsconfig.test.json` に multiRowHeaderPlugin.ts を追加
- [x] lint (biome) PASS / 型チェック (tsc --noEmit) PASS
- [x] test:unit 55/55 PASS / esbuild bundle PASS
- [x] CSS: `tr[data-extra-header]` をヘッダー行として見た目に反映（Phase E）
- [x] UI: ヘッダー行の追加・削除ボタン（Phase E）
- [x] CSS: `tr[data-is-header] th` にも同じグレー背景を追加（v0.1.6）
- [x] バグ修正: media/view.js が古いバンドルだったため再コンパイル（v0.1.5 fix を含む）
- [x] バグ修正: 結合解除で covered `^` セルを置換せず挿入していたため列数が増える問題を修正

#### 日記

##### 2026-06-14 — Plan 0002 コア実装完了、テスト PASS
**やったこと**: コンテキスト引き継ぎ後、lint (CRLF→LF / テンプレートリテラル / import順序) を修正して PASS。multiRowHeaderPlugin.test.ts を新規作成したが `processColspan` のセマンティクスバグを発見: `>` が左ではなく右のセルに colspan を付与していた。remark-extended-table と一致する「左延長」に修正し、ラウンドトリップ安定を確認。全 55 テスト PASS、型チェック・lint・ビルドも全 PASS。
**今の見立て**: Phase A〜D（remark プラグイン・スキーマ・view 登録・unmerge 対応）は完了。残りは Phase E（CSS + UI ボタン）のみ。ユーザー承認待ちで一旦コミットして問題ない状態。
**次の自分へ**: Phase E: `media/styles.css`（または webview 用の CSS ファイル）で `tr[data-extra-header] th` をヘッダーとして装飾する。ボタンは tableBlockPlugin や tableMergePlugin の既存パターンを参考に実装する。
**気になっていること**: extra_header_row の `toMarkdown.runner` で `openNode` を `as unknown as` でキャストしている。型安全ではないが SerializerState の公開 API が限られているため止む無し。

##### 2026-06-14 — バンドル未コンパイル問題と CSS 修正
**やったこと**: ユーザーが「まだbodyに落ちます」と報告。`media/view.js` を確認したところ v0.1.5 の修正が含まれていなかった（未コンパイル状態）。`npm run compile` で再ビルド。また標準ヘッダー行（`tr[data-is-header] th`）にグレー背景 CSS を追加 — extra_header_row と同じスタイルにすることで視覚的な混乱を解消。v0.1.6 としてコミット。
**今の見立て**: コード上の serialize/parse ロジックは正しい。ユーザーの問題は「バンドル古い」か「既存ファイルが旧バージョンで壊れた」のいずれか。CSS 修正で視覚的誤認も解消される。
**次の自分へ**: Plan 0002 は実質完了。次は品質検証フロー（コードレビュー・ノウハウ記録・Progress アーカイブ・TODO 更新）を実行するか、ユーザーの次の要望を待つ。
**気になっていること**: 旧バージョンで保存されたファイルはピパラグラフなしのテーブルになっているため、自動復旧できない。ユーザーに手動修正を案内する必要があるかもしれない。

##### 2026-06-15 — unmerge バグ修正（covered ^ セル列数増加問題）
**やったこと**: ユーザー報告「結合解除したら壊れました」を調査。root cause: extra_header_row の rowspan セルを結合解除する際、unmerge ハンドラが次の行（table_header_row）に新しいプレースホルダーセルを「挿入」していたが、そこには既に covered=true の `^` セルが存在していた。結果、table_header_row の列数が増加し、extra_header_row と GFM ヘッダーの列数が不一致になり、re-parse 時に extra_header_row が拒否されて消える問題。修正: coveredInRange でその位置の covered セルを検出し、新規挿入ではなく in-place 置換（covered=false の空セルに差し替え）するよう変更。57 テスト PASS、compile PASS。
**今の見立て**: 修正は正しい。保護(cs=2) の colspan unmerge は rowspan=1 のため rowspan ブランチを通らず影響なし。項番/名前(rs=2) の rowspan unmerge は covered セルの置換で列数を維持できる。
**次の自分へ**: ユーザーに再テストを依頼。問題が解消されたらコミットして Plan 0002 の品質検証フローを完了させる。
**気になっていること**: cellType.create({...}) でコンテンツなしの table_header ノードを生成しているが、既存コード（else ブランチ）も同じ方法を使っており動作確認済みのため問題なし。
