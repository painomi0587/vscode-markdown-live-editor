// Pure logic for single-tilde handling, kept free of milkdown/remark imports
// so it can be unit-tested (the test build is CJS; those packages are
// ESM-only). Wired into the editor by strikethroughPlugin.ts.

export interface UnsafePatternLike {
	character?: string;
	before?: string;
	after?: string;
	atBreak?: boolean;
	inConstruct?: string | string[];
	notInConstruct?: string | string[];
	[key: string]: unknown;
}

export interface ToMarkdownExtensionLike {
	unsafe?: UnsafePatternLike[];
	extensions?: ToMarkdownExtensionLike[];
	[key: string]: unknown;
}

// remark-gfm's strikethrough serializer registers an unconditional escape for
// every `~` in phrasing content — it does not honor singleTilde: false (that
// option only affects parsing). With single tildes disabled on the parse
// side, a lone `~` is plain text, so escaping it would rewrite range notation
// like `0~2` into `0\~2` on every save. Narrow the rule in place so a `~` is
// only escaped when adjacent to another `~` (a potential ~~ delimiter run).
// The core rule escaping `~` at a line break (``` ~~~ ``` code fences) has
// atBreak set and is left untouched.
export function relaxLoneTildeEscape(
	extensions: ToMarkdownExtensionLike[],
): boolean {
	let patched = false;
	for (const ext of extensions) {
		if (!ext || typeof ext !== 'object') continue;
		const unsafe = ext.unsafe;
		if (Array.isArray(unsafe)) {
			for (let i = 0; i < unsafe.length; i++) {
				const entry = unsafe[i];
				if (
					entry?.character === '~' &&
					entry.before === undefined &&
					entry.after === undefined &&
					!entry.atBreak
				) {
					unsafe.splice(
						i,
						1,
						{ ...entry, after: '~' },
						{ ...entry, before: '~' },
					);
					i += 1;
					patched = true;
				}
			}
		}
		if (Array.isArray(ext.extensions)) {
			patched = relaxLoneTildeEscape(ext.extensions) || patched;
		}
	}
	return patched;
}

// Input rule pattern: only double tildes toggle strikethrough while typing.
// preset-gfm's stock rule uses ~{1,2}, so a single tilde (`~text~`) would
// create the mark too.
export const DOUBLE_TILDE_INPUT_REGEX = /(?<![\w:/])(~~)(.+?)\1(?!\w|\/)/;
