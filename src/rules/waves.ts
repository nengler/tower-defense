import type { EnemyKind } from "./enemies.ts";

/** A group of one kind: `count` of them, one every `gap` seconds, starting `at` seconds into the wave. */
export interface Group {
  readonly kind: EnemyKind;
  readonly count: number;
  readonly gap: number;
  readonly at: number;
}

/** The first version's five waves. */
export const WAVES: readonly (readonly Group[])[] = [
  [{ kind: "crawler", count: 6, gap: 1.6, at: 0 }],
  [
    { kind: "crawler", count: 6, gap: 1.4, at: 0 },
    { kind: "skitter", count: 4, gap: 1.0, at: 5 },
  ],
  [{ kind: "skitter", count: 12, gap: 0.8, at: 0 }],
  [
    { kind: "crawler", count: 10, gap: 1.0, at: 0 },
    { kind: "skitter", count: 8, gap: 0.7, at: 4 },
  ],
  [
    { kind: "skitter", count: 10, gap: 0.6, at: 0 },
    { kind: "crawler", count: 14, gap: 0.8, at: 3 },
  ],
];

export const WAVE_COUNT = WAVES.length;

/** A milestone (pick a new creature) comes before these waves (counted from 1): the start of the run, and later. */
export const MILESTONES: readonly number[] = [1, 3, 5];

/** How many creatures a milestone offers. */
export const OFFER_SIZE = 3;

/** One enemy of a wave and when it comes. */
export interface Spawn {
  readonly kind: EnemyKind;
  readonly at: number;
}

/** Every enemy of a wave (counted from 1), in the order they come. */
export function spawnsOf(wave: number): Spawn[] {
  const groups = WAVES[wave - 1] ?? [];
  const spawns: Spawn[] = [];
  for (const g of groups) for (let i = 0; i < g.count; i++) spawns.push({ kind: g.kind, at: g.at + i * g.gap });
  return spawns.sort((a, b) => a.at - b.at);
}
