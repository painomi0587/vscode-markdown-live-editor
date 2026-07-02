import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	DOUBLE_TILDE_INPUT_REGEX,
	relaxLoneTildeEscape,
	type ToMarkdownExtensionLike,
} from '../../src/view/strikethroughLogic';

// Mirrors the shape produced by remark-gfm: gfmToMarkdown() returns
// { extensions: [...] } where the strikethrough extension carries the
// unconditional `~` unsafe rule.
function gfmLikeExtensions(): ToMarkdownExtensionLike[] {
	return [
		{
			extensions: [
				{ unsafe: [{ character: '&', inConstruct: 'phrasing' }] },
				{
					unsafe: [
						{
							character: '~',
							inConstruct: 'phrasing',
							notInConstruct: ['autolink'],
						},
					],
					handlers: {},
				},
			],
		},
	];
}

describe('relaxLoneTildeEscape', () => {
	it('splits the unconditional ~ rule into adjacent-only rules', () => {
		const extensions = gfmLikeExtensions();

		const patched = relaxLoneTildeEscape(extensions);

		assert.equal(patched, true);
		const unsafe = extensions[0].extensions?.[1].unsafe;
		assert.deepEqual(unsafe, [
			{
				character: '~',
				after: '~',
				inConstruct: 'phrasing',
				notInConstruct: ['autolink'],
			},
			{
				character: '~',
				before: '~',
				inConstruct: 'phrasing',
				notInConstruct: ['autolink'],
			},
		]);
	});

	it('leaves non-tilde rules and already-conditional tilde rules alone', () => {
		const extensions: ToMarkdownExtensionLike[] = [
			{
				unsafe: [
					{ character: '&', inConstruct: 'phrasing' },
					{ atBreak: true, character: '~' },
					{ character: '~', after: '~' },
				],
			},
		];
		const before = JSON.parse(JSON.stringify(extensions));

		const patched = relaxLoneTildeEscape(extensions);

		assert.equal(patched, false);
		assert.deepEqual(extensions, before);
	});

	it('is idempotent', () => {
		const extensions = gfmLikeExtensions();
		relaxLoneTildeEscape(extensions);
		const once = JSON.parse(JSON.stringify(extensions));

		const patchedAgain = relaxLoneTildeEscape(extensions);

		assert.equal(patchedAgain, false);
		assert.deepEqual(extensions, once);
	});
});

describe('DOUBLE_TILDE_INPUT_REGEX', () => {
	it('matches double-tilde runs', () => {
		assert.ok(DOUBLE_TILDE_INPUT_REGEX.test('~~struck~~'));
		assert.ok(DOUBLE_TILDE_INPUT_REGEX.test('これは~~削除~~です'));
	});

	it('does not match single tildes (range notation)', () => {
		assert.equal(DOUBLE_TILDE_INPUT_REGEX.test('0~2、3~5'), false);
		assert.equal(DOUBLE_TILDE_INPUT_REGEX.test('残り~5個、合計~です'), false);
	});
});
