/**
 * Marks: what some area moves leave on the path tiles they cover, for a while. An enemy on a marked tile keeps getting the mark's
 * status, so where a creature's area lands along the path matters, and two creatures can lay marks for each other's combos.
 * A tile holds one mark: a new one replaces the old (a puddle puts out embers).
 */
export type MarkKind = "puddle" | "embers" | "spores";

export interface MarkInfo {
  readonly name: string;
  /** Seconds a mark lasts. */
  readonly lasts: number;
  /** What an enemy on it gets, every `PULSE` seconds. */
  readonly soak: number;
  /** Burn damage a second, before the maker's attack and the type factor. */
  readonly burn: number;
  readonly slow: number;
}

/** How often a mark touches the enemies on it, and how long what it gives lasts after an enemy steps off. */
export const PULSE = 0.25;
export const LINGER = 0.5;

export const MARKS: Readonly<Record<MarkKind, MarkInfo>> = {
  puddle: { name: "Puddle", lasts: 5, soak: LINGER, burn: 0, slow: 0 },
  embers: { name: "Embers", lasts: 4, soak: 0, burn: 3, slow: 0 },
  spores: { name: "Spores", lasts: 5, soak: 0, burn: 0, slow: 0.35 },
};

/** The colour a mark is drawn in. */
export const MARK_COLOR: Readonly<Record<MarkKind, string>> = {
  puddle: "#4aa3f0",
  embers: "#f07a3a",
  spores: "#b0f09a",
};

/** The path tiles (`col,row`) whose middle is within `radius` of (x, y): what an area move marks. At least the tile it is on. */
export function tilesUnder(pathTiles: ReadonlySet<string>, x: number, y: number, radius: number, tile: number): string[] {
  const out: string[] = [];
  for (const key of pathTiles) {
    const [col, row] = key.split(",").map(Number) as [number, number];
    const cx = col * tile + tile / 2;
    const cy = row * tile + tile / 2;
    if (Math.hypot(cx - x, cy - y) <= Math.max(radius, tile / 2)) out.push(key);
  }
  return out;
}
