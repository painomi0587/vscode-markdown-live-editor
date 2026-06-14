import { Plugin, PluginKey } from '@milkdown/prose/state';
import { Decoration, DecorationSet } from '@milkdown/prose/view';
import { $prose } from '@milkdown/utils';

const key = new PluginKey('table-merge');

export const tableMergePlugin = $prose(() => {
	return new Plugin({
		key,
		props: {
			decorations(state) {
				const { selection } = state;
				const decorations: Decoration[] = [];

				state.doc.descendants((node, pos) => {
					const isMergeableCell =
						node.type.name === 'table_cell' ||
						node.type.name === 'table_header';
					if (!isMergeableCell) return;

					const colspan = (node.attrs.colspan as number) || 1;
					const rowspan = (node.attrs.rowspan as number) || 1;
					if (colspan <= 1 && rowspan <= 1) return;

					// Check if cursor is inside this cell
					if (selection.from < pos || selection.from > pos + node.nodeSize)
						return;

					decorations.push(
						Decoration.widget(pos + 1, () => {
							const btn = document.createElement('button');
							btn.className = 'table-unmerge-btn';
							btn.title = 'セル結合を解除';
							btn.textContent = '⊠';
							btn.addEventListener('mousedown', (e) => {
								e.preventDefault();
								btn.dispatchEvent(
									new CustomEvent('unmerge-cell', {
										bubbles: true,
										detail: { pos },
									}),
								);
							});
							return btn;
						}),
					);
				});

				return DecorationSet.create(state.doc, decorations);
			},
		},
	});
});
