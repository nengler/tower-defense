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


/**
 * Each species' and form's idle bob in `assets/creatures.png` (two frames a row: the species in `SPECIES_IDS` order, then the forms
 * in `FORM_IDS` order; `tools/make-art.ts`).
 */
export const CREATURE_ANIMATIONS = {
  emberling: { frames: "0-1", fps: 3 },
  puddlepup: { frames: "2-3", fps: 2 },
  voltkit: { frames: "4-5", fps: 4 },
  pebblet: { frames: "6-7", fps: 1.5 },
  sproutling: { frames: "8-9", fps: 2 },
  blazefang: { frames: "10-11", fps: 4 },
  kilnback: { frames: "12-13", fps: 2 },
  tidehound: { frames: "14-15", fps: 3 },
  wellspring: { frames: "16-17", fps: 2 },
  stormlynx: { frames: "18-19", fps: 5 },
  dynamo: { frames: "20-21", fps: 3 },
  cragjaw: { frames: "22-23", fps: 2 },
  bastion: { frames: "24-25", fps: 1 },
  briarwolf: { frames: "26-27", fps: 3 },
  elderbloom: { frames: "28-29", fps: 1.5 },
} as const;

/** Each enemy kind's walk (a hop) in `assets/enemies.png` (16 × 16 frames, rows in `ENEMY_KINDS` order; `tools/make-enemies.ts`). */
export const ENEMY_ANIMATIONS = {
  crawler: { frames: "0-1", fps: 6 },
  skitter: { frames: "2-3", fps: 10 },
  mite: { frames: "4-5", fps: 12 },
  shell: { frames: "6-7", fps: 3 },
  sprinter: { frames: "8-9", fps: 10 },
  cleanser: { frames: "10-11", fps: 4 },
  brood: { frames: "12-13", fps: 5 },
  burrower: { frames: "14-15", fps: 6 },
  jammer: { frames: "16-17", fps: 6 },
  shepherd: { frames: "18-19", fps: 3 },
  mosshorn: { frames: "20-21", fps: 2 },
  prism: { frames: "22-23", fps: 3 },
} as const;

/** The tiles of `assets/tiles.png`: grass, grass with a tuft, path, then a terrain tile per type in `TYPES` order. */
export const TILE_FRAME = {
  grass: 0,
  tuft: 1,
  path: 2,
  ember: 3,
  tide: 4,
  volt: 5,
  stone: 6,
  bloom: 7,
  bog: 8,
  reeds: 9,
  cobbles: 10,
  water: 11,
  lantern: 12,
  mushroom: 13,
} as const;
