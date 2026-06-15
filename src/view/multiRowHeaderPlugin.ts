/**
 * Remark plugin that supports multiple header rows in GFM tables.
 *
 * PARSE direction (markdown → mdast):
 *   remark-gfm treats only the row immediately before `---` as the header.
 *   A paragraph of pipe-delimited lines immediately before a table is detected
 *   and re-injected as extra header rows (`tableRow` with `isExtraHeader: true`).
 *
 * SERIALIZE direction (mdast → markdown):
 *   Handled in multiRowTableSchema.toMarkdown.runner via `preTableRow` mdast
 *   nodes, which are stringified directly (no pipe escaping) with no blank line
 *   before the table (join=0 registered here in toMarkdownExtensions).
 */

import type { Paragraph, Root, Table, TableRow } from 'mdast';

/** Parse a single pipe-row line into raw cell strings (without leading/trailing pipes). */
function parsePipeRow(line: string): string[] | null {
	const trimmed = line.trim();
	if (!trimmed.startsWith('|')) return null;
	const parts = trimmed.split('|');
	if (parts.length < 3) return null;
	return parts.slice(1, -1).map((c) => c.trim());
}

/** Resolve `>` colspan markers in a flat cell-value array.
 *  Returns the processed cells with `colspan` set and `>` entries removed. */
function processColspan(
	rawCells: string[],
): Array<{ value: string; colspan: number }> {
	const cells = rawCells.map((v) => ({ value: v, colspan: 1 }));
	const toDelete: number[] = [];

	// `>` extends the nearest non-`>` cell to its LEFT (same semantics as remark-extended-table body rows).
	for (let j = 0; j < cells.length; j++) {
		if (cells[j].value === '>') {
			for (let k = j - 1; k >= 0; k--) {
				if (cells[k].value !== '>') {
					cells[k].colspan += 1;
					break;
				}
			}
			toDelete.push(j);
		}
	}

	for (const idx of toDelete.sort((a, b) => b - a)) {
		cells.splice(idx, 1);
	}

	return cells;
}

/** Count effective columns in a table row (summing colspan values). */
function countTableCols(row: TableRow): number {
	let n = 0;
	for (const cell of row.children) {
		n += (cell as unknown as { colspan?: number }).colspan ?? 1;
	}
	return n;
}

/**
 * Build a column-position → cell-index map.
 * e.g. cells=[A(cs=2), B(cs=1)] → [0, 0, 1]
 */
function buildColLayout(cells: Array<{ colspan?: number }>): number[] {
	const layout: number[] = [];
	for (let i = 0; i < cells.length; i++) {
		const cs = cells[i].colspan ?? 1;
		for (let k = 0; k < cs; k++) layout.push(i);
	}
	return layout;
}

// ------------------------------------------------------------------
// Parse direction helpers
// ------------------------------------------------------------------

