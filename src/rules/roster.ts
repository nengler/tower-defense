import type { MoveId } from "./moves.ts";
import { addXp, knownAt, slotsFor } from "./progress.ts";
import type { SpeciesId } from "./species.ts";
import { COLS, isPath, ROWS } from "./map.ts";

/** At most this many creatures on the field at once. */
export const FIELD_LIMIT = 5;

/** A creature the player owns this run. */
export interface Owned {
  readonly id: number;
  readonly species: SpeciesId;
  readonly level: number;
  /** XP toward the next level. */
  readonly xp: number;
  /** Its species' mastery when it joined: what it starts knowing, when it learns, and its slots. */
  readonly mastery: number;
  /** Every move it knows, in the order it learned them. */
  readonly known: readonly MoveId[];
  /** The moves it uses, in the order it tries them. At most `slotsFor(mastery)`. */
  readonly equipped: readonly MoveId[];
  /** The tile it stands on, or -1 for the bench. */
  readonly col: number;
  readonly row: number;
}

/** A new creature at level 1, on the bench, with what it knows equipped (as many as fit). */
export function newCreature(id: number, species: SpeciesId, mastery: number): Owned {
  const known = knownAt(species, 1, mastery);
  return { id, species, level: 1, xp: 0, mastery, known, equipped: known.slice(0, slotsFor(mastery)), col: -1, row: -1 };
}

export function onField(roster: readonly Owned[]): Owned[] {
  return roster.filter((c) => c.col >= 0);
}

export function standingAt(roster: readonly Owned[], col: number, row: number): Owned | undefined {
  return roster.find((c) => c.col === col && c.row === row);
}

/** Can creature `id` go on this tile: on the field, not path, free, and (if it comes from the bench) under the limit. */
export function canPlace(roster: readonly Owned[], id: number, col: number, row: number): boolean {
  const c = roster.find((o) => o.id === id);
  if (c === undefined) return false;
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS || isPath(col, row)) return false;
  if (standingAt(roster, col, row) !== undefined) return false;
  return c.col >= 0 || onField(roster).length < FIELD_LIMIT;
}

/** Put creature `id` on a tile (from the bench or from another tile). Unchanged if it cannot go there. */
export function place(roster: readonly Owned[], id: number, col: number, row: number): readonly Owned[] {
  if (!canPlace(roster, id, col, row)) return roster;
  return roster.map((c) => (c.id === id ? { ...c, col, row } : c));
}

/** Back to the bench. */
export function bench(roster: readonly Owned[], id: number): readonly Owned[] {
  return roster.map((c) => (c.id === id ? { ...c, col: -1, row: -1 } : c));
}

/**
 * Creature `id` earns XP. On a level-up it learns what its species learns by then; a new move is equipped if a slot is free, and
 * otherwise waits in its move list for the player to swap in.
 */
export function earn(roster: readonly Owned[], id: number, amount: number): readonly Owned[] {
  return roster.map((c) => {
    if (c.id !== id) return c;
    const leveled = addXp(c.level, c.xp, amount);
    if (leveled.gained === 0) return { ...c, xp: leveled.xp };
    const learned = knownAt(c.species, leveled.level, c.mastery).filter((m) => !c.known.includes(m));
    const slots = slotsFor(c.mastery);
    const equipped = [...c.equipped, ...learned].slice(0, Math.max(slots, c.equipped.length));
    return { ...c, level: leveled.level, xp: leveled.xp, known: [...c.known, ...learned], equipped };
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
