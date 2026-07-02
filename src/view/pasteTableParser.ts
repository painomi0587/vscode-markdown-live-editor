// Pure CSV/TSV parsing and GFM table formatting. Kept free of ProseMirror /
// Milkdown imports so it can be unit-tested in plain Node. pasteTablePlugin.ts
// wires these into the editor's paste handling.

/**
 * Split delimited text into a grid of rows/cells. Handles RFC 4180 style
 * quoting ("" escapes a quote, quoted fields may contain the delimiter or
 * newlines) so it works for both comma and tab delimiters.
 */
function splitDelimited(text: string, delimiter: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = '';
	let inQuotes = false;
	let i = 0;

	while (i < text.length) {
		const ch = text[i];
		if (inQuotes) {
			if (ch === '"') {
				if (text[i + 1] === '"') {
					field += '"';
					i += 2;
					continue;
				}
				inQuotes = false;
				i += 1;
				continue;
			}
			field += ch;
			i += 1;
			continue;
		}
		if (ch === '"') {
			inQuotes = true;
			i += 1;
			continue;
		}
		if (ch === delimiter) {
			row.push(field);
			field = '';
			i += 1;
			continue;
		}
		if (ch === '\n') {
			row.push(field);
			rows.push(row);
			row = [];
			field = '';
			i += 1;
			continue;
		}
		field += ch;
		i += 1;
	}

	row.push(field);
	rows.push(row);

	// Drop a trailing empty row produced by a final newline.
	while (
		rows.length > 0 &&
		rows[rows.length - 1].length === 1 &&
		rows[rows.length - 1][0] === ''
	) {
		rows.pop();
	}

	return rows;
}

/**
 * Detect and parse pasted text as a delimited table. Returns a padded grid
 * (every row the same width) or null when the text does not look tabular.
 *
 * Detection rules, tuned to avoid converting ordinary prose:
 *  - A tab anywhere means TSV (prose rarely contains tabs); at least one row
 *    must have 2+ columns.
 *  - Otherwise comma-delimited, which is far riskier, so it must span 2+ rows
 *    that all share the same column count of 2 or more.
 */
export function parseDelimitedText(text: string): string[][] | null {
	const normalized = text.replace(/\r\n?/g, '\n').replace(/\n+$/, '');
	if (!normalized.trim()) return null;

	const delimiter = normalized.includes('\t') ? '\t' : ',';
	const rows = splitDelimited(normalized, delimiter);
	if (rows.length === 0) return null;

	const maxCols = rows.reduce((max, r) => Math.max(max, r.length), 0);
	if (maxCols < 2) return null;

	if (delimiter === ',') {
		if (rows.length < 2) return null;
		const cols = rows[0].length;
		if (!rows.every((r) => r.length === cols)) return null;
	}

	return rows.map((r) => {
		const padded = r.slice();
		while (padded.length < maxCols) padded.push('');
		return padded;
	});
}

/** Escape a cell value for safe embedding in a GFM table cell. */
function escapeCell(value: string): string {
	return value
		.replace(/\\/g, '\\\\')
		.replace(/\|/g, '\\|')
		.replace(/\n/g, ' ')
		.trim();
}

/** Build GFM table Markdown from a rectangular grid. First row is the header. */
export function buildTableMarkdown(rows: string[][]): string {
	const header = rows[0];
	const toLine = (cells: string[]) =>
		`| ${cells.map(escapeCell).join(' | ')} |`;
	const separator = `| ${header.map(() => '---').join(' | ')} |`;
	const lines = [toLine(header), separator, ...rows.slice(1).map(toLine)];
	return lines.join('\n');
}
