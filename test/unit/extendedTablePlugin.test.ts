import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	isTableCellMarkdownNode,
	isTableCellProseNode,
} from '../../src/view/extendedTableMatchers';

describe('isTableCellMarkdownNode', () => {
	it('returns true for tableCell nodes', () => {
		assert.equal(isTableCellMarkdownNode({ type: 'tableCell' }), true);
	});

	it('returns false for other node types', () => {
		assert.equal(isTableCellMarkdownNode({ type: 'tableRow' }), false);
		assert.equal(isTableCellMarkdownNode({ type: 'table' }), false);
		assert.equal(isTableCellMarkdownNode({ type: '' }), false);
	});
});

describe('isTableCellProseNode', () => {
	it('returns true for table_cell nodes', () => {
		assert.equal(isTableCellProseNode({ type: { name: 'table_cell' } }), true);
	});

	it('returns false for other node types', () => {
		assert.equal(isTableCellProseNode({ type: { name: 'table_row' } }), false);
		assert.equal(isTableCellProseNode({ type: { name: 'table' } }), false);
		assert.equal(isTableCellProseNode({ type: { name: '' } }), false);
	});
});

// ---------------------------------------------------------------------------
// coveredColspan attribute logic
// ---------------------------------------------------------------------------
// These tests verify the pure computation rules used in
// extendedTableHeaderSchema.parseMarkdown.runner and .toMarkdown.runner.
// The PM schema runners themselves require a full editor context, so we
// test the equivalent logic here in isolation.

function computeParseAttrs(mdNode: { colspan?: number; isCovered?: boolean }) {
	const covered = !!mdNode.isCovered;
	const origColspan = mdNode.colspan || 1;
	return {
		colspan: covered ? 0 : origColspan,
		coveredColspan: covered ? origColspan : 1,
		covered,
	};
}

function computeSerializedColspan(attrs: {
	covered?: boolean;
	coveredColspan?: number;
	colspan?: number;
}) {
	return attrs.covered ? (attrs.coveredColspan ?? 1) : (attrs.colspan ?? 1);
}

function buildPreTableRowParts(
	cells: Array<{ attrs: { covered?: boolean; coveredColspan?: number; colspan?: number }; textContent: string }>,
): string[] {
	const parts: string[] = [];
	for (const cell of cells) {
		const cs = cell.attrs.covered
			? (cell.attrs.coveredColspan ?? 1)
			: (cell.attrs.colspan ?? 1);
		for (let k = 1; k < cs; k++) parts.push('>');
		parts.push(cell.textContent);
	}
	return parts;
}

describe('coveredColspan — parseMarkdown attr computation', () => {
	it('non-covered cell: colspan=origColspan, coveredColspan=1', () => {
		const attrs = computeParseAttrs({ colspan: 2, isCovered: false });
		assert.equal(attrs.colspan, 2);
		assert.equal(attrs.coveredColspan, 1);
		assert.equal(attrs.covered, false);
	});

	it('covered cell with colspan=1: colspan=0, coveredColspan=1', () => {
		const attrs = computeParseAttrs({ colspan: 1, isCovered: true });
		assert.equal(attrs.colspan, 0);
		assert.equal(attrs.coveredColspan, 1);
		assert.equal(attrs.covered, true);
	});

	it('covered cell with colspan=2: colspan=0, coveredColspan=2', () => {
		const attrs = computeParseAttrs({ colspan: 2, isCovered: true });
		assert.equal(attrs.colspan, 0);
		assert.equal(attrs.coveredColspan, 2);
		assert.equal(attrs.covered, true);
	});

	it('covered cell with no colspan: defaults colspan=0, coveredColspan=1', () => {
		const attrs = computeParseAttrs({ isCovered: true });
		assert.equal(attrs.colspan, 0);
		assert.equal(attrs.coveredColspan, 1);
	});
});

describe('coveredColspan — toMarkdown serialized colspan', () => {
	it('non-covered cell uses colspan attr', () => {
		assert.equal(
			computeSerializedColspan({ covered: false, colspan: 3, coveredColspan: 1 }),
			3,
		);
	});

	it('covered cell uses coveredColspan (not colspan=0)', () => {
		assert.equal(
			computeSerializedColspan({ covered: true, colspan: 0, coveredColspan: 2 }),
			2,
		);
	});

	it('covered cell with coveredColspan=1 returns 1', () => {
		assert.equal(
			computeSerializedColspan({ covered: true, colspan: 0, coveredColspan: 1 }),
			1,
		);
	});
});

describe('coveredColspan — preTableRow > marker serialization', () => {
	it('regular cell emits no > markers', () => {
		const parts = buildPreTableRowParts([
			{ attrs: { covered: false, colspan: 1 }, textContent: 'A' },
		]);
		assert.deepEqual(parts, ['A']);
	});

	it('covered cell with coveredColspan=1 emits no > markers', () => {
		const parts = buildPreTableRowParts([
			{ attrs: { covered: true, colspan: 0, coveredColspan: 1 }, textContent: '' },
			{ attrs: { covered: false, colspan: 1 }, textContent: 'B' },
		]);
		assert.deepEqual(parts, ['', 'B']);
	});

	it('covered cell with coveredColspan=2 emits one > marker before the cell', () => {
		const parts = buildPreTableRowParts([
			{ attrs: { covered: true, colspan: 0, coveredColspan: 2 }, textContent: '' },
			{ attrs: { covered: false, colspan: 1 }, textContent: 'C' },
		]);
		assert.deepEqual(parts, ['>', '', 'C']);
	});

	it('non-covered cell with colspan=3 emits two > markers', () => {
		const parts = buildPreTableRowParts([
			{ attrs: { covered: false, colspan: 3 }, textContent: 'Wide' },
		]);
		assert.deepEqual(parts, ['>', '>', 'Wide']);
	});
});
