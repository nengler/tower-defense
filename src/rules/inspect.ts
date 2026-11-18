import { MARKS } from "./marks.ts";
import { MOVES, type MoveId } from "./moves.ts";
import { scaled } from "./scaled.ts";
import type { Stats } from "./species.ts";

/** One line of a move's details on the card: a label and its value. */
export interface Detail {
  readonly label: string;
  readonly value: string;
}

/** A ring to draw on the field: where its middle is, how far its edge is, and its colour. */
export interface Ring {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly color: string;
}

/** Seconds to one decimal, as the card shows them. */
const secs = (n: number) => `${Math.round(n * 10) / 10}S`;
const pct = (n: number) => `${Math.round(n * 100)}%`;

/**
 * How far a move reaches as this creature uses it, in pixels from the creature: the target's reach for a hit or a splash, the radius
 * for a pulse or a buff. The field draws it as a ring while the move is inspected.
 */
export function rangeOf(move: MoveId, stats: Stats): number {
  const m = MOVES[move];
  const u = scaled(move, stats);
  return m.shape === "hit" || m.shape === "splash" ? u.reach : u.radius;
}

/** A move's numbers as this creature uses it, for the card: what it does, how far, how often, and what it leaves. */
export function moveDetails(move: MoveId, stats: Stats): readonly Detail[] {
  const m = MOVES[move];
  const u = scaled(move, stats);
  const e = m.effects;
  const lines: Detail[] = [{ label: m.shape === "buff" ? "BUFF" : m.shape.toUpperCase(), value: m.type.toUpperCase() }];
  if (m.damage > 0) lines.push({ label: "DMG", value: `${Math.round(u.damage)}` });
  lines.push({ label: m.shape === "pulse" || m.shape === "buff" ? "RADIUS" : "REACH", value: `${Math.round(rangeOf(move, stats))}` });
  if (m.shape === "splash") lines.push({ label: "SPLASH", value: `${Math.round(u.radius)}` });
  lines.push({ label: "CD", value: secs(u.cooldown) });
  lines.push({ label: "USE", value: secs(u.animation) });
  if (e.stun !== undefined) lines.push({ label: "STUN", value: secs(e.stun) });
  if (e.slow !== undefined) lines.push({ label: "SLOW", value: `${pct(e.slow)} ${secs(e.slowFor ?? 0)}` });
  if (e.burn !== undefined) lines.push({ label: "BURN", value: `${Math.round(u.burn)}/S ${secs(e.burnFor ?? 0)}` });
  if (e.soak !== undefined) lines.push({ label: "SOAK", value: secs(e.soak) });
  if (e.haste !== undefined) lines.push({ label: "HASTE", value: `${pct(e.haste)} ${secs(e.hasteFor ?? 0)}` });
  if (e.bonusVs !== undefined) lines.push({ label: `VS ${e.bonusVs.toUpperCase()}`, value: `X${e.bonus ?? 1}` });
  if (e.mark !== undefined) lines.push({ label: "LEAVES", value: MARKS[e.mark].name.toUpperCase() });
  return lines;
}
