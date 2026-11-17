import type { Type } from "./types.ts";

export type EnemyKind =
  | "crawler"
  | "skitter"
  | "mite"
  | "shell"
  | "sprinter"
  | "cleanser"
  | "brood"
  | "burrower"
  | "jammer"
  | "shepherd"
  | "mosshorn"
  | "prism";

/** Every kind, in the order of their rows in `assets/enemies.png`. */
export const ENEMY_KINDS: readonly EnemyKind[] = [
  "crawler",
  "skitter",
  "mite",
  "shell",
  "sprinter",
  "cleanser",
  "brood",
  "burrower",
  "jammer",
  "shepherd",
  "mosshorn",
  "prism",
];

/**
 * An enemy kind. Enemies never hurt creatures; the ones after the first four get in the way of a plan instead: they wash off
 * statuses, heal, freeze cooldowns, go underground, speed up when hit or split when killed.
 */
export interface EnemyKindInfo {
  readonly name: string;
  readonly type: Type;
  /** Hit points in wave 1 (a boss's are its own, whatever the wave). */
  readonly hp: number;
  /** Pixels a second. */
  readonly speed: number;
  /** Lives it takes when it reaches the end. */
  readonly lives: number;
  readonly size: number;
  /** Taken off every hit's damage (never below 1). Burns ignore it, so big hits and burns beat quick ones. */
  readonly armor: number;
  /** A boss: its hit points do not grow with the wave, and it is drawn bigger. */
  readonly boss?: boolean;
  /** Statuses do not stick to it (it can still be hit). */
  readonly immune?: boolean;
  /** Every `CLEANSE_EVERY` seconds it washes every status off the enemies within this radius. */
  readonly cleanse?: number;
  /** Every `HEAL_EVERY` seconds it heals the enemies within `healRadius` by this share of their hit points. */
  readonly heal?: number;
  readonly healRadius?: number;
  /** Creatures within this radius of it are jammed: their cooldowns stop. */
  readonly jam?: number;
  /** It goes underground for stretches of the path (`BURROW`): it cannot be targeted or hit there. */
  readonly burrow?: boolean;
  /** Each hit makes it this much faster (1.12 = 12 %), up to `SPRINT_CAP` times its speed. */
  readonly sprint?: number;
  /** When killed it splits into this many of `into`. */
  readonly split?: { readonly into: EnemyKind; readonly count: number };
  /** Below `at` of its hit points it changes: a new type, armour and speed. */
  readonly shed?: { readonly at: number; readonly type: Type; readonly armor: number; readonly speed: number };
  /** Its type changes as it goes: the path split into equal stretches, one type each. */
  readonly cycle?: readonly Type[];
}

export const ENEMIES: Readonly<Record<EnemyKind, EnemyKindInfo>> = {
  crawler: { name: "Crawler", type: "bloom", hp: 34, speed: 24, lives: 1, size: 8, armor: 0 },
  skitter: { name: "Skitter", type: "tide", hp: 20, speed: 40, lives: 1, size: 6, armor: 0 },
  /** Small and quick, in swarms: an area move hits a crowd of them at once. */
  mite: { name: "Mite", type: "ember", hp: 8, speed: 44, lives: 1, size: 4, armor: 0 },
  /** Slow and armoured: a quick jab barely scratches it. Takes two lives if it gets through. */
  shell: { name: "Shell", type: "stone", hp: 80, speed: 16, lives: 2, size: 10, armor: 6 },
  /** Speeds up every time it is hit: chip damage backfires, one big hit is best. */
  sprinter: { name: "Sprinter", type: "volt", hp: 30, speed: 26, lives: 1, size: 6, armor: 0, sprint: 1.12 },
  /** Washes statuses off the enemies around it and takes none itself: combos break unless it goes first. */
  cleanser: { name: "Cleanser", type: "tide", hp: 44, speed: 22, lives: 1, size: 8, armor: 0, immune: true, cleanse: 26 },
  /** Splits into mites when killed, so an area move is needed further down the path too. */
  brood: { name: "Brood", type: "ember", hp: 52, speed: 20, lives: 1, size: 9, armor: 0, split: { into: "mite", count: 2 } },
  /** Goes underground for stretches of the path: stacking every creature at one bend fails. */
  burrower: { name: "Burrower", type: "stone", hp: 50, speed: 26, lives: 1, size: 8, armor: 2, burrow: true },
  /** Freezes the cooldowns of the creatures near it. */
  jammer: { name: "Jammer", type: "volt", hp: 46, speed: 20, lives: 1, size: 8, armor: 0, jam: 28 },
  /** Heals the enemies around it: something must reach it. */
  shepherd: { name: "Shepherd", type: "bloom", hp: 54, speed: 18, lives: 1, size: 9, armor: 0, heal: 0.03, healRadius: 30 },
  /** Wave 5's boss: armoured stone, until half its hit points are gone; then it sheds its shell and runs as bloom. */
  mosshorn: {
    name: "Mosshorn",
    type: "stone",
    hp: 450,
    speed: 11,
    lives: 3,
    size: 12,
    armor: 6,
    boss: true,
    shed: { at: 0.5, type: "bloom", armor: 0, speed: 20 },
  },
  /** Wave 10's boss: its type changes every fifth of the path, so one type of team cannot carry it. */
  prism: {
    name: "Prism",
    type: "ember",
    hp: 3000,
    speed: 9,
    lives: 6,
    size: 12,
    armor: 4,
    boss: true,
    cycle: ["ember", "tide", "volt", "stone", "bloom"],
  },
};

