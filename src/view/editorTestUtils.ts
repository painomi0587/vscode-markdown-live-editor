export interface HeadingData {
	text: string;
	level: number;
	pos: number;
}

export interface WordCountData {
	words: number;
	characters: number;
}

// Strip spurious <br /> that can appear in serialized markdown table rows.
export function cleanupTableBr(md: string): string {
	// Detect the newline style and preserve it
	const newlineMatch = md.match(/\r\n|\n|\r/);
	const newline = newlineMatch ? newlineMatch[0] : '\n';
	
	return md
		.split(/\r\n|\n|\r/)
		.map((line) =>
			line.startsWith('|') ? line.replaceAll('<br />', '') : line,
		)
		.join(newline);
}

// Unescape \^ and \> in table cells (extended table syntax)
export function cleanupTableEscapes(md: string): string {
	// Detect the newline style and preserve it
	const newlineMatch = md.match(/\r\n|\n|\r/);
	const newline = newlineMatch ? newlineMatch[0] : '\n';
	
	return md
		.split(/\r\n|\n|\r/)
		.map((line) =>
			line.startsWith('|')
				? line.replaceAll('\\^', '^').replaceAll('\\>', '>')
				: line,
		)
		.join(newline);
}

export function countText(text: string): WordCountData {
	const characters = text.length;
	const words = text.split(/\s+/).filter((w) => w.length > 0).length;
	return { words, characters };
}

export function headingsEqual(a: HeadingData[], b: HeadingData[]): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (
			a[i].text !== b[i].text ||
			a[i].level !== b[i].level ||
			a[i].pos !== b[i].pos
		) {
			return false;
		}
	}
	return true;
}

export function dedupeNearbyRowTops(
	tops: number[],
	minDistance = 1.5,
): number[] {
	const sorted = [...tops].sort((a, b) => a - b);
	const deduped: number[] = [];
	for (const top of sorted) {
		const last = deduped[deduped.length - 1];
		if (last === undefined || Math.abs(top - last) > minDistance) {
			deduped.push(top);
		}
	}
	return deduped;
}

export function countParagraphRowsFromHardBreaks(
	hardBreakCount: number,
): number {
	return Math.max(1, hardBreakCount + 1);
}

export function countLogicalTextLines(text: string): number {
	return Math.max(1, text.split(/\r\n|\n|\r/).length);
}

export function shouldMergeNearbyTop(
	currentTop: number,
	lastTop: number,
	threshold = 4,
): boolean {
	return Math.abs(currentTop - lastTop) < threshold;
}
