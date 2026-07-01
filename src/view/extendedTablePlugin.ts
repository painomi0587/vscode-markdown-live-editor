import {
	tableCellSchema,
	tableHeaderRowSchema,
	tableHeaderSchema,
	tableRowSchema,
	tableSchema,
} from '@milkdown/preset-gfm';
import type { NodeType, Node as ProseNode } from '@milkdown/prose/model';
import type {
	JSONRecord,
	MarkdownNode,
	ParserState,
	SerializerState,
} from '@milkdown/transformer';
import { $nodeSchema, $remark } from '@milkdown/utils';
import { remarkExtendedTable } from 'remark-extended-table';
import {
	isTableCellMarkdownNode,
	isTableCellProseNode,
	isTableHeaderMarkdownNode,
	isTableHeaderProseNode,
} from './extendedTableMatchers';
import { remarkMultiRowHeader } from './multiRowHeaderPlugin';

export {
	isTableCellMarkdownNode,
	isTableCellProseNode,
	isTableHeaderMarkdownNode,
	isTableHeaderProseNode,
} from './extendedTableMatchers';

// ----------------------------------------------------------------
// Remark plugins
// ----------------------------------------------------------------

export const extendedTablePlugin = $remark(
	'remarkExtendedTable',
	() => remarkExtendedTable,
);

export const multiRowHeaderPlugin = $remark(
	'remarkMultiRowHeader',
	() => remarkMultiRowHeader,
);

// ----------------------------------------------------------------
// Body cell schema — adds colspan/rowspan attrs to table_cell
// ----------------------------------------------------------------

