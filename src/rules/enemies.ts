import type { Type } from "./types.ts";

export type EnemyKind = "crawler" | "skitter";

export interface EnemyKindInfo {
  readonly name: string;
  readonly type: Type;
  /** Hit points in wave 1. */
  readonly hp: number;
  /** Pixels a second. */
  readonly speed: number;
  /** Lives it takes when it reaches the end. */
  readonly lives: number;
  readonly size: number;
}

export const ENEMIES: Readonly<Record<EnemyKind, EnemyKindInfo>> = {
  crawler: { name: "Crawler", type: "bloom", hp: 40, speed: 16, lives: 1, size: 8 },
  skitter: { name: "Skitter", type: "tide", hp: 20, speed: 30, lives: 1, size: 6 },
};

/** Each wave after the first adds this much to every enemy's hit points (0.35 = +35 %). */
export const HP_PER_WAVE = 0.35;

/** An enemy's hit points in a wave (counted from 1). */
export function hpOf(kind: EnemyKind, wave: number): number {
  return Math.round(ENEMIES[kind].hp * (1 + HP_PER_WAVE * (wave - 1)));
}
