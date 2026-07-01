import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	buildImageSrc,
	disambiguateFilename,
	extensionForMime,
	generateImageFilename,
	normalizeSaveDir,
	sanitizeSegment,
	timestampSlug,
} from '../../src/provider/imageAssets';

describe('extensionForMime', () => {
	it('maps known image types', () => {
		assert.equal(extensionForMime('image/png'), 'png');
		assert.equal(extensionForMime('image/jpeg'), 'jpg');
		assert.equal(extensionForMime('image/svg+xml'), 'svg');
	});

	it('ignores parameters and casing', () => {
		assert.equal(extensionForMime('IMAGE/PNG; charset=binary'), 'png');
	});

	it('returns null for unknown types', () => {
		assert.equal(extensionForMime('application/pdf'), null);
		assert.equal(extensionForMime(''), null);
	});
});

describe('sanitizeSegment', () => {
	it('strips directory components', () => {
		assert.equal(sanitizeSegment('a/b/c.png'), 'c.png');
		assert.equal(sanitizeSegment('..\\..\\evil.png'), 'evil.png');
	});

	it('replaces unsafe characters but keeps unicode letters', () => {
		assert.equal(sanitizeSegment('my file?.png'), 'my file_.png');
		assert.equal(sanitizeSegment('図表.png'), '図表.png');
	});
});

describe('timestampSlug', () => {
	it('formats a zero-padded slug', () => {
		assert.equal(
			timestampSlug(new Date(2026, 6, 1, 3, 4, 5)),
			'20260701-030405',
		);
	});
});

describe('generateImageFilename', () => {
	const now = new Date(2026, 6, 1, 13, 45, 1);

	it('generates a timestamped name for clipboard pastes (no name)', () => {
		const result = generateImageFilename({
			mimeType: 'image/png',
			originalName: null,
			now,
			rand: 'a1b2',
		});
		assert.deepEqual(result, {
			filename: 'image-20260701-134501-a1b2.png',
			alt: 'image-20260701-134501-a1b2',
		});
	});

	it('keeps an original filename with a recognized extension', () => {
		const result = generateImageFilename({
			mimeType: 'image/png',
			originalName: 'diagram.PNG',
			now,
			rand: 'a1b2',
		});
		assert.deepEqual(result, { filename: 'diagram.png', alt: 'diagram' });
	});

	it('normalizes jpeg extension to jpg', () => {
		const result = generateImageFilename({
			mimeType: 'image/jpeg',
			originalName: 'photo.jpeg',
			now,
			rand: 'x',
		});
		assert.equal(result?.filename, 'photo.jpg');
	});

	it('appends the mime extension when the name lacks an image extension', () => {
		const result = generateImageFilename({
			mimeType: 'image/png',
			originalName: 'screenshot',
			now,
			rand: 'x',
		});
		assert.deepEqual(result, { filename: 'screenshot.png', alt: 'screenshot' });
	});

	it('returns null for unsupported types without a usable extension', () => {
		assert.equal(
			generateImageFilename({
				mimeType: 'application/octet-stream',
				originalName: 'file.bin',
				now,
				rand: 'x',
			}),
			null,
		);
	});
});

describe('normalizeSaveDir', () => {
	it('splits and cleans path segments', () => {
		assert.deepEqual(normalizeSaveDir('assets/images'), ['assets', 'images']);
		assert.deepEqual(normalizeSaveDir('./images/'), ['images']);
		assert.deepEqual(normalizeSaveDir('a\\b'), ['a', 'b']);
	});

	it('returns an empty array for empty or dot dirs', () => {
		assert.deepEqual(normalizeSaveDir(''), []);
		assert.deepEqual(normalizeSaveDir('.'), []);
	});
});

describe('buildImageSrc', () => {
	it('joins segments and filename with posix separators', () => {
		assert.equal(buildImageSrc(['images'], 'a.png'), 'images/a.png');
		assert.equal(buildImageSrc([], 'a.png'), 'a.png');
		assert.equal(buildImageSrc(['a', 'b'], 'c.png'), 'a/b/c.png');
	});
});

describe('disambiguateFilename', () => {
	it('returns the name unchanged when free', () => {
		assert.equal(
			disambiguateFilename('a.png', () => false),
			'a.png',
		);
	});

	it('appends an incrementing suffix on collisions', () => {
		const taken = new Set(['a.png', 'a-1.png']);
		assert.equal(
			disambiguateFilename('a.png', (c) => taken.has(c)),
			'a-2.png',
		);
	});

	it('handles names without an extension', () => {
		const taken = new Set(['file']);
		assert.equal(
			disambiguateFilename('file', (c) => taken.has(c)),
			'file-1',
		);
	});
});
