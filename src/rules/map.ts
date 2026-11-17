import type { Type } from "./types.ts";

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

/** The tile a point is on, as `col,row`. */
export const tileKey = (col: number, row: number): string => `${col},${row}`;

export type MapId = "meadow" | "riverbend" | "gauntlet" | "glowmire";

export const MAP_IDS: readonly MapId[] = ["meadow", "riverbend", "gauntlet", "glowmire"];

/** A tile as `[col, row]`. */
export type Tile = readonly [number, number];

/**
 * A map: its path and its terrain. Terrain tiles are tiles a creature may stand on; one standing on its own type's terrain is
 * attuned (`TERRAIN_BONUS` to every stat), so where a creature stands is a choice even though moving it is free.
 */
export interface GameMap {
  readonly id: MapId;
  readonly name: string;
  /** One line for the run setup. */
  readonly text: string;
  readonly path: Path;
  /** Every tile the path crosses, as `col,row`. */
  readonly pathTiles: ReadonlySet<string>;
  /** The terrain tiles, `col,row` to the type they attune. */
  readonly terrain: ReadonlyMap<string, Type>;
  /** Night: drawn under a light map, with its own shaders (`Night.tsx`). */
  readonly night: boolean;
  /**
   * Enemies here gain this much more hit points each wave, on top of the curve every map has (1.06 = 6 % more each wave): a longer
   * path gives the creatures more time, so its later waves are tougher. 1 for none.
   */
  readonly toughness: number;
  /** Water, as `col,row`: no creature stands there. */
  readonly water: ReadonlySet<string>;
  /** Lanterns and glow-mushrooms: lights standing on a tile, which no creature can then take. */
  readonly lanterns: readonly Tile[];
  readonly mushrooms: readonly Tile[];
}

/** What else a map has, beyond its path and terrain. */
interface Extra {
  readonly night?: boolean;
  readonly toughness?: number;
  readonly water?: readonly string[];
  readonly lanterns?: readonly Tile[];
  readonly mushrooms?: readonly Tile[];
}

/** Every tile in the rectangle from (c0, r0) to (c1, r1), inclusive, as `col,row`. */
function block(c0: number, r0: number, c1: number, r1: number): string[] {
  const tiles: string[] = [];
  for (let col = c0; col <= c1; col++) for (let row = r0; row <= r1; row++) tiles.push(tileKey(col, row));
  return tiles;
}

/** What standing on its own type's terrain adds to each of a creature's stats. */
export const TERRAIN_BONUS = 2;

/** Every tile a path through these corners crosses. Every segment is straight across or down. */
function tilesOf(corners: readonly (readonly [number, number])[]): ReadonlySet<string> {
  const tiles = new Set<string>();
  for (let i = 1; i < corners.length; i++) {
    const [c0, r0] = corners[i - 1] as readonly [number, number];
    const [c1, r1] = corners[i] as readonly [number, number];
    const steps = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0));
    for (let k = 0; k <= steps; k++) {
      const col = c0 + Math.sign(c1 - c0) * k;
      const row = r0 + Math.sign(r1 - r0) * k;
      if (col >= 0 && col < COLS && row >= 0 && row < ROWS) tiles.add(tileKey(col, row));
    }
  }
  return tiles;
}

/**
 * A map from its corners (as tiles, from just off the left edge to just off the right), its terrain (tiles by type) and anything
 * else it has. Throws if a terrain tile is on the path, in the water, under a lantern or mushroom, or off the grid, so a typo in a
 * table is caught when the module loads.
 */
function makeMap(
  id: MapId,
  name: string,
  text: string,
  corners: readonly (readonly [number, number])[],
  terrain: Readonly<Record<Type, readonly (readonly [number, number])[]>>,
  extra: Extra = {}
): GameMap {
  const pathTiles = tilesOf(corners);
  const water = new Set(extra.water ?? []);
  const props = new Set([...(extra.lanterns ?? []), ...(extra.mushrooms ?? [])].map(([col, row]) => tileKey(col, row)));
  const tiles = new Map<string, Type>();
  for (const [type, spots] of Object.entries(terrain) as [Type, readonly (readonly [number, number])[]][]) {
    for (const [col, row] of spots) {
      const key = tileKey(col, row);
      if (pathTiles.has(key) || water.has(key) || props.has(key) || col < 0 || col >= COLS || row < 0 || row >= ROWS || tiles.has(key))
        throw new Error(`${id}: terrain at ${key} is on the path, in the water, under a light, off the grid or twice`);
      tiles.set(key, type);
    }
  }
  return {
    id,
    name,
    text,
    path: makePath(corners.map(([col, row]) => centre(col, row))),
    pathTiles,
    terrain: tiles,
    night: extra.night ?? false,
    toughness: extra.toughness ?? 1,
    water,
    lanterns: extra.lanterns ?? [],
    mushrooms: extra.mushrooms ?? [],
  };
}

