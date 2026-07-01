import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	computeSectionMove,
	type SectionChild,
} from '../../src/view/sectionMove';

// A synthetic document laid out as:
//   index0: H1 "A"   size 3  pos  0
//   index1: para     size 4  pos  3
//   index2: H2 "B"   size 3  pos  7
//   index3: para     size 5  pos 10
//   index4: H1 "C"   size 3  pos 15
//   index5: para     size 4  pos 18
//   total content size = 22
function sampleDoc(): SectionChild[] {
	return [
		{ isHeading: true, level: 1, size: 3 },
		{ isHeading: false, level: 0, size: 4 },
		{ isHeading: true, level: 2, size: 3 },
		{ isHeading: false, level: 0, size: 5 },
		{ isHeading: true, level: 1, size: 3 },
		{ isHeading: false, level: 0, size: 4 },
	];
}

describe('computeSectionMove', () => {
	it('spans a section up to the next same-or-shallower heading', () => {
		// Moving H1 "A" (owns index0..3) before H1 "C".
		const move = computeSectionMove(sampleDoc(), 0, 4);
		assert.deepEqual(move, { startPos: 0, endPos: 15, insertPos: 15 });
	});

	it('includes only nested content for a deeper heading', () => {
		// H2 "B" owns index2..3, ending at the next H1.
		const move = computeSectionMove(sampleDoc(), 2, 0);
		assert.deepEqual(move, { startPos: 7, endPos: 15, insertPos: 0 });
	});

	it('moves a later section before an earlier one', () => {
		const move = computeSectionMove(sampleDoc(), 4, 0);
		assert.deepEqual(move, { startPos: 15, endPos: 22, insertPos: 0 });
	});

	it('moves a section to the end when target is null', () => {
		const move = computeSectionMove(sampleDoc(), 0, null);
		assert.deepEqual(move, { startPos: 0, endPos: 15, insertPos: 22 });
	});

	it('rejects dropping a section into its own descendant', () => {
		// H1 "A" owns index0..3; dropping onto H2 "B" (index2) is inside it.
		assert.equal(computeSectionMove(sampleDoc(), 0, 2), null);
	});

	it('rejects a non-heading source', () => {
		assert.equal(computeSectionMove(sampleDoc(), 1, 0), null);
	});

	it('rejects an out-of-range source index', () => {
		assert.equal(computeSectionMove(sampleDoc(), 6, 0), null);
		assert.equal(computeSectionMove(sampleDoc(), -1, 0), null);
	});
});
