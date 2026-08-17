import { isAbsolute, relative, resolve, sep } from "node:path";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

/** Home-relative path, no middle-segment elision. */
export function formatCwd(cwd: string): string {
	const home = process.env.HOME || process.env.USERPROFILE;
	if (!home) return cwd;
	const rel = relative(resolve(home), resolve(cwd));
	const insideHome = rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
	if (!insideHome) return cwd;
	return rel === "" ? "~" : `~${sep}${rel}`;
}

/**
 * The model's display name, not `provider/id`. pi's model objects carry a
 * human name; most footers ignore it and show the slug instead.
 */
export function formatModel(model: { name?: string; id?: string } | null | undefined): string {
	return model?.name || model?.id || "no model";
}

export function formatThinking(level: string | undefined): string {
	return level || "off";
}

/**
 * Token counts at a glance: `842`, `4.2k`, `128k`, `1.0M`. Under 10k keeps one
 * decimal — the difference between 4.2k and 4.9k is worth seeing — above it the
 * decimal is noise on a line that has to share space with everything else.
 */
export function formatTokens(n: number): string {
	if (n < 1000) return `${n}`;
	if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
	return `${(n / 1_000_000).toFixed(1)}M`;
}

export function padRight(text: string, width: number): string {
	const w = visibleWidth(text);
	if (w >= width) return truncateToWidth(text, width, "");
	return text + " ".repeat(width - w);
}
