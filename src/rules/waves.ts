import type { EnemyKind } from "./enemies.ts";
import { extraGroups } from "./tiers.ts";

/** A group of one kind: `count` of them, one every `gap` seconds, starting `at` seconds into the wave. */
export interface Group {
  readonly kind: EnemyKind;
  readonly count: number;
  readonly gap: number;
  readonly at: number;
}

/**
 * The ten waves. Each brings in something new, so a team that held the last one may not hold this one: sprinters (wave 2),
 * cleansers (3), burrowers and mite swarms (4), the Mosshorn (5), broods and jammers (6), shepherds (7), and the Prism (10). The
 * last waves are the hardest.
 */
export const WAVES: readonly (readonly Group[])[] = [
  [
    { kind: "crawler", count: 3, gap: 2, at: 0 },
    { kind: "skitter", count: 2, gap: 2, at: 6 },
  ],
  [
    { kind: "crawler", count: 6, gap: 1.3, at: 0 },
    { kind: "sprinter", count: 3, gap: 1.5, at: 5 },
  ],
  [
    { kind: "skitter", count: 6, gap: 0.8, at: 0 },
    { kind: "cleanser", count: 1, gap: 3, at: 3 },
    { kind: "crawler", count: 4, gap: 1.2, at: 6 },
  ],
  [
    { kind: "mite", count: 12, gap: 0.08, at: 0 },
    { kind: "burrower", count: 3, gap: 1.8, at: 3 },
    { kind: "skitter", count: 4, gap: 0.8, at: 8 },
  ],
  [
    { kind: "mosshorn", count: 1, gap: 0, at: 0 },
    { kind: "shell", count: 2, gap: 3, at: 5 },
    { kind: "crawler", count: 6, gap: 1.0, at: 8 },
    { kind: "sprinter", count: 4, gap: 1.0, at: 12 },
  ],
  [
    { kind: "brood", count: 4, gap: 2, at: 0 },
    { kind: "jammer", count: 2, gap: 3, at: 4 },
    { kind: "mite", count: 10, gap: 0.08, at: 12 },
  ],
  [
    { kind: "shepherd", count: 2, gap: 4, at: 0 },
    { kind: "shell", count: 4, gap: 2.5, at: 1 },
    { kind: "cleanser", count: 3, gap: 2.5, at: 5 },
    { kind: "sprinter", count: 6, gap: 0.8, at: 9 },
  ],
  [
    { kind: "burrower", count: 5, gap: 1.4, at: 0 },
    { kind: "mite", count: 24, gap: 0.08, at: 4 },
    { kind: "jammer", count: 3, gap: 2, at: 6 },
    { kind: "brood", count: 4, gap: 1.5, at: 10 },
  ],
  [
    { kind: "shell", count: 5, gap: 1.8, at: 0 },
    { kind: "shepherd", count: 3, gap: 3, at: 2 },
    { kind: "jammer", count: 3, gap: 2.5, at: 4 },
    { kind: "sprinter", count: 7, gap: 0.7, at: 6 },
    { kind: "cleanser", count: 4, gap: 2, at: 10 },
    { kind: "mite", count: 8, gap: 0.08, at: 12 },
    { kind: "crawler", count: 12, gap: 0.6, at: 14 },
  ],
  [
    { kind: "prism", count: 1, gap: 0, at: 0 },
    { kind: "mite", count: 22, gap: 0.08, at: 2 },
    { kind: "shell", count: 6, gap: 2, at: 5 },
    { kind: "jammer", count: 4, gap: 2.5, at: 8 },
    { kind: "brood", count: 5, gap: 1.4, at: 12 },
    { kind: "shepherd", count: 3, gap: 3, at: 14 },
    { kind: "burrower", count: 3, gap: 1.8, at: 16 },
    { kind: "skitter", count: 8, gap: 0.6, at: 18 },
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

/** The waves a boss comes in. */
export const BOSS_WAVES: readonly number[] = [5, 10];

/** Every enemy of a wave (counted from 1) at a difficulty tier, in the order they come. */
export function spawnsOf(wave: number, tier = 0): Spawn[] {
  const groups = [...(WAVES[wave - 1] ?? []), ...(WAVES[wave - 1] === undefined ? [] : extraGroups(wave, tier))];
  const spawns: Spawn[] = [];
  for (const g of groups) for (let i = 0; i < g.count; i++) spawns.push({ kind: g.kind, at: g.at + i * g.gap });
  return spawns.sort((a, b) => a.at - b.at);
}

/** How many of each kind a wave brings, in the order they first come: what the bar's preview shows. */
export function previewOf(wave: number, tier = 0): { readonly kind: EnemyKind; readonly count: number }[] {
  const out: { kind: EnemyKind; count: number }[] = [];
  for (const s of spawnsOf(wave, tier)) {
    const seen = out.find((o) => o.kind === s.kind);
    if (seen === undefined) out.push({ kind: s.kind, count: 1 });
    else seen.count += 1;
  }
  return out;
}
