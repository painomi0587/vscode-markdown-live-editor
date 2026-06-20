import type { Node as ProseNode } from '@milkdown/prose/model';
import { Plugin, PluginKey } from '@milkdown/prose/state';
import { $prose } from '@milkdown/utils';

const extraHeaderSyncKey = new PluginKey('extraHeaderSync');

/**
 * Returns the first index where `smaller` and `larger` differ by nodeSize or
 * textContent. Falls back to `smaller.childCount` (i.e., "change is at the end")
 * when all shared cells match.
 *
 * Limitation: adjacent empty cells of identical size are indistinguishable.
 * The index may be off in that case; the consequence is a new cell appearing
 * at a slightly wrong column in `extra_header_row`, not data corruption.
 */
function findChangeIndex(smaller: ProseNode, larger: ProseNode): number {
	const limit = smaller.childCount;
	for (let i = 0; i < limit; i++) {
		const a = smaller.child(i);
		const b = larger.child(i);
		if (a.nodeSize !== b.nodeSize || a.textContent !== b.textContent) {
			return i;
		}
	}
	return limit;
}

/**
 * Safety net: keeps `extra_header_row` in sync with `table_header_row` after
 * column operations. Because `extra_header_row` has `tableRole:'row'`,
 * prosemirror-tables already handles it in the common case (cell inserted or
 * removed). This plugin only acts when the two rows diverge — e.g., after
 * deleting a column that was inside a spanning cell's range, the covered
 * placeholder `>` (colspan=0) becomes orphaned and must be removed here.
 *
 * Guard: if `extra_header_row`'s total colspan sum already matches the new
 * header count (meaning prosemirror-tables handled it by extending a spanning
 * cell's colspan rather than inserting a new cell), this plugin skips to avoid
 * double-modification.
 */
export const extraHeaderSyncPlugin = $prose(() => {
	return new Plugin({
		key: extraHeaderSyncKey,
		appendTransaction(transactions, oldState, newState) {
			if (transactions.every((tr) => !tr.docChanged)) return null;
			// Bail if one of the incoming transactions is our own output, preventing
			// an infinite appendTransaction loop.
			if (transactions.some((tr) => tr.getMeta(extraHeaderSyncKey)))
				return null;

			const tr = newState.tr;
			let modified = false;

			newState.doc.descendants((newTable, tablePos) => {
				if (newTable.type.name !== 'table') return; // keep descending non-table nodes

				// Note: tablePos is from newState.doc. Using it directly on oldState.doc
				// is incorrect when content was inserted before this table in the same
				// transaction. In practice this only causes a silent no-op (oldTable
				// is null or wrong type) and the common single-table case is unaffected.
				const oldTable = oldState.doc.nodeAt(tablePos);
				if (!oldTable || oldTable.type.name !== 'table') return false;

				let newHeaderRow: ProseNode | null = null;
				let oldHeaderRow: ProseNode | null = null;
				const extraHeaderRows: Array<{ row: ProseNode; offset: number }> = [];

				newTable.forEach((child, childOffset) => {
					if (child.type.name === 'table_header_row') newHeaderRow = child;
					else if (child.type.name === 'extra_header_row')
						extraHeaderRows.push({ row: child, offset: childOffset });
				});
				oldTable.forEach((child) => {
					if (child.type.name === 'table_header_row') oldHeaderRow = child;
				});

				if (!newHeaderRow || !oldHeaderRow || extraHeaderRows.length === 0)
					return false;

				const headerDiff =
					(newHeaderRow as ProseNode).childCount -
					(oldHeaderRow as ProseNode).childCount;
				if (headerDiff === 0) return false;

				for (const { row: extraRow, offset: rowOffset } of extraHeaderRows) {
					const extraDiff =
						(newHeaderRow as ProseNode).childCount - extraRow.childCount;
					if (extraDiff === 0) continue;

					// If prosemirror-tables handled this row by extending a spanning
					// cell's colspan (instead of inserting/removing a cell), the colspan
					// sum already reflects the new column count — skip to avoid a
					// spurious extra cell insertion.
					if (extraDiff > 0) {
						let extraColspanTotal = 0;
						extraRow.forEach((cell: ProseNode) => {
							extraColspanTotal += (cell.attrs.colspan as number) || 0;
						});
						if (extraColspanTotal >= (newHeaderRow as ProseNode).childCount)
							continue;
					}

					// rawRowPos is the doc position of the extra_header_row in newState.doc.
					// tr.mapping.map() compensates for any earlier steps in this appendTransaction.
					const rawRowPos = tablePos + 1 + rowOffset;

					if (extraDiff > 0) {
						const changeIdx = findChangeIndex(
							oldHeaderRow as ProseNode,
							newHeaderRow as ProseNode,
						);
						const { table_header, paragraph } = newState.schema.nodes;

						let insertOffset: number;
						if (changeIdx >= extraRow.childCount) {
							// Append after the last cell (before the row's closing token)
							insertOffset = extraRow.nodeSize - 1;
						} else {
							insertOffset = 1; // skip the row's opening token
							for (let i = 0; i < changeIdx; i++) {
								insertOffset += extraRow.child(i).nodeSize;
							}
						}

						// Insert all new cells at once to preserve left-to-right order
						const newCells: ProseNode[] = Array.from(
							{ length: extraDiff },
							() => table_header.create({}, paragraph.create()),
						);
						tr.insert(tr.mapping.map(rawRowPos + insertOffset), newCells);
						modified = true;
					} else {
						// Columns were removed: delete starting at changeIdx, then changeIdx+1, ...
						// tr.mapping compensates for each prior deletion within this transaction.
						const changeIdx = findChangeIndex(
							newHeaderRow as ProseNode,
							oldHeaderRow as ProseNode,
						);

						for (let i = 0; i < -extraDiff; i++) {
							const cellIdx = changeIdx + i;
							if (cellIdx >= extraRow.childCount) break;

							let cellOffset = 1;
							for (let j = 0; j < cellIdx; j++) {
								cellOffset += extraRow.child(j).nodeSize;
							}
							const cellDocPos = tr.mapping.map(rawRowPos + cellOffset);
							tr.delete(
								cellDocPos,
								cellDocPos + extraRow.child(cellIdx).nodeSize,
							);
							modified = true;
						}
					}
				}

				return false; // don't descend into table children
			});

			if (modified) {
				tr.setMeta(extraHeaderSyncKey, true);
				return tr;
			}
			return null;
		},
	});
});
