import { SPECIES, type SpeciesId } from "./species.ts";

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
