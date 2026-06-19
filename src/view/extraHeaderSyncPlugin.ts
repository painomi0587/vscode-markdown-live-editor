import type { Node as ProseNode } from '@milkdown/prose/model';
import { Plugin } from '@milkdown/prose/state';
import { $prose } from '@milkdown/utils';

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
 * Keeps `extra_header_row` cell counts in sync with `table_header_row` after
 * column operations (addColumnAfter, addColumnBefore, deleteColumn).
 *
 * Background: `extra_header_row` has no `tableRole:'row'`, so prosemirror-tables'
 * TableMap ignores it and column commands do not update it automatically.
 *
 * Known limitation: `extra_header_row` cells with `colspan > 1` are not handled.
 * The cell count will be corrected but the column alignment may be off.
 */
export const extraHeaderSyncPlugin = $prose(() => {
	return new Plugin({
		appendTransaction(transactions, oldState, newState) {
			if (transactions.every((tr) => !tr.docChanged)) return null;

			const tr = newState.tr;
			let modified = false;

			newState.doc.descendants((newTable, tablePos) => {
				if (newTable.type.name !== 'table') return; // keep descending non-table nodes

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

			return modified ? tr : null;
		},
	});
});
