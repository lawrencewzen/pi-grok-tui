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
	/** Append elapsed time and output tokens to the working line. */
	workingStats: boolean;
	/** The word the working line leads with. */
	workingLabel: string;
	/** Start with tool output collapsed; pi's own ctrl+o still toggles it. */
	collapseTools: boolean;
	icons: IconMode;
	footer: {
		gitBranch: boolean;
		thinking: boolean;
		cost: boolean;
		/**
		 * Spell the context gauge out as `used/window` next to the percentage.
		 * The percentage says how much room is left; the counts say how big the
		 * room is, which is what tells you whether 20% is generous or nothing.
		 */
		contextTokens: boolean;
		/** Show what other extensions published through `ctx.ui.setStatus()`. */
		extensions: boolean;
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
		thinking: true,
		cost: false,
		contextTokens: true,
		extensions: true,
		indent: 1,
	},
};

function configPath(): string {
	const home = process.env.HOME || process.env.USERPROFILE || ".";
	return join(process.env.PI_AGENT_DIR ?? join(home, ".pi", "agent"), "grok-tui.json");
}

export function loadConfig(): GrokTuiConfig {
	// A missing or malformed file is not an error: the defaults stand in. The
	// copy matters — callers hold on to the result and DEFAULT_CONFIG is shared.
	let parsed: Partial<GrokTuiConfig> = {};
	try {
		parsed = (JSON.parse(readFileSync(configPath(), "utf8")) as Partial<GrokTuiConfig> | null) ?? {};
	} catch {}
	return { ...DEFAULT_CONFIG, ...parsed, footer: { ...DEFAULT_CONFIG.footer, ...parsed.footer } };
}

export function saveConfig(config: GrokTuiConfig): void {
	const path = configPath();
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}
