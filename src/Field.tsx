import { Entity, Sprite } from "@tsengine/runtime/jsx";

import { COLS, isPath, ROWS, TILE } from "./rules/map.ts";

/** Every tile of the grid, in reading order, with the frame of `assets/tiles.png` it shows: grass (now and then a tuft) or path. */
const TILES = Array.from({ length: COLS * ROWS }, (_, i) => {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const tuft = ((col * 7 + row * 13) % 5) === 0;
  return { id: i, col, row, frame: isPath(col, row) ? 2 : tuft ? 1 : 0 };
});

/** The ground: grass and the path, from `assets/tiles.png` (`tools/make-art.ts`). */
export function Field() {
  return (
    <Entity>
      {TILES.map((t) => (
        <Sprite key={t.id} image="tiles.png" frameWidth={TILE} frameHeight={TILE} frame={t.frame} x={t.col * TILE} y={t.row * TILE} />
      ))}
    </Entity>
  );
}
