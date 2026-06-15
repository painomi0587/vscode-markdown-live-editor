import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { remarkMultiRowHeader } from '../../src/view/multiRowHeaderPlugin';

// Minimal mdast node type for testing
type AnyNode = { type: string; [k: string]: unknown };

function text(value: string): AnyNode {
	return { type: 'text', value };
}

function paragraph(...children: AnyNode[]): AnyNode {
	return { type: 'paragraph', children };
}

function tableCell(value: string, extra: Record<string, unknown> = {}): AnyNode {
	return { type: 'tableCell', children: [text(value)], ...extra };
}

function tableRow(cells: AnyNode[], extra: Record<string, unknown> = {}): AnyNode {
	return { type: 'tableRow', children: cells, ...extra };
}

function table(rows: AnyNode[]): AnyNode {
	return { type: 'table', children: rows };
}

function root(...children: AnyNode[]): { type: 'root'; children: AnyNode[] } {
	return { type: 'root', children };
}

type Tree = { type: string; children: unknown[] };

function runPlugin(tree: Tree) {
	const transform = remarkMultiRowHeader();
	transform(tree as Parameters<typeof transform>[0]);
}

function asChildren(node: unknown): AnyNode[] {
	return (node as { children: AnyNode[] }).children;
}

function asValue(node: unknown): string {
	return (node as { value: string }).value;
}

// -------------------------------------------------------------------
// Parse direction tests
// -------------------------------------------------------------------

