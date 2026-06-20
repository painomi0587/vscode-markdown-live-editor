import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	formatMarkdownTables,
	formatTableBlock,
	getDisplayWidth,
} from '../../src/provider/tableFormatter';

describe('getDisplayWidth', () => {
	it('counts ASCII characters as width 1', () => {
		assert.equal(getDisplayWidth('hello'), 5);
		assert.equal(getDisplayWidth('abc'), 3);
	});

	it('counts full-width CJK characters as width 2', () => {
		assert.equal(getDisplayWidth('日本語'), 6);
		assert.equal(getDisplayWidth('テスト'), 6);
		assert.equal(getDisplayWidth('한국어'), 6);
	});

	it('handles mixed ASCII and full-width characters', () => {
		assert.equal(getDisplayWidth('Name: 山田'), 10); // 6 ASCII + 2*2 CJK
		assert.equal(getDisplayWidth('AB日本'), 6); // 2 + 4
	});

	it('counts fullwidth ASCII variants as width 2', () => {
		// FULLWIDTH LATIN CAPITAL LETTER A = U+FF21
		assert.equal(getDisplayWidth('Ａ'), 2);
	});

	it('returns 0 for empty string', () => {
		assert.equal(getDisplayWidth(''), 0);
	});
});

describe('formatTableBlock', () => {
	it('aligns simple ASCII table', () => {
		const input = [
			'| Name | Age |',
			'| --- | --- |',
			'| Alice | 25 |',
			'| Bob | 30 |',
		];
		const result = formatTableBlock(input);
		assert.deepEqual(result, [
			'| Name  | Age |',
			'| ----- | --- |',
			'| Alice | 25  |',
			'| Bob   | 30  |',
		]);
	});

	it('aligns table with full-width characters', () => {
		const input = [
			'| Name | Comment |',
			'| --- | --- |',
			'| Alice | Hello |',
			'| 山田 | テスト |',
		];
		const result = formatTableBlock(input);
		// 山田 = width 4, Alice = width 5 → col0 width 5
		// テスト = width 6, Hello = width 5 → col1 width 6
		assert.deepEqual(result, [
			'| Name  | Comment |',
			'| ----- | ------- |',
			'| Alice | Hello   |',
			'| 山田  | テスト  |',
		]);
	});

	it('preserves column alignment in separator row', () => {
		const input = [
			'| Left | Center | Right | None |',
			'| :--- | :---: | ---: | --- |',
			'| a | b | c | d |',
		];
		const result = formatTableBlock(input);
		assert.deepEqual(result, [
			'| Left | Center | Right | None |',
			'| :--- | :----: | ----: | ---- |',
			'| a    | b      | c     | d    |',
		]);
	});

	it('returns lines unchanged when a row cannot be parsed', () => {
		const input = ['not a table row', '| valid | row |'];
		const result = formatTableBlock(input);
		assert.deepEqual(result, input);
	});

	it('pads short rows to match column count', () => {
		const input = [
			'| A | B | C |',
			'| - | - | - |',
			'| x | y |',
		];
		const result = formatTableBlock(input);
		// Single-char separators expand to min width 3, so all cols become width 3
		assert.deepEqual(result, [
			'| A   | B   | C   |',
			'| --- | --- | --- |',
			'| x   | y   |     |',
		]);
	});

	it('handles single-column table', () => {
		const input = ['| Header |', '| ------ |', '| value |'];
		const result = formatTableBlock(input);
		assert.deepEqual(result, [
			'| Header |',
			'| ------ |',
			'| value  |',
		]);
	});

	it('ensures separator minimum width of 3', () => {
		const input = ['| A |', '| - |', '| x |'];
		const result = formatTableBlock(input);
		// col width = max(1 for 'A', 1 for 'x', 3 for separator) = 3
		assert.deepEqual(result, ['| A   |', '| --- |', '| x   |']);
	});
});

describe('formatMarkdownTables', () => {
	it('is a no-op for an already-formatted table', () => {
		const input = '| A   | BB  |\n| --- | --- |\n| x   | yy  |\n';
		const result = formatMarkdownTables(input);
		assert.equal(result, input);
	});

	it('expands separator dashes to column width', () => {
		// Single-char separators get expanded to min 3 (separator rule)
		const input = '| A | BB |\n| - | -- |\n| x | yy |\n';
		const result = formatMarkdownTables(input);
		// Col0: max(1,3,1)=3, Col1: max(2,3,2)=3
		assert.equal(result, '| A   | BB  |\n| --- | --- |\n| x   | yy  |\n');
	});

	it('formats a table and leaves surrounding text untouched', () => {
		const input = [
			'# Heading',
			'',
			'| Col1 | Col2 |',
			'| --- | --- |',
			'| long value | short |',
			'',
			'Some paragraph.',
		].join('\n');
		const result = formatMarkdownTables(input);
		assert.equal(
			result,
			[
				'# Heading',
				'',
				'| Col1       | Col2  |',
				'| ---------- | ----- |',
				'| long value | short |',
				'',
				'Some paragraph.',
			].join('\n'),
		);
	});

	it('does not format tables inside fenced code blocks', () => {
		const input = [
			'```',
			'| not | a | table |',
			'| --- | - | ----- |',
			'```',
		].join('\n');
		const result = formatMarkdownTables(input);
		assert.equal(result, input);
	});

	it('formats multiple separate tables', () => {
		const input = [
			'| A | BB |',
			'| - | -- |',
			'',
			'| X | YYY |',
			'| - | --- |',
		].join('\n');
		const result = formatMarkdownTables(input);
		// Table 1: col0=3, col1=3. Table 2: col0=3, col1=3
		assert.equal(
			result,
			[
				'| A   | BB  |',
				'| --- | --- |',
				'',
				'| X   | YYY |',
				'| --- | --- |',
			].join('\n'),
		);
	});

	it('preserves Windows line endings (CRLF)', () => {
		const input = '| A | B |\r\n| - | - |\r\n| x | y |\r\n';
		const result = formatMarkdownTables(input);
		// Col0: max(1,3,1)=3, Col1: max(1,3,1)=3
		assert.equal(result, '| A   | B   |\r\n| --- | --- |\r\n| x   | y   |\r\n');
	});

	it('formats table with full-width characters in document', () => {
		const input = [
			'# Title',
			'',
			'| 名前 | 年齢 |',
			'| --- | --- |',
			'| 山田太郎 | 25 |',
			'| Alice | 30 |',
		].join('\n');
		const result = formatMarkdownTables(input);
		// 名前 = 4, 山田太郎 = 8, Alice = 5 → col0 width 8
		// 年齢 = 4, 25 = 2, 30 = 2 → col1 width 4
		assert.equal(
			result,
			[
				'# Title',
				'',
				'| 名前     | 年齢 |',
				'| -------- | ---- |',
				'| 山田太郎 | 25   |',
				'| Alice    | 30   |',
			].join('\n'),
		);
	});
});
