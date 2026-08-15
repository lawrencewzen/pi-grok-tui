import type { ExtensionAPI, ExtensionContext, ReadonlyFooterDataProvider, Theme } from "@earendil-works/pi-coding-agent";
import type { Component, TUI } from "@earendil-works/pi-tui";
import { truncateToWidth } from "@earendil-works/pi-tui";
import type { GrokTuiConfig } from "./config.ts";
import { type Glyphs, resolveGlyphs } from "./icons.ts";
import { formatCwd, formatModel, formatThinking } from "./utils.ts";

interface Segment {
	icon: string;
	text: string;
	/** Segments can override the text color; the default is `muted`. */
	color?: "muted" | "warning" | "error";
}

export class GrokFooter implements Component {
	private readonly ctx: ExtensionContext;
	private readonly pi: ExtensionAPI;
	private readonly theme: Theme;
	private readonly config: GrokTuiConfig;
	private readonly glyphs: Glyphs;
	private readonly data: ReadonlyFooterDataProvider;
	public dispose: () => void;

	constructor(pi: ExtensionAPI, ctx: ExtensionContext, tui: TUI, theme: Theme, data: ReadonlyFooterDataProvider, config: GrokTuiConfig) {
		this.pi = pi;
		this.ctx = ctx;
		this.theme = theme;
		this.config = config;
		this.data = data;
		this.glyphs = resolveGlyphs(config.icons);
		this.dispose = data.onBranchChange(() => tui.requestRender());
	}

	private contextSegment(): Segment | null {
		const usage = this.ctx.getContextUsage();
		if (!usage || usage.percent === null) return null;
		const left = Math.max(0, Math.round(100 - usage.percent));
		// The one place color is allowed back into the footer: running out of room.
		const color = left < 10 ? "error" : left < 20 ? "warning" : "muted";
		return { icon: this.glyphs.context, text: `${left}% left`, color };
	}

	private segments(): Segment[] {
		const out: Segment[] = [{ icon: this.glyphs.cwd, text: formatCwd(this.ctx.cwd) }];

		if (this.config.footer.gitBranch) {
			const branch = this.data.getGitBranch();
			if (branch) out.push({ icon: this.glyphs.branch, text: branch });
		}

		out.push({ icon: this.glyphs.model, text: formatModel(this.ctx.model) });

		if (this.config.footer.thinking) {
			out.push({ icon: this.glyphs.thinking, text: formatThinking(this.pi.getThinkingLevel()) });
		}

		const context = this.contextSegment();
		if (context) out.push(context);

		if (this.config.footer.cost) {
			const cost = this.sessionCost();
			if (cost !== null) out.push({ icon: this.glyphs.cost, text: cost.toFixed(2) });
		}

		return out;
	}

	private sessionCost(): number | null {
		try {
			const branch = this.ctx.sessionManager.getBranch();
			let total = 0;
			for (const entry of branch) {
				const cost = (entry as { usage?: { cost?: { total?: number } } }).usage?.cost?.total;
				if (typeof cost === "number") total += cost;
			}
			return total > 0 ? total : null;
		} catch {
			return null;
		}
	}

	render(width: number): string[] {
		const theme = this.theme;
		// Icons sit one step darker than the text they label, so they read as
		// markers rather than decoration.
		const painted = this.segments().map((seg) => {
			const text = theme.fg(seg.color ?? "muted", seg.text);
			return seg.icon ? `${theme.fg("dim", seg.icon)} ${text}` : text;
		});
		const separator = theme.fg("border", " | ");
		return [truncateToWidth(painted.join(separator), width, "…")];
	}

	invalidate(): void {}
}

export function installFooter(pi: ExtensionAPI, ctx: ExtensionContext, config: GrokTuiConfig): () => void {
	let footer: GrokFooter | undefined;
	ctx.ui.setFooter((tui, theme, footerData) => {
		footer?.dispose();
		footer = new GrokFooter(pi, ctx, tui, theme, footerData, config);
		return footer;
	});
	return () => {
		footer?.dispose();
		footer = undefined;
		ctx.ui.setFooter(undefined);
	};
}
