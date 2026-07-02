import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	buildTableMarkdown,
	parseDelimitedText,
} from '../../src/view/pasteTableParser';

describe('parseDelimitedText', () => {
	it('parses tab-separated values', () => {
		assert.deepEqual(parseDelimitedText('a\tb\tc\n1\t2\t3'), [
			['a', 'b', 'c'],
			['1', '2', '3'],
		]);
	});

	it('parses a single tab-separated row', () => {
		assert.deepEqual(parseDelimitedText('name\tvalue'), [['name', 'value']]);
	});

	it('pads short TSV rows to the widest row', () => {
		assert.deepEqual(parseDelimitedText('a\tb\tc\n1\t2'), [
			['a', 'b', 'c'],
			['1', '2', ''],
		]);
	});

	it('parses comma-separated values with consistent columns', () => {
		assert.deepEqual(parseDelimitedText('a,b\nc,d'), [
			['a', 'b'],
			['c', 'd'],
		]);
	});

	it('handles quoted CSV fields containing commas and newlines', () => {
		assert.deepEqual(parseDelimitedText('a,"b,c"\n"line1\nline2",d'), [
			['a', 'b,c'],
			['line1\nline2', 'd'],
		]);
	});

	it('unescapes doubled quotes in CSV', () => {
		assert.deepEqual(parseDelimitedText('a,"he said ""hi"""\nx,y'), [
			['a', 'he said "hi"'],
			['x', 'y'],
		]);
	});

	it('normalizes CRLF and trailing newlines', () => {
		assert.deepEqual(parseDelimitedText('a\tb\r\n1\t2\r\n'), [
			['a', 'b'],
			['1', '2'],
		]);
	});

	it('rejects a single line of prose with a comma', () => {
		assert.equal(parseDelimitedText('Hello, world'), null);
	});

	it('rejects CSV with inconsistent column counts', () => {
		assert.equal(parseDelimitedText('a,b\nc,d,e'), null);
	});

	it('rejects single-column text', () => {
		assert.equal(parseDelimitedText('just\nsome\nlines'), null);
	});

	it('rejects empty or blank input', () => {
		assert.equal(parseDelimitedText(''), null);
		assert.equal(parseDelimitedText('   \n  '), null);
	});
});

describe('buildTableMarkdown', () => {
	it('builds a GFM table with header, separator, and body', () => {
		const md = buildTableMarkdown([
			['a', 'b'],
			['1', '2'],
		]);
		assert.equal(md, '| a | b |\n| --- | --- |\n| 1 | 2 |');
	});

	it('builds a header-only table for a single row', () => {
		const md = buildTableMarkdown([['x', 'y']]);
		assert.equal(md, '| x | y |\n| --- | --- |');
	});

	it('escapes pipes and collapses newlines inside cells', () => {
		const md = buildTableMarkdown([
			['a|b', 'c'],
			['d\ne', 'f'],
		]);
		assert.equal(md, '| a\\|b | c |\n| --- | --- |\n| d e | f |');
	});
});
