/**
 * Writes `assets/enemies.png` from the Tiny Creatures sprites in `tools/tiny-creatures/` (CC0, by Clint Bellanger; see the README
 * there), so this runs offline. Each kind is one row of two 16 × 16 frames: the sprite as it is, then the same sprite a pixel higher,
 * so the walk (`ENEMY_ANIMATIONS`) is a hop. Rows are in `ENEMY_KINDS` order. Run it again after changing a pick; the sheet is
 * committed.
 *
 *   node tools/make-enemies.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { decodePng, encodePng } from "@tsengine/player-node";

import { ENEMY_KINDS, type EnemyKind } from "../src/rules/enemies.ts";

const here = dirname(fileURLToPath(import.meta.url));
const SIZE = 16;

/** Each kind's sprite: its number in the pack. Its colour matches the kind's type (see the README for what each one is). */
const PICK: Readonly<Record<EnemyKind, number>> = {
  crawler: 147,
  skitter: 57,
  mite: 56,
  shell: 48,
  sprinter: 141,
  cleanser: 47,
  brood: 46,
  burrower: 138,
  jammer: 146,
  shepherd: 8,
  mosshorn: 16,
  prism: 50,
};

const width = SIZE * 2;
const out = new Uint8Array(width * SIZE * ENEMY_KINDS.length * 4);
ENEMY_KINDS.forEach((kind, row) => {
  const name = `tiny-creatures-${String(PICK[kind]).padStart(4, "0")}.png`;
  const src = decodePng(readFileSync(join(here, "tiny-creatures", name)));
  if (src.width !== SIZE || src.height !== SIZE) throw new Error(`${name} is ${src.width} × ${src.height}, not ${SIZE} × ${SIZE}`);
  for (let frame = 0; frame < 2; frame++) {
    // The second frame is the hop: a pixel higher.
    const lift = frame;
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) {
        const ty = row * SIZE + y - lift;
        if (ty < row * SIZE) continue;
        const from = (y * SIZE + x) * 4;
        out.set(src.rgba.subarray(from, from + 4), (ty * width + frame * SIZE + x) * 4);
      }
  }
});
writeFileSync(join(here, "../assets/enemies.png"), encodePng({ width, height: SIZE * ENEMY_KINDS.length, rgba: out }));
console.log(`wrote enemies.png: ${ENEMY_KINDS.length} kinds from tools/tiny-creatures/`);
