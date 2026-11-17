import { Entity, Sprite } from "@tsengine/runtime/jsx";

import { useGame } from "./GameState.ts";
import { TILE_FRAME } from "./rules/draw.ts";
import { COLS, mapOf, ROWS, TILE, tileKey } from "./rules/map.ts";

/** Every tile of a map's grid, in reading order, with the frame of `assets/tiles.png` it shows. */
function tilesOf(map: string): { readonly id: number; readonly col: number; readonly row: number; readonly frame: number }[] {
  const { pathTiles, terrain } = mapOf(map);
  return Array.from({ length: COLS * ROWS }, (_, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const key = tileKey(col, row);
    const type = terrain.get(key);
    const tuft = (col * 7 + row * 13) % 5 === 0;
    const frame = pathTiles.has(key) ? TILE_FRAME.path : type !== undefined ? TILE_FRAME[type] : tuft ? TILE_FRAME.tuft : TILE_FRAME.grass;
    return { id: i, col, row, frame };
  });
}

/**
 * The ground of the run's map: grass, the path, and its terrain tiles (`tools/make-art.ts`): a creature on its own type's terrain is
 * attuned, every stat higher.
 */
export function Field() {
  const map = useGame((s) => s.map);
  return (
    <Entity>
      {tilesOf(map).map((t) => (
        <Sprite key={t.id} image="tiles.png" frameWidth={TILE} frameHeight={TILE} frame={t.frame} x={t.col * TILE} y={t.row * TILE} />
      ))}
    </Entity>
  );
}
