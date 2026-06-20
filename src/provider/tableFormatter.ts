// Unicode East Asian Width — full-width characters occupy 2 columns in monospace fonts
function isFullWidthCodePoint(cp: number): boolean {
	return (
		(cp >= 0x1100 && cp <= 0x115f) || // Hangul Jamo
		(cp >= 0x2e80 && cp <= 0x303e) || // CJK Radicals Supplement .. CJK Symbols
		(cp >= 0x3040 && cp <= 0x33ff) || // Hiragana, Katakana, Bopomofo, Hangul Compat, etc.
		(cp >= 0x3400 && cp <= 0x4dbf) || // CJK Unified Ideographs Extension A
		(cp >= 0x4e00 && cp <= 0xa4cf) || // CJK Unified Ideographs + Yi
		(cp >= 0xa960 && cp <= 0xa97f) || // Hangul Jamo Extended-A
		(cp >= 0xac00 && cp <= 0xd7ff) || // Hangul Syllables + Jamo Extended-B
		(cp >= 0xf900 && cp <= 0xfaff) || // CJK Compatibility Ideographs
		(cp >= 0xfe10 && cp <= 0xfe1f) || // Vertical Forms
		(cp >= 0xfe30 && cp <= 0xfe6f) || // CJK Compatibility Forms + Small Form Variants
		(cp >= 0xff01 && cp <= 0xff60) || // Fullwidth ASCII Variants
		(cp >= 0xffe0 && cp <= 0xffe6) || // Fullwidth Signs
		(cp >= 0x1b000 && cp <= 0x1b12f) || // Kana Supplement
		(cp >= 0x20000 && cp <= 0x2a6df) || // CJK Extension B
		(cp >= 0x2a700 && cp <= 0x2ceaf) || // CJK Extensions C/D/E
		(cp >= 0x2ceb0 && cp <= 0x2ebef) || // CJK Extension F
		(cp >= 0x2f800 && cp <= 0x2fa1f) || // CJK Compatibility Ideographs Supplement
		(cp >= 0x30000 && cp <= 0x3134f) // CJK Extension G
	);
}

export function getDisplayWidth(str: string): number {
	let width = 0;
	for (const char of str) {
		const cp = char.codePointAt(0) ?? 0;
		width += isFullWidthCodePoint(cp) ? 2 : 1;
	}
	return width;
}

function isSeparatorCell(cell: string): boolean {
	return /^:?-+:?$/.test(cell);
}

type Alignment = 'left' | 'right' | 'center' | 'none';

function getSeparatorAlignment(cell: string): Alignment {
	const left = cell.startsWith(':');
	const right = cell.endsWith(':');
	if (left && right) return 'center';
	if (left) return 'left';
	if (right) return 'right';
	return 'none';
}

function formatSeparatorCell(width: number, align: Alignment): string {
	const w = Math.max(3, width);
	switch (align) {
		case 'center':
			return `:${'-'.repeat(w - 2)}:`;
		case 'left':
			return `:${'-'.repeat(w - 1)}`;
		case 'right':
			return `${'-'.repeat(w - 1)}:`;
		default:
			return '-'.repeat(w);
	}
}

function parseRow(line: string): string[] | null {
	const trimmed = line.trim();
	if (!trimmed.startsWith('|')) return null;
	const inner = trimmed.slice(1).endsWith('|')
		? trimmed.slice(1, -1)
		: trimmed.slice(1);
	return inner.split('|').map((cell) => cell.trim());
}

export function isTableRow(line: string): boolean {
	return line.trim().startsWith('|');
}

export function formatTableBlock(lines: string[]): string[] {
	const rows = lines.map(parseRow);
	if (rows.some((r) => r === null)) return lines;

	const parsedRows = rows as string[][];
	const colCount = Math.max(...parsedRows.map((r) => r.length));

	for (const row of parsedRows) {
		while (row.length < colCount) row.push('');
	}

	const separatorAligns: Alignment[][] = parsedRows.map((row) =>
		row.map((cell) =>
			isSeparatorCell(cell) ? getSeparatorAlignment(cell) : 'none',
		),
	);

	const colWidths: number[] = Array(colCount).fill(0) as number[];
	for (let ri = 0; ri < parsedRows.length; ri++) {
		for (let ci = 0; ci < parsedRows[ri].length; ci++) {
			const cell = parsedRows[ri][ci];
			const w = isSeparatorCell(cell) ? 3 : getDisplayWidth(cell);
			if (w > colWidths[ci]) colWidths[ci] = w;
		}
	}

	return parsedRows.map((row, ri) => {
		const cells = row.map((cell, ci) => {
			const width = colWidths[ci];
			if (isSeparatorCell(cell)) {
				return formatSeparatorCell(width, separatorAligns[ri][ci]);
			}
			const pad = width - getDisplayWidth(cell);
			return cell + ' '.repeat(Math.max(0, pad));
		});
		return `| ${cells.join(' | ')} |`;
	});
}

export function formatMarkdownTables(text: string): string {
	const eol = text.includes('\r\n') ? '\r\n' : '\n';
	const lines = text.split('\n').map((l) => l.replace(/\r$/, ''));
	const result: string[] = [];
	let inCodeBlock = false;
	let codeFence = '';
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];
		const trimmed = line.trim();

		if (!inCodeBlock) {
			const fenceMatch = /^(`{3,}|~{3,})/.exec(trimmed);
			if (fenceMatch) {
				inCodeBlock = true;
				codeFence = fenceMatch[1];
				result.push(line);
				i++;
				continue;
			}
			if (isTableRow(line)) {
				const start = i;
				while (i < lines.length && isTableRow(lines[i])) i++;
				result.push(...formatTableBlock(lines.slice(start, i)));
				continue;
			}
		} else {
			if (trimmed.startsWith(codeFence)) {
				inCodeBlock = false;
				codeFence = '';
			}
		}

		result.push(line);
		i++;
	}

	return result.join(eol);
}
