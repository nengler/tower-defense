import type { MoveId } from "./moves.ts";
import { scaled } from "./scaled.ts";
import type { Stats } from "./species.ts";

/** How full a move's cooldown pip is: 0 just used (or just equipped), 1 ready. */
export function pipFill(cooldowns: Readonly<Partial<Record<MoveId, number>>>, move: MoveId, stats: Stats): number {
  const full = scaled(move, stats).cooldown;
  return 1 - (cooldowns[move] ?? full) / full;
}

/** A cooldown table with one move's set. */
export function withCooldown(
  cooldowns: Readonly<Partial<Record<MoveId, number>>>,
  move: MoveId,
  seconds: number
): Partial<Record<MoveId, number>> {
  const next = { ...cooldowns };
  next[move] = seconds;
  return next;
}


/** Each species' idle bob in `assets/creatures.png` (two frames a row, rows in `SPECIES_IDS` order; `tools/make-art.ts`). */
export const CREATURE_ANIMATIONS = {
  emberling: { frames: "0-1", fps: 3 },
  puddlepup: { frames: "2-3", fps: 2 },
  voltkit: { frames: "4-5", fps: 4 },
  pebblet: { frames: "6-7", fps: 1.5 },
  sproutling: { frames: "8-9", fps: 2 },
} as const;

/** Each enemy kind's walk in `assets/enemies.png` (rows in `ENEMY_KINDS` order). */
export const ENEMY_ANIMATIONS = {
  crawler: { frames: "0-1", fps: 6 },
  skitter: { frames: "2-3", fps: 10 },
  mite: { frames: "4-5", fps: 12 },
  shell: { frames: "6-7", fps: 3 },
} as const;
