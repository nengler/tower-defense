import type { MoveId } from "./moves.ts";
import { addXp, learnLevel, slotsFor } from "./progress.ts";
import { EVOLVE_AT, FORMS, SPECIES, type FormId, type SpeciesId } from "./species.ts";
import { isOpen, type MapId } from "./map.ts";

/** At most this many creatures on the field at once. */
export const FIELD_LIMIT = 5;

/** A choice waiting for the player: two moves at a learn step, or two forms at `EVOLVE_AT`. */
export type Choice =
  | { readonly kind: "move"; readonly options: readonly MoveId[] }
  | { readonly kind: "form"; readonly options: readonly FormId[] };

/** A creature the player owns this run. */
export interface Owned {
  readonly id: number;
  readonly species: SpeciesId;
  readonly level: number;
  /** XP toward the next level. */
  readonly xp: number;
  /** Its species' mastery when it joined: when it learns, and its slots. */
  readonly mastery: number;
  /** Every move it knows, in the order it learned them. */
  readonly known: readonly MoveId[];
  /** The moves it uses, in the order it tries them. At most `slotsFor(mastery)`. */
  readonly equipped: readonly MoveId[];
  /** How many of its species' learn steps are behind it (learned, or picked from). */
  readonly step: number;
  /** A choice waiting for the player, or null. While one waits, later steps wait behind it. */
  readonly choice: Choice | null;
  /** The form it evolved into, or "". */
  readonly form: FormId | "";
  /** The tile it stands on, or -1 for the bench. */
  readonly col: number;
  readonly row: number;
}

/** Learn a move: known, and equipped in place of `replace` if given, else at the end if a slot is free. */
function teach(c: Owned, move: MoveId, replace: MoveId | ""): Owned {
  if (c.known.includes(move)) return c;
  const known = [...c.known, move];
  if (replace !== "" && c.equipped.includes(replace)) return { ...c, known, equipped: c.equipped.map((m) => (m === replace ? move : m)) };
  const equipped = c.equipped.length < slotsFor(c.mastery) ? [...c.equipped, move] : c.equipped;
  return { ...c, known, equipped };
}

/**
 * Bring a creature's learning up to its level: each step it has reached is learned outright when it has one move to offer, or
 * becomes its choice when it has two; at `EVOLVE_AT`, with every step behind it, its two forms are. Nothing changes while a choice
 * waits.
 */
export function offerNext(c: Owned): Owned {
  let cur = c;
  for (;;) {
    if (cur.choice !== null) return cur;
    const learns = SPECIES[cur.species].learns;
    if (cur.step < learns.length) {
      if (learnLevel(cur.species, cur.step, cur.mastery) > cur.level) return cur;
      const options = learns[cur.step]!.options.filter((m) => !cur.known.includes(m));
      if (options.length >= 2) return { ...cur, choice: { kind: "move", options } };
      cur = { ...(options.length === 1 ? teach(cur, options[0]!, "") : cur), step: cur.step + 1 };
      continue;
    }
    if (cur.form === "" && cur.level >= EVOLVE_AT) return { ...cur, choice: { kind: "form", options: SPECIES[cur.species].forms } };
    return cur;
  }
}

/** A new creature at level 1, on the bench, knowing its first move (and offered its first choice with mastery 1). */
export function newCreature(id: number, species: SpeciesId, mastery: number): Owned {
  return offerNext({ id, species, level: 1, xp: 0, mastery, known: [], equipped: [], step: 0, choice: null, form: "", col: -1, row: -1 });
}

/**
 * The player picks `move` from creature `id`'s waiting choice: it is learned, and equipped in place of `replace` (a move it has
 * equipped) or, with "", into a free slot if there is one (else it waits in its list). Then any later step it has reached comes up.
 */
export function learn(roster: readonly Owned[], id: number, move: MoveId, replace: MoveId | ""): readonly Owned[] {
  return update(roster, id, (c) => {
    if (c.choice?.kind !== "move" || !c.choice.options.includes(move)) return c;
    return offerNext({ ...teach(c, move, replace), choice: null, step: c.step + 1 });
  });
}

