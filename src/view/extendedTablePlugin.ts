import { $nodeSchema, $remark } from '@milkdown/utils';
import { remarkExtendedTable } from 'remark-extended-table';

export const extendedTablePlugin = $remark(
	'remarkExtendedTable',
	() => remarkExtendedTable,
);

// table_cell スキーマを colspan/rowspan 対応に上書き
export const extendedTableCellSchema = $nodeSchema('table_cell', () => ({
	content: 'inline*',
	attrs: {
		alignment: { default: null },
		colspan: { default: 1 },
		rowspan: { default: 1 },
	},
	tableRole: 'cell',
	isolating: true,
	group: 'tableCell',
	parseDOM: [
		{
			tag: 'td',
			getAttrs: (dom) => {
				if (!(dom instanceof HTMLElement)) return {};
				return {
					alignment: dom.style.textAlign || null,
					colspan: Number(dom.getAttribute('colspan') || 1),
					rowspan: Number(dom.getAttribute('rowspan') || 1),
				};
			},
		},
	],
	toDOM: (node) => [
		'td',
		{
			...(node.attrs.alignment
				? { style: `text-align: ${node.attrs.alignment}` }
				: {}),
			...(node.attrs.colspan > 1
				? { colspan: String(node.attrs.colspan) }
				: {}),
			...(node.attrs.rowspan > 1
				? { rowspan: String(node.attrs.rowspan) }
				: {}),
		},
		0,
	],
	parseMarkdown: {
		match: (node) => node.type === 'tableCell',
		runner: (state, node, type) => {
			const colspan = (node.colspan as number) || 1;
			const rowspan = (node.rowspan as number) || 1;
			state
				.openNode(type, { colspan, rowspan })
				.next(node.children)
				.closeNode();
		},
	},
	toMarkdown: {
		match: (node) => node.type.name === 'table_cell',
		runner: (state, node) => {
			state
				.openNode('tableCell', undefined, {
					colspan: node.attrs.colspan,
					rowspan: node.attrs.rowspan,
				})
				.next(node.content)
				.closeNode();
		},
	},
}));
