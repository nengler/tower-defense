import { TERRAIN_BONUS } from "./map.ts";
import { FORM_IDS, FORMS, SPECIES, SPECIES_IDS, statsAt, type SpeciesId, type Stats } from "./species.ts";

/** The highest level a creature reaches. */
export const MAX_LEVEL = 20;

/** XP from one level to the next: 40 at level 1, 80 at level 2, … (XP is damage dealt). */
export function xpToNext(level: number): number {
  return 40 * level;
}

export interface Leveled {
  readonly level: number;
  /** XP toward the next level. */
  readonly xp: number;
  readonly gained: number;
}

/** Add XP (one point per point of damage dealt), levelling up as often as it covers, up to MAX_LEVEL. */
export function addXp(level: number, xp: number, amount: number): Leveled {
  let l = level;
  let x = xp + amount;
  while (l < MAX_LEVEL && x >= xpToNext(l)) {
    x -= xpToNext(l);
    l += 1;
  }
  return { level: l, xp: l >= MAX_LEVEL ? 0 : x, gained: l - level };
}

/**
 * The share of a hasted creature's XP its buffer earns as well: 50 % of the damage a creature deals while hasted goes to whoever hasted
 * it (the hasted creature still earns all of its own).
 */
export const BUFF_XP_SHARE = 0.5;

/** Mastery points needed for each mastery level (DESIGN.md, "Mastery"). */
export const MASTERY_AT: readonly number[] = [5, 15, 30];
/** Mastery points for each wave a species was on the field for, and for each run it finished (win or lose). */
export const MASTERY_PER_WAVE = 1;
export const MASTERY_PER_RUN = 3;

/** The mastery level for this many points: 0 to 3. */
export function masteryLevel(points: number): number {
  return MASTERY_AT.filter((at) => points >= at).length;
}

/** Move slots: 3, and a fourth at mastery 3. */
export function slotsFor(mastery: number): number {
  return mastery >= 3 ? 4 : 3;
}

/**
 * The level a species reaches its `index`th learn step at, with mastery: from mastery 1 the second step (its first choice) is offered
 * at level 1, and from mastery 2 every step after that comes two levels earlier. Infinity past the last step.
 */
export function learnLevel(species: SpeciesId, index: number, mastery: number): number {
  const step = SPECIES[species].learns[index];
  if (step === undefined) return Infinity;
  if (index === 0) return 1;
  if (index === 1 && mastery >= 1) return 1;
  return mastery >= 2 && index >= 2 ? Math.max(1, step.level - 2) : step.level;
}

/** The points the next mastery level needs, or null at the top. */
export function nextMasteryAt(points: number): number | null {
  return MASTERY_AT.find((at) => points < at) ?? null;
}

/** What a mastery level gives, in a few words. */
export const MASTERY_TEXT: readonly string[] = ["", "FIRST CHOICE AT LV1", "LEARNS MOVES SOONER", "A 4TH MOVE SLOT"];

/**
 * The highest each stat can be: the best of any species or form at `MAX_LEVEL`, standing on its own terrain. The card draws each stat
 * as a bar out of its own highest, as a Pokémon summary does, so a full bar means as high as that stat goes in the game.
 */
export const STAT_CEILING: Readonly<Record<keyof Stats, number>> = (() => {
  const best = { atk: 0, spd: 0, rng: 0, cd: 0 };
  const keys = ["atk", "spd", "rng", "cd"] as const;
  const consider = (s: Stats) => {
    for (const k of keys) best[k] = Math.max(best[k], s[k] + TERRAIN_BONUS);
  };
  for (const id of SPECIES_IDS) consider(statsAt(id, MAX_LEVEL));
  for (const id of FORM_IDS) {
    const f = FORMS[id];
    const s = statsAt(f.species, MAX_LEVEL);
    consider({ atk: s.atk + f.bonus.atk, spd: s.spd + f.bonus.spd, rng: s.rng + f.bonus.rng, cd: s.cd + f.bonus.cd });
  }
  return best;
})();

/** How much of a stat's bar `value` fills: a percentage of that stat's `STAT_CEILING`. */
export function statBarPercent(stat: keyof Stats, value: number): number {
  return Math.min(100, Math.max(0, (100 * value) / STAT_CEILING[stat]));
}
