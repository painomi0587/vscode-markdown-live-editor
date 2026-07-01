import { parserCtx } from '@milkdown/core';
import { Slice } from '@milkdown/prose/model';
import { Plugin } from '@milkdown/prose/state';
import { $prose } from '@milkdown/utils';
import { buildTableMarkdown, parseDelimitedText } from './pasteTableParser';

// -------------------------------------------------------
// Paste CSV / TSV as a GFM table.
//
// When plain text pasted from a spreadsheet (TSV) or a CSV source is
// delimited and grid-shaped, convert it into a Markdown table instead of
// dropping it in as a paragraph. Real HTML tables (e.g. rich Excel paste) are
// left to ProseMirror's native clipboard parsing, which preserves formatting.
// The parsing/formatting logic lives in the ProseMirror-free pasteTableParser.
// -------------------------------------------------------

/**
 * ProseMirror plugin that intercepts paste of delimited plain text and
 * converts it to a Markdown table node.
 */
export const pasteTablePlugin = $prose((ctx) => {
	return new Plugin({
		props: {
			handlePaste(view, event) {
				const clipboard = event.clipboardData;
				if (!clipboard) return false;

				// Defer real HTML tables to ProseMirror's native clipboard parser.
				const html = clipboard.getData('text/html');
				if (html && /<table[\s>]/i.test(html)) return false;

				const text = clipboard.getData('text/plain');
				if (!text) return false;

				// Don't convert inside code blocks or existing tables.
				const { $from } = view.state.selection;
				for (let depth = $from.depth; depth > 0; depth -= 1) {
					const name = $from.node(depth).type.name;
					if (name === 'code_block' || name.includes('table')) return false;
				}

				const rows = parseDelimitedText(text);
				if (!rows) return false;

				const markdown = buildTableMarkdown(rows);
				const parser = ctx.get(parserCtx);
				const doc = parser(markdown);
				if (!doc || doc.childCount === 0) return false;

				const tr = view.state.tr.replaceSelection(new Slice(doc.content, 0, 0));
				view.dispatch(tr.scrollIntoView());
				return true;
			},
		},
	});
});
