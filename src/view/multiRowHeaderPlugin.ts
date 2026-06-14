/**
 * Remark plugin that supports multiple header rows in GFM tables.
 *
 * PARSE direction (markdown → mdast):
 *   remark-gfm treats only the row immediately before `---` as the header.
 *   A paragraph of pipe-delimited lines immediately before a table is detected
 *   and re-injected as extra header rows (`tableRow` with `isExtraHeader: true`).
 *
 * SERIALIZE direction (mdast → markdown):
 *   `tableRow` nodes with `isExtraHeader: true` inside a table are extracted
 *   and emitted as a paragraph of pipe-delimited text before the table,
 *   which round-trips correctly on next parse.
 */

import type { Paragraph, Root, Table, TableRow } from 'mdast';

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function extractTextFromNode(node: {
	value?: string;
	children?: unknown[];
}): string {
	if (typeof node.value === 'string') return node.value;
	if (!node.children) return '';
	return (node.children as { value?: string; children?: unknown[] }[])
		.map(extractTextFromNode)
		.join('');
}

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
		let allValid = true;

		for (const line of lines) {
			const rawCells = parsePipeRow(line);
			if (!rawCells) {
				allValid = false;
				break;
			}

			const processed = processColspan(rawCells);
			const effectiveCols = processed.reduce((s, c) => s + c.colspan, 0);
			if (effectiveCols !== colCount) {
				allValid = false;
				break;
			}

			const mdastCells = processed.map((c) => ({
				type: 'tableCell' as const,
				isHeader: true as const,
				...(c.colspan > 1 ? { colspan: c.colspan } : {}),
				children: [{ type: 'text' as const, value: c.value }],
			}));

			extraRows.push({
				type: 'tableRow' as const,
				isExtraHeader: true as const,
				children: mdastCells,
			} as unknown as TableRow & { isExtraHeader: true });
		}

		if (!allValid || extraRows.length === 0) continue;

		// Prepend extra header rows to the table.
		table.children = [...extraRows, ...table.children];

		// Remove the preceding paragraph.
		(children as unknown[]).splice(i - 1, 1);
	}
}

// ------------------------------------------------------------------
// Serialize direction helpers
// ------------------------------------------------------------------

function processSerializeDirection(tree: Root): void {
	const children = tree.children as unknown[];
	for (let i = children.length - 1; i >= 0; i--) {
		const node = children[i] as { type: string };
		if (node.type !== 'table') continue;

		const table = node as unknown as {
			children: (TableRow & { isExtraHeader?: boolean })[];
		};

		const extraRows: (TableRow & { isExtraHeader?: boolean })[] = [];
		const regularRows: (TableRow & { isExtraHeader?: boolean })[] = [];

		for (const row of table.children) {
			if (row.isExtraHeader) {
				extraRows.push(row);
			} else {
				regularRows.push(row);
			}
		}

		if (extraRows.length === 0) continue;

		// Convert extra header rows back to pipe-delimited text lines.
		const lines = extraRows.map((row) => {
			const parts: string[] = [];
			for (const cell of row.children) {
				const c = cell as unknown as { colspan?: number; children?: unknown[] };
				const colspan = c.colspan ?? 1;
				const text = extractTextFromNode(
					c as { value?: string; children?: unknown[] },
				);
				parts.push(text);
				for (let k = 1; k < colspan; k++) {
					parts.push('>');
				}
			}
			return `| ${parts.join(' | ')} |`;
		});

		const paragraph = {
			type: 'paragraph' as const,
			children: [{ type: 'text' as const, value: lines.join('\n') }],
		};

		// Restore the table to only regular rows.
		table.children = regularRows;

		// Insert paragraph before the table.
		children.splice(i, 0, paragraph);
	}
}

// ------------------------------------------------------------------
// Plugin export
// ------------------------------------------------------------------

export function remarkMultiRowHeader() {
	return (tree: Root): void => {
		// Detect direction: if any table already has `isExtraHeader` rows,
		// we are in the serialize direction.
		let isSerialize = false;
		for (const node of tree.children) {
			if (node.type !== 'table') continue;
			const t = node as unknown as { children: { isExtraHeader?: boolean }[] };
			if (t.children.some((r) => r.isExtraHeader)) {
				isSerialize = true;
				break;
			}
		}

		if (isSerialize) {
			processSerializeDirection(tree);
		} else {
			processParseDirection(tree);
		}
	};
}
