/**
 * The shapes the battle's components hand each other. The battle itself is in the components: `Play` keeps the lives and the
 * wave, an `Enemy` walks and takes its hits.
 */
import type { EnemyKind } from "./rules/enemies.ts";
import type { Type } from "./rules/types.ts";

/** An enemy that has come: what `Play` knows of it. Where it is and how hurt it is are the `Enemy`'s own. */
export interface Foe {
  readonly id: number;
  readonly kind: EnemyKind;
  readonly maxHp: number;
}

/** What a move lands as: everything an enemy needs to work out what it takes. */
export interface Blast {
  /** The one enemy a hit lands on, by id; -1 for an area that lands on everything within `radius` of (x, y). */
  readonly target: number;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  /** The creature that used the move (its XP), and the types that decide the type factor. */
  readonly from: number;
  readonly moveType: Type;
  readonly userType: Type;
  /** Damage before the type factor (the creature's attack is already in it). */
  readonly damage: number;
  /** Burn damage a second before the type factor, for `burnFor` seconds. */
  readonly burn: number;
  readonly burnFor: number;
  readonly stun: number;
  readonly slow: number;
  readonly slowFor: number;
  readonly soak: number;
  /** Against a soaked enemy the damage is multiplied by this and the soak is used up; 0 for none. */
  readonly soakedBonus: number;
}

/** A blast that only damages: for tests, and as the base of a move's. */
export const PLAIN_BLAST: Blast = {
  target: -1,
  x: 0,
  y: 0,
  radius: 0,
  from: -1,
  moveType: "stone",
  userType: "stone",
  damage: 0,
  burn: 0,
  burnFor: 0,
  stun: 0,
  slow: 0,
  slowFor: 0,
  soak: 0,
  soakedBonus: 0,
};

/** What the colliders carry (`<Collider data>`), by tag. */
declare global {
  interface ColliderData {
    /** An enemy, as a creature sees it: who it is, how far along the path, where, and whether it still stands. */
    enemy: { readonly id: number; readonly dist: number; readonly x: number; readonly y: number; readonly hp: number };
    /** A move landing. */
    blast: Blast;
  }
}
