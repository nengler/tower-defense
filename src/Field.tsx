import { Entity, Layer, Sprite } from "@tsengine/runtime/jsx";

import { useGame } from "./GameState.ts";
import { COLS, mapOf, MAPS, ROWS, TILE, type GameMap, type MapId } from "./rules/map.ts";

/** Frames of `assets/tiles.png` (`tools/make-art.ts`). */
const FRAME = { grass: 0, tuft: 1, path: 2, bog: 3, reeds: 4, cobbles: 5, water: 6, lantern: 7, mushroom: 8 } as const;

/** Something worked out once for each map. */
const perMap = <T,>(make: (map: GameMap) => T): Readonly<Record<MapId, T>> => ({ meadow: make(MAPS.meadow), glowmire: make(MAPS.glowmire) });

interface Ground {
  readonly id: number;
  readonly col: number;
  readonly row: number;
  readonly frame: number;
}

/**
 * Each map's ground, tile by tile in reading order, worked out once: grass (now and then a tuft, or reeds at night) or path. Water
 * is left out of it: it is drawn on its own layer, through its shader.
 */
const GROUND = perMap((map) => {
    const tiles: Ground[] = [];
    for (let i = 0; i < COLS * ROWS; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const key = `${col},${row}`;
      if (map.water.has(key)) continue;
      const tuft = (col * 7 + row * 13) % 5 === 0;
      const frame = map.pathTiles.has(key) ? (map.night ? FRAME.cobbles : FRAME.path) : map.night ? (tuft ? FRAME.reeds : FRAME.bog) : tuft ? FRAME.tuft : FRAME.grass;
      tiles.push({ id: i, col, row, frame });
    }
    return tiles as readonly Ground[];
});

/** Each map's water tiles, and the lanterns and mushrooms standing on it. */
const WATER = perMap((map): readonly Ground[] =>
  [...map.water].map((key) => {
    const [col, row] = key.split(",").map(Number) as [number, number];
    return { id: row * COLS + col, col, row, frame: FRAME.water };
  })
);

const PROPS = perMap((map): readonly Ground[] => [
  ...map.lanterns.map(([col, row]) => ({ id: row * COLS + col, col, row, frame: FRAME.lantern })),
  ...map.mushrooms.map(([col, row]) => ({ id: row * COLS + col, col, row, frame: FRAME.mushroom })),
]);

/**
 * The ground of the run's map, from `assets/tiles.png`: grass and the path, the ponds on a layer of their own that `water.glsl`
 * ripples, and the lanterns and mushrooms that stand on it.
 */
export function Field() {
  const mapId = useGame((s) => s.map);
  const map = mapOf(mapId).id;
  return (
    <Entity>
      {GROUND[map].map((t) => (
        <Sprite key={t.id} image="tiles.png" frameWidth={TILE} frameHeight={TILE} frame={t.frame} x={t.col * TILE} y={t.row * TILE} />
      ))}
      <Layer shader="water.glsl" params={[1]}>
        {WATER[map].map((t) => (
          <Sprite key={t.id} image="tiles.png" frameWidth={TILE} frameHeight={TILE} frame={t.frame} x={t.col * TILE} y={t.row * TILE} />
        ))}
      </Layer>
      {PROPS[map].map((t) => (
        <Sprite key={t.id} image="tiles.png" frameWidth={TILE} frameHeight={TILE} frame={t.frame} x={t.col * TILE} y={t.row * TILE} />
      ))}
    </Entity>
  );
}