describe('remarkMultiRowHeader — parse direction', () => {
	it('does nothing when there is no paragraph before the table', () => {
		const headerRow = tableRow([tableCell('A'), tableCell('B')], { isHeader: true });
		const bodyRow = tableRow([tableCell('1'), tableCell('2')]);
		const t = table([headerRow, bodyRow]);
		const tree = root(t);

		runPlugin(tree);

		assert.equal(tree.children.length, 1, 'table should remain alone');
		assert.equal(asChildren(tree.children[0]).length, 2, 'table rows unchanged');
	});

	it('does nothing when the preceding paragraph has non-pipe lines', () => {
		const p = paragraph(text('some regular text'));
		const headerRow = tableRow([tableCell('A'), tableCell('B')], { isHeader: true });
		const t = table([headerRow]);
		const tree = root(p, t);

		runPlugin(tree);

		assert.equal(tree.children.length, 2, 'paragraph should not be consumed');
	});

	it('does nothing when column count does not match', () => {
		// paragraph has 3 columns but table header row has 2 effective columns
		const p = paragraph(text('| X | Y | Z |'));
		const headerRow = tableRow([tableCell('A'), tableCell('B')], { isHeader: true });
		const t = table([headerRow]);
		const tree = root(p, t);

		runPlugin(tree);

		assert.equal(tree.children.length, 2, 'mismatch → paragraph not consumed');
	});

	it('inserts a single extra header row and removes the paragraph', () => {
		const p = paragraph(text('| X | Y |'));
		const headerRow = tableRow([tableCell('A'), tableCell('B')], { isHeader: true });
		const bodyRow = tableRow([tableCell('1'), tableCell('2')]);
		const t = table([headerRow, bodyRow]);
		const tree = root(p, t);

		runPlugin(tree);

		// Paragraph consumed, only table left
		assert.equal(tree.children.length, 1);
		const rows = asChildren(tree.children[0]);
		// extra header row prepended
		assert.equal(rows.length, 3);
		const extra = rows[0] as AnyNode;
		assert.equal(extra.isExtraHeader, true);
		const extraCells = asChildren(extra);
		assert.equal(extraCells.length, 2);
		assert.equal(asValue(asChildren(extraCells[0])[0]), 'X');
		assert.equal(asValue(asChildren(extraCells[1])[0]), 'Y');
	});

	it('inserts multiple extra header rows from multi-line paragraph', () => {
		const p = paragraph(text('| R1A | R1B |\n| R2A | R2B |'));
		const headerRow = tableRow([tableCell('H1'), tableCell('H2')], { isHeader: true });
		const t = table([headerRow]);
		const tree = root(p, t);

		runPlugin(tree);

		assert.equal(tree.children.length, 1);
		const rows = asChildren(tree.children[0]);
		assert.equal(rows.length, 3); // 2 extra + 1 standard header
		assert.equal((rows[0] as AnyNode).isExtraHeader, true);
		assert.equal((rows[1] as AnyNode).isExtraHeader, true);
	});

	it('handles > colspan markers: > extends the cell to its LEFT', () => {
		// "| A | > | B |" → A(colspan=2), B(colspan=1)
		// Standard header row has 3 effective cols: A(2) + B(1) = 3
		// So the table header needs [H1, H2, H3] to match
		const p = paragraph(text('| A | > | B |'));
		const headerRow = tableRow(
			[tableCell('H1'), tableCell('H2'), tableCell('H3')],
			{ isHeader: true },
		);
		const t = table([headerRow]);
		const tree = root(p, t);

		runPlugin(tree);

		// Column counts match → paragraph consumed
		assert.equal(tree.children.length, 1);
		const rows = asChildren(tree.children[0]);
		assert.equal(rows.length, 2); // 1 extra + 1 standard
		const extraCells = asChildren(rows[0]);
		assert.equal(extraCells.length, 2); // '>' removed
		// A gets colspan=2
		assert.equal((extraCells[0] as AnyNode).colspan, 2);
		assert.equal(asValue(asChildren(extraCells[0])[0]), 'A');
		// B has no extra colspan
		assert.equal((extraCells[1] as AnyNode).colspan, undefined);
		assert.equal(asValue(asChildren(extraCells[1])[0]), 'B');
	});

	it('handles consecutive > markers for wider spans', () => {
		// "| A | > | > | B |" → A(colspan=3), B(colspan=1)
		const p = paragraph(text('| A | > | > | B |'));
		const headerRow = tableRow(
			[tableCell('H1'), tableCell('H2'), tableCell('H3'), tableCell('H4')],
			{ isHeader: true },
		);
		const t = table([headerRow]);
		const tree = root(p, t);

		runPlugin(tree);

		assert.equal(tree.children.length, 1);
		const extraCells = asChildren(asChildren(tree.children[0])[0]);
		assert.equal(extraCells.length, 2); // both > removed
		assert.equal((extraCells[0] as AnyNode).colspan, 3);
		assert.equal(asValue(asChildren(extraCells[0])[0]), 'A');
	});
});

// -------------------------------------------------------------------
// Serialize direction (via preTableRow node — handled by Milkdown runner,
// not the remark plugin itself). The plugin now only handles parse direction.
// These tests verify the parse still works when the file was written in the
// new format: pipe rows immediately before the table with no blank line.
// -------------------------------------------------------------------

