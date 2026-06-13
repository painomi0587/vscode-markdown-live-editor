export const isTableCellMarkdownNode = (node: { type: string }): boolean =>
	node.type === 'tableCell';

export const isTableCellProseNode = (node: {
	type: { name: string };
}): boolean => node.type.name === 'table_cell';
