// Body cells: tableCell nodes that are NOT header cells.
export const isTableCellMarkdownNode = (node: {
	type: string;
	isHeader?: boolean;
}): boolean => node.type === 'tableCell' && !node.isHeader;

// Header cells: tableCell nodes with isHeader: true (set by remark-gfm or our plugin).
export const isTableHeaderMarkdownNode = (node: {
	type: string;
	isHeader?: boolean;
}): boolean => node.type === 'tableCell' && !!node.isHeader;

export const isTableCellProseNode = (node: {
	type: { name: string };
}): boolean => node.type.name === 'table_cell';

export const isTableHeaderProseNode = (node: {
	type: { name: string };
}): boolean => node.type.name === 'table_header';
