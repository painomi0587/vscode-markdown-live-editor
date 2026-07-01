import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isJavascriptUrlAttribute } from '../../src/view/exportHtml';

describe('isJavascriptUrlAttribute', () => {
	it('flags javascript: URLs on href/src/xlink:href/formaction', () => {
		assert.equal(isJavascriptUrlAttribute('href', 'javascript:alert(1)'), true);
		assert.equal(isJavascriptUrlAttribute('src', 'javascript:alert(1)'), true);
		assert.equal(
			isJavascriptUrlAttribute('xlink:href', 'javascript:alert(1)'),
			true,
		);
		assert.equal(
			isJavascriptUrlAttribute('formaction', 'javascript:alert(1)'),
			true,
		);
	});

	it('flags obfuscated javascript: URLs with embedded whitespace', () => {
		assert.equal(isJavascriptUrlAttribute('href', 'java\tscript:alert(1)'), true);
		assert.equal(
			isJavascriptUrlAttribute('href', '  JAVASCRIPT:alert(1)'),
			true,
		);
	});

	it('ignores non-URL attributes even with a javascript: value', () => {
		assert.equal(isJavascriptUrlAttribute('title', 'javascript:alert(1)'), false);
	});

	it('ignores normal URL values', () => {
		assert.equal(isJavascriptUrlAttribute('href', 'https://example.com'), false);
		assert.equal(isJavascriptUrlAttribute('src', '/images/foo.png'), false);
	});
});
