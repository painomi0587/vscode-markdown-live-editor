import type { Node as ProseMirrorNode } from '@milkdown/prose/model';
import {
	countText,
	type HeadingData,
	type WordCountData,
} from './editorTestUtils';

// Extracts headings for the outline panel (TreeView) sent to the extension host.
export function extractHeadings(doc: ProseMirrorNode): HeadingData[] {
	const headings: HeadingData[] = [];
	doc.descendants((node, pos) => {
		if (node.type.name === 'heading') {
			const text = node.textContent.trim();
			if (!text) return;
			headings.push({
				text,
				level: node.attrs.level as number,
				pos,
			});
		}
	});
	return headings;
}

// Computes word/character counts for the status bar display.
export function calculateWordCount(doc: ProseMirrorNode): WordCountData {
	let text = '';
	doc.descendants((node) => {
		if (node.isText) {
			text += node.text;
		} else if (node.isBlock && text.length > 0) {
			text += '\n';
		}
	});
	return countText(text);
}
