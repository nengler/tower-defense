/**
 * The shapes the battle's components hand each other. The battle itself is in the components: `Play` keeps the lives and the
 * wave, an `Enemy` walks and takes its hits.
 */
import type { EnemyKind } from "./rules/enemies.ts";
import type { MarkKind } from "./rules/marks.ts";
import type { MoveId, Reaction, Status } from "./rules/moves.ts";
import type { Type } from "./rules/types.ts";

/** An enemy that has come: what `Play` knows of it. Where it is and how hurt it is are the `Enemy`'s own. */
export interface Foe {
  readonly id: number;
  readonly kind: EnemyKind;
  readonly maxHp: number;
  /** Where along the path it starts (0, or where the brood it split from fell). */
  readonly startDist: number;
}

/**
 * What a move lands as: everything an enemy needs to work out what it takes. Which enemies it lands on is the creature's choice
 * (`send("enemy", …)`: the one it aimed at, or every one whose middle is in the area), so a blast says nothing of where.
 */
export interface Blast {
  /** The creature that used the move (its XP), and the types that decide the type factor. */
  readonly from: number;
  /** The creature whose haste was on it when it used the move (a share of its XP, `BUFF_XP_SHARE`), or -1. */
  readonly helper: number;
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
  /** A combo: against an enemy with status `bonusVs` the damage is multiplied by `bonus` ("" and 0 for none). */
  readonly bonusVs: Status | "";
  readonly bonus: number;
  /** The combo uses the status up. */
  readonly consumes: boolean;
  /** The combo sets off no reaction (a douse). */
  readonly quiet: boolean;
  /** It only lands on an enemy with this status ("" for any): a chain jumps between soaked enemies, a root holds slowed ones. */
  readonly only: Status | "";
  /** It is a reaction's (or a mark's): it sets off no reaction of its own, so reactions never cascade. */
  readonly reacted: boolean;
  /** The enemy that sent it, which it never lands on (a reaction's own enemy, a shepherd itself); -1 for none. */
  readonly skip: number;
  /** An enemy's, not a creature's: heal this share of the receiver's hit points (a shepherd). */
  readonly heal: number;
  /** An enemy's: wash every status off the receiver (a cleanser). */
  readonly cleanse: boolean;
}

/** A blast that only damages: for tests, and as the base of a move's. */
export const PLAIN_BLAST: Blast = {
  from: -1,
  helper: -1,
  moveType: "stone",
  userType: "stone",
  damage: 0,
  burn: 0,
  burnFor: 0,
  stun: 0,
  slow: 0,
  slowFor: 0,
  soak: 0,
  bonusVs: "",
  bonus: 0,
  consumes: false,
  quiet: false,
  only: "",
  reacted: false,
  skip: -1,
  heal: 0,
  cleanse: false,
};

/** A buff landing on an ally (every ally whose middle is in its area, chosen by the creature that used it). */
export interface Aura {
  /** The creature that used the buff: it earns a share of the XP the hasted creature earns while the haste lasts. */
  readonly from: number;
  /** Moves this much faster (0.3 = 30 % shorter animations and cooldowns), for `hasteFor` seconds. */
  readonly haste: number;
  readonly hasteFor: number;
}

/**
 * What a creature's move shows when its animation ends: a line from the creature to where it lands for a hit, a disc for an area.
 * Only for the eye: the blast or aura itself is sent to the enemies or allies it lands on. A reaction shows as a disc too.
 */
export interface Effect {
  readonly move: MoveId;
  /** The colour it is drawn in (its move's type, or its reaction's). */
  readonly color: string;
  /** The creature that used it and its type; -1 for a reaction. */
  readonly from: number;
  readonly userType: Type;
  /** The mark it leaves on the path tiles it covers ("" for none), and that mark's burn a second with the user's attack in it. */
  readonly mark: MarkKind | "";
  readonly markBurn: number;
  /** Where the creature that used it stands. */
  readonly fromX: number;
  readonly fromY: number;
  /** Where it lands, and the area it covers (0 for a hit). */
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

/** An effect in `Play`'s list. */
export interface Placed extends Effect {
  readonly id: number;
}

declare global {
  /** What the colliders carry (`<Collider data>`), by tag: what `nearby` sees of each. */
  interface ColliderData {
    /** A creature, as a buff sees it: who and where. */
    ally: { readonly id: number; readonly x: number; readonly y: number };
    /**
     * An enemy, as a creature sees it: who it is, how far along the path, where, whether it still stands, whether it is underground
     * (no move can target or hit it), and the radius it jams creatures in (0 for none).
     */
    enemy: {
      readonly id: number;
      readonly dist: number;
      readonly x: number;
      readonly y: number;
      readonly hp: number;
      readonly hidden: boolean;
      readonly jam: number;
    };
  }
  /** What can be sent to each tag (`send(tag, …)`, received by `<Collider onReceive>`). */
  interface ColliderMessages {
    /** A move landing on an enemy. */
    enemy: Blast;
    /** A buff landing on an ally. */
    ally: Aura;
  }
}

/** A mark on a path tile, in `Play`'s list (see `rules/marks.ts`). */
export interface Mark {
  readonly id: number;
  readonly key: string;
  readonly col: number;
  readonly row: number;
  readonly kind: MarkKind;
  /** The creature that laid it (its XP), and what its burn does a second, its attack already in it. */
  readonly from: number;
  readonly burn: number;
  readonly userType: Type;
}

/** A reaction going off, for `Play` to show and sound. */
export interface Reacted {
  readonly reaction: Reaction;
  readonly x: number;
  readonly y: number;
}
