#!/usr/bin/env node
// Checks a theme against pi's theme schema: required tokens present, no unknown
// tokens, every value a valid hex / 256-index / var reference / "".
// Usage: node validate.mjs [themes/*.json]

import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SCHEMA = "/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/theme/theme-schema.json";
const schema = JSON.parse(readFileSync(SCHEMA, "utf8"));
const required = schema.properties.colors.required;
const known = Object.keys(schema.properties.colors.properties);

const files = process.argv.slice(2).length
	? process.argv.slice(2).map((f) => resolve(here, f))
	: readdirSync(join(here, "themes"))
			.filter((f) => f.endsWith(".json"))
			.map((f) => join(here, "themes", f));

let failed = false;
for (const file of files) {
	const errors = [];
	const theme = JSON.parse(readFileSync(file, "utf8"));

	if (!theme.name) errors.push("missing name");
	if (theme.name?.includes("/")) errors.push("name must not contain '/'");

	const resolveVar = (value, chain = []) => {
		if (typeof value === "number") {
			if (!Number.isInteger(value) || value < 0 || value > 255) errors.push(`256-color index out of range: ${value}`);
			return;
		}
		if (typeof value !== "string") return errors.push(`bad color value: ${JSON.stringify(value)}`);
		if (value === "" || /^#[0-9a-fA-F]{6}$/.test(value)) return;
		if (chain.includes(value)) return errors.push(`circular var: ${chain.join(" -> ")} -> ${value}`);
		if (!(value in (theme.vars ?? {}))) return errors.push(`unknown var reference: "${value}"`);
		resolveVar(theme.vars[value], [...chain, value]);
	};

	for (const [k, v] of Object.entries(theme.vars ?? {})) resolveVar(v, [k]);
	for (const token of required) if (!(token in (theme.colors ?? {}))) errors.push(`missing required token: ${token}`);
	for (const [token, v] of Object.entries(theme.colors ?? {})) {
		if (!known.includes(token)) errors.push(`unknown token: ${token}`);
		resolveVar(v);
	}
	for (const [k, v] of Object.entries(theme.export ?? {})) {
		if (!["pageBg", "cardBg", "infoBg"].includes(k)) errors.push(`unknown export key: ${k}`);
		resolveVar(v);
	}

	const unused = Object.keys(theme.vars ?? {}).filter(
		(v) => !Object.values(theme.colors ?? {}).includes(v) && !Object.values(theme.export ?? {}).includes(v) && !Object.values(theme.vars ?? {}).includes(v),
	);

	const name = file.replace(here + "/", "");
	if (errors.length) {
		failed = true;
		console.log(`✗ ${name}`);
		for (const e of errors) console.log(`    ${e}`);
	} else {
		console.log(`✓ ${name}  (${Object.keys(theme.colors).length} tokens)${unused.length ? `  note: unused vars: ${unused.join(", ")}` : ""}`);
	}
}
process.exit(failed ? 1 : 0);
