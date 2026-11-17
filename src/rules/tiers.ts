import type { Group } from "./waves.ts";
import { MAP_IDS, type MapId } from "./map.ts";

/**
 * Difficulty tiers. Winning a run at a tier unlocks the next; each adds one change to everything below it, so tier 5 has all five.
 * Tier 0 is the game as designed.
 */
export interface TierInfo {
  readonly name: string;
  /** What this tier adds, for the run setup. */
  readonly text: string;
}

export const TIERS: readonly TierInfo[] = [
  { name: "TIER 0", text: "AS DESIGNED" },
  { name: "TIER 1", text: "+ ENEMIES 20% TOUGHER" },
  { name: "TIER 2", text: "+ 8 LIVES, NOT 10" },
  { name: "TIER 3", text: "+ NO PICK BEFORE WAVE 8" },
  { name: "TIER 4", text: "+ SHEPHERDS FROM WAVE 3" },
  { name: "TIER 5", text: "+ ENEMIES 10% FASTER" },
];

export const TOP_TIER = TIERS.length - 1;

/** Lives a run starts with. */
export function startLives(tier: number): number {
  return tier >= 2 ? 8 : 10;
}

/** An elite wave: enemies this much tougher, and the milestone after it offers `ELITE_OFFER` creatures, not three. */
export const ELITE_HP = 1.5;
export const ELITE_OFFER = 4;

/** What every enemy's hit points are multiplied by. */
export function hpScale(tier: number, elite: boolean): number {
  return (tier >= 1 ? 1.2 : 1) * (elite ? ELITE_HP : 1);
}

/** What every enemy's speed is multiplied by. */
export function speedScale(tier: number): number {
  return tier >= 5 ? 1.1 : 1;
}

/** The milestones of a run at this tier (before which waves a creature is offered). */
export function milestonesFor(tier: number, milestones: readonly number[]): readonly number[] {
  return tier >= 3 ? milestones.filter((w) => w !== 8) : milestones;
}

/** What a tier adds to a wave. */
export function extraGroups(wave: number, tier: number): readonly Group[] {
  return tier >= 4 && wave >= 3 ? [{ kind: "shepherd", count: 2, gap: 5, at: 2 }] : [];
}

/** The daily run: a seed from the date, and the map and tier it sets. Everyone playing on a day gets the same run. */
export interface Daily {
  readonly seed: number;
  readonly map: MapId;
  readonly tier: number;
  /** The date, as YYYY-MM-DD. */
  readonly label: string;
}

export const DAILY_TIER = 2;

export function dailyOf(year: number, month: number, day: number): Daily {
  const n = year * 10000 + month * 100 + day;
  // A small integer hash, so neighbouring days get unrelated seeds.
  let h = n | 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = (h ^ (h >>> 16)) >>> 0;
  const pad = (v: number) => String(v).padStart(2, "0");
  return { seed: h, map: MAP_IDS[h % MAP_IDS.length] as MapId, tier: DAILY_TIER, label: `${year}-${pad(month)}-${pad(day)}` };
}

/** Today's daily run, by the player's clock. Only called when the player picks it, so tests and replays never read the clock. */
export function today(): Daily {
  const d = new Date();
  return dailyOf(d.getFullYear(), d.getMonth() + 1, d.getDate());
}
