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

type Piece = "left" | "top" | "right";
/** `ax`/`ay` are the sliding piece's origin, so they exist only while one moves. */
type Frame = { phase: number; flash?: boolean; white?: boolean } & ({ active: Piece; ax: number; ay: number } | { active: "none" });

const FRAMES: Frame[] = [
	...Array.from({ length: 4 }, (_, ay) => ({ phase: 0, active: "left" as const, ax: 2, ay })),
	...Array.from({ length: 3 }, (_, ay) => ({ phase: 1, active: "top" as const, ax: 2, ay })),
	...Array.from({ length: 5 }, (_, ay) => ({ phase: 2, active: "right" as const, ax: 5, ay })),
	{ phase: 3, active: "none" },
	{ phase: 3, active: "none", flash: true },
	{ phase: 3, active: "none" },
	{ phase: 3, active: "none", flash: true },
	{ phase: 4, active: "none" },
	{ phase: 5, active: "none" },
	{ phase: 5, active: "none", white: true },
	{ phase: 5, active: "none" },
	{ phase: 5, active: "none", white: true },
	{ phase: 6, active: "none" },
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

/** A set of `y,x` cell keys, parsed once instead of per lookup. */
const cells = (spec: string): ReadonlySet<string> => new Set(spec.split(" "));

const ASSEMBLED = cells("3,2 3,3 3,4 4,2 4,4 5,2 5,3 5,5 6,2 6,5");
/** The same mark one row up: the beat before it drops into place. */
const RAISED: ReadonlySet<string> = new Set(
	[...ASSEMBLED].map((key) => {
		const [y, x] = key.split(",");
		return `${Number(y) - 1},${x}`;
	}),
);

/** Where each piece comes to rest, and the base rule the pieces land on. */
const LANDED = { left: cells("3,2 4,2 4,3 5,2"), top: cells("2,2 2,3 2,4 3,4"), right: cells("4,5 5,5 6,5 6,6") };
const BASE = cells("6,1 6,2 6,3 6,4");

/** Each piece's own shape while it slides, as offsets from the frame's `ax`/`ay`. */
const SLIDING: Record<Piece, ReadonlySet<string>> = {
	left: cells("0,0 1,0 1,1 2,0"),
	top: cells("0,0 0,1 0,2 1,2"),
	right: cells("0,0 1,0 2,0 2,1"),
};

function weightAt(frame: Frame, y: number, x: number): CellWeight {
	const at = `${y},${x}`;
	if (frame.white) return ASSEMBLED.has(at) ? "locked" : null;
	if (frame.flash && y === 6 && x >= 1 && x <= 6) return "locked";

	if (frame.active !== "none" && SLIDING[frame.active].has(`${y - frame.ay},${x - frame.ax}`)) return "sliding";

	if (frame.phase === 6) return ASSEMBLED.has(at) ? "locked" : null;
	if (frame.phase === 4) return RAISED.has(at) ? "settled" : null;
	if (frame.phase >= 5) return ASSEMBLED.has(at) ? "settled" : null;

	if (frame.phase <= 3 && BASE.has(at)) return "settled";
	if (frame.phase >= 2 && LANDED.top.has(at)) return "settled";
	if (frame.phase >= 1 && LANDED.left.has(at)) return "settled";
	if (frame.phase >= 3 && LANDED.right.has(at)) return "settled";
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
