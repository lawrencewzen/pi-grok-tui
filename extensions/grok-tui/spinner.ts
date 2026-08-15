import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { GrokTuiConfig, SpinnerStyle } from "./config.ts";

/**
 * pi's stock spinner walks two braille dots around a 2×4 cell. Two things
 * follow from that grid, both measured in Maple Mono NF CN (1/1000 em):
 *
 *   - the lit dots move, so the glyph's optical center travels 340→553 —
 *     a 213 swing, about 21% of the type size, and the spinner visibly bobs
 *     against the word next to it;
 *   - the braille block is 2 cells wide by 4 tall, so the mark reads as an
 *     upright rectangle, 376×772.
 *
 * `square` fixes both: every frame is a full 600×600 square outline with the
 * fill flipping inside it, so the bounding box — and the center — never move.
 * `braille` keeps the dot texture and only fixes the bobbing, by lighting
 * seven of eight dots and rotating the gap.
 *
 * Both sets are present in Maple Mono NF CN and JetBrains Mono NF.
 */
const FRAMES: Record<Exclude<SpinnerStyle, "pi">, { frames: string[]; intervalMs: number }> = {
	square: { frames: ["◧", "◩", "◨", "◪"], intervalMs: 130 },
	braille: { frames: ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"], intervalMs: 80 },
};

export function installSpinner(ctx: ExtensionContext, config: GrokTuiConfig): () => void {
	const preset = config.spinner === "pi" ? undefined : FRAMES[config.spinner];
	if (!preset) return () => {};
	// Custom frames render verbatim, so the color has to be baked in here.
	ctx.ui.setWorkingIndicator({
		frames: preset.frames.map((frame) => ctx.ui.theme.fg("muted", frame)),
		intervalMs: preset.intervalMs,
	});
	return () => ctx.ui.setWorkingIndicator();
}
