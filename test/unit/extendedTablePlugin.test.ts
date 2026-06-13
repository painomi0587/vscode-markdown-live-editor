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
