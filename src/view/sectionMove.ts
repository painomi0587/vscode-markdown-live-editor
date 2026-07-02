// Pure geometry for reordering top-level heading sections in the ProseMirror
// document. Kept free of ProseMirror imports so it can be unit-tested with
// plain data. view.ts adapts the live document into this shape.

export interface SectionChild {
	/** Whether this top-level child is a heading node. */
	isHeading: boolean;
	/** Heading level (1-6). Meaningful only when isHeading is true. */
	level: number;
	/** ProseMirror nodeSize of this child. */
	size: number;
}

export interface SectionMove {
	/** Start position of the source section (inclusive). */
	startPos: number;
	/** End position of the source section (exclusive). */
	endPos: number;
	/** Position at which the extracted section should be re-inserted. */
	insertPos: number;
}

/**
 * A heading "section" spans its own heading child plus every following child
 * up to (but excluding) the next heading of the same or shallower level.
 * Returns the exclusive end index of the section owned by `startIndex`.
 */
function sectionEndIndex(children: SectionChild[], startIndex: number): number {
	const level = children[startIndex].level;
	let end = startIndex + 1;
	while (end < children.length) {
		const child = children[end];
		if (child.isHeading && child.level <= level) break;
		end += 1;
	}
	return end;
}

/**
 * Compute the positions needed to move the section owned by the heading at
 * `sourceIndex` so that it lands immediately before the section owned by the
 * heading at `targetIndex`. A null `targetIndex` moves the section to the end
 * of the document.
 *
 * Returns null when the move is a no-op or invalid — the source child is not a
 * heading, or the drop target lands inside the source section (e.g. dropping a
 * parent heading onto one of its own descendants).
 */
export function computeSectionMove(
	children: SectionChild[],
	sourceIndex: number,
	targetIndex: number | null,
): SectionMove | null {
	if (sourceIndex < 0 || sourceIndex >= children.length) return null;
	if (!children[sourceIndex].isHeading) return null;

	// Prefix sums: position[i] is the start position of child i, and
	// position[children.length] is the total content size.
	const position: number[] = new Array(children.length + 1);
	position[0] = 0;
	for (let i = 0; i < children.length; i += 1) {
		position[i + 1] = position[i] + children[i].size;
	}

	const sourceEnd = sectionEndIndex(children, sourceIndex);
	const startPos = position[sourceIndex];
	const endPos = position[sourceEnd];

	const insertPos =
		targetIndex === null ? position[children.length] : position[targetIndex];

	// Bail if the insertion point sits within the source section itself
	// (dropping onto the source or one of its descendants). insertPos === endPos
	// is allowed but produces no structural change.
	if (insertPos >= startPos && insertPos < endPos) return null;

	return { startPos, endPos, insertPos };
}
