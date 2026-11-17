import { Entity, Shape } from "@tsengine/runtime/jsx";

import { useGame } from "./GameState.ts";
import { COLS, MAPS, ROWS, TILE } from "./rules/map.ts";
import { canPlace } from "./rules/roster.ts";

/** Every tile of the grid, in reading order. */
const TILES = Array.from({ length: COLS * ROWS }, (_, i) => ({ id: i, col: i % COLS, row: Math.floor(i / COLS) }));

/**
 * While a creature is being placed or moved: a soft square on every tile it may go to, and a frame on every other creature (a
 * press there trades places with it). Nothing otherwise.
 */
export function Spots() {
  const moving = useGame((s) => s.moving);
  const roster = useGame((s) => s.roster);
  const selected = useGame((s) => s.selected);
  const mapId = useGame((s) => s.map);
  const map = MAPS[mapId];
  const others = moving ? roster.filter((c) => c.col >= 0 && c.id !== selected) : [];
  const free = moving ? TILES.filter((t) => canPlace(roster, selected, t.col, t.row, map)) : [];
  return (
    <Entity>
      {free.map((t) => (
        <Shape key={t.id} kind="rect" width={TILE - 4} height={TILE - 4} x={t.col * TILE + 2} y={t.row * TILE + 2} color="#ffffff" opacity={0.22} />
      ))}
      {others.map((c) => (
        <Shape key={c.id} kind="rect" width={TILE - 2} height={TILE - 2} x={c.col * TILE + 1} y={c.row * TILE + 1} color="#f0d84a" opacity={0.35} />
      ))}
    </Entity>
  );
}
