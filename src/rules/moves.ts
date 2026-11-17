import type { MarkKind } from "./marks.ts";
import type { Type } from "./types.ts";

/**
 * How a move picks what it affects:
 * - `hit`: the target (the enemy in reach furthest along the path);
 * - `splash`: everything within `radius` of the target;
 * - `pulse`: everything within `radius` of the creature (no target needed, but one must be in the radius);
 * - `buff`: the creature and every ally within `radius` of it.
 */
export type MoveShape = "hit" | "splash" | "pulse" | "buff";

/** What a move leaves on what it affects, besides damage. Durations are seconds. */
export interface MoveEffects {
  /** The enemy stops. */
  readonly stun?: number;
  /** The enemy walks this much slower (0.4 = 40 % slower) for `slowFor` seconds. */
  readonly slow?: number;
  readonly slowFor?: number;
  /** Damage a second, for `burnFor` seconds. Scaled by attack and type as the hit is. */
  readonly burn?: number;
  readonly burnFor?: number;
  /** Marks the enemy soaked for this long. */
  readonly soak?: number;
  /** A combo: against an enemy with this status the damage is multiplied by `bonus`. */
  readonly bonusVs?: Status;
  readonly bonus?: number;
  /** The combo uses the status up (a soak is spent by the Volt move that cashes it in). */
  readonly consumes?: boolean;
  /** Allies use their moves this much faster (0.3 = 30 % shorter animations and cooldowns) for `hasteFor` seconds. */
  readonly haste?: number;
  readonly hasteFor?: number;
  /** Its combo sets off no reaction (a douse puts a fire out rather than spreading it). */
  readonly quiet?: boolean;
  /** It leaves this mark on the path tiles its area covers (see `marks.ts`). */
  readonly mark?: MarkKind;
}

/** A move's base values: what the creature using it scales (see `scaled.ts`). */
export interface Move {
  readonly id: MoveId;
  readonly name: string;
  readonly type: Type;
  readonly shape: MoveShape;
  readonly damage: number;
  /** Seconds the creature is busy using it. Its damage and effects land at the end. */
  readonly animation: number;
  /** How far away the target may be (hit, splash). */
  readonly reach: number;
  /** The area it covers (splash: around the target; pulse and buff: around the creature). 0 for a hit. */
  readonly radius: number;
  /** Seconds until it can be used again. */
  readonly cooldown: number;
  readonly effects: MoveEffects;
  /** One line for the move list. */
  readonly text: string;
}

/** What a move can leave on an enemy, and what a combo move can do more against. */
export type Status = "soaked" | "burning" | "stunned" | "slowed";

export type MoveId =
  | "spark"
  | "cinder"
  | "heatwave"
  | "flare"
  | "wildfire"
  | "jet"
  | "bubble"
  | "torrent"
  | "undertow"
  | "zap"
  | "surge"
  | "arc"
  | "jolt"
  | "pebble"
  | "boulder"
  | "gravel"
  | "rubble"
  | "quake"
  | "thorn"
  | "vine"
  | "spore"
  | "bramble"
  | "overgrowth"
  | "rally"
  | "inferno"
  | "emberrain"
  | "riptide"
  | "deluge"
  | "thunderclap"
  | "overcharge"
  | "landslide"
  | "tremor"
  | "lash"
  | "verdant";

