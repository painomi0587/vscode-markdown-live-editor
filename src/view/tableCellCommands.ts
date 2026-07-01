import type { Node as ProseMirrorNode } from '@milkdown/prose/model';
import type { EditorView } from '@milkdown/prose/view';
import { buildTableLayout, type TableCellLayout } from './tableLayout';

// Splits a merged cell (colspan/rowspan > 1) back into individual cells.
// Triggered by the ⊠ unmerge control from tableMergePlugin.
export function unmergeCellAt(view: EditorView, pos: number): void {
	const state = view.state;
	const node = state.doc.nodeAt(pos);
	const isHeaderCell = node?.type.name === 'table_header';
	if (!node || (node.type.name !== 'table_cell' && !isHeaderCell)) return;

	const colspan = (node.attrs.colspan as number) || 1;
	const rowspan = (node.attrs.rowspan as number) || 1;
	if (colspan <= 1 && rowspan <= 1) return;

	const { table_cell, table_header, paragraph } = state.schema.nodes;
	// Use the same cell type as the target cell when creating placeholders/splits.
	const cellType = isHeaderCell ? table_header : table_cell;
	const tr = state.tr;

	let targetTableNode: ProseMirrorNode | null = null;
	let targetTablePos = -1;
	state.doc.descendants((n, p) => {
		if (n.type.name !== 'table') return;
		if (p < pos && pos < p + n.nodeSize) {
			targetTableNode = n;
			targetTablePos = p;
		}
	});
	if (!targetTableNode) return;

	const rows = buildTableLayout(targetTableNode, targetTablePos);
	let targetRowIndex = -1;
	let targetCellInfo: TableCellLayout | null = null;

	for (let i = 0; i < rows.length; i++) {
		const rowInfo = rows[i];
		for (const cellInfo of rowInfo.cells) {
			if (cellInfo.pos === pos) {
				targetRowIndex = i;
				targetCellInfo = cellInfo;
				break;
			}
		}
		if (targetCellInfo) break;
	}
	if (!targetCellInfo) return;

	if (rowspan > 1) {
		for (let i = targetRowIndex + 1; i < targetRowIndex + rowspan; i++) {
			if (i >= rows.length) continue;
			const rowInfo = rows[i];

			const targetColumn = targetCellInfo.startColumn;

			// Replace existing placeholder cells rather than inserting new ones.
			// Two kinds of placeholder occupy the spanned columns:
			//   1. table_header cells with covered=true (multi-row header rows)
			//   2. table_cell cells whose text is "^" (remark-extended-table body rows)
			// Inserting alongside either kind inflates the column count and breaks
			// round-trip serialization, so we replace them in-place instead.
			const coveredInRange = rowInfo.cells.filter(
				(cell) =>
					cell.startColumn >= targetColumn &&
					cell.startColumn < targetColumn + colspan &&
					((cell.node.attrs.covered as boolean) ||
						cell.node.textContent === '^'),
			);

			if (coveredInRange.length > 0) {
				// Process in reverse order so later positions shift first.
				for (let k = coveredInRange.length - 1; k >= 0; k--) {
					const cc = coveredInRange[k];
					const cellPos = tr.mapping.map(cc.pos);
					const newAttrs: Record<string, unknown> = {
						colspan: 1,
						rowspan: 1,
						alignment: null,
					};
					if (cc.node.type.name === 'table_header') {
						newAttrs.covered = false;
					}
					const uncovered = cc.node.type.create(newAttrs, paragraph.create());
					tr.replaceWith(cellPos, cellPos + cc.node.nodeSize, uncovered);
				}
			} else {
				let computedPos = rowInfo.rowPos + rowInfo.row.nodeSize - 1;

				const beforeCell = rowInfo.cells.find(
					(cell) => cell.startColumn >= targetColumn,
				);
				const previousCell = [...rowInfo.cells]
					.filter((cell) => cell.startColumn < targetColumn)
					.pop();

				if (beforeCell) {
					computedPos = beforeCell.pos;
				} else if (
					previousCell &&
					previousCell.startColumn + previousCell.colspan > targetColumn
				) {
					computedPos = previousCell.pos + previousCell.node.nodeSize;
				}

				// Map through preceding insertions so position stays correct
				// when multiple rows need placeholder cells (rowspan > 2).
				const insertPos = tr.mapping.map(computedPos);

				for (let j = colspan - 1; j >= 0; j--) {
					const placeholderCell = cellType.create(
						{ colspan: 1, rowspan: 1, alignment: null },
						paragraph.create(),
					);
					tr.insert(insertPos, placeholderCell);
				}
			}
		}
	}

	const mappedPos = tr.mapping.map(pos);
	const emptyCell = cellType.create(
		{ colspan: 1, rowspan: 1, alignment: node.attrs.alignment },
		node.content,
	);
	const extraCells = [];
	for (let i = 1; i < colspan; i++) {
		extraCells.push(
			cellType.create(
				{ colspan: 1, rowspan: 1, alignment: null },
				paragraph.create(),
			),
		);
	}
	tr.replaceWith(mappedPos, mappedPos + node.nodeSize, [
		emptyCell,
		...extraCells,
	]);

	view.dispatch(tr);
}

// Inserts a new extra_header_row above/below the main header, one table_header
// cell per column. Triggered by multiRowHeaderUiPlugin's "add extra header" control.
export function addExtraHeaderRowAt(
	view: EditorView,
	insertPos: number,
	colCount: number,
): void {
	const state = view.state;
	const { extra_header_row, table_header, paragraph } = state.schema.nodes;
	const cells: ProseMirrorNode[] = [];
	for (let i = 0; i < colCount; i++) {
		cells.push(
			table_header.create(
				{ colspan: 1, rowspan: 1, alignment: null },
				paragraph.create(),
			),
		);
	}
	const newRow = extra_header_row.create({}, cells);
	const mappedPos = state.tr.mapping.map(insertPos);
	view.dispatch(state.tr.insert(mappedPos, newRow));
}

// Removes an extra_header_row. Triggered by multiRowHeaderUiPlugin's
// "remove extra header" control.
export function removeExtraHeaderRowAt(view: EditorView, rowPos: number): void {
	const state = view.state;
	const node = state.doc.nodeAt(rowPos);
	if (!node || node.type.name !== 'extra_header_row') return;
	view.dispatch(state.tr.delete(rowPos, rowPos + node.nodeSize));
}
