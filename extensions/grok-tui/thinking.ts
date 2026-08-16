import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { GrokTuiConfig } from "./config.ts";

/**
 * Hides thinking blocks without spending a row on them, and brings them back.
 *
 * pi's own `hideThinkingBlock` swaps the reasoning for a `Thinking...` label,
 * and that label keeps its line whatever it says. The Markdown path spends
 * nothing instead: a transformer returning an empty string renders zero lines.
 * So the blocks stay in the message — session file and model context untouched
 * — and only their display is emptied, which is what makes the switch reversible.
 *
 * Requires pi's `hideThinkingBlock` to be false; install.sh sets it.
 */
export function installThinking(pi: ExtensionAPI, getConfig: () => GrokTuiConfig) {
	let visible = getConfig().thinkingBlocks === "visible";

	pi.registerMarkdownTransformer((markdown, mctx) => {
		if (mctx.messageType !== "assistant-thinking" || visible) return markdown;
		return getConfig().enabled ? "" : markdown;
	});

	const set = (ctx: ExtensionContext, next: boolean) => {
		if (next === visible) return;
		visible = next;
		// Transformers run inside render, so re-rendering is what applies the new
		// state to messages already on screen. Re-applying the current theme is the
		// one public lever that invalidates the whole tree.
		ctx.ui.setTheme(ctx.ui.theme.name);
	};

	return {
		isVisible: () => visible,
		set,
		toggle: (ctx: ExtensionContext) => set(ctx, !visible),
	};
}
