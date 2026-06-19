import * as vscode from 'vscode';
import {
	formatMarkdownTables,
	formatTableBlock,
	isTableRow,
} from './tableFormatter';

function findTableRange(
	document: vscode.TextDocument,
	line: number,
): vscode.Range | null {
	if (!isTableRow(document.lineAt(line).text)) return null;

	let start = line;
	while (start > 0 && isTableRow(document.lineAt(start - 1).text)) start--;

	let end = line;
	while (
		end < document.lineCount - 1 &&
		isTableRow(document.lineAt(end + 1).text)
	)
		end++;

	return new vscode.Range(start, 0, end, document.lineAt(end).text.length);
}

export class TableFormatterProvider
	implements
		vscode.DocumentFormattingEditProvider,
		vscode.OnTypeFormattingEditProvider
{
	readonly triggerCharacters = ['|'];

	provideDocumentFormattingEdits(
		document: vscode.TextDocument,
		_options: vscode.FormattingOptions,
		_token: vscode.CancellationToken,
	): vscode.TextEdit[] {
		const text = document.getText();
		const formatted = formatMarkdownTables(text);
		if (formatted === text) return [];
		const lastLine = document.lineCount - 1;
		const lastChar = document.lineAt(lastLine).text.length;
		return [
			vscode.TextEdit.replace(
				new vscode.Range(0, 0, lastLine, lastChar),
				formatted,
			),
		];
	}

	provideOnTypeFormattingEdits(
		document: vscode.TextDocument,
		position: vscode.Position,
		_ch: string,
		_options: vscode.FormattingOptions,
		_token: vscode.CancellationToken,
	): vscode.TextEdit[] {
		const config = vscode.workspace.getConfiguration('markdownLiveEditor');
		if (!config.get<boolean>('formatTableOnType', true)) return [];

		const tableRange = findTableRange(document, position.line);
		if (!tableRange) return [];

		const tableText = document.getText(tableRange);
		const tableLines = tableText.split('\n').map((l) => l.replace(/\r$/, ''));
		const formattedLines = formatTableBlock(tableLines);
		const formatted = formattedLines.join('\n');
		if (formatted === tableText) return [];
		return [vscode.TextEdit.replace(tableRange, formatted)];
	}
}