function processParseDirection(tree: Root): void {
	const children = tree.children as unknown[];
	// Iterate backwards so index shifts from splice don't affect earlier items.
	for (let i = children.length - 1; i > 0; i--) {
		const current = children[i] as { type: string };
		const prev = children[i - 1] as { type: string };

		if (current.type !== 'table') continue;
		if (prev.type !== 'paragraph') continue;

		const table = current as unknown as Table & {
			children: (TableRow & { isExtraHeader?: boolean })[];
		};
		if (!table.children.length) continue;

		const colCount = countTableCols(table.children[0]);

		// Extract text from the preceding paragraph.
		const para = prev as unknown as Paragraph;
		let paraText = '';
		for (const child of para.children) {
			const c = child as { type: string; value?: string };
			if (c.type === 'text') paraText += c.value ?? '';
			else if (c.type === 'break') paraText += '\n';
		}

		const lines = paraText
			.split('\n')
			.map((l) => l.trim())
			.filter(Boolean);
		if (lines.length === 0) continue;

		const extraRows: (TableRow & { isExtraHeader: true })[] = [];
		// Track the previous extra-row's mdast cells for ^ resolution.
		let prevMdastCells: Array<Record<string, unknown>> | null = null;
		let allValid = true;

		for (const line of lines) {
			const rawCells = parsePipeRow(line);
			if (!rawCells) {
				allValid = false;
				break;
			}

			const processed = processColspan(rawCells);
			const prevLayout = prevMdastCells
				? buildColLayout(prevMdastCells as Array<{ colspan?: number }>)
				: [];

			// Count effective columns: ^ inherits colspan from the cell above.
			let effectiveCols = 0;
			let colPos = 0;
			for (const cell of processed) {
				if (cell.value === '^' && prevMdastCells) {
					const prevIdx = prevLayout[colPos];
					const cs =
						prevIdx !== undefined
							? ((prevMdastCells[prevIdx].colspan as number | undefined) ?? 1)
							: 1;
					effectiveCols += cs;
					colPos += cs;
				} else {
					effectiveCols += cell.colspan;
					colPos += cell.colspan;
				}
			}
			if (effectiveCols !== colCount) {
				allValid = false;
				break;
			}

			// Build mdast cells, resolving ^ into rowspan on the cell above.
			const mdastCells: Record<string, unknown>[] = [];
			colPos = 0;
			for (const cell of processed) {
				if (cell.value === '^' && prevMdastCells) {
					const prevIdx = prevLayout[colPos];
					if (prevIdx !== undefined) {
						const prevCell = prevMdastCells[prevIdx];
						prevCell.rowspan =
							((prevCell.rowspan as number | undefined) ?? 1) + 1;
						const cs = (prevCell.colspan as number | undefined) ?? 1;
						mdastCells.push({
							type: 'tableCell',
							isHeader: true,
							isCovered: true,
							colspan: cs,
							children: [{ type: 'text', value: '^' }],
						});
						colPos += cs;
						continue;
					}
				}
				const mdastCell: Record<string, unknown> = {
					type: 'tableCell',
					isHeader: true,
					children: [{ type: 'text', value: cell.value }],
				};
				if (cell.colspan > 1) mdastCell.colspan = cell.colspan;
				mdastCells.push(mdastCell);
				colPos += cell.colspan;
			}

			prevMdastCells = mdastCells;
			extraRows.push({
				type: 'tableRow' as const,
				isExtraHeader: true as const,
				children: mdastCells,
			} as unknown as TableRow & { isExtraHeader: true });
		}

		if (!allValid || extraRows.length === 0) continue;

		// Resolve ^ in the standard GFM header row (table.children[0]) to extend
		// cells in the last extra header row.
		{
			const lastExtraCells = (
				extraRows[extraRows.length - 1] as unknown as {
					children: Array<Record<string, unknown>>;
				}
			).children;
			const lastLayout = buildColLayout(
				lastExtraCells as Array<{ colspan?: number }>,
			);
			const stdHeader = table.children[0] as unknown as {
				children: Array<{
					children: Array<{ value?: string }>;
					colspan?: number;
					isCovered?: boolean;
				}>;
			};
			let colPos = 0;
			for (const cell of stdHeader.children) {
				const text = cell.children[0]?.value ?? '';
				const cs = cell.colspan ?? 1;
				if (text === '^') {
					const prevIdx = lastLayout[colPos];
					if (prevIdx !== undefined) {
						const extCell = lastExtraCells[prevIdx];
						extCell.rowspan =
							((extCell.rowspan as number | undefined) ?? 1) + 1;
						cell.isCovered = true;
					}
				}
				colPos += cs;
			}
		}

		// Prepend extra header rows to the table.
		table.children = [...extraRows, ...table.children];

		// Remove the preceding paragraph.
		(children as unknown[]).splice(i - 1, 1);
	}
}

// ------------------------------------------------------------------
// Plugin export
// ------------------------------------------------------------------

export function remarkMultiRowHeader(this: unknown) {
	// Register a toMarkdownExtension that handles `preTableRow` nodes:
	// - outputs the raw pipe-row text without escaping
	// - uses join=0 so no blank line is inserted between the row(s) and the table
	const processor = this as { data?(): Record<string, unknown> } | undefined;
	const data = processor?.data?.() ?? {};
	const ext = (data.toMarkdownExtensions as unknown[] | undefined) ?? [];
	data.toMarkdownExtensions = ext;
	ext.push({
		handlers: {
			preTableRow: (node: { value?: string }) => node.value ?? '',
		},
		join: [
			(left: { type: string }, right: { type: string }) => {
				if (left.type === 'preTableRow' && right.type === 'table') {
					return 0; // single \n — no blank line before the table
				}
			},
		],
	});

	return (tree: Root): void => {
		// Parse direction only — serialize direction is handled in
		// multiRowTableSchema.toMarkdown.runner via the preTableRow node.
		processParseDirection(tree);
	};
}
