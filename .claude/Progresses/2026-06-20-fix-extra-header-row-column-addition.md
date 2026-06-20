# 進捗アーカイブ: fix — extra_header_row 列追加不具合修正

## タスク

### 完了: fix — extra_header_row 列追加不具合修正

#### 日記

##### 2026-06-20 — tableRole:'row' 欠落による列追加不能バグを修正

**やったこと**: `extra_header_row` に `tableRole: 'row'` を追加（commit `9740b0e`）。prosemirror-tables の `isInTable()` が extra_header_row の `$head` に対して false を返すため `addColumnAfter/Before` がサイレントに no-op になっていたのが根本原因。`extraHeaderSyncPlugin.ts` にも colspan 合計ガードを追加し、prosemirror-tables が spanning cell の colspan を拡張した場合の二重挿入を防止した。ビルド・89ユニットテスト・スモーク全通過。`feature/table-formatter` にマージ済み（commit `17c94f5`）。

**今の見立て**: 修正完了（ユーザー確認済み「できた」）。commit `5534ca7` で `tableRole:'row'` を削除した際に regression が入った（そのコミットは `extraHeaderSyncPlugin` 導入と同時）。

**次の自分へ**: TODO.md のオーナーリクエスト「品質を向上させる計画を追加する」に取り組む。

**気になっていること**: worktree の `core.autocrlf=true` により lint が CRLF → LF 変換を要求した。`.gitattributes` を追加すると将来の worktree でこの問題を防げる（品質改善計画に含めると良い）。
