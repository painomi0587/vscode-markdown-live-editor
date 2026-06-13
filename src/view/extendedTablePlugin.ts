import { tableCellSchema } from '@milkdown/preset-gfm';
import type { NodeType, Node as ProseNode } from '@milkdown/prose/model';
import type {
	JSONRecord,
	MarkdownNode,
	ParserState,
	SerializerState,
} from '@milkdown/transformer';
import { $remark } from '@milkdown/utils';
import { remarkExtendedTable } from 'remark-extended-table';
import {
	isTableCellMarkdownNode,
	isTableCellProseNode,
} from './extendedTableMatchers';

export {
	isTableCellMarkdownNode,
	isTableCellProseNode,
} from './extendedTableMatchers';

export const extendedTablePlugin = $remark(
	'remarkExtendedTable',
	() => remarkExtendedTable,
);

// Extend the built-in Milkdown table cell schema so colspan/rowspan are preserved.
export const extendedTableCellSchema = tableCellSchema.extendSchema(
	(prev) => (ctx) => {
		const prevSchema = prev(ctx);
		return {
			...prevSchema,
			attrs: {
				...prevSchema.attrs,
				colspan: { default: 1 },
				rowspan: { default: 1 },
			},
			parseDOM: [
				{
					tag: 'td',
					getAttrs: (dom: Node) => {
						if (!(dom instanceof HTMLElement)) return null;
						return {
							alignment: dom.style.textAlign || null,
							colspan: Number(dom.getAttribute('colspan') || 1),
							rowspan: Number(dom.getAttribute('rowspan') || 1),
						};
					},
				},
			],
			toDOM: (node: ProseNode) => [
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
				match: (node: MarkdownNode) => isTableCellMarkdownNode(node),
				runner: (state: ParserState, node: MarkdownNode, type: NodeType) => {
					const alignment = (node.align as string) || null;
					const colspan = (node.colspan as number) || 1;
					const rowspan = (node.rowspan as number) || 1;
					state
						.openNode(type, { alignment, colspan, rowspan })
						.openNode(state.schema.nodes.paragraph as NodeType)
						.next(node.children)
						.closeNode()
						.closeNode();
				},
			},
			toMarkdown: {
				match: (node: ProseNode) => isTableCellProseNode(node),
				runner: (state: SerializerState, node: ProseNode) => {
					const props: JSONRecord = {
						colspan: node.attrs.colspan,
						rowspan: node.attrs.rowspan,
					};
					if (
						node.attrs.alignment !== undefined &&
						node.attrs.alignment !== null
					) {
						props.alignment = node.attrs.alignment;
					}
					state
						.openNode('tableCell', undefined, props)
						.next(node.content)
						.closeNode();
				},
			},
		};
	},
);