describe('remarkMultiRowHeader — serialize format (parse of new output)', () => {
	it('leaves tables with isExtraHeader rows unchanged (serialize is handled in Milkdown runner)', () => {
		// The remark plugin no longer strips isExtraHeader rows; Milkdown's
		// toMarkdown runner does that before remark.stringify() is called.
		const extraRow = tableRow([tableCell('X'), tableCell('Y')], { isExtraHeader: true });
		const headerRow = tableRow([tableCell('A'), tableCell('B')], { isHeader: true });
		const t = table([extraRow, headerRow]);
		const tree = root(t);

		runPlugin(tree);

		// Plugin is parse-only now; it should not transform this tree.
		assert.equal(tree.children.length, 1, 'table unchanged — serialize is Milkdown runner\'s job');
		assert.equal(asChildren(tree.children[0]).length, 2, 'both rows still present');
	});

	it('round-trip: parse the new serialized format (pipe rows, no blank line before table)', () => {
		// The Milkdown runner serializes extra header rows as:
		//   | A | > | B |
		//   | 1 | 2 | 3 |   ← standard GFM table (header + sep + body)
		//   | - | - | - |
		// remark-gfm parses this as paragraph("| A | > | B |") + table.
		// Our plugin then converts the paragraph back to an extra_header_row.
		const p = paragraph(text('| A | > | B |'));
		const headerRow = tableRow([tableCell('H1'), tableCell('H2'), tableCell('H3')], { isHeader: true });
		const t = table([headerRow]);
		const tree = root(p, t);

		runPlugin(tree);

		assert.equal(tree.children.length, 1);
		const extraCells = asChildren(asChildren(tree.children[0])[0]);
		assert.equal(extraCells.length, 2);
		assert.equal((extraCells[0] as AnyNode).colspan, 2);
		assert.equal(asValue(asChildren(extraCells[0])[0]), 'A');
	});

	it('round-trip: multi-line pipe paragraph (multiple extra header rows) before table', () => {
		const p = paragraph(text('| R1A | R1B |\n| R2A | R2B |'));
		const headerRow = tableRow([tableCell('H1'), tableCell('H2')], { isHeader: true });
		const t = table([headerRow]);
		const tree = root(p, t);

		runPlugin(tree);

		assert.equal(tree.children.length, 1);
		const rows = asChildren(tree.children[0]);
		assert.equal(rows.length, 3); // 2 extra + 1 standard
		assert.equal((rows[0] as AnyNode).isExtraHeader, true);
		assert.equal((rows[1] as AnyNode).isExtraHeader, true);
		assert.equal(asValue(asChildren(asChildren(rows[0])[0])[0]), 'R1A');
		assert.equal(asValue(asChildren(asChildren(rows[1])[0])[0]), 'R2A');
	});
});

// -------------------------------------------------------------------
// ^ (rowspan) handling in extra header rows
// -------------------------------------------------------------------

