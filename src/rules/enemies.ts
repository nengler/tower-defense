import type { Type } from "./types.ts";

export type EnemyKind = "crawler" | "skitter" | "mite" | "shell";

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
  /** Taken off every hit's damage (never below 1). Burns ignore it, so big hits and burns beat quick ones. */
  readonly armor: number;
}

export const ENEMIES: Readonly<Record<EnemyKind, EnemyKindInfo>> = {
  crawler: { name: "Crawler", type: "bloom", hp: 34, speed: 24, lives: 1, size: 8, armor: 0 },
  skitter: { name: "Skitter", type: "tide", hp: 20, speed: 40, lives: 1, size: 6, armor: 0 },
  /** Small and quick, in swarms: an area move hits a crowd of them at once. */
  mite: { name: "Mite", type: "ember", hp: 8, speed: 44, lives: 1, size: 4, armor: 0 },
  /** Slow and armoured: a quick jab barely scratches it. Takes two lives if it gets through. */
  shell: { name: "Shell", type: "stone", hp: 90, speed: 16, lives: 2, size: 10, armor: 8 },
};

/** Each wave after the first adds this much to every enemy's hit points (0.38 = +38 %). */
export const HP_PER_WAVE = 0.38;

/** An enemy's hit points in a wave (counted from 1). */
export function hpOf(kind: EnemyKind, wave: number): number {
  return Math.round(ENEMIES[kind].hp * (1 + HP_PER_WAVE * (wave - 1)));
}

/** What a hit of `damage` does to an enemy of this kind: less its armour, at least 1. */
export function afterArmor(kind: EnemyKind, damage: number): number {
  return damage <= 0 ? 0 : Math.max(1, damage - ENEMIES[kind].armor);
}
