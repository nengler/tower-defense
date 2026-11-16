import type { MoveId } from "./moves.ts";
import type { Type } from "./types.ts";

/** The four stats (DESIGN.md, "Creatures"). Small numbers: about 1–5 at level 1. */
export interface Stats {
  /** Attack: a move's damage. */
  readonly atk: number;
  /** Attack speed: how long a move's animation takes. */
  readonly spd: number;
  /** Range: a move's reach and radius. */
  readonly rng: number;
  /** Cooldown: how long until a move is ready again. */
  readonly cd: number;
}

/** A move a species learns, and the level it learns it at. */
export interface Learned {
  readonly move: MoveId;
  readonly level: number;
}

export interface Species {
  readonly id: SpeciesId;
  readonly name: string;
  readonly type: Type;
  /** Stats at level 1. */
  readonly base: Stats;
  /** What each stat gains a level (fractions add up: 0.5 is one point every two levels). */
  readonly growth: Stats;
  /**
   * Its moves in the order it learns them; the first is known from level 1. Its best area move comes last, after its three slots
   * are full: it is only used if the player swaps it in.
   */
  readonly learns: readonly Learned[];
}

export type SpeciesId = "emberling" | "puddlepup" | "voltkit";

export const SPECIES: Readonly<Record<SpeciesId, Species>> = {
  emberling: {
    id: "emberling",
    name: "Emberling",
    type: "ember",
    base: { atk: 4, spd: 3, rng: 2, cd: 2 },
    growth: { atk: 1.5, spd: 0.5, rng: 0.5, cd: 0.5 },
    learns: [
      { move: "spark", level: 1 },
      { move: "jolt", level: 3 },
      { move: "rally", level: 5 },
      { move: "flare", level: 7 },
    ],
  },
  puddlepup: {
    id: "puddlepup",
    name: "Puddlepup",
    type: "tide",
    base: { atk: 3, spd: 3, rng: 4, cd: 3 },
    growth: { atk: 0.5, spd: 0.5, rng: 1, cd: 1 },
    learns: [
      { move: "jet", level: 1 },
      { move: "rally", level: 3 },
      { move: "zap", level: 5 },
      { move: "undertow", level: 7 },
    ],
  },
  voltkit: {
    id: "voltkit",
    name: "Voltkit",
    type: "volt",
    base: { atk: 3, spd: 5, rng: 2, cd: 2 },
    growth: { atk: 1, spd: 1.5, rng: 0.5, cd: 0.5 },
    learns: [
      { move: "zap", level: 1 },
      { move: "jolt", level: 3 },
      { move: "jet", level: 5 },
      { move: "arc", level: 7 },
    ],
  },
};

export const SPECIES_IDS: readonly SpeciesId[] = ["emberling", "puddlepup", "voltkit"];

/** Its stats at `level`: the base plus the growth of every level after the first, rounded down. */
export function statsAt(species: SpeciesId, level: number): Stats {
  const { base, growth } = SPECIES[species];
  const grow = (stat: keyof Stats) => Math.floor(base[stat] + growth[stat] * (level - 1));
  return { atk: grow("atk"), spd: grow("spd"), rng: grow("rng"), cd: grow("cd") };
}
