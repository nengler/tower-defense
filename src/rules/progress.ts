import type { MoveId } from "./moves.ts";
import { SPECIES, type SpeciesId } from "./species.ts";

/** The highest level a creature reaches. */
export const MAX_LEVEL = 20;

/** XP from one level to the next: 20 at level 1, 40 at level 2, … */
export function xpToNext(level: number): number {
  return 20 * level;
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

/** The level a species learns its `index`th move at, with mastery: from mastery 2, every move after the first two comes two levels earlier. */
export function learnLevel(species: SpeciesId, index: number, mastery: number): number {
  const learned = SPECIES[species].learns[index];
  if (learned === undefined) return Infinity;
  if (index === 0) return 1;
  if (index === 1 && mastery >= 1) return 1;
  return mastery >= 2 && index >= 2 ? Math.max(1, learned.level - 2) : learned.level;
}

/** The moves it knows at `level`, in the order it learned them. */
export function knownAt(species: SpeciesId, level: number, mastery: number): MoveId[] {
  return SPECIES[species].learns.filter((_, i) => learnLevel(species, i, mastery) <= level).map((l) => l.move);
}
