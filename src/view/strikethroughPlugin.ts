import type { Ctx } from '@milkdown/ctx';
import { remarkGFMPlugin, strikethroughSchema } from '@milkdown/preset-gfm';
import { markRule } from '@milkdown/prose';
import { $inputRule, $remark } from '@milkdown/utils';
import {
	DOUBLE_TILDE_INPUT_REGEX,
	relaxLoneTildeEscape,
	type ToMarkdownExtensionLike,
} from './strikethroughLogic';

// ----------------------------------------------------------------
// Strikethrough: require double tildes (~~) everywhere.
//
// remark-gfm defaults to singleTilde: true, so plain-text tilde
// ranges like `0~2、3~5` (two single tildes in one paragraph/cell)
// pair up and render as strikethrough. VS Code's built-in markdown
// preview only recognizes ~~, so we match that behavior.
// ----------------------------------------------------------------

export function configureStrikethrough(ctx: Ctx): void {
	ctx.set(remarkGFMPlugin.options.key, { singleTilde: false });
}

// Serialize side: stop escaping lone tildes (see strikethroughLogic.ts).
// Must be registered after the gfm preset so remark-gfm has already pushed
// its toMarkdown extension when this attacher runs.
export const remarkLoneTildePlugin = $remark('remarkLoneTilde', () => {
	return function remarkLoneTilde(this: unknown) {
		const processor = this as { data?(): Record<string, unknown> } | undefined;
		const data = processor?.data?.() ?? {};
		const extensions =
			(data.toMarkdownExtensions as ToMarkdownExtensionLike[] | undefined) ??
			[];
		if (!relaxLoneTildeEscape(extensions)) {
			console.warn(
				'[strikethroughPlugin] no lone-tilde unsafe rule found to relax — mdast-util-gfm-strikethrough internals may have changed',
			);
		}
	};
});

// Replacement for preset-gfm's strikethroughInputRule, which accepts a
// single tilde (`~text~`) while typing. Only `~~text~~` triggers the mark.
export const strikethroughDoubleTildeInputRule = $inputRule((ctx) =>
	markRule(DOUBLE_TILDE_INPUT_REGEX, strikethroughSchema.type(ctx)),
);
