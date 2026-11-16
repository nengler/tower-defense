import { Entity, Shape } from "@rge/runtime/jsx";

import { COLS, isPath, ROWS, TILE } from "./rules/map.ts";

/** Every tile of the grid, in reading order. */
const TILES = Array.from({ length: COLS * ROWS }, (_, i) => ({ id: i, col: i % COLS, row: Math.floor(i / COLS) }));
const PATH = TILES.filter((t) => isPath(t.col, t.row));

/** The ground: grass, the path, and a faint grid so a free tile is easy to see. */
export function Field() {
  return (
    <Entity>
      <Shape kind="rect" width={COLS * TILE} height={ROWS * TILE} color="#1d2a22" />
      {TILES.map((t) => (
        <Shape key={t.id} kind="rect" width={TILE - 1} height={TILE - 1} x={t.col * TILE} y={t.row * TILE} color="#223228" />
      ))}
      {PATH.map((t) => (
        <Shape key={t.id} kind="rect" width={TILE} height={TILE} x={t.col * TILE} y={t.row * TILE} color="#5b4d3a" />
      ))}
    </Entity>
  );
}
