import type { Node as ProseMirrorNode } from '@milkdown/prose/model';

export interface TableCellLayout {
	node: ProseMirrorNode;
	pos: number;
	startColumn: number;
	colspan: number;
	rowspan: number;
}

export interface TableRowLayout {
	row: ProseMirrorNode;
	rowPos: number;
	cells: TableCellLayout[];
}

// Computes per-row cell layout (start column, effective colspan/rowspan) for
// a table node, accounting for prosemirror-tables' covered-cell model where
// covered cells store colspan=0 so findWidth() doesn't double-count them.
export function buildTableLayout(
	table: ProseMirrorNode,
	tableStart: number,
): TableRowLayout[] {
	const rows: TableRowLayout[] = [];
	const rowSpanCounts: number[] = [];

	table.forEach((row, rowOffset) => {
		// Include all row types so ⊠ unmerge works for cells in any row
		// (table_row, table_header_row, extra_header_row).
		if (
			row.type.name !== 'table_row' &&
			row.type.name !== 'table_header_row' &&
			row.type.name !== 'extra_header_row'
		)
			return;
		const rowPos = tableStart + 1 + rowOffset;
		const cells: TableCellLayout[] = [];
		let col = 0;

		row.forEach((cell, cellOffset) => {
			while (rowSpanCounts[col] > 0) {
				col += 1;
			}
			const startColumn = col;
			// Covered cells store colspan=0 in the PM model so prosemirror-tables'
			// findWidth() doesn't double-count them. Use coveredColspan for the
			// visual column advance so subsequent cells get the correct startColumn.
			const colspan = cell.attrs.covered
				? (cell.attrs.coveredColspan as number) || 1
				: (cell.attrs.colspan as number) || 1;
			const rowspan = (cell.attrs.rowspan as number) || 1;
			cells.push({
				node: cell,
				pos: rowPos + 1 + cellOffset,
				startColumn,
				colspan,
				rowspan,
			});

			for (let i = 0; i < colspan; i++) {
				const index = startColumn + i;
				if (rowspan > 1) {
					rowSpanCounts[index] = Math.max(
						rowSpanCounts[index] || 0,
						rowspan - 1,
					);
				} else if (rowSpanCounts[index] === undefined) {
					rowSpanCounts[index] = 0;
				}
			}
			col += colspan;
		});

		rows.push({ row, rowPos, cells });
		for (let i = 0; i < rowSpanCounts.length; i++) {
			if (rowSpanCounts[i] > 0) {
				rowSpanCounts[i] -= 1;
			}
		}
	});

	return rows;
}
