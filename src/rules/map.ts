import type { Type } from "./types.ts";

/**
 * The screen is 480 × 270. The field is a 20 × 14 grid of 16 px tiles, the top left 320 × 224 of it; the bar is under the field and
 * the side panel to its right.
 */
export const TILE = 16;
export const COLS = 20;
export const ROWS = 14;
export const FIELD_WIDTH = COLS * TILE;
export const FIELD_HEIGHT = ROWS * TILE;
export const SCREEN_WIDTH = 480;
export const SCREEN_HEIGHT = 270;

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

export type MapId = "meadow" | "riverbend" | "gauntlet";

export const MAP_IDS: readonly MapId[] = ["meadow", "riverbend", "gauntlet"];

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
 * A map from its corners (as tiles, from just off the left edge to just off the right) and its terrain (tiles by type). Throws if a
 * terrain tile is on the path or off the grid, so a typo in a table is caught when the module loads.
 */
function makeMap(
  id: MapId,
  name: string,
  text: string,
  corners: readonly (readonly [number, number])[],
  terrain: Readonly<Record<Type, readonly (readonly [number, number])[]>>
): GameMap {
  const pathTiles = tilesOf(corners);
  const tiles = new Map<string, Type>();
  for (const [type, spots] of Object.entries(terrain) as [Type, readonly (readonly [number, number])[]][]) {
    for (const [col, row] of spots) {
      const key = tileKey(col, row);
      if (pathTiles.has(key) || col < 0 || col >= COLS || row < 0 || row >= ROWS || tiles.has(key))
        throw new Error(`${id}: terrain at ${key} is on the path, off the grid or twice`);
      tiles.set(key, type);
    }
  }
  return { id, name, text, path: makePath(corners.map(([col, row]) => centre(col, row))), pathTiles, terrain: tiles };
}

export const MAPS: Readonly<Record<MapId, GameMap>> = {
  meadow: makeMap(
    "meadow",
    "Meadow",
    "A long winding path.",
    [
      [-1, 1],
      [4, 1],
      [4, 10],
      [9, 10],
      [9, 3],
      [14, 3],
      [14, 12],
      [20, 12],
    ],
    {
      tide: [
        [5, 9],
        [13, 11],
      ],
      volt: [
        [8, 9],
        [10, 4],
      ],
      stone: [
        [3, 2],
        [15, 11],
      ],
      ember: [
        [5, 4],
        [8, 5],
      ],
      bloom: [
        [13, 4],
        [10, 8],
      ],
    }
  ),
  riverbend: makeMap(
    "riverbend",
    "Riverbend",
    "Tight bends, far apart.",
    [
      [-1, 6],
      [6, 6],
      [6, 1],
      [12, 1],
      [12, 12],
      [17, 12],
      [17, 5],
      [20, 5],
    ],
    {
      tide: [
        [7, 2],
        [16, 11],
      ],
      volt: [
        [11, 2],
        [3, 7],
      ],
      stone: [
        [5, 5],
        [13, 10],
      ],
      ember: [
        [13, 11],
        [9, 0],
      ],
      bloom: [
        [18, 6],
        [9, 2],
      ],
    }
  ),
  gauntlet: makeMap(
    "gauntlet",
    "Gauntlet",
    "Short, one bend. The hard one.",
    [
      [-1, 3],
      [10, 3],
      [10, 10],
      [20, 10],
    ],
    {
      tide: [
        [9, 4],
        [15, 9],
      ],
      volt: [
        [11, 9],
        [5, 4],
      ],
      stone: [
        [9, 11],
        [6, 2],
      ],
      ember: [
        [11, 2],
        [15, 11],
      ],
      bloom: [
        [5, 2],
        [11, 4],
      ],
    }
  ),
};

/**
 * The map with this id. The game state keeps the run's map as a plain string (what a component reads of the state is typed by its
 * first value), so lookups go through here; an id that is no map's is the first map.
 */
export function mapOf(id: string): GameMap {
  return MAPS[id as MapId] ?? MAPS.meadow;
}

export function isPath(map: string, col: number, row: number): boolean {
  return mapOf(map).pathTiles.has(tileKey(col, row));
}

/** The type a tile attunes, or null for plain grass and path. */
export function terrainAt(map: string, col: number, row: number): Type | null {
  return mapOf(map).terrain.get(tileKey(col, row)) ?? null;
}
