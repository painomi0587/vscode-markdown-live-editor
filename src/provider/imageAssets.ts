// Pure helpers for saving pasted/dropped images as asset files. Kept free of
// vscode/fs imports so the naming rules can be unit-tested. The provider wires
// these to the actual filesystem.

const MIME_EXT: Record<string, string> = {
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/jpg': 'jpg',
	'image/gif': 'gif',
	'image/webp': 'webp',
	'image/svg+xml': 'svg',
	'image/bmp': 'bmp',
	'image/x-icon': 'ico',
	'image/vnd.microsoft.icon': 'ico',
	'image/avif': 'avif',
	'image/tiff': 'tiff',
};

const IMAGE_EXTS = new Set([...Object.values(MIME_EXT), 'jpeg']);

/** Map an image MIME type to a file extension, or null when unrecognized. */
export function extensionForMime(mime: string): string | null {
	const normalized = mime.toLowerCase().split(';')[0].trim();
	return MIME_EXT[normalized] ?? null;
}

/** Reduce an arbitrary filename to a safe single path segment (no directories). */
export function sanitizeSegment(name: string): string {
	const base =
		name
			.replace(/[\\/]+/g, '/')
			.split('/')
			.pop() ?? '';
	return base
		.replace(/[^\w.\-　-鿿＀-￯ ]+/g, '_')
		.replace(/\s+/g, ' ')
		.trim();
}

function pad2(n: number): string {
	return String(n).padStart(2, '0');
}

/** Timestamp slug like 20260701-134501 for auto-generated names. */
export function timestampSlug(d: Date): string {
	return (
		`${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}` +
		`-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`
	);
}

export interface GeneratedImageName {
	/** Filename with extension, e.g. "image-20260701-134501-a1b2.png". */
	filename: string;
	/** Alt text suggestion (the base name without extension). */
	alt: string;
}

/**
 * Decide a filename for a saved image.
 *  - When a usable original filename is given (drag & drop of a real file),
 *    keep its base name and a recognized extension.
 *  - Otherwise (clipboard paste) generate `image-<timestamp>-<rand>.<ext>`.
 * Returns null when the type is unknown and no extension can be determined.
 */
export function generateImageFilename(args: {
	mimeType: string;
	originalName?: string | null;
	now: Date;
	rand: string;
}): GeneratedImageName | null {
	const { mimeType, originalName, now, rand } = args;
	const mimeExt = extensionForMime(mimeType);
	const sanitized = originalName ? sanitizeSegment(originalName) : '';

	let base = '';
	let ext = mimeExt ?? '';

	if (sanitized) {
		const dot = sanitized.lastIndexOf('.');
		if (dot > 0) {
			const nameExt = sanitized.slice(dot + 1).toLowerCase();
			if (IMAGE_EXTS.has(nameExt)) {
				base = sanitized.slice(0, dot);
				ext = nameExt === 'jpeg' ? 'jpg' : nameExt;
			} else if (mimeExt) {
				base = sanitized.replace(/\.+$/, '');
			}
		} else if (mimeExt) {
			base = sanitized;
		}
	}

	if (!ext) return null;
	if (!base) base = `image-${timestampSlug(now)}-${rand}`;

	return { filename: `${base}.${ext}`, alt: base };
}

/**
 * Normalize a configured save directory into POSIX path segments relative to
 * the document. An empty result means "save alongside the document".
 */
export function normalizeSaveDir(dir: string): string[] {
	return dir
		.replace(/\\/g, '/')
		.split('/')
		.map((s) => s.trim())
		.filter((s) => s !== '' && s !== '.');
}

/**
 * Build the Markdown `src` reference for a saved image, given the (normalized)
 * save-dir segments and the final filename. Uses POSIX separators.
 */
export function buildImageSrc(dirSegments: string[], filename: string): string {
	return [...dirSegments, filename].join('/');
}

/**
 * Return a filename that does not collide with existing names by appending
 * `-1`, `-2`, … before the extension.
 */
export function disambiguateFilename(
	filename: string,
	exists: (candidate: string) => boolean,
): string {
	if (!exists(filename)) return filename;
	const dot = filename.lastIndexOf('.');
	const base = dot > 0 ? filename.slice(0, dot) : filename;
	const ext = dot > 0 ? filename.slice(dot) : '';
	let n = 1;
	let candidate = `${base}-${n}${ext}`;
	while (exists(candidate)) {
		n += 1;
		candidate = `${base}-${n}${ext}`;
	}
	return candidate;
}