export const MOVES: Readonly<Record<MoveId, Move>> = {
  spark: {
    id: "spark",
    name: "Spark",
    type: "ember",
    shape: "hit",
    damage: 10,
    animation: 0.4,
    reach: 40,
    radius: 0,
    cooldown: 1.2,
    effects: {},
    text: "Quick hit.",
  },
  flare: {
    id: "flare",
    name: "Flare Burst",
    type: "ember",
    shape: "splash",
    damage: 14,
    animation: 0.8,
    reach: 36,
    radius: 14,
    cooldown: 6,
    effects: { burn: 4, burnFor: 3, mark: "embers" },
    text: "Splash; burns; embers.",
  },
  jet: {
    id: "jet",
    name: "Splash Jet",
    type: "tide",
    shape: "hit",
    damage: 10,
    animation: 0.4,
    reach: 44,
    radius: 0,
    cooldown: 1.1,
    effects: { soak: 4 },
    text: "Hit; soaks.",
  },
  undertow: {
    id: "undertow",
    name: "Undertow",
    type: "tide",
    shape: "pulse",
    damage: 6,
    animation: 0.7,
    reach: 0,
    radius: 30,
    cooldown: 7,
    effects: { slow: 0.4, slowFor: 2.5, soak: 4, mark: "puddle" },
    text: "Pulse; soaks; puddles.",
  },
  zap: {
    id: "zap",
    name: "Zap",
    type: "volt",
    shape: "hit",
    damage: 9,
    animation: 0.3,
    reach: 40,
    radius: 0,
    cooldown: 1.0,
    effects: { bonusVs: "soaked", bonus: 2, consumes: true },
    text: "Hit; x2 on soaked.",
  },
  arc: {
    id: "arc",
    name: "Arc Storm",
    type: "volt",
    shape: "splash",
    damage: 18,
    animation: 1.0,
    reach: 40,
    radius: 18,
    cooldown: 9,
    effects: { bonusVs: "soaked", bonus: 2, consumes: true },
    text: "Splash; x2 on soaked.",
  },
  jolt: {
    id: "jolt",
    name: "Static Jolt",
    type: "volt",
    shape: "hit",
    damage: 5,
    animation: 0.5,
    reach: 36,
    radius: 0,
    cooldown: 8,
    effects: { stun: 1.2 },
    text: "Hit; stuns.",
  },
  wildfire: {
    id: "wildfire",
    name: "Wildfire",
    type: "ember",
    shape: "splash",
    damage: 12,
    animation: 0.9,
    reach: 38,
    radius: 20,
    cooldown: 8,
    effects: { bonusVs: "burning", bonus: 2, burn: 5, burnFor: 3, mark: "embers" },
    text: "Splash; x2 burning; embers.",
  },
  pebble: {
    id: "pebble",
    name: "Pebble",
    type: "stone",
    shape: "hit",
    damage: 9,
    animation: 0.4,
    reach: 38,
    radius: 0,
    cooldown: 1.2,
    effects: {},
    text: "Quick hit.",
  },
  boulder: {
    id: "boulder",
    name: "Boulder",
    type: "stone",
    shape: "hit",
    damage: 28,
    animation: 1.0,
    reach: 40,
    radius: 0,
    cooldown: 5,
    effects: { bonusVs: "stunned", bonus: 2 },
    text: "Big hit; x2 on stunned.",
  },
  quake: {
    id: "quake",
    name: "Quake",
    type: "stone",
    shape: "pulse",
    damage: 12,
    animation: 0.9,
    reach: 0,
    radius: 28,
    cooldown: 9,
    effects: { stun: 0.8 },
    text: "Pulse; stuns.",
  },
  thorn: {
    id: "thorn",
    name: "Thorn",
    type: "bloom",
    shape: "hit",
    damage: 8,
    animation: 0.35,
    reach: 42,
    radius: 0,
    cooldown: 1.0,
    effects: { slow: 0.2, slowFor: 1 },
    text: "Hit; slows a little.",
  },
  spore: {
    id: "spore",
    name: "Spore Cloud",
    type: "bloom",
    shape: "splash",
    damage: 6,
    animation: 0.7,
    reach: 40,
    radius: 20,
    cooldown: 7,
    effects: { slow: 0.5, slowFor: 3, mark: "spores" },
    text: "Splash; slows; spores.",
  },
  overgrowth: {
    id: "overgrowth",
    name: "Overgrowth",
    type: "bloom",
    shape: "pulse",
    damage: 14,
    animation: 0.8,
    reach: 0,
    radius: 30,
    cooldown: 8,
    effects: { bonusVs: "slowed", bonus: 2 },
    text: "Pulse; x2 on slowed.",
  },
  rally: {
    id: "rally",
    name: "Rally",
    type: "bloom",
    shape: "buff",
    damage: 0,
    animation: 0.5,
    reach: 0,
    radius: 40,
    cooldown: 12,
    effects: { haste: 0.3, hasteFor: 5 },
    text: "Allies near: 30% faster.",
  },
  cinder: {
    id: "cinder",
    name: "Cinder",
    type: "ember",
    shape: "hit",
    damage: 6,
    animation: 0.4,
    reach: 40,
    radius: 0,
    cooldown: 1.6,
    effects: { burn: 3, burnFor: 3 },
    text: "Hit; burns.",
  },
  heatwave: {
    id: "heatwave",
    name: "Heat Wave",
    type: "ember",
    shape: "pulse",
    damage: 10,
    animation: 0.7,
    reach: 0,
    radius: 28,
    cooldown: 7,
    effects: { burn: 3, burnFor: 2 },
    text: "Pulse; burns.",
  },
  bubble: {
    id: "bubble",
    name: "Bubble",
    type: "tide",
    shape: "splash",
    damage: 5,
    animation: 0.5,
    reach: 40,
    radius: 14,
    cooldown: 4,
    effects: { soak: 4 },
    text: "Splash; soaks.",
  },
  torrent: {
    id: "torrent",
    name: "Torrent",
    type: "tide",
    shape: "hit",
    damage: 22,
    animation: 0.7,
    reach: 40,
    radius: 0,
    cooldown: 4,
    effects: { bonusVs: "burning", bonus: 2, consumes: true, quiet: true },
    text: "Big hit; x2 burning, douses.",
  },
  surge: {
    id: "surge",
    name: "Surge",
    type: "volt",
    shape: "pulse",
    damage: 14,
    animation: 0.8,
    reach: 0,
    radius: 28,
    cooldown: 8,
    effects: { bonusVs: "soaked", bonus: 2, consumes: true },
    text: "Pulse; x2 on soaked.",
  },
  gravel: {
    id: "gravel",
    name: "Gravel",
    type: "stone",
    shape: "splash",
    damage: 12,
    animation: 0.6,
    reach: 38,
    radius: 14,
    cooldown: 5,
    effects: {},
    text: "Splash.",
  },
  rubble: {
    id: "rubble",
    name: "Rubble",
    type: "stone",
    shape: "splash",
    damage: 16,
    animation: 0.8,
    reach: 38,
    radius: 18,
    cooldown: 7,
    effects: { slow: 0.3, slowFor: 2 },
    text: "Splash; slows.",
  },
  vine: {
    id: "vine",
    name: "Vine",
    type: "bloom",
    shape: "hit",
    damage: 6,
    animation: 0.4,
    reach: 42,
    radius: 0,
    cooldown: 3,
    effects: { slow: 0.45, slowFor: 2 },
    text: "Hit; slows a lot.",
  },
  bramble: {
    id: "bramble",
    name: "Bramble",
    type: "bloom",
    shape: "pulse",
    damage: 10,
    animation: 0.7,
    reach: 0,
    radius: 26,
    cooldown: 7,
    effects: { slow: 0.4, slowFor: 2, mark: "spores" },
    text: "Pulse; slows; spores.",
  },
  inferno: {
    id: "inferno",
    name: "Inferno",
    type: "ember",
    shape: "splash",
    damage: 30,
    animation: 1.0,
    reach: 42,
    radius: 22,
    cooldown: 9,
    effects: { burn: 6, burnFor: 3, bonusVs: "burning", bonus: 2 },
    text: "Big splash; x2 burning.",
  },
  emberrain: {
    id: "emberrain",
    name: "Ember Rain",
    type: "ember",
    shape: "splash",
    damage: 10,
    animation: 0.8,
    reach: 48,
    radius: 26,
    cooldown: 7,
    effects: { burn: 4, burnFor: 4, mark: "embers" },
    text: "Wide splash; embers.",
  },
  riptide: {
    id: "riptide",
    name: "Riptide",
    type: "tide",
    shape: "hit",
    damage: 30,
    animation: 0.6,
    reach: 44,
    radius: 0,
    cooldown: 3.5,
    effects: { soak: 4 },
    text: "Big hit; soaks.",
  },
  deluge: {
    id: "deluge",
    name: "Deluge",
    type: "tide",
    shape: "pulse",
    damage: 8,
    animation: 0.8,
    reach: 0,
    radius: 36,
    cooldown: 8,
    effects: { soak: 5, slow: 0.3, slowFor: 2, mark: "puddle" },
    text: "Wide pulse; puddles.",
  },
  thunderclap: {
    id: "thunderclap",
    name: "Thunderclap",
    type: "volt",
    shape: "splash",
    damage: 26,
    animation: 0.9,
    reach: 42,
    radius: 18,
    cooldown: 7,
    effects: { stun: 0.4, bonusVs: "soaked", bonus: 2, consumes: true },
    text: "Splash; stuns; x2 soaked.",
  },
  overcharge: {
    id: "overcharge",
    name: "Overcharge",
    type: "volt",
    shape: "buff",
    damage: 0,
    animation: 0.5,
    reach: 0,
    radius: 48,
    cooldown: 10,
    effects: { haste: 0.4, hasteFor: 4 },
    text: "Allies near: 40% faster.",
  },
  landslide: {
    id: "landslide",
    name: "Landslide",
    type: "stone",
    shape: "splash",
    damage: 40,
    animation: 1.1,
    reach: 40,
    radius: 16,
    cooldown: 7,
    effects: { bonusVs: "stunned", bonus: 2 },
    text: "Huge splash; x2 stunned.",
  },
  tremor: {
    id: "tremor",
    name: "Tremor",
    type: "stone",
    shape: "pulse",
    damage: 10,
    animation: 0.8,
    reach: 0,
    radius: 34,
    cooldown: 8,
    effects: { stun: 1.0 },
    text: "Wide pulse; stuns.",
  },
  lash: {
    id: "lash",
    name: "Bramble Lash",
    type: "bloom",
    shape: "hit",
    damage: 20,
    animation: 0.5,
    reach: 44,
    radius: 0,
    cooldown: 2,
    effects: { bonusVs: "slowed", bonus: 2 },
    text: "Hit; x2 on slowed.",
  },
  verdant: {
    id: "verdant",
    name: "Verdant Field",
    type: "bloom",
    shape: "pulse",
    damage: 8,
    animation: 0.8,
    reach: 0,
    radius: 36,
    cooldown: 8,
    effects: { slow: 0.5, slowFor: 3, mark: "spores" },
    text: "Wide pulse; spores.",
  },
};