/**
 * How enemies' hit points grow with the wave: each wave adds `HP_PER_WAVE` of their first-wave hit points, plus `HP_CURVE` times the
 * square of the waves gone by, so the last waves pull ahead of a team that has grown strong.
 */
export const HP_PER_WAVE = 0.28;
export const HP_CURVE = 0.04;

/** What a wave (counted from 1) multiplies hit points by. */
export function waveHp(wave: number): number {
  const w = wave - 1;
  return 1 + HP_PER_WAVE * w + HP_CURVE * w * w;
}

/** How often a cleanser washes, and a shepherd heals. */
export const CLEANSE_EVERY = 1.5;
export const HEAL_EVERY = 0.5;
/** A sprinter's top speed, as a multiple of its own. */
export const SPRINT_CAP = 2.2;
/** A burrower's rhythm: this many pixels on the surface, then this many underground, faster. */
export const BURROW = { up: 48, under: 72, speed: 1.6 } as const;

/** An enemy's hit points in a wave (counted from 1). A boss's do not grow with the wave. */
export function hpOf(kind: EnemyKind, wave: number): number {
  const info = ENEMIES[kind];
  return Math.round(info.hp * (info.boss === true ? 1 : waveHp(wave)));
}

/** What a hit of `damage` does to an enemy with this armour: less the armour, at least 1. */
export function afterArmor(armor: number, damage: number): number {
  return damage <= 0 ? 0 : Math.max(1, damage - armor);
}

/** Is a burrower `dist` pixels along the path underground. Never at the very start, so it is seen coming. */
export function burrowed(dist: number): boolean {
  const cycle = BURROW.up + BURROW.under;
  return dist % cycle >= BURROW.up;
}

/** A cycling boss's type `dist` pixels along a path `length` long. */
export function cycleType(cycle: readonly Type[], dist: number, length: number): Type {
  const i = Math.min(cycle.length - 1, Math.floor((dist / length) * cycle.length));
  return cycle[Math.max(0, i)] as Type;
}

/** A kind's type now: a boss that has shed its shell is its new type; a cycling one, the type of the stretch of path it is on. */
export function typeNow(kind: EnemyKind, shed: boolean, dist: number, length: number): Type {
  const info = ENEMIES[kind];
  if (shed && info.shed !== undefined) return info.shed.type;
  if (info.cycle !== undefined) return cycleType(info.cycle, dist, length);
  return info.type;
}

/** A kind's armour now (a shed shell is gone). */
export function armorNow(kind: EnemyKind, shed: boolean): number {
  const info = ENEMIES[kind];
  return shed && info.shed !== undefined ? info.shed.armor : info.armor;
}

/** A kind's own speed now (a boss without its shell runs). */
export function speedNow(kind: EnemyKind, shed: boolean): number {
  const info = ENEMIES[kind];
  return shed && info.shed !== undefined ? info.shed.speed : info.speed;
}

/** The radius a kind jams creatures in, 0 for none. */
export function jamOf(kind: EnemyKind): number {
  return ENEMIES[kind].jam ?? 0;
}
