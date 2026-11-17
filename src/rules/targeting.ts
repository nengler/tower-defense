/** An enemy as a creature sees it (its collider's data). */
export interface Seen {
  readonly id: number;
  readonly dist: number;
  readonly x: number;
  readonly y: number;
  readonly hp: number;
  /** Underground: no move can target it. */
  readonly hidden?: boolean;
}

/** The enemy within `reach` of (x, y) that is furthest along the path, still standing and not underground; ties go to the lower id. */
export function pickTarget(x: number, y: number, reach: number, enemies: readonly Seen[]): Seen | null {
  let best: Seen | null = null;
  for (const e of enemies) {
    if (e.hp <= 0 || e.hidden === true || Math.hypot(e.x - x, e.y - y) > reach) continue;
    if (best === null || e.dist > best.dist || (e.dist === best.dist && e.id < best.id)) best = e;
  }
  return best;
}

/** Is any standing enemy above ground within `radius` of (x, y). */
export function anyWithin(x: number, y: number, radius: number, enemies: readonly Seen[]): boolean {
  return enemies.some((e) => e.hp > 0 && e.hidden !== true && Math.hypot(e.x - x, e.y - y) <= radius);
}

/** Is any jammer's jam radius over (x, y). */
export function jammedAt(x: number, y: number, enemies: readonly (Seen & { readonly jam: number })[]): boolean {
  return enemies.some((e) => e.jam > 0 && e.hp > 0 && Math.hypot(e.x - x, e.y - y) <= e.jam);
}