export const extendedTableCellSchema = tableCellSchema.extendSchema(
	(prev) => (ctx) => {
		const prevSchema = prev(ctx);
		return {
			...prevSchema,
			attrs: {
				...prevSchema.attrs,
				// The base gfm schema defaults `alignment` to "left". That default
				// bites when prosemirror-tables' addColumn creates a new cell via
				// createAndFill() without an explicit alignment: the fresh column
				// would serialize as `:---` (left) instead of `---` (unset). Parsed
				// cells always carry an explicit alignment (null when unset), so
				// overriding the default to null only affects newly inserted cells.
				alignment: { default: null },
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

// ----------------------------------------------------------------
// Header cell schema — adds colspan/rowspan attrs to table_header
// ----------------------------------------------------------------

export const extendedTableHeaderSchema = tableHeaderSchema.extendSchema(
	(prev) => (ctx) => {
		const prevSchema = prev(ctx);
		return {
			...prevSchema,
			attrs: {
				...prevSchema.attrs,
				// See the note on extendedTableCellSchema: override the base "left"
				// default so newly inserted header cells serialize as `---`, not `:---`.
				alignment: { default: null },
				colspan: { default: 1 },
				rowspan: { default: 1 },
				covered: { default: false },
				// Stores the visual colspan for covered cells (colspan=0 in the
				// ProseMirror model keeps prosemirror-tables' findWidth() from
				// counting covered columns twice, but serialization still needs the
				// original span width to emit the correct `>` markers).
				coveredColspan: { default: 1 },
			},
			parseDOM: [
				{
					tag: 'th',
					getAttrs: (dom: Node) => {
						if (!(dom instanceof HTMLElement)) return null;
						const covered = dom.getAttribute('data-covered') === 'true';
						const domColspan = Number(dom.getAttribute('colspan') || 1);
						const coveredColspan = covered
							? Number(dom.getAttribute('data-covered-colspan') || domColspan)
							: 1;
						return {
							alignment: dom.style.textAlign || null,
							colspan: covered ? 0 : domColspan,
							rowspan: Number(dom.getAttribute('rowspan') || 1),
							covered,
							coveredColspan,
						};
					},
				},
			],
			toDOM: (node: ProseNode) => {
				const domAttrs: Record<string, string> = {};
				if (node.attrs.alignment)
					domAttrs.style = `text-align: ${node.attrs.alignment}`;
				if (node.attrs.colspan > 1)
					domAttrs.colspan = String(node.attrs.colspan);
				if (node.attrs.rowspan > 1)
					domAttrs.rowspan = String(node.attrs.rowspan);
				if (node.attrs.covered) {
					domAttrs['data-covered'] = 'true';
					if ((node.attrs.coveredColspan as number) > 1)
						domAttrs['data-covered-colspan'] = String(
							node.attrs.coveredColspan,
						);
					domAttrs.style = 'display:none;padding:0;border:none;width:0;';
				}
				return ['th', domAttrs, 0] as [string, Record<string, string>, number];
			},
			parseMarkdown: {
				match: (node: MarkdownNode) => isTableHeaderMarkdownNode(node),
				runner: (state: ParserState, node: MarkdownNode, type: NodeType) => {
					const alignment = (node.align as string) || null;
					const covered = !!(node as unknown as { isCovered?: boolean })
						.isCovered;
					const origColspan = (node.colspan as number) || 1;
					// colspan=0 prevents prosemirror-tables' findWidth() from
					// counting covered cells as extra columns (which would corrupt
					// the TableMap and cause "No cell with offset X found" crashes).
					const colspan = covered ? 0 : origColspan;
					const coveredColspan = covered ? origColspan : 1;
					const rowspan = (node.rowspan as number) || 1;
					state
						.openNode(type, {
							alignment,
							colspan,
							rowspan,
							covered,
							coveredColspan,
						})
						.openNode(state.schema.nodes.paragraph as NodeType)
						.next(node.children)
						.closeNode()
						.closeNode();
				},
			},
			toMarkdown: {
				match: (node: ProseNode) => isTableHeaderProseNode(node),
				runner: (state: SerializerState, node: ProseNode) => {
					const props: JSONRecord = {
						// Use coveredColspan for covered cells so the remark serializer
						// emits the correct number of `>` markers.
						colspan: node.attrs.covered
							? node.attrs.coveredColspan
							: node.attrs.colspan,
						rowspan: node.attrs.rowspan,
					};
					if (
						node.attrs.alignment !== undefined &&
						node.attrs.alignment !== null
					) {
						props.alignment = node.attrs.alignment;
					}
					if (node.attrs.covered) {
						props.isCovered = true;
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

// ----------------------------------------------------------------
// Extra header row — new ProseMirror node type that holds header
// cells from rows preceding the standard GFM header row.
// ----------------------------------------------------------------

export const extraHeaderRowSchema = $nodeSchema('extra_header_row', () => ({
	content: '(table_header)*',
	tableRole: 'row',
	isolating: true,
	parseDOM: [{ tag: 'tr[data-extra-header]' }],
	toDOM() {
		return ['tr', { 'data-extra-header': 'true' }, 0] as [
			string,
			Record<string, string>,
			number,
		];
	},
	parseMarkdown: {
		match: (node: MarkdownNode) =>
			(node as unknown as { type: string; isExtraHeader?: boolean }).type ===
				'tableRow' &&
			!!(node as unknown as { isExtraHeader?: boolean }).isExtraHeader,
		runner: (state: ParserState, node: MarkdownNode, type: NodeType) => {
			state.openNode(type);
			state.next(node.children);
			state.closeNode();
		},
	},
	toMarkdown: {
		match: (node: ProseNode) => node.type.name === 'extra_header_row',
		runner: (state: SerializerState, node: ProseNode) => {
			// Serialize as a tableRow with isExtraHeader marker so the
			// remarkMultiRowHeader plugin can convert it back to a paragraph.
			(
				state as unknown as {
					openNode(
						t: string,
						content?: unknown,
						attrs?: JSONRecord,
					): SerializerState;
				}
			).openNode('tableRow', undefined, { isExtraHeader: true });
			state.next(node.content);
			(state as unknown as { closeNode(): SerializerState }).closeNode();
		},
	},
}));

// ----------------------------------------------------------------
// Extended table schema — allows extra_header_row* before the
// standard table_header_row, and fixes the parseMarkdown runner.
// ----------------------------------------------------------------

export const multiRowTableSchema = tableSchema.extendSchema((prev) => (ctx) => {
	const prevSchema = prev(ctx);
	return {
		...prevSchema,
		// Allow zero or more extra header rows before the standard header.
		content: 'extra_header_row* table_header_row table_row*',
		parseMarkdown: {
			match: prevSchema.parseMarkdown.match,
			runner: (state: ParserState, node: MarkdownNode, type: NodeType) => {
				const align = (node as unknown as { align: string[] }).align;
				const rawChildren = (
					node as unknown as {
						children: (MarkdownNode & {
							isExtraHeader?: boolean;
						})[];
					}
				).children;

				// The first non-extra-header row is the standard header.
				const standardHeaderIdx = rawChildren.findIndex(
					(c) => !c.isExtraHeader,
				);

				const children = rawChildren.map((x, i) => ({
					...x,
					align,
					isExtraHeader: !!x.isExtraHeader,
					// Only the first non-extra-header row is isHeader: true.
					isHeader: i === standardHeaderIdx,
				}));

				state.openNode(type);
				state.next(children);
				state.closeNode();
			},
		},
		toMarkdown: {
			match: (node: ProseNode) => node.type.name === 'table',
			runner: (state: SerializerState, node: ProseNode) => {
				// Emit extra_header_row nodes as a paragraph BEFORE the table.
				// remark.stringify() does not run remark transform plugins, so we
				// must handle the extra-row → paragraph conversion here instead of
				// relying on remarkMultiRowHeader's serialize direction.
				const extraLines: string[] = [];
				node.forEach((child) => {
					if (child.type.name !== 'extra_header_row') return;
					const parts: string[] = [];
					child.forEach((cell) => {
						// Use coveredColspan for covered cells so `>` markers are
						// emitted correctly even when colspan=0 in the model.
						const cs = cell.attrs.covered
							? ((cell.attrs.coveredColspan as number) ?? 1)
							: ((cell.attrs.colspan as number) ?? 1);
						// `>` appears BEFORE the spanning cell (consistent with
						// remark-extended-table body rows and the standard GFM header).
						for (let k = 1; k < cs; k++) parts.push('>');
						parts.push(cell.textContent);
					});
					extraLines.push(`| ${parts.join(' | ')} |`);
				});

				if (extraLines.length > 0) {
					// Use preTableRow (custom node handled by remarkMultiRowHeader's
					// toMarkdownExtension) so the output is unescaped and has no blank
					// line between the header rows and the GFM table.
					state.addNode('preTableRow', undefined, extraLines.join('\n'));
				}

				// Use the standard table_header_row for alignment info.
				const align: (string | null)[] = [];
				node.forEach((child) => {
					if (child.type.name !== 'table_header_row') return;
					child.forEach((cell) => {
						align.push((cell.attrs.alignment as string | null) ?? null);
					});
				});

				(
					state as unknown as {
						openNode(
							t: string,
							content?: unknown,
							attrs?: JSONRecord,
						): SerializerState;
					}
				).openNode('table', undefined, { align });
				// Process only non-extra-header rows inside the table.
				node.forEach((child) => {
					if (child.type.name !== 'extra_header_row') {
						state.next(child);
					}
				});
				(state as unknown as { closeNode(): SerializerState }).closeNode();
			},
		},
	};
});

// ----------------------------------------------------------------
// Extended table_row schema — excludes extra_header_row nodes from
// the match so they are routed to extraHeaderRowSchema instead.
// ----------------------------------------------------------------

export const extendedTableRowSchema = tableRowSchema.extendSchema(
	(prev) => (ctx) => {
		const prevSchema = prev(ctx);
		return {
			...prevSchema,
			parseMarkdown: {
				...prevSchema.parseMarkdown,
				match: (node: MarkdownNode) =>
					(node as unknown as { type: string }).type === 'tableRow' &&
					!(node as unknown as { isHeader?: boolean }).isHeader &&
					!(node as unknown as { isExtraHeader?: boolean }).isExtraHeader,
			},
		};
	},
);

// ----------------------------------------------------------------
// Extended table_header_row schema — excludes extra_header_row nodes.
// ----------------------------------------------------------------

export const extendedTableHeaderRowSchema = tableHeaderRowSchema.extendSchema(
	(prev) => (ctx) => {
		const prevSchema = prev(ctx);
		return {
			...prevSchema,
			parseMarkdown: {
				...prevSchema.parseMarkdown,
				match: (node: MarkdownNode) =>
					(node as unknown as { type: string }).type === 'tableRow' &&
					!!(node as unknown as { isHeader?: boolean }).isHeader &&
					!(node as unknown as { isExtraHeader?: boolean }).isExtraHeader,
			},
		};
	},
);
