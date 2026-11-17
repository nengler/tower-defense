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

/**
 * A step in what a species learns: at `level`, the player picks one of `options` (a step with one option is learned outright).
 * The first step is at level 1 with one option: the move it starts with.
 */
export interface Tier {
  readonly level: number;
  readonly options: readonly MoveId[];
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
   * What it learns, step by step. Each later step offers two moves, so two creatures of one species can grow apart. Its best area
   * moves come last, after its three slots are full: one only gets used if the player swaps it in (the learn prompt offers to).
   */
  readonly learns: readonly Tier[];
  /** The two forms it may evolve into at `EVOLVE_AT`. */
  readonly forms: readonly [FormId, FormId];
}

export type SpeciesId = "emberling" | "puddlepup" | "voltkit" | "pebblet" | "sproutling";

const tier = (level: number, ...options: MoveId[]): Tier => ({ level, options });

export const SPECIES: Readonly<Record<SpeciesId, Species>> = {
  emberling: {
    id: "emberling",
    name: "Emberling",
    type: "ember",
    base: { atk: 4, spd: 3, rng: 2, cd: 2 },
    growth: { atk: 1.5, spd: 0.5, rng: 0.5, cd: 0.5 },
    learns: [tier(1, "spark"), tier(3, "cinder", "jolt"), tier(5, "rally", "heatwave"), tier(7, "flare", "wildfire")],
    forms: ["blazefang", "kilnback"],
  },
  puddlepup: {
    id: "puddlepup",
    name: "Puddlepup",
    type: "tide",
    base: { atk: 3, spd: 3, rng: 4, cd: 3 },
    growth: { atk: 0.5, spd: 0.5, rng: 1, cd: 1 },
    learns: [tier(1, "jet"), tier(3, "bubble", "rally"), tier(5, "zap", "torrent"), tier(7, "undertow", "spore")],
    forms: ["tidehound", "wellspring"],
  },
  voltkit: {
    id: "voltkit",
    name: "Voltkit",
    type: "volt",
    base: { atk: 3, spd: 5, rng: 2, cd: 2 },
    growth: { atk: 1, spd: 1.5, rng: 0.5, cd: 0.5 },
    learns: [tier(1, "zap"), tier(3, "jolt", "bubble"), tier(5, "jet", "rally"), tier(7, "arc", "surge")],
    forms: ["stormlynx", "dynamo"],
  },
  pebblet: {
    id: "pebblet",
    name: "Pebblet",
    type: "stone",
    base: { atk: 5, spd: 1, rng: 2, cd: 2 },
    growth: { atk: 1.5, spd: 0.5, rng: 0.5, cd: 0.5 },
    learns: [tier(1, "pebble"), tier(3, "boulder", "gravel"), tier(5, "jolt", "rally"), tier(7, "quake", "rubble")],
    forms: ["cragjaw", "bastion"],
  },
  sproutling: {
    id: "sproutling",
    name: "Sproutling",
    type: "bloom",
    base: { atk: 2, spd: 3, rng: 4, cd: 4 },
    growth: { atk: 0.5, spd: 0.5, rng: 1, cd: 1 },
    learns: [tier(1, "thorn"), tier(3, "rally", "vine"), tier(5, "spore", "heatwave"), tier(7, "overgrowth", "bramble")],
    forms: ["briarwolf", "elderbloom"],
  },
};

/** The level a creature may evolve at: the player picks one of its species' two forms. */
export const EVOLVE_AT = 10;

export type FormId =
  | "blazefang"
  | "kilnback"
  | "tidehound"
  | "wellspring"
  | "stormlynx"
  | "dynamo"
  | "cragjaw"
  | "bastion"
  | "briarwolf"
  | "elderbloom";

/** An evolved form: a new name and look, stats added on top of its species', and a move it learns on evolving. */
export interface Form {
  readonly id: FormId;
  readonly name: string;
  readonly species: SpeciesId;
  readonly bonus: Stats;
  readonly move: MoveId;
  /** A few words for the prompt. */
  readonly text: string;
}

/** Each species evolves one of two ways: a hard hitter, or a wider, slower support. */
export const FORMS: Readonly<Record<FormId, Form>> = {
  blazefang: { id: "blazefang", name: "Blazefang", species: "emberling", bonus: { atk: 3, spd: 2, rng: 0, cd: 0 }, move: "inferno", text: "HITS HARDER" },
  kilnback: { id: "kilnback", name: "Kilnback", species: "emberling", bonus: { atk: 0, spd: 0, rng: 3, cd: 2 }, move: "emberrain", text: "WIDER, EMBERS" },
  tidehound: { id: "tidehound", name: "Tidehound", species: "puddlepup", bonus: { atk: 3, spd: 2, rng: 0, cd: 0 }, move: "riptide", text: "HITS HARDER" },
  wellspring: { id: "wellspring", name: "Wellspring", species: "puddlepup", bonus: { atk: 0, spd: 0, rng: 3, cd: 2 }, move: "deluge", text: "WIDER, PUDDLES" },
  stormlynx: { id: "stormlynx", name: "Stormlynx", species: "voltkit", bonus: { atk: 3, spd: 2, rng: 0, cd: 0 }, move: "thunderclap", text: "HITS HARDER" },
  dynamo: { id: "dynamo", name: "Dynamo", species: "voltkit", bonus: { atk: 0, spd: 0, rng: 3, cd: 2 }, move: "overcharge", text: "SPEEDS ALLIES" },
  cragjaw: { id: "cragjaw", name: "Cragjaw", species: "pebblet", bonus: { atk: 3, spd: 2, rng: 0, cd: 0 }, move: "landslide", text: "HITS HARDER" },
  bastion: { id: "bastion", name: "Bastion", species: "pebblet", bonus: { atk: 0, spd: 0, rng: 3, cd: 2 }, move: "tremor", text: "WIDER, STUNS" },
  briarwolf: { id: "briarwolf", name: "Briarwolf", species: "sproutling", bonus: { atk: 3, spd: 2, rng: 0, cd: 0 }, move: "lash", text: "HITS HARDER" },
  elderbloom: { id: "elderbloom", name: "Elderbloom", species: "sproutling", bonus: { atk: 0, spd: 0, rng: 3, cd: 2 }, move: "verdant", text: "WIDER, SPORES" },
};

export const FORM_IDS = Object.keys(FORMS) as readonly FormId[];

export const SPECIES_IDS: readonly SpeciesId[] = ["emberling", "puddlepup", "voltkit", "pebblet", "sproutling"];

/** Its stats at `level`: the base plus the growth of every level after the first, rounded down. */
export function statsAt(species: SpeciesId, level: number): Stats {
  const { base, growth } = SPECIES[species];
  const grow = (stat: keyof Stats) => Math.floor(base[stat] + growth[stat] * (level - 1));
  return { atk: grow("atk"), spd: grow("spd"), rng: grow("rng"), cd: grow("cd") };
}

/**
 * A creature's stats as it fights: its species' at its level, plus its form's, plus `terrainBonus` to each (standing on its own
 * type's terrain).
 */
export function statsOf(species: SpeciesId, level: number, form: FormId | "", terrainBonus: number): Stats {
  const s = statsAt(species, level);
  const f = form === "" ? null : FORMS[form].bonus;
  const add = (stat: keyof Stats) => s[stat] + (f?.[stat] ?? 0) + terrainBonus;
  return { atk: add("atk"), spd: add("spd"), rng: add("rng"), cd: add("cd") };
}
