import { estimateTokens, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { GrokTuiConfig } from "./config.ts";

const TICK_MS = 250;

function formatElapsed(ms: number): string {
	const total = Math.floor(ms / 1000);
	if (total < 60) return `${total}s`;
	return `${Math.floor(total / 60)}m${String(total % 60).padStart(2, "0")}s`;
}

function formatTokens(n: number): string {
	if (n < 1000) return `${n}`;
	if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
	return `${(n / 1_000_000).toFixed(1)}M`;
}

/**
 * Appends elapsed time and output tokens to the working line.
 *
 * Providers on the OpenAI-compatible protocol only return usage in the final
 * chunk (`stream_options: {include_usage: true}`), so a streaming message
 * reports 0 output tokens until it ends — the count would sit still for the
 * whole response and then jump. To keep the number live, the streaming message
 * is estimated from its own text whenever the provider hasn't reported yet, and
 * the display marks it `~`. Reported numbers always win once they arrive.
 *
 * Completed messages in the same agent run are carried in `settled`, so a
 * multi-tool turn keeps counting up instead of resetting per message.
 */
export function installWorkingStats(pi: ExtensionAPI, getConfig: () => GrokTuiConfig): void {
	let timer: ReturnType<typeof setInterval> | undefined;
	let startedAt = 0;
	let settled = 0;
	// Held rather than measured per delta: message_update fires per token, while
	// the line only repaints every TICK_MS.
	let partial: Parameters<typeof estimateTokens>[0] | undefined;

	const stop = (ctx: ExtensionContext) => {
		if (timer) clearInterval(timer);
		timer = undefined;
		ctx.ui.setWorkingMessage();
	};

	const paint = (ctx: ExtensionContext) => {
		const config = getConfig();
		const parts = [formatElapsed(Date.now() - startedAt)];

		const reported = partial?.role === "assistant" ? (partial.usage?.output ?? 0) : 0;
		const estimated = reported === 0 && partial ? estimateTokens(partial) : 0;
		const tokens = settled + reported + estimated;
		if (tokens > 0) parts.push(`${estimated > 0 ? "~" : ""}${formatTokens(tokens)} tok`);

		ctx.ui.setWorkingMessage(`${config.workingLabel} ${parts.join(" · ")}`);
	};

	pi.on("agent_start", (_event, ctx) => {
		if (!getConfig().enabled || !getConfig().workingStats || ctx.mode !== "tui") return;
		startedAt = Date.now();
		settled = 0;
		partial = undefined;
		paint(ctx);
		timer = setInterval(() => paint(ctx), TICK_MS);
		timer.unref?.();
	});

	pi.on("message_update", (event) => {
		if (!timer) return;
		partial = event.assistantMessageEvent.partial;
	});

	pi.on("message_end", (event) => {
		if (!timer) return;
		settled += event.message.role === "assistant" ? (event.message.usage?.output ?? 0) : 0;
		partial = undefined;
	});

	pi.on("agent_end", (_event, ctx) => stop(ctx));
	pi.on("session_shutdown", (_event, ctx) => stop(ctx));
}
