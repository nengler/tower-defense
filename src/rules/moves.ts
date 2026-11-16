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
  /** Against a soaked enemy the damage is multiplied by this, and the soak is used up. */
  readonly soakedBonus?: number;
  /** Allies use their moves this much faster (0.3 = 30 % shorter animations and cooldowns) for `hasteFor` seconds. */
  readonly haste?: number;
  readonly hasteFor?: number;
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

export type MoveId = "spark" | "flare" | "jet" | "undertow" | "zap" | "arc" | "jolt" | "rally";

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
    effects: { burn: 4, burnFor: 3 },
    text: "Splash; burns.",
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
    effects: { slow: 0.4, slowFor: 2.5, soak: 4 },
    text: "Pulse; slows, soaks.",
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
    effects: { soakedBonus: 2 },
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
    effects: { soakedBonus: 2 },
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
};
