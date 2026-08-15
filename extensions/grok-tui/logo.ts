/**
 * The pi mark, and the assembly animation for it.
 *
 * Cell coordinates and frame choreography are derived from pi-open-tui (MIT),
 * which in turn derives them from pi's official install script. That package
 * ships the frames but renders only the last one — the animation has never
 * actually played. Here it plays, in grayscale: pieces slide in dim, settle to
 * mid, and the assembled mark locks up in the accent color.
 */

const CELL = "███";
const BLANK = "   ";

/** Weight of a cell, from faintest to strongest. */
export type CellWeight = "sliding" | "settled" | "locked" | null;

interface Frame {
	phase: number;
	active: "left" | "top" | "right" | "none";
	ax: number;
	ay: number;
	flash?: boolean;
	white?: boolean;
}

const FRAMES: Frame[] = [
	...Array.from({ length: 4 }, (_, ay) => ({ phase: 0, active: "left" as const, ax: 2, ay })),
	...Array.from({ length: 3 }, (_, ay) => ({ phase: 1, active: "top" as const, ax: 2, ay })),
	...Array.from({ length: 5 }, (_, ay) => ({ phase: 2, active: "right" as const, ax: 5, ay })),
	{ phase: 3, active: "none", ax: 0, ay: 0 },
	{ phase: 3, active: "none", ax: 0, ay: 0, flash: true },
	{ phase: 3, active: "none", ax: 0, ay: 0 },
	{ phase: 3, active: "none", ax: 0, ay: 0, flash: true },
	{ phase: 4, active: "none", ax: 0, ay: 0 },
	{ phase: 5, active: "none", ax: 0, ay: 0 },
	{ phase: 5, active: "none", ax: 0, ay: 0, white: true },
	{ phase: 5, active: "none", ax: 0, ay: 0 },
	{ phase: 5, active: "none", ax: 0, ay: 0, white: true },
	{ phase: 6, active: "none", ax: 0, ay: 0 },
];

export const FRAME_COUNT = FRAMES.length;
export const FRAME_INTERVAL_MS = 70;
/**
 * A fixed viewport over the cell grid. Both axes are pinned so the mark holds
 * one position from the first frame to the last — cropping per frame, or
 * trimming blank rows once it settles, makes the whole block jump.
 *
 * Rows 2–6 cover every row the choreography actually uses: the pieces occupy
 * 2–5 while assembling and drop to 3–6 on the final beat. Row 1 is clipped on
 * purpose, so the first piece enters from beyond the edge instead of popping in.
 */
const MIN_Y = 2;
const MAX_Y = 6;
const MIN_X = 1;
const MAX_X = 6;
export const LOGO_WIDTH = (MAX_X - MIN_X + 1) * CELL.length;

const ASSEMBLED = "3,2 3,3 3,4 4,4 4,2 5,2 5,3 5,5 6,2 6,5";

function hasCell(y: number, x: number, cells: string): boolean {
	return cells.split(" ").includes(`${y},${x}`);
}

function hasPiece(y: number, x: number, py: number, px: number, cells: string): boolean {
	return cells.split(" ").some((item) => {
		const [dy, dx] = item.split(",").map(Number);
		return y === py + (dy ?? 0) && x === px + (dx ?? 0);
	});
}

function weightAt(frame: Frame, y: number, x: number): CellWeight {
	if (frame.white) return hasCell(y, x, "3,2 3,3 3,4 4,2 4,4 5,2 5,3 5,5 6,2 6,5") ? "locked" : null;
	if (frame.flash && y === 6 && x >= 1 && x <= 6) return "locked";

	if (frame.active === "left" && hasPiece(y, x, frame.ay, frame.ax, "0,0 1,0 1,1 2,0")) return "sliding";
	if (frame.active === "top" && hasPiece(y, x, frame.ay, frame.ax, "0,0 0,1 0,2 1,2")) return "sliding";
	if (frame.active === "right" && hasPiece(y, x, frame.ay, frame.ax, "0,0 1,0 2,0 2,1")) return "sliding";

	if (frame.phase === 6) return hasCell(y, x, ASSEMBLED) ? "locked" : null;
	if (frame.phase === 4) return hasCell(y, x, "2,2 2,3 2,4 3,4 3,2 4,2 4,3 5,2 4,5 5,5") ? "settled" : null;
	if (frame.phase >= 5) return hasCell(y, x, "3,2 3,3 3,4 4,4 4,2 5,2 5,3 6,2 5,5 6,5") ? "settled" : null;

	if (frame.phase <= 3 && hasCell(y, x, "6,1 6,2 6,3 6,4")) return "settled";
	if (frame.phase >= 2 && hasCell(y, x, "2,2 2,3 2,4 3,4")) return "settled";
	if (frame.phase >= 1 && hasCell(y, x, "3,2 4,2 4,3 5,2")) return "settled";
	if (frame.phase >= 3 && hasCell(y, x, "4,5 5,5 6,5 6,6")) return "settled";
	return null;
}

/**
 * Render one frame as rows of painted cells. `paint` receives the cell string
 * and its weight, so the caller owns all color decisions.
 */
export function renderFrame(index: number, paint: (cell: string, weight: Exclude<CellWeight, null>) => string): string[] {
	const frame = FRAMES[Math.min(index, FRAMES.length - 1)]!;
	const rows: string[] = [];
	for (let y = MIN_Y; y <= MAX_Y; y++) {
		let line = "";
		for (let x = MIN_X; x <= MAX_X; x++) {
			const weight = weightAt(frame, y, x);
			line += weight ? paint(CELL, weight) : BLANK;
		}
		rows.push(line);
	}
	return rows;
}
