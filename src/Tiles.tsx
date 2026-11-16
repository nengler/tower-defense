import { Entity, Pointer } from "@rge/runtime/jsx";

import { useGame } from "./GameState.ts";
import { COLS, ROWS, TILE } from "./rules/map.ts";

/** Every tile of the grid, in reading order. */
const TILES = Array.from({ length: COLS * ROWS }, (_, i) => ({ id: i, col: i % COLS, row: Math.floor(i / COLS) }));

/** A press target on every tile: pressing one selects the creature on it, or puts the selected creature there. */
export function Tiles() {
  const { tapTile } = useGame.actions();
  return (
    <Entity>
      {TILES.map((t) => (
        <Pointer key={t.id} width={TILE} height={TILE} x={t.col * TILE} y={t.row * TILE} onPress={() => tapTile(t.col, t.row)} />
      ))}
    </Entity>
  );
}
