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

					// Position for inserting a new extra_header_row (before table_header_row)
					let insertBeforeHeaderPos = pos + 1;
					// Position inside first cell of table_header_row for the "add" button widget
					let addBtnWidgetPos = -1;

					node.forEach((child, offset) => {
						const childPos = pos + 1 + offset;
						if (child.type.name === 'extra_header_row') {
							// Update insert position to after this extra row
							insertBeforeHeaderPos = childPos + child.nodeSize;

							// Show "remove" button inside first cell when cursor is in this row
							if (
								selection.from >= childPos &&
								selection.from <= childPos + child.nodeSize &&
								child.firstChild
							) {
								// firstCell is at childPos + 1; widget goes inside the cell at +1
								const firstCellPos = childPos + 1;
								decorations.push(
									Decoration.widget(firstCellPos + 1, () => {
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
							addBtnWidgetPos === -1 &&
							child.firstChild
						) {
							// Widget inside first cell of table_header_row (+1 for row content, +1 inside cell)
							addBtnWidgetPos = childPos + 1 + 1;
						}
					});

					// Show "add header row" button inside first cell of the standard header row
					if (addBtnWidgetPos >= 0) {
						const capturedInsertPos = insertBeforeHeaderPos;
						const capturedColCount = (() => {
							let n = 0;
							node.forEach((child) => {
								if (child.type.name === 'table_header_row' && n === 0) {
									n = child.childCount;
								}
							});
							return n;
						})();
						decorations.push(
							Decoration.widget(addBtnWidgetPos, () => {
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
												insertPos: capturedInsertPos,
												colCount: capturedColCount,
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
