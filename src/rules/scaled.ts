import { MOVES, type MoveId } from "./moves.ts";
import type { Stats } from "./species.ts";

/** Each stat point's worth (DESIGN.md, "Moves"). */
export const PER_ATK = 0.1;
export const PER_SPD = 0.05;
export const PER_RNG = 0.1;
export const PER_CD = 0.05;

/** A move as a creature with these stats uses it: everything but the type factor, which depends on the enemy. */
export interface Scaled {
  readonly damage: number;
  readonly burn: number;
  readonly animation: number;
  readonly reach: number;
  readonly radius: number;
  readonly cooldown: number;
}

export function scaleDamage(base: number, stats: Stats): number {
  return base * (1 + PER_ATK * stats.atk);
}

export function scaleAnimation(base: number, stats: Stats): number {
  return base / (1 + PER_SPD * stats.spd);
}

/** Reach and radius: by the square root, so the area grows in step with range. */
export function scaleArea(base: number, stats: Stats): number {
  return base * Math.sqrt(1 + PER_RNG * stats.rng);
}

export function scaleCooldown(base: number, stats: Stats): number {
  return base / (1 + PER_CD * stats.cd);
}

export function scaled(move: MoveId, stats: Stats): Scaled {
  const m = MOVES[move];
  return {
    damage: scaleDamage(m.damage, stats),
    burn: scaleDamage(m.effects.burn ?? 0, stats),
    animation: scaleAnimation(m.animation, stats),
    reach: scaleArea(m.reach, stats),
    radius: scaleArea(m.radius, stats),
    cooldown: scaleCooldown(m.cooldown, stats),
  };
}
