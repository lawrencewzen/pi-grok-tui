import { VERSION, type ExtensionAPI, type ExtensionContext, type SlashCommandInfo, type Theme } from "@earendil-works/pi-coding-agent";
import type { Component, TUI } from "@earendil-works/pi-tui";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import type { GrokTuiConfig } from "./config.ts";
import { FRAME_COUNT, FRAME_INTERVAL_MS, LOGO_WIDTH, renderFrame } from "./logo.ts";
import { formatCwd, formatModel, formatThinking, padRight } from "./utils.ts";

const MIN_TWO_COLUMN_WIDTH = 62;

/**
 * A sample of the commands actually loaded, not a hardcoded list. Skills and
 * prompts come first — those are the ones the user installed and is most likely
 * to have forgotten about; built-in extension commands fill the rest.
 */
function pickTips(commands: SlashCommandInfo[], count: number): SlashCommandInfo[] {
	if (count <= 0) return [];
	const shuffle = <T>(items: T[]): T[] => {
		const out = [...items];
		for (let i = out.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[out[i], out[j]] = [out[j]!, out[i]!];
		}
		return out;
	};
	const owned = shuffle(commands.filter((c) => c.source === "skill" || c.source === "prompt"));
	const builtin = shuffle(commands.filter((c) => c.source === "extension"));
	return [...owned, ...builtin].slice(0, count);
}
/** The mark starts at grid column 2; text lines match that inset. */
const LOGO_GUTTER = "   ";

export class GrokHeader implements Component {
	private readonly pi: ExtensionAPI;
	private readonly ctx: ExtensionContext;
	private readonly tui: TUI;
	private readonly config: GrokTuiConfig;
	private frame: number;
	private timer: ReturnType<typeof setInterval> | undefined;
	private readonly tips: SlashCommandInfo[];
	private readonly commandCount: number;

	constructor(pi: ExtensionAPI, ctx: ExtensionContext, tui: TUI, config: GrokTuiConfig) {
		this.pi = pi;
		this.ctx = ctx;
		this.tui = tui;
		this.config = config;
		const commands = pi.getCommands();
		this.commandCount = commands.length;
		this.tips = pickTips(commands, config.commandTips);
		this.frame = config.headerAnimation ? 0 : FRAME_COUNT - 1;
		if (config.headerAnimation) this.startAnimation();
	}

	private startAnimation(): void {
		this.timer = setInterval(() => {
			this.frame++;
			if (this.frame >= FRAME_COUNT - 1) {
				this.frame = FRAME_COUNT - 1;
				this.stopAnimation();
			}
			this.tui.requestRender();
		}, FRAME_INTERVAL_MS);
		// Don't hold the process open on exit.
		this.timer.unref?.();
	}

	private stopAnimation(): void {
		if (this.timer) clearInterval(this.timer);
		this.timer = undefined;
	}

	private logoLines(theme: Theme): string[] {
		const rows = renderFrame(this.frame, (cell, weight) => {
			if (weight === "sliding") return theme.fg("borderMuted", cell);
			if (weight === "settled") return theme.fg("dim", cell);
			return theme.fg("accent", cell);
		});
		// Returned as-is, always the same row count: the viewport in logo.ts is
		// fixed, so the mark does not move when the animation ends.
		return rows;
	}

	private infoLines(theme: Theme): string[] {
		const lines: string[] = [];
		if (this.config.tagline) lines.push(theme.fg("text", theme.bold(this.config.tagline)));
		lines.push(theme.fg("muted", `${formatModel(this.ctx.model)} · ${formatThinking(this.pi.getThinkingLevel())}`));
		lines.push(theme.fg("dim", formatCwd(this.ctx.cwd)));
		// The mark's own left edge is grid column 2, three cells in; indent the
		// text so both share one edge.
		return lines.map((line) => `${LOGO_GUTTER}${line}`);
	}

	private commandLines(theme: Theme): string[] {
		if (this.config.commandTips <= 0) return [];
		const lines = [
			theme.fg("accent", theme.bold("Welcome")),
			theme.fg("muted", "Ask pi anything"),
			theme.fg("border", "──────────"),
			theme.fg("accent", theme.bold(`Commands ${this.commandCount}`)),
		];
		for (const tip of this.tips) lines.push(theme.fg("dim", `/${tip.name}`));
		lines.push(theme.fg("border", "/help for all"));
		return lines;
	}

	render(width: number): string[] {
		const theme = this.ctx.ui.theme;
		if (width < 20) return [theme.fg("accent", `pi v${VERSION}`)];

		const logo = this.logoLines(theme);
		const info = this.infoLines(theme);
		const style = this.config.header;

		// logo-only variant: mark plus one meta line, no frame, no commands.
		if (style === "logo") {
			const meta = `${formatModel(this.ctx.model)} · ${formatThinking(this.pi.getThinkingLevel())} · ${formatCwd(this.ctx.cwd)}`;
			return [...logo, "", `${LOGO_GUTTER}${theme.fg("dim", truncateToWidth(meta, Math.max(0, width - LOGO_GUTTER.length), "…"))}`];
		}

		const twoColumn = width >= MIN_TWO_COLUMN_WIDTH;
		const commands = twoColumn ? this.commandLines(theme) : [];

		if (style === "plain") {
			const body = this.stack(logo, info, commands, width, 0);
			return [...body, theme.fg("borderMuted", "─".repeat(width))];
		}

		// full: square hairline frame, label riding the top rule
		const inner = width - 4;
		const label = ` pi v${VERSION} `;
		// ┌ + ─ + label + fill + ┐ must come to exactly `width`.
		const topFill = Math.max(0, width - 3 - visibleWidth(label));
		const lines: string[] = [];
		lines.push(theme.fg("border", `┌─${label}${"─".repeat(topFill)}┐`));
		for (const row of this.stack(logo, info, commands, inner, 2)) {
			lines.push(`${theme.fg("border", "│")} ${padRight(row, inner)} ${theme.fg("border", "│")}`);
		}
		lines.push(theme.fg("border", `└${"─".repeat(Math.max(0, width - 2))}┘`));
		return lines.map((line) => truncateToWidth(line, width, ""));
	}

	/** Left column (logo + info) beside the right column (commands). */
	private stack(logo: string[], info: string[], commands: string[], width: number, indent: number): string[] {
		const leftWidth = commands.length ? Math.max(LOGO_WIDTH + 4, Math.floor(width * 0.55)) : width;
		const left = [...logo, "", ...info];
		const rows = Math.max(left.length, commands.length);
		const out: string[] = [];
		const pad = " ".repeat(indent);

		for (let i = 0; i < rows; i++) {
			const l = left[i] ?? "";
			const r = commands[i] ?? "";
			if (!commands.length) {
				out.push(`${pad}${l}`);
				continue;
			}
			out.push(`${pad}${padRight(l, leftWidth - indent)}${r}`);
		}
		return out;
	}

	invalidate(): void {}

	dispose(): void {
		this.stopAnimation();
	}
}

export function installHeader(pi: ExtensionAPI, ctx: ExtensionContext, config: GrokTuiConfig): () => void {
	let header: GrokHeader | undefined;
	ctx.ui.setHeader((tui) => {
		header?.dispose();
		header = new GrokHeader(pi, ctx, tui, config);
		return header;
	});
	return () => {
		header?.dispose();
		header = undefined;
		ctx.ui.setHeader(undefined);
	};
}