/** The player picks the form creature `id` evolves into: it takes the form and learns its move (as `learn` does). */
export function evolve(roster: readonly Owned[], id: number, form: FormId, replace: MoveId | ""): readonly Owned[] {
  return update(roster, id, (c) => {
    if (c.choice?.kind !== "form" || !c.choice.options.includes(form)) return c;
    return { ...teach(c, FORMS[form].move, replace), choice: null, form };
  });
}

export function onField(roster: readonly Owned[]): Owned[] {
  return roster.filter((c) => c.col >= 0);
}

export function standingAt(roster: readonly Owned[], col: number, row: number): Owned | undefined {
  return roster.find((c) => c.col === col && c.row === row);
}

/**
 * Can creature `id` go on this tile: open (on the field, not path or water, no lantern or mushroom), free, and (if it comes from the
 * bench) under the limit.
 */
export function canPlace(roster: readonly Owned[], map: MapId, id: number, col: number, row: number): boolean {
  const c = roster.find((o) => o.id === id);
  if (c === undefined) return false;
  if (!isOpen(map, col, row)) return false;
  if (standingAt(roster, col, row) !== undefined) return false;
  return c.col >= 0 || onField(roster).length < FIELD_LIMIT;
}

/** Put creature `id` on a tile (from the bench or from another tile). Unchanged if it cannot go there. */
export function place(roster: readonly Owned[], map: MapId, id: number, col: number, row: number): readonly Owned[] {
  if (!canPlace(roster, map, id, col, row)) return roster;
  return roster.map((c) => (c.id === id ? { ...c, col, row } : c));
}

/**
 * Creature `id` takes the place of creature `other`, which goes where `id` was: two on the field trade tiles, and one from the bench
 * puts the other on the bench (so the field count stays the same).
 */
export function swap(roster: readonly Owned[], id: number, other: number): readonly Owned[] {
  const a = roster.find((c) => c.id === id);
  const b = roster.find((c) => c.id === other);
  if (a === undefined || b === undefined || a === b) return roster;
  return roster.map((c) => (c.id === id ? { ...c, col: b.col, row: b.row } : c.id === other ? { ...c, col: a.col, row: a.row } : c));
}

/** Back to the bench. */
export function bench(roster: readonly Owned[], id: number): readonly Owned[] {
  return roster.map((c) => (c.id === id ? { ...c, col: -1, row: -1 } : c));
}

/** Creature `id` earns XP. On a level-up, whatever it has reached comes up: a move learned, or a choice for the player. */
export function earn(roster: readonly Owned[], id: number, amount: number): readonly Owned[] {
  return update(roster, id, (c) => {
    const leveled = addXp(c.level, c.xp, amount);
    if (leveled.gained === 0) return { ...c, xp: leveled.xp };
    return offerNext({ ...c, level: leveled.level, xp: leveled.xp });
  });
}

/** Change one creature. */
function update(roster: readonly Owned[], id: number, change: (c: Owned) => Owned): readonly Owned[] {
  return roster.map((c) => (c.id === id ? change(c) : c));
}

/** Equip a move it knows into a free slot, at the end of the order. Unchanged if every slot is full or it is already equipped. */
export function equipMove(roster: readonly Owned[], id: number, move: MoveId): readonly Owned[] {
  return update(roster, id, (c) =>
    c.known.includes(move) && !c.equipped.includes(move) && c.equipped.length < slotsFor(c.mastery)
      ? { ...c, equipped: [...c.equipped, move] }
      : c
  );
}

/** Take a move out of its slots (it stays known). */
export function unequipMove(roster: readonly Owned[], id: number, move: MoveId): readonly Owned[] {
  return update(roster, id, (c) => ({ ...c, equipped: c.equipped.filter((m) => m !== move) }));
}

/** Move an equipped move one place earlier in the order it is tried in. */
export function raiseMove(roster: readonly Owned[], id: number, move: MoveId): readonly Owned[] {
  return update(roster, id, (c) => {
    const i = c.equipped.indexOf(move);
    if (i <= 0) return c;
    const order = [...c.equipped];
    order[i] = order[i - 1] as MoveId;
    order[i - 1] = move;
    return { ...c, equipped: order };
  });
}

/** The creature with this id, if the roster has it. */
export function creatureById(roster: readonly Owned[], id: number): Owned | undefined {
  return roster.find((c) => c.id === id);
}
