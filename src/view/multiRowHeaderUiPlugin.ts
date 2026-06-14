import { Plugin, PluginKey } from '@milkdown/prose/state';
import { Decoration, DecorationSet } from '@milkdown/prose/view';
import { $prose } from '@milkdown/utils';

const key = new PluginKey('multi-row-header-ui');

export const multiRowHeaderUiPlugin = $prose(() => {
	return new Plugin({
		key,
		props: {
			decorations(state) {
				const { selection, doc } = state;
				const decorations: Decoration[] = [];

				doc.descendants((node, pos) => {
					if (node.type.name !== 'table') return;
					if (selection.from < pos || selection.from > pos + node.nodeSize)
						return;

					let extraHeaderEndPos = pos + 1; // default: start of table content
					let headerRowPos = -1;
					let headerRowColCount = 0;

					node.forEach((child, offset) => {
						const childPos = pos + 1 + offset;
						if (child.type.name === 'extra_header_row') {
							extraHeaderEndPos = childPos + child.nodeSize;

							// Show "remove" button when cursor is inside this extra_header_row
							if (
								selection.from >= childPos &&
								selection.from <= childPos + child.nodeSize
							) {
								decorations.push(
									Decoration.widget(childPos + 1, () => {
										const btn = document.createElement('button');
										btn.className = 'extra-header-remove-btn';
										btn.title = '追加ヘッダー行を削除';
										btn.textContent = '✕';
										btn.addEventListener('mousedown', (e) => {
											e.preventDefault();
											btn.dispatchEvent(
												new CustomEvent('remove-extra-header', {
													bubbles: true,
													detail: { rowPos: childPos },
												}),
											);
										});
										return btn;
									}),
								);
							}
						} else if (
							child.type.name === 'table_header_row' &&
							headerRowPos === -1
						) {
							headerRowPos = childPos;
							headerRowColCount = child.childCount;
						}
					});

					// Show "add header row" button before the standard header row
					if (headerRowPos >= 0) {
						decorations.push(
							Decoration.widget(extraHeaderEndPos, () => {
								const btn = document.createElement('button');
								btn.className = 'extra-header-add-btn';
								btn.title = '追加ヘッダー行を挿入';
								btn.textContent = '+ 見出し行';
								btn.addEventListener('mousedown', (e) => {
									e.preventDefault();
									btn.dispatchEvent(
										new CustomEvent('add-extra-header', {
											bubbles: true,
											detail: {
												insertPos: extraHeaderEndPos,
												colCount: headerRowColCount,
											},
										}),
									);
								});
								return btn;
							}),
						);
					}
				});

				return DecorationSet.create(doc, decorations);
			},
		},
	});
});
