/**
 * A seeded random number generator (mulberry32), kept as a plain number so it can live in state: the same seed gives the same
 * run, which tests and replays rely on.
 */
export interface Rolled {
  /** A number in [0, 1). */
  readonly value: number;
  /** The seed to roll the next one from. */
  readonly seed: number;
}

export function roll(seed: number): Rolled {
  const next = (seed + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, seed: next };
}

/** `count` different items of `from`, picked at random. */
export function pick<T>(from: readonly T[], count: number, seed: number): { readonly picked: T[]; readonly seed: number } {
  const pool = [...from];
  const picked: T[] = [];
  let s = seed;
  while (picked.length < count && pool.length > 0) {
    const r = roll(s);
    s = r.seed;
    picked.push(pool.splice(Math.floor(r.value * pool.length), 1)[0] as T);
  }
  return { picked, seed: s };
}