describe('remarkMultiRowHeader — ^ rowspan handling', () => {
	it('^ in standard GFM header extends the extra header row cell above (sets rowspan)', () => {
		// Paragraph: | 項番 | 名前 | 保護 | > |
		// Standard header: | ^ | ^ | A | B |
		// ^ at col 0 → 項番 gets rowspan=2; ^ at col 1 → 名前 gets rowspan=2
		const p = paragraph(text('| 項番 | 名前 | 保護 | > |'));
		const headerRow = tableRow(
			[tableCell('^'), tableCell('^'), tableCell('A'), tableCell('B')],
			{ isHeader: true },
		);
		const t = table([headerRow]);
		const tree = root(p, t);

		runPlugin(tree);

		assert.equal(tree.children.length, 1, 'paragraph consumed');
		const rows = asChildren(tree.children[0]);
		assert.equal(rows.length, 2); // 1 extra + 1 standard

		// Extra header row: 項番(rs=2), 名前(rs=2), 保護(cs=2)
		const extraRow = rows[0] as AnyNode;
		assert.equal(extraRow.isExtraHeader, true);
		const extraCells = asChildren(extraRow);
		assert.equal(extraCells.length, 3); // 項番, 名前, 保護 (> was merged)
		assert.equal(asValue(asChildren(extraCells[0])[0]), '項番');
		assert.equal((extraCells[0] as AnyNode).rowspan, 2, '項番 rowspan=2');
		assert.equal(asValue(asChildren(extraCells[1])[0]), '名前');
		assert.equal((extraCells[1] as AnyNode).rowspan, 2, '名前 rowspan=2');
		assert.equal(asValue(asChildren(extraCells[2])[0]), '保護');
		assert.equal((extraCells[2] as AnyNode).colspan, 2, '保護 colspan=2');

		// Standard header row: ^ cells are marked isCovered, A and B unchanged
		const stdRow = rows[1] as AnyNode;
		const stdCells = asChildren(stdRow);
		assert.equal(stdCells.length, 4);
		assert.equal((stdCells[0] as AnyNode).isCovered, true, '^[0] isCovered');
		assert.equal((stdCells[1] as AnyNode).isCovered, true, '^[1] isCovered');
		assert.equal(asValue(asChildren(stdCells[2])[0]), 'A');
		assert.equal(asValue(asChildren(stdCells[3])[0]), 'B');
	});

	it('^ in extra row paragraph extends the previous extra row (multi-line paragraph)', () => {
		// Line 1: | A | B |   → extra row 1: A(rs=2), B
		// Line 2: | ^ | C |   → extra row 2: ^(covered), C
		// Standard header: | H1 | H2 |
		const p = paragraph(text('| A | B |\n| ^ | C |'));
		const headerRow = tableRow([tableCell('H1'), tableCell('H2')], { isHeader: true });
		const t = table([headerRow]);
		const tree = root(p, t);

		runPlugin(tree);

		assert.equal(tree.children.length, 1);
		const rows = asChildren(tree.children[0]);
		assert.equal(rows.length, 3); // 2 extra + 1 standard

		const extraRow1 = rows[0] as AnyNode;
		const cells1 = asChildren(extraRow1);
		assert.equal(cells1.length, 2);
		assert.equal(asValue(asChildren(cells1[0])[0]), 'A');
		assert.equal((cells1[0] as AnyNode).rowspan, 2, 'A gets rowspan=2');

		const extraRow2 = rows[1] as AnyNode;
		const cells2 = asChildren(extraRow2);
		assert.equal(cells2.length, 2);
		assert.equal((cells2[0] as AnyNode).isCovered, true, '^ cell is covered');
		assert.equal(asValue(asChildren(cells2[1])[0]), 'C');
	});

	it('^ in extra row inherits colspan when extending a wide cell', () => {
		// Line 1: | X | > | Y |   → X(cs=2, rs=1), Y(cs=1)
		// Line 2: | ^ | Z |       → ^ extends X (inherits cs=2), Z at col 3
		// effectiveCols = 2+1 = 3 ✓ (matches standard header with 3 cols)
		const p = paragraph(text('| X | > | Y |\n| ^ | Z |'));
		const headerRow = tableRow(
			[tableCell('H1'), tableCell('H2'), tableCell('H3')],
			{ isHeader: true },
		);
		const t = table([headerRow]);
		const tree = root(p, t);

		runPlugin(tree);

		const rows = asChildren(tree.children[0]);
		assert.equal(rows.length, 3); // 2 extra + 1 standard

		const extra1Cells = asChildren(rows[0]);
		assert.equal((extra1Cells[0] as AnyNode).colspan, 2, 'X colspan=2');
		assert.equal((extra1Cells[0] as AnyNode).rowspan, 2, 'X rowspan=2 after ^');

		const extra2Cells = asChildren(rows[1]);
		assert.equal(extra2Cells.length, 2);
		assert.equal((extra2Cells[0] as AnyNode).isCovered, true);
		assert.equal((extra2Cells[0] as AnyNode).colspan, 2, 'covered ^ inherits cs=2');
		assert.equal(asValue(asChildren(extra2Cells[1])[0]), 'Z');
	});

	it('^ column count mismatch (^ does not extend a known cell) → paragraph not consumed', () => {
		// Line 1: | A |   (1 col)
		// Line 2: | ^ | B | (^ extends A, B at col 1 → effective 2 cols ≠ 1 col in header)
		const p = paragraph(text('| A |\n| ^ | B |'));
		const headerRow = tableRow([tableCell('H1')], { isHeader: true });
		const t = table([headerRow]);
		const tree = root(p, t);

		runPlugin(tree);

		// effectiveCols for line 2: ^(inherits 1)+B(1)=2 ≠ colCount=1 → invalid
		assert.equal(tree.children.length, 2, 'paragraph NOT consumed due to mismatch');
	});
});
