import type { MoveId } from "./moves.ts";
import { scaled } from "./scaled.ts";
import type { Stats } from "./species.ts";

/** `color` (`#rrggbb`) with an alpha that fades from `start` (0 to 1) at t = 0 to nothing at t = `over`. */
export function fadeColor(color: string, start: number, t: number, over: number): string {
  const alpha = Math.round(255 * start * Math.max(0, 1 - t / over));
  return `${color}${alpha.toString(16).padStart(2, "0")}`;
}

/** How full a move's cooldown pip is: 0 just used (or just equipped), 1 ready. */
export function pipFill(cooldowns: Readonly<Partial<Record<MoveId, number>>>, move: MoveId, stats: Stats): number {
  const full = scaled(move, stats).cooldown;
  return 1 - (cooldowns[move] ?? full) / full;
}

/** A cooldown table with one move's set. */
export function withCooldown(
  cooldowns: Readonly<Partial<Record<MoveId, number>>>,
  move: MoveId,
  seconds: number
): Partial<Record<MoveId, number>> {
  const next = { ...cooldowns };
  next[move] = seconds;
  return next;
}