/** A move's combo, as a blast carries it: the status it plays off ("" for none), the multiplier, whether it uses the status up, and whether it sets off no reaction. */
export function comboOf(move: MoveId): {
  readonly bonusVs: Status | "";
  readonly bonus: number;
  readonly consumes: boolean;
  readonly quiet: boolean;
} {
  const e = MOVES[move].effects;
  return { bonusVs: e.bonusVs ?? "", bonus: e.bonus ?? 0, consumes: e.consumes ?? false, quiet: e.quiet ?? false };
}

/** Every move, in table order. */
export const MOVE_IDS = Object.keys(MOVES) as readonly MoveId[];

/**
 * What a combo sets off around the enemy it landed on, by the status it cashed in:
 * - `chain` (soaked): the hit jumps to every other soaked enemy near, at `CHAIN_SHARE` of its damage, using their soak up too;
 * - `spread` (burning): the fire spreads to every enemy near;
 * - `shatter` (stunned): `SHATTER_SHARE` of the damage splashes onto every enemy near;
 * - `root` (slowed): every slowed enemy near is rooted (stopped) for `ROOT_FOR` seconds.
 */
export type Reaction = "chain" | "spread" | "shatter" | "root";

export const REACTION_OF: Readonly<Record<Status, Reaction>> = {
  soaked: "chain",
  burning: "spread",
  stunned: "shatter",
  slowed: "root",
};

/** How far around the enemy a reaction reaches. */
export const REACTION_RADIUS: Readonly<Record<Reaction, number>> = { chain: 30, spread: 20, shatter: 22, root: 24 };
export const CHAIN_SHARE = 0.6;
export const SHATTER_SHARE = 0.5;
export const ROOT_FOR = 0.7;

/** The colour a reaction is drawn in. */
export const REACTION_COLOR: Readonly<Record<Reaction, string>> = {
  chain: "#f0d84a",
  spread: "#f07a3a",
  shatter: "#c8b490",
  root: "#6ad06a",
};
