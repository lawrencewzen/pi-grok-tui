import type { IconMode } from "./config.ts";

/**
 * Footer glyphs. Nerd Font codepoints are Material Design icons (nf-md-*) —
 * one family, so a font that has any of them has all of them.
 */
export interface Glyphs {
	cwd: string;
	branch: string;
	model: string;
	context: string;
	thinking: string;
	cost: string;
}

const NERD: Glyphs = {
	cwd: "\u{F024B}", // 󰉋 folder
	branch: "\u{F062C}", // 󰘬 source branch
	model: "\u{F06A9}", // 󰚩 robot
	context: "\u{F0109}", // 󰄉 timer/gauge
	thinking: "\u{F0335}", // 󰌵 lightbulb
	cost: "\u{F0114}", // 󰄔 currency
};

/** Every glyph empty: the footer degrades to the plain-text variant. */
const NONE: Glyphs = { cwd: "", branch: "", model: "", context: "", thinking: "", cost: "" };

/**
 * Terminals whose users have very likely installed a Nerd Font. A TUI can't
 * read the terminal's font, so this is a guess — the same one Starship makes.
 * PI_NERD_FONT=0 opts out, PI_NERD_FONT=1 forces it on.
 */
const NERD_FONT_TERMINALS = new Set(["ghostty", "WezTerm", "iTerm.app", "kitty", "rio", "Tabby", "vscode", "Warp"]);

export function detectNerdFont(): boolean {
	const flag = process.env.PI_NERD_FONT;
	if (flag === "0" || flag === "false") return false;
	if (flag === "1" || flag === "true") return true;

	const termProgram = process.env.TERM_PROGRAM;
	if (termProgram && NERD_FONT_TERMINALS.has(termProgram)) return true;
	const lcTerminal = process.env.LC_TERMINAL;
	if (lcTerminal && NERD_FONT_TERMINALS.has(lcTerminal)) return true;
	if (process.env.TERM === "xterm-kitty" || process.env.TERM === "xterm-ghostty") return true;
	if (process.env.WT_SESSION) return true;
	return false;
}

export function resolveGlyphs(mode: IconMode): Glyphs {
	if (mode === "off") return NONE;
	if (mode === "nerd") return NERD;
	return detectNerdFont() ? NERD : NONE;
}
