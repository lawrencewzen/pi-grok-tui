#!/usr/bin/env node
// Renders a fake pi TUI screen with a theme's colors, so you can eyeball a
// theme without launching pi. Usage: node preview.mjs [themes/grok.json]

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const file = resolve(here, process.argv[2] ?? "themes/grok.json");
const theme = JSON.parse(readFileSync(file, "utf8"));

const hex = (value, seen = new Set()) => {
	if (typeof value === "number") return null; // 256-color index: not previewed
	if (!value) return null; // terminal default
	if (/^#[0-9a-fA-F]{6}$/.test(value)) return value;
	if (seen.has(value)) throw new Error(`circular var reference: ${value}`);
	seen.add(value);
	const target = theme.vars?.[value];
	if (target === undefined) throw new Error(`unknown var: ${value}`);
	return hex(target, seen);
};

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const fg = (name, s) => {
	const h = hex(theme.colors[name]);
	return h ? `\x1b[38;2;${rgb(h).join(";")}m${s}\x1b[39m` : s;
};
const bg = (name, s) => {
	const h = hex(theme.colors[name]);
	return h ? `\x1b[48;2;${rgb(h).join(";")}m${s}\x1b[49m` : s;
};
const bold = (s) => `\x1b[1m${s}\x1b[22m`;
const W = 74;
// CJK and box-drawing-adjacent chars take two terminal columns
const wide = /[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿가-힣豈-﫿︰-﹯＀-｠￠-￦]/;
const width = (s) => [...s.replace(/\x1b\[[0-9;]*m/g, "")].reduce((n, ch) => n + (wide.test(ch) ? 2 : 1), 0);
const pad = (s, w = W) => s + " ".repeat(Math.max(0, w - width(s)));
const box = (bgName, lines) => lines.forEach((l) => console.log(bg(bgName, pad("  " + l))));
const rule = (name, char = "─") => console.log(fg(name, char.repeat(W)));

console.log();
console.log(`  ${bold(fg("accent", "π"))}  ${fg("muted", theme.name)}   ${fg("dim", file.replace(here + "/", ""))}`);
console.log();

// user message
box("userMessageBg", ["", fg("userMessageText", "重构 auth 中间件，把 token 校验抽成独立函数"), ""]);
console.log();

// thinking
console.log(fg("thinkingText", "  思考中… 先看现有的中间件签名，再决定拆分边界。"));
console.log();

// assistant markdown
console.log(`  ${bold(fg("mdHeading", "验证流程"))}`);
console.log(`  ${fg("mdListBullet", "•")} 解析 ${fg("mdCode", "Authorization")} 头`);
console.log(`  ${fg("mdListBullet", "•")} 参考 ${fg("mdLink", "RFC 6750")} ${fg("mdLinkUrl", "(datatracker.ietf.org)")}`);
console.log(`  ${fg("mdQuoteBorder", "│")} ${fg("mdQuote", "过期 token 应返回 401 而非 403")}`);
console.log(`  ${fg("mdHr", "─".repeat(W - 2))}`);
console.log();

// tool boxes
box("toolPendingBg", [`${fg("toolTitle", bold("bash"))}  ${fg("muted", "npm test")}`, fg("toolOutput", "running…")]);
console.log();
box("toolSuccessBg", [
	`${fg("toolTitle", bold("edit"))}  ${fg("muted", "src/auth.ts")}`,
	fg("toolDiffContext", " export function verify(req) {"),
	fg("toolDiffRemoved", "-  const t = req.headers.auth"),
	fg("toolDiffAdded", "+  const t = parseBearer(req)"),
	fg("toolDiffContext", " }"),
]);
console.log();
box("toolErrorBg", [`${fg("toolTitle", bold("bash"))}  ${fg("muted", "npm run lint")}`, fg("error", "2 problems (2 errors)")]);
console.log();

// syntax highlighting sample
console.log(`  ${fg("mdCodeBlockBorder", "```ts")}`);
console.log(
	`  ${fg("syntaxComment", "// verify a bearer token")}\n` +
		`  ${fg("syntaxKeyword", "export async function")} ${fg("syntaxFunction", "parseBearer")}${fg("syntaxPunctuation", "(")}${fg("syntaxVariable", "req")}${fg("syntaxOperator", ":")} ${fg("syntaxType", "Request")}${fg("syntaxPunctuation", ")")} ${fg("syntaxPunctuation", "{")}\n` +
		`    ${fg("syntaxKeyword", "const")} ${fg("syntaxVariable", "raw")} ${fg("syntaxOperator", "=")} ${fg("syntaxVariable", "req")}${fg("syntaxPunctuation", ".")}${fg("syntaxFunction", "header")}${fg("syntaxPunctuation", "(")}${fg("syntaxString", '"authorization"')}${fg("syntaxPunctuation", ")")}\n` +
		`    ${fg("syntaxKeyword", "if")} ${fg("syntaxPunctuation", "(")}${fg("syntaxVariable", "raw")}${fg("syntaxPunctuation", ".")}${fg("syntaxVariable", "length")} ${fg("syntaxOperator", "<")} ${fg("syntaxNumber", "8")}${fg("syntaxPunctuation", ")")} ${fg("syntaxKeyword", "throw")} ${fg("syntaxFunction", "unauthorized")}${fg("syntaxPunctuation", "()")}\n` +
		`  ${fg("syntaxPunctuation", "}")}`,
);
console.log(`  ${fg("mdCodeBlockBorder", "```")}`);
console.log();

// states + selection
console.log(
	`  ${fg("success", "✓ 通过")}   ${fg("error", "✗ 失败")}   ${fg("warning", "! 警告")}   ${fg("muted", "muted")}   ${fg("dim", "dim")}`,
);
console.log("  " + bg("selectedBg", pad(fg("accent", "❯ 选中的候选项"), W - 2)));
console.log();

// editor borders per thinking level
rule("border");
const levels = ["thinkingOff", "thinkingMinimal", "thinkingLow", "thinkingMedium", "thinkingHigh", "thinkingXhigh", "thinkingMax", "bashMode"];
for (const l of levels) {
	const label = l.replace("thinking", "").toLowerCase() || "off";
	console.log(`  ${fg(l, "▌")} ${fg("dim", pad(l === "bashMode" ? "! bash" : label, 10))}${fg(l, "─".repeat(24))}`);
}
rule("borderMuted");
console.log(`  ${fg("borderAccent", "▌")} ${fg("dim", pad("focused", 10))}${fg("borderAccent", "─".repeat(24))}`);
console.log();
