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

/** A tile as `[col, row]`. */
export type Tile = readonly [number, number];

export type MapId = "meadow" | "glowmire";
export const MAP_IDS: readonly MapId[] = ["meadow", "glowmire"];

/** One map: the path the enemies walk, and what else stands on the field. */
export interface GameMap {
  readonly id: MapId;
  readonly name: string;
  /** A few words for the title screen. */
  readonly blurb: string;
  /** Night: drawn under a light map (`Night.tsx`), with its own shaders. */
  readonly night: boolean;
  /**
   * Enemies here gain this much more hit points each wave, on top of every map's growth (1.1 = 10 % more each wave than on the
   * Meadow): a longer path gives the creatures more time, so its later waves are tougher. 1 for none.
   */
  readonly toughness: number;
  /**
   * The path's corners as tiles, from just off the left edge to just off the right. Every segment is straight across or down, so
   * the tiles it crosses are the path.
   */
  readonly corners: readonly Tile[];
  readonly path: Path;
  /** Every tile the path crosses, as `col,row`. */
  readonly pathTiles: ReadonlySet<string>;
  /** Water: no creature stands there. */
  readonly water: ReadonlySet<string>;
  /** Lanterns and glow-mushrooms: lights that stand on a tile, which no creature can then take. */
  readonly lanterns: readonly Tile[];
  readonly mushrooms: readonly Tile[];
}

/** Every tile a run of corners crosses, as `col,row`. */
function tilesAlong(corners: readonly Tile[]): ReadonlySet<string> {
  const tiles = new Set<string>();
  for (let i = 1; i < corners.length; i++) {
    const [c0, r0] = corners[i - 1] as Tile;
    const [c1, r1] = corners[i] as Tile;
    const steps = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0));
    for (let k = 0; k <= steps; k++) {
      const col = c0 + Math.sign(c1 - c0) * k;
      const row = r0 + Math.sign(r1 - r0) * k;
      if (col >= 0 && col < COLS && row >= 0 && row < ROWS) tiles.add(`${col},${row}`);
    }
  }
  return tiles;
}

/** Every tile in the rectangle from (c0, r0) to (c1, r1), inclusive. */
function block(c0: number, r0: number, c1: number, r1: number): string[] {
  const tiles: string[] = [];
  for (let col = c0; col <= c1; col++) for (let row = r0; row <= r1; row++) tiles.push(`${col},${row}`);
  return tiles;
}

function makeMap(
  id: MapId,
  name: string,
  blurb: string,
  night: boolean,
  corners: readonly Tile[],
  extra: { toughness?: number; water?: readonly string[]; lanterns?: readonly Tile[]; mushrooms?: readonly Tile[] } = {}
): GameMap {
  return {
    id,
    name,
    blurb,
    night,
    toughness: extra.toughness ?? 1,
    corners,
    path: makePath(corners.map(([col, row]) => centre(col, row))),
    pathTiles: tilesAlong(corners),
    water: new Set(extra.water ?? []),
    lanterns: extra.lanterns ?? [],
    mushrooms: extra.mushrooms ?? [],
  };
}

export const MAPS: Readonly<Record<MapId, GameMap>> = {
  meadow: makeMap("meadow", "Meadow", "THE FIRST FIELD", false, [
    [-1, 1],
    [4, 1],
    [4, 6],
    [9, 6],
    [9, 2],
    [14, 2],
    [14, 7],
    [20, 7],
  ]),
  /**
   * A bog at night: a longer path that winds through three bends, but ponds fill the hollows inside them, and lanterns and
   * mushrooms take more tiles, so the spots that cover two stretches of path are few.
   */
  glowmire: makeMap(
    "glowmire",
    "Glowmire",
    "A BOG AT NIGHT. LONG PATH, FEW SPOTS",
    true,
    [
      [-1, 4],
      [2, 4],
      [2, 1],
      [6, 1],
      [6, 7],
      [10, 7],
      [10, 2],
      [14, 2],
      [14, 6],
      [17, 6],
      [17, 3],
      [20, 3],
    ],
    {
      toughness: 1.12,
      water: [...block(7, 4, 9, 6), ...block(11, 5, 13, 8), ...block(0, 6, 3, 8), ...block(15, 0, 19, 1), "18,2"],
      lanterns: [
        [3, 3],
        [9, 2],
        [13, 3],
        [18, 7],
      ],
      mushrooms: [
        [0, 0],
        [5, 8],
        [16, 4],
        [4, 6],
        [8, 8],
      ],
    }
  ),
};

/** What an enemy's hit points are multiplied by on this map in this wave (counted from 1). */
export function toughnessAt(map: GameMap, wave: number): number {
  return map.toughness ** Math.max(0, wave - 1);
}

/** Can a creature stand on this tile of the map: on the grid, not path, not water, no lantern or mushroom. */
export function isOpen(map: GameMap, col: number, row: number): boolean {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
  const key = `${col},${row}`;
  if (map.pathTiles.has(key) || map.water.has(key)) return false;
  return !map.lanterns.some(([c, r]) => c === col && r === row) && !map.mushrooms.some(([c, r]) => c === col && r === row);
}

export function isPath(map: GameMap, col: number, row: number): boolean {
  return map.pathTiles.has(`${col},${row}`);
}
