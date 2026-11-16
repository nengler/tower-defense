import type { EnemyKind } from "./enemies.ts";

/** A group of one kind: `count` of them, one every `gap` seconds, starting `at` seconds into the wave. */
export interface Group {
  readonly kind: EnemyKind;
  readonly count: number;
  readonly gap: number;
  readonly at: number;
}

/** The ten waves: plain ones first, then swarms of mites (area moves) and armoured shells (big hits and burns). */
export const WAVES: readonly (readonly Group[])[] = [
  [
    { kind: "crawler", count: 3, gap: 2, at: 0 },
    { kind: "skitter", count: 2, gap: 2, at: 6 },
  ],
  [
    { kind: "crawler", count: 6, gap: 1.4, at: 0 },
    { kind: "skitter", count: 3, gap: 1.0, at: 5 },
  ],
  [
    { kind: "skitter", count: 8, gap: 0.8, at: 0 },
    { kind: "crawler", count: 4, gap: 1.2, at: 4 },
  ],
  [
    { kind: "mite", count: 12, gap: 0.08, at: 0 },
    { kind: "skitter", count: 4, gap: 0.8, at: 5 },
  ],
  [
    { kind: "shell", count: 3, gap: 3, at: 0 },
    { kind: "crawler", count: 6, gap: 1.0, at: 4 },
  ],
  [
    { kind: "mite", count: 20, gap: 0.08, at: 0 },
    { kind: "skitter", count: 6, gap: 0.6, at: 6 },
  ],
  [
    { kind: "shell", count: 4, gap: 2.5, at: 0 },
    { kind: "mite", count: 12, gap: 0.08, at: 5 },
    { kind: "crawler", count: 6, gap: 0.9, at: 9 },
  ],
  [
    { kind: "skitter", count: 10, gap: 0.5, at: 0 },
    { kind: "mite", count: 24, gap: 0.08, at: 4 },
  ],
  [
    { kind: "shell", count: 6, gap: 2.0, at: 0 },
    { kind: "crawler", count: 10, gap: 0.8, at: 3 },
    { kind: "skitter", count: 10, gap: 0.5, at: 10 },
  ],
  [
    { kind: "mite", count: 30, gap: 0.08, at: 0 },
    { kind: "shell", count: 6, gap: 2.0, at: 4 },
    { kind: "skitter", count: 12, gap: 0.5, at: 10 },
    { kind: "crawler", count: 10, gap: 0.7, at: 16 },
  ],
];

export const WAVE_COUNT = WAVES.length;

/**
 * A milestone (pick a new creature) comes before these waves (counted from 1): the start of the run, and later. Six in all: one more
 * creature than the field holds, so the last pick is also a choice of whom to bench.
 */
export const MILESTONES: readonly number[] = [1, 2, 4, 6, 8, 10];

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
