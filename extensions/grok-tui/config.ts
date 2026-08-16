import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type HeaderStyle = "full" | "plain" | "logo";
export type EditorFrame = "box" | "lines";
export type IconMode = "auto" | "nerd" | "off";
export type CursorStyle = "bar" | "block";
export type CompletionPlacement = "above" | "below";
export type SpinnerStyle = "square" | "braille" | "pi";

export interface GrokTuiConfig {
	enabled: boolean;
	/** Wipe the screen and scrollback once, before pi paints its first frame. */
	clearOnStart: boolean;
	/**
	 * Say so on the working line while the model reasons: `Working with thinking`
	 * during a reasoning burst, plain `Working` the rest of the time.
	 */
	thinkingInWorking: boolean;
	/**
	 * Whether thinking blocks start hidden. Hiding is display-only — the blocks
	 * stay in the session and in the model's context — and leaves no row behind,
	 * unlike pi's own `hideThinkingBlock`, which this needs turned off.
	 */
	thinkingBlocks: "hidden" | "visible";
	/** Key that flips thinking blocks between hidden and visible. "" disables it. */
	thinkingToggleKey: string;
	/** Header layout: full = framed two columns, plain = no frame, logo = logo only. */
	header: HeaderStyle;
	/** Play the startup logo animation once per session. */
	headerAnimation: boolean;
	/** Line under the logo. Empty string hides it. */
	tagline: string;
	/** How many real slash commands to sample in the right column. 0 hides it. */
	commandTips: number;
	/** box = square closed frame, lines = pi's default top/bottom rules. */
	editorFrame: EditorFrame;
	/** bar = let the terminal draw its own caret, block = pi's reverse-video cell. */
	cursor: CursorStyle;
	/** Where the autocomplete panel opens relative to the input. */
	completion: CompletionPlacement;
	/** square = square glyphs, braille = braille with a fixed center, pi = its stock spinner. */
	spinner: SpinnerStyle;
	icons: IconMode;
	footer: {
		gitBranch: boolean;
		thinking: boolean;
		cost: boolean;
		/**
		 * Left indent, in cells. Box-drawing glyphs sit in the middle of their cell
		 * while text starts at its left edge, so a footer on column 0 reads as half
		 * a cell left of the frame above it. One cell puts it back under the border.
		 */
		indent: number;
	};
}

export const DEFAULT_CONFIG: GrokTuiConfig = {
	enabled: true,
	clearOnStart: true,
	thinkingInWorking: true,
	thinkingBlocks: "hidden",
	// ctrl+t belongs to pi's own toggle and is reserved against extensions.
	thinkingToggleKey: "alt+t",
	header: "full",
	headerAnimation: true,
	// Phrase inherited from pi-open-tui's header. Set to "" to drop it.
	tagline: "Let's build something great",
	commandTips: 4,
	editorFrame: "box",
	cursor: "bar",
	completion: "above",
	spinner: "braille",
	workingStats: true,
	workingLabel: "Working",
	collapseTools: true,
	// Plain text by default: the glyphs read as clutter next to the text they
	// label. Set to "nerd" or "auto" to bring them back.
	icons: "off",
	footer: {
		gitBranch: false,
		thinking: false,
		cost: false,
		indent: 1,
	},
};

function configPath(): string {
	const home = process.env.HOME || process.env.USERPROFILE || ".";
	return join(process.env.PI_AGENT_DIR ?? join(home, ".pi", "agent"), "grok-tui.json");
}

export function loadConfig(): GrokTuiConfig {
	try {
		const raw = readFileSync(configPath(), "utf8");
		const parsed = JSON.parse(raw) as Partial<GrokTuiConfig>;
		return {
			...DEFAULT_CONFIG,
			...parsed,
			footer: { ...DEFAULT_CONFIG.footer, ...(parsed.footer ?? {}) },
		};
	} catch {
		return { ...DEFAULT_CONFIG, footer: { ...DEFAULT_CONFIG.footer } };
	}
}

export function saveConfig(config: GrokTuiConfig): void {
	const path = configPath();
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}