export const MAPS: Readonly<Record<MapId, GameMap>> = {
  meadow: makeMap(
    "meadow",
    "Meadow",
    "A long winding path.",
    [
      [-1, 1],
      [4, 1],
      [4, 6],
      [9, 6],
      [9, 2],
      [14, 2],
      [14, 7],
      [20, 7],
    ],
    {
      tide: [
        [5, 5],
        [13, 6],
      ],
      volt: [
        [8, 5],
        [10, 3],
      ],
      stone: [
        [3, 2],
        [15, 6],
      ],
      ember: [
        [5, 2],
        [8, 3],
      ],
      bloom: [
        [13, 3],
        [10, 5],
      ],
    }
  ),
  riverbend: makeMap(
    "riverbend",
    "Riverbend",
    "Tight bends, far apart.",
    [
      [-1, 4],
      [6, 4],
      [6, 1],
      [12, 1],
      [12, 7],
      [17, 7],
      [17, 3],
      [20, 3],
    ],
    {
      tide: [
        [7, 2],
        [16, 6],
      ],
      volt: [
        [11, 2],
        [3, 5],
      ],
      stone: [
        [5, 3],
        [14, 5],
      ],
      ember: [
        [13, 6],
        [9, 0],
      ],
      bloom: [
        [18, 4],
        [9, 2],
      ],
    }
  ),
  gauntlet: makeMap(
    "gauntlet",
    "Gauntlet",
    "One bend: all of it passes by.",
    [
      [-1, 2],
      [10, 2],
      [10, 6],
      [20, 6],
    ],
    {
      tide: [
        [9, 3],
        [15, 5],
      ],
      volt: [
        [11, 5],
        [5, 3],
      ],
      stone: [
        [9, 7],
        [6, 1],
      ],
      ember: [
        [11, 1],
        [15, 7],
      ],
      bloom: [
        [5, 1],
        [11, 3],
      ],
    }
  ),
  /**
   * A bog at night: a longer path that winds through three bends, but ponds fill the hollows inside them, and lanterns and
   * mushrooms take more tiles, so the spots beside two stretches of path are few.
   */
  glowmire: makeMap(
    "glowmire",
    "Glowmire",
    "A bog at night: a long path, few spots.",
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
      tide: [
        [8, 3],
        [15, 5],
      ],
      volt: [
        [12, 4],
        [1, 2],
      ],
      stone: [
        [5, 5],
        [16, 7],
      ],
      ember: [
        [4, 2],
        [11, 3],
      ],
      bloom: [
        [7, 2],
        [16, 2],
      ],
    },
    {
      night: true,
      toughness: 1.06,
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
export function toughnessAt(map: MapId, wave: number): number {
  return mapOf(map).toughness ** Math.max(0, wave - 1);
}

/** Can a creature stand on this tile: on the grid, not path or water, no lantern or mushroom on it. */
export function isOpen(map: MapId, col: number, row: number): boolean {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
  const m = mapOf(map);
  const key = tileKey(col, row);
  if (m.pathTiles.has(key) || m.water.has(key)) return false;
  return !m.lanterns.some(([c, r]) => c === col && r === row) && !m.mushrooms.some(([c, r]) => c === col && r === row);
}

/** The map with this id. */
export function mapOf(id: MapId): GameMap {
  return MAPS[id];
}

export function isPath(map: MapId, col: number, row: number): boolean {
  return mapOf(map).pathTiles.has(tileKey(col, row));
}

/** The type a tile attunes, or null for plain grass and path. */
export function terrainAt(map: MapId, col: number, row: number): Type | null {
  return mapOf(map).terrain.get(tileKey(col, row)) ?? null;
}
