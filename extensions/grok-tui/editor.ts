import { CustomEditor, type ExtensionContext, type KeybindingsManager } from "@earendil-works/pi-coding-agent";
import type { EditorTheme, TUI } from "@earendil-works/pi-tui";
import { stripTerminalSequences, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import type { EditorFrame, GrokTuiConfig } from "./config.ts";

/**
 * pi's stock editor draws only a top and bottom rule. This wraps the same
 * content in a square hairline frame so the input echoes the header's frame.
 *
 * Border color is never hardcoded: everything routes through `this.borderColor`,
 * which pi repaints for thinking level and bash mode.
 */
export class GrokEditor extends CustomEditor {
	private readonly frame: EditorFrame;
	private readonly barCursor: boolean;
	private readonly completionAbove: boolean;

	constructor(tui: TUI, editorTheme: EditorTheme, keybindings: KeybindingsManager, config: GrokTuiConfig) {
		super(tui, editorTheme, keybindings, config.editorFrame === "box" ? { paddingX: 0 } : {});
		this.frame = config.editorFrame;
		this.barCursor = config.cursor === "bar";
		this.completionAbove = config.completion === "above";
		// Hand cursor duty to the terminal so it draws in the user's own style
		// (Ghostty's cursor-style, blink and cursor-color) instead of pi's block.
		if (this.barCursor) tui.setShowHardwareCursor(true);
	}

	override setPaddingX(padding: number): void {
		// In box mode the frame owns the horizontal inset.
		super.setPaddingX(this.frame === "box" ? 0 : padding);
	}

	/**
	 * pi draws its caret as a reverse-video cell. With the hardware cursor on,
	 * that block sits alongside the terminal's own caret — strip it and let the
	 * real one show through.
	 */
	private unblock(line: string): string {
		return this.barCursor ? line.replace(/\x1b\[7m(.*?)\x1b\[0m/g, "$1") : line;
	}

	/** A rule pi drew itself: a full run of ─, optionally carrying a scroll label. */
	private isRule(line: string): boolean {
		const plain = stripTerminalSequences(line);
		return /^─+$/.test(plain) || /^─*\s*[↑↓]\s+\d+\s+more\s*─*$/.test(plain);
	}

	/**
	 * The editor's own bottom rule. Anything after it is autocomplete, which pi
	 * renders as a free-standing panel — it must stay outside the frame, or the
	 * frame swallows the list and loses its bottom edge.
	 */
	private bottomRuleIndex(lines: string[]): number {
		for (let i = lines.length - 1; i >= 1; i--) {
			if (this.isRule(lines[i]!)) return i;
		}
		return Math.max(0, lines.length - 1);
	}

	private rule(width: number, kind: "top" | "bottom", source: string | undefined): string {
		const [left, right] = kind === "top" ? ["┌", "┐"] : ["└", "┘"];
		const label = source ? stripTerminalSequences(source).match(/([↑↓]\s+\d+\s+more)/) : null;
		if (label) {
			const text = `─── ${label[1]} `;
			const fill = Math.max(0, width - 2 - visibleWidth(text));
			return this.borderColor(`${left}${text}${"─".repeat(fill)}${right}`);
		}
		return this.borderColor(`${left}${"─".repeat(Math.max(0, width - 2))}${right}`);
	}

	override render(width: number): string[] {
		if (this.frame === "lines") {
			const plain = super.render(width).map((line) => this.unblock(line));
			if (!this.completionAbove) return plain;
			const cut = this.bottomRuleIndex(plain);
			const panel = plain.slice(cut + 1);
			return panel.length > 0 ? [...panel, ...plain.slice(0, cut + 1)] : plain;
		}
		if (width < 6) return super.render(width).map((line) => this.unblock(line));
		// │ + gap on each side
		const inner = width - 4;
		const lines = super.render(inner).map((line) => this.unblock(line));
		if (lines.length === 0) return lines;

		const bottom = this.bottomRuleIndex(lines);
		const rail = this.borderColor("│");
		const out: string[] = [this.rule(width, "top", lines[0])];

		for (let i = 1; i < bottom; i++) {
			// An interior rule is pi's scroll divider; blank it so only the frame draws lines.
			const line = this.isRule(lines[i]!) ? "" : lines[i]!;
			const content = truncateToWidth(line, inner, "");
			const pad = " ".repeat(Math.max(0, inner - visibleWidth(content)));
			out.push(`${rail} ${content}${pad} ${rail}`);
		}

		out.push(this.rule(width, "bottom", lines[bottom]));

		// The autocomplete panel pi appended. Opening it above the input keeps
		// the input where the eye already is and lets candidates rise toward the
		// conversation, the way a shell completion menu does.
		const panel = lines.slice(bottom + 1);
		const composed = this.completionAbove && panel.length > 0 ? [...panel, ...out] : [...out, ...panel];

		return composed.map((line) => truncateToWidth(line, width, ""));
	}
}

export function installEditor(ctx: ExtensionContext, config: GrokTuiConfig): () => void {
	// Installed even in "lines" mode, because the cursor treatment lives here too.
	if (config.editorFrame === "lines" && config.cursor === "block") return () => {};
	ctx.ui.setEditorComponent((tui, theme, keybindings) => new GrokEditor(tui, theme, keybindings, config));
	return () => ctx.ui.setEditorComponent(undefined);
}
