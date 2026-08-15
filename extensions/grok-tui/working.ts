import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
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
 * Tokens come from the streaming message's own usage, so they only move while a
 * provider reports usage mid-stream; when it doesn't, the count stays at zero
 * until the message ends and only the timer runs. Completed messages in the
 * same agent run are carried in `settled` so a multi-tool turn keeps counting up
 * instead of resetting per message.
 */
export function installWorkingStats(pi: ExtensionAPI, getConfig: () => GrokTuiConfig): void {
	let timer: ReturnType<typeof setInterval> | undefined;
	let startedAt = 0;
	let settled = 0;
	let streaming = 0;

	const stop = (ctx: ExtensionContext) => {
		if (timer) clearInterval(timer);
		timer = undefined;
		ctx.ui.setWorkingMessage();
	};

	const paint = (ctx: ExtensionContext) => {
		const config = getConfig();
		const parts = [formatElapsed(Date.now() - startedAt)];
		const tokens = settled + streaming;
		if (tokens > 0) parts.push(`${formatTokens(tokens)} tok`);
		ctx.ui.setWorkingMessage(`${config.workingLabel} ${parts.join(" · ")}`);
	};

	pi.on("agent_start", (_event, ctx) => {
		if (!getConfig().enabled || !getConfig().workingStats || ctx.mode !== "tui") return;
		startedAt = Date.now();
		settled = 0;
		streaming = 0;
		paint(ctx);
		timer = setInterval(() => paint(ctx), TICK_MS);
		timer.unref?.();
	});

	pi.on("message_update", (event, ctx) => {
		if (!timer) return;
		streaming = event.assistantMessageEvent.partial?.usage?.output ?? streaming;
		paint(ctx);
	});

	pi.on("message_end", (event) => {
		if (!timer) return;
		settled += event.message.role === "assistant" ? (event.message.usage?.output ?? 0) : 0;
		streaming = 0;
	});

	pi.on("agent_end", (_event, ctx) => stop(ctx));
	pi.on("session_shutdown", (_event, ctx) => stop(ctx));
}
