import { Entity, Layer, Sprite } from "@tsengine/runtime/jsx";

import { useGame } from "./GameState.ts";
import { pathFrame, TILE_FRAME } from "./rules/draw.ts";
import { COLS, mapOf, ROWS, TILE, tileKey, type MapId } from "./rules/map.ts";
import { TYPES, type Type } from "./rules/types.ts";

interface Drawn {
  readonly id: number;
  readonly col: number;
  readonly row: number;
  readonly frame: number;
}

/**
 * Every tile of a map's ground, in reading order, with the frame of `assets/tiles.png` it shows: grass (now and then flowers, or
 * reeds at night) or the path (a road joined to its neighbours, or cobbles at night). Water and terrain are left out: each is drawn on a layer of its own (`waterOf`,
 * `terrainOf`), through its shader.
 */
function tilesOf(map: MapId): Drawn[] {
  const { pathTiles, terrain, water, night, path } = mapOf(map);
  // The path runs off the edge at its two ends: the tiles just off the grid there count as road, so the road reaches the edge.
  const ends = [path.points[0]!, path.points[path.points.length - 1]!].map((p) => tileKey(Math.floor(p.x / TILE), Math.floor(p.y / TILE)));
  const road = (col: number, row: number) => pathTiles.has(tileKey(col, row)) || ends.includes(tileKey(col, row));
  const tiles: Drawn[] = [];
  for (let i = 0; i < COLS * ROWS; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const key = tileKey(col, row);
    if (water.has(key) || terrain.has(key)) continue;
    // Now and then a tuft of reeds at night; flowers, rarer, by day.
    const tuft = night ? (col * 7 + row * 13) % 5 === 0 : (((col * 73856093) ^ (row * 19349663)) >>> 0) % 9 === 0;
    const frame = pathTiles.has(key)
      ? night
        ? TILE_FRAME.cobbles
        : pathFrame(road(col, row - 1), road(col + 1, row), road(col, row + 1), road(col - 1, row))
      : night
          ? tuft
            ? TILE_FRAME.reeds
            : TILE_FRAME.bog
          : tuft
            ? TILE_FRAME.tuft
            : TILE_FRAME.grass;
    tiles.push({ id: i, col, row, frame });
  }
  return tiles;
}

/** A map's terrain tiles of one type. */
function terrainOf(map: MapId, type: Type): Drawn[] {
  const tiles: Drawn[] = [];
  for (const [key, t] of mapOf(map).terrain) {
    if (t !== type) continue;
    const [col, row] = key.split(",").map(Number) as [number, number];
    tiles.push({ id: row * COLS + col, col, row, frame: TILE_FRAME[type] });
  }
  return tiles;
}

/** Each type with its place in `TYPES`: which effect `terrain.glsl` gives its tiles. */
const KINDS = TYPES.map((type, i) => ({ type, i }));

/** A map's water tiles. */
function waterOf(map: MapId): Drawn[] {
  return [...mapOf(map).water].map((key) => {
    const [col, row] = key.split(",").map(Number) as [number, number];
    return { id: row * COLS + col, col, row, frame: TILE_FRAME.water };
  });
}

/** A map's lanterns and mushrooms, drawn over the ground. */
function propsOf(map: MapId): Drawn[] {
  const { lanterns, mushrooms } = mapOf(map);
  return [
    ...lanterns.map(([col, row]) => ({ id: row * COLS + col, col, row, frame: TILE_FRAME.lantern })),
    ...mushrooms.map(([col, row]) => ({ id: row * COLS + col, col, row, frame: TILE_FRAME.mushroom })),
  ];
}

/**
 * The ground of the run's map: grass, the path, and its terrain tiles (`tools/make-art.ts`): a creature on its own type's terrain is
 * attuned, every stat higher. Each type's terrain is a layer of its own that `terrain.glsl` keeps moving (embers, ripples, a crackle,
 * a glint, a rustle), so the tiles that attune stand out. Ponds are drawn on a layer of their own, which `water.glsl` ripples, and lanterns and mushrooms stand
 * on top.
 */
export function Field() {
  const map = useGame((s) => s.map);
  return (
    <Entity>
      {tilesOf(map).map((t) => (
        <Sprite key={t.id} image="tiles.png" frameWidth={TILE} frameHeight={TILE} frame={t.frame} x={t.col * TILE} y={t.row * TILE} />
      ))}
      {KINDS.map((k) => (
        <Layer key={k.type} shader="terrain.glsl" params={[k.i]}>
          {terrainOf(map, k.type).map((t) => (
            <Sprite key={t.id} image="tiles.png" frameWidth={TILE} frameHeight={TILE} frame={t.frame} x={t.col * TILE} y={t.row * TILE} />
          ))}
        </Layer>
      ))}
      <Layer shader="water.glsl" params={[1]}>
        {waterOf(map).map((t) => (
          <Sprite key={t.id} image="tiles.png" frameWidth={TILE} frameHeight={TILE} frame={t.frame} x={t.col * TILE} y={t.row * TILE} />
        ))}
      </Layer>
      {propsOf(map).map((t) => (
        <Sprite key={t.id} image="tiles.png" frameWidth={TILE} frameHeight={TILE} frame={t.frame} x={t.col * TILE} y={t.row * TILE} />
      ))}
    </Entity>
  );
}
