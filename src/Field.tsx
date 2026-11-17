import { Entity, Layer, Sprite } from "@tsengine/runtime/jsx";

import { useGame } from "./GameState.ts";
import { TILE_FRAME } from "./rules/draw.ts";
import { COLS, mapOf, ROWS, TILE, tileKey, type MapId } from "./rules/map.ts";

interface Drawn {
  readonly id: number;
  readonly col: number;
  readonly row: number;
  readonly frame: number;
}

/**
 * Every tile of a map's ground, in reading order, with the frame of `assets/tiles.png` it shows: grass (now and then a tuft, or reeds
 * at night), the path (cobbles at night), or terrain. Water is left out: it is drawn on a layer of its own (`waterOf`).
 */
function tilesOf(map: MapId): Drawn[] {
  const { pathTiles, terrain, water, night } = mapOf(map);
  const tiles: Drawn[] = [];
  for (let i = 0; i < COLS * ROWS; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const key = tileKey(col, row);
    if (water.has(key)) continue;
    const type = terrain.get(key);
    const tuft = (col * 7 + row * 13) % 5 === 0;
    const frame = pathTiles.has(key)
      ? night
        ? TILE_FRAME.cobbles
        : TILE_FRAME.path
      : type !== undefined
        ? TILE_FRAME[type]
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
 * attuned, every stat higher. Ponds are drawn on a layer of their own, which `water.glsl` ripples, and lanterns and mushrooms stand
 * on top.
 */
export function Field() {
  const map = useGame((s) => s.map);
  return (
    <Entity>
      {tilesOf(map).map((t) => (
        <Sprite key={t.id} image="tiles.png" frameWidth={TILE} frameHeight={TILE} frame={t.frame} x={t.col * TILE} y={t.row * TILE} />
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
