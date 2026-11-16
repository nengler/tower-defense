/** The field: a 20 × 9 grid of 16 px tiles, the top 320 × 144 of the screen. The bar is under it. */
export const TILE = 16;
export const COLS = 20;
export const ROWS = 9;
export const FIELD_HEIGHT = ROWS * TILE;

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** A polyline the enemies walk. */
export interface Path {
  readonly points: readonly Point[];
  /** Distance from the start to each point. */
  readonly offsets: readonly number[];
  readonly length: number;
}

export function makePath(points: readonly Point[]): Path {
  if (points.length < 2) throw new Error("A path needs at least a start and an end.");
  const offsets: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1] as Point;
    const b = points[i] as Point;
    offsets.push((offsets[i - 1] as number) + Math.hypot(b.x - a.x, b.y - a.y));
  }
  return { points, offsets, length: offsets[offsets.length - 1] as number };
}

/** Where `distance` pixels along the path is (clamped to its ends). */
export function pathAt(path: Path, distance: number): Point {
  const d = Math.max(0, Math.min(distance, path.length));
  let i = 1;
  while (i < path.points.length - 1 && (path.offsets[i] as number) < d) i++;
  const a = path.points[i - 1] as Point;
  const b = path.points[i] as Point;
  const segment = (path.offsets[i] as number) - (path.offsets[i - 1] as number);
  const t = segment === 0 ? 0 : (d - (path.offsets[i - 1] as number)) / segment;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** The middle of a tile. */
export const centre = (col: number, row: number): Point => ({ x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 });

/**
 * The path's corners as tiles, from just off the left edge to just off the right. Every segment is straight across or down, so
 * the tiles it crosses are the path.
 */
const CORNERS: readonly (readonly [number, number])[] = [
  [-1, 1],
  [4, 1],
  [4, 6],
  [9, 6],
  [9, 2],
  [14, 2],
  [14, 7],
  [20, 7],
];

export const PATH = makePath(CORNERS.map(([col, row]) => centre(col, row)));

/** Every tile the path crosses, as `col,row`. */
function pathTiles(): ReadonlySet<string> {
  const tiles = new Set<string>();
  for (let i = 1; i < CORNERS.length; i++) {
    const [c0, r0] = CORNERS[i - 1] as readonly [number, number];
    const [c1, r1] = CORNERS[i] as readonly [number, number];
    const steps = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0));
    for (let k = 0; k <= steps; k++) {
      const col = c0 + Math.sign(c1 - c0) * k;
      const row = r0 + Math.sign(r1 - r0) * k;
      if (col >= 0 && col < COLS && row >= 0 && row < ROWS) tiles.add(`${col},${row}`);
    }
  }
  return tiles;
}

export const PATH_TILES = pathTiles();

export function isPath(col: number, row: number): boolean {
  return PATH_TILES.has(`${col},${row}`);
}
