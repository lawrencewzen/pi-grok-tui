#!/usr/bin/env node
// Renders the extension's header and footer outside pi, with a stub context,
// so layout and alignment can be checked without launching the TUI.
// Colors are stripped: this checks geometry, preview.mjs checks color.
// Usage: node preview-chrome.mjs [width]

const WIDTH = Number(process.argv[2] ?? 78);

const { GrokHeader } = await import("./extensions/grok-tui/header.ts");
const { GrokFooter } = await import("./extensions/grok-tui/footer.ts");
const { DEFAULT_CONFIG } = await import("./extensions/grok-tui/config.ts");
const { FRAME_COUNT } = await import("./extensions/grok-tui/logo.ts");

const theme = { fg: (_c, s) => s, bg: (_c, s) => s, bold: (s) => s };
const tui = { requestRender() {}, terminal: { rows: 40, columns: WIDTH } };
const ctx = {
	mode: "tui",
	ui: { theme },
	cwd: `${process.env.HOME}/Projects/pi-tui-theme`,
	model: { name: "DeepSeek Chat", id: "deepseek-chat", provider: "deepseek" },
	getContextUsage: () => ({ tokens: 18000, contextWindow: 128000, percent: 14 }),
	sessionManager: { getBranch: () => [] },
};
const pi = {
	getThinkingLevel: () => "high",
	getCommands: () => [
		{ name: "pi-subagents", source: "skill" },
		{ name: "parallel-review", source: "prompt" },
		{ name: "review-loop", source: "prompt" },
		{ name: "gather-context-and-clarify", source: "prompt" },
		{ name: "settings", source: "extension" },
		{ name: "export", source: "extension" },
		{ name: "grok-tui", source: "extension" },
	],
};
const footerData = { getGitBranch: () => "main", onBranchChange: () => () => {} };

const rule = (label) => console.log(`\n\x1b[2m── ${label} ${"─".repeat(Math.max(0, WIDTH - label.length - 4))}\x1b[22m`);
const show = (lines) => {
	for (const line of lines) {
		const width = [...line.replace(/\x1b\[[0-9;]*m/g, "")].length;
		const flag = width > WIDTH ? `  \x1b[31m<- ${width} > ${WIDTH}\x1b[39m` : "";
		console.log(`|${line}|${flag}`);
	}
};

for (const style of ["full", "plain", "logo"]) {
	rule(`header · ${style}`);
	const header = new GrokHeader(pi, ctx, tui, { ...DEFAULT_CONFIG, header: style, headerAnimation: false });
	show(header.render(WIDTH));
	header.dispose();
}

rule(`header · full · animation frames`);
const animated = new GrokHeader(pi, ctx, tui, { ...DEFAULT_CONFIG, headerAnimation: true });
for (const frame of [0, 6, 12, FRAME_COUNT - 1]) {
	animated.frame = frame;
	console.log(`\n  frame ${frame + 1}/${FRAME_COUNT}`);
	show(animated.render(WIDTH));
}
animated.dispose();

rule("footer · default (plain text, three segments)");
const footer = new GrokFooter(pi, ctx, tui, theme, footerData, DEFAULT_CONFIG);
show(footer.render(WIDTH));
footer.dispose();

rule("footer · all segments on, icons forced");
const full = new GrokFooter(pi, ctx, tui, theme, footerData, {
	...DEFAULT_CONFIG,
	icons: "nerd",
	footer: { gitBranch: true, thinking: true, cost: true },
});
show(full.render(WIDTH));
full.dispose();

rule("footer · icons forced on");
const plain = new GrokFooter(pi, ctx, tui, theme, footerData, { ...DEFAULT_CONFIG, icons: "nerd" });
show(plain.render(WIDTH));
plain.dispose();

rule("footer · context nearly full");
const tight = new GrokFooter(
	pi,
	{ ...ctx, getContextUsage: () => ({ tokens: 120000, contextWindow: 128000, percent: 94 }) },
	tui,
	theme,
	footerData,
	DEFAULT_CONFIG,
);
show(tight.render(WIDTH));
tight.dispose();
console.log();

// Editor: the frame must stop at pi's own bottom rule, leaving the autocomplete
// panel outside it, and the reverse-video caret must be gone.
const { GrokEditor } = await import("./extensions/grok-tui/editor.ts");
const probe = Object.create(GrokEditor.prototype);
probe.barCursor = true;
probe.borderColor = (s) => s;
const editorLines = [
	"─".repeat(40),
	"/\x1b[7m \x1b[0m",
	"─".repeat(40),
	"→ settings          Open settings menu",
	"  model             Select model",
	"(1/52)",
];
rule("editor · frame vs autocomplete");
console.log(`  bottom rule at index ${probe.bottomRuleIndex(editorLines)} of ${editorLines.length - 1}  (3..5 stay outside the frame)`);
console.log(`  caret line: ${JSON.stringify(probe.unblock(editorLines[1]))}  (was ${JSON.stringify(editorLines[1])})`);
console.log();
