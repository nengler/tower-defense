/** An enemy as a creature sees it (its collider's data). */
export interface Seen {
  readonly id: number;
  readonly dist: number;
  readonly x: number;
  readonly y: number;
  readonly hp: number;
}

/** The enemy within `reach` of (x, y) that is furthest along the path and still standing; ties go to the lower id. */
export function pickTarget(x: number, y: number, reach: number, enemies: readonly Seen[]): Seen | null {
  let best: Seen | null = null;
  for (const e of enemies) {
    if (e.hp <= 0 || Math.hypot(e.x - x, e.y - y) > reach) continue;
    if (best === null || e.dist > best.dist || (e.dist === best.dist && e.id < best.id)) best = e;
  }
  return best;
}

/** Is any standing enemy within `radius` of (x, y). */
export function anyWithin(x: number, y: number, radius: number, enemies: readonly Seen[]): boolean {
  return enemies.some((e) => e.hp > 0 && Math.hypot(e.x - x, e.y - y) <= radius);
}
