/**
 * Draws the game's pixel art into `assets/`, in code: no drawn or downloaded images. Run it again after changing a sprite; the
 * files are committed.
 *
 * - `creatures.png`: 12 × 12 frames, two to a row (an idle bob), one row a species in `SPECIES_IDS` order.
 * - `enemies.png`: 12 × 12 frames, two to a row (a walk), one row a kind in `ENEMY_KINDS` order.
 * - `tiles.png`: 16 × 16 tiles in a row: grass, grass with a tuft, path.
 *
 *   node tools/make-art.ts
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { encodePng } from "@rge/player-node";

import { ENEMY_KINDS } from "../src/rules/enemies.ts";
import { SPECIES_IDS } from "../src/rules/species.ts";

const assets = join(dirname(fileURLToPath(import.meta.url)), "../assets");

type Rgb = readonly [number, number, number];

class Canvas {
  readonly width: number;
  readonly height: number;
  readonly rgba: Uint8Array;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.rgba = new Uint8Array(width * height * 4);
  }
  set(x: number, y: number, [r, g, b]: Rgb): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    this.rgba.set([r, g, b, 255], (y * this.width + x) * 4);
  }
  rect(x: number, y: number, w: number, h: number, c: Rgb): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }
  disc(cx: number, cy: number, r: number, c: Rgb): void {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r) this.set(x, y, c);
  }
  write(name: string): void {
    writeFileSync(join(assets, name), encodePng({ width: this.width, height: this.height, rgba: this.rgba }));
  }
}

const INK: Rgb = [0x1a, 0x16, 0x24];
const WHITE: Rgb = [0xff, 0xf6, 0xe0];
/** Each type's body, light and dark: the same hues as `TYPE_COLOR`. */
const TONE = {
  ember: { main: [0xf0, 0x7a, 0x3a], light: [0xff, 0xc0, 0x6a], dark: [0xa8, 0x48, 0x20] },
  tide: { main: [0x4a, 0xa3, 0xf0], light: [0x9c, 0xd6, 0xff], dark: [0x2a, 0x62, 0xa8] },
  volt: { main: [0xf0, 0xd8, 0x4a], light: [0xff, 0xf4, 0xa0], dark: [0xa8, 0x8e, 0x20] },
  stone: { main: [0xa0, 0x8a, 0x6a], light: [0xc8, 0xb4, 0x90], dark: [0x6a, 0x5a, 0x44] },
  bloom: { main: [0x6a, 0xd0, 0x6a], light: [0xb0, 0xf0, 0x9a], dark: [0x3a, 0x88, 0x40] },
} as const satisfies Record<string, { main: Rgb; light: Rgb; dark: Rgb }>;

/** Two eyes looking right, at (x, y) and (x + 3, y). */
function eyes(c: Canvas, x: number, y: number): void {
  c.set(x, y, INK);
  c.set(x + 3, y, INK);
  c.set(x, y - 1, WHITE);
  c.set(x + 3, y - 1, WHITE);
}

type Draw = (c: Canvas, ox: number, oy: number, frame: number) => void;

/** Each species, drawn in a 12 × 12 frame whose top-left is (ox, oy); `frame` 1 is the bob. */
const CREATURES: Record<(typeof SPECIES_IDS)[number], Draw> = {
  emberling: (c, ox, oy, f) => {
    const t = TONE.ember;
    const b = f;
    // A flame: a round body and a flickering tip.
    c.disc(ox + 6, oy + 8, 4, t.dark);
    c.disc(ox + 6, oy + 7.5, 3.5, t.main);
    c.rect(ox + 5, oy + 2 + b, 2, 3, t.main);
    c.set(ox + 6 - f, oy + 1 + b, t.light);
    c.disc(ox + 5.5, oy + 6.5, 1.5, t.light);
    eyes(c, ox + 4, oy + 8);
  },
  puddlepup: (c, ox, oy, f) => {
    const t = TONE.tide;
    // A round pup with drooping ears.
    c.disc(ox + 6, oy + 7 + f * 0.5, 4.5, t.dark);
    c.disc(ox + 6, oy + 6.5 + f * 0.5, 4, t.main);
    c.rect(ox + 1, oy + 4 + f, 2, 4, t.dark);
    c.rect(ox + 9, oy + 4 + f, 2, 4, t.dark);
    c.disc(ox + 5, oy + 5, 1.2, t.light);
    eyes(c, ox + 4, oy + 7 + f);
    c.set(ox + 6, oy + 9 + f, INK);
  },
  voltkit: (c, ox, oy, f) => {
    const t = TONE.volt;
    // A kit with pointed ears and a zigzag tail.
    c.disc(ox + 6, oy + 7, 3.5, t.dark);
    c.disc(ox + 6, oy + 6.5, 3, t.main);
    c.set(ox + 3, oy + 2, t.main);
    c.set(ox + 4, oy + 3, t.main);
    c.set(ox + 9, oy + 2, t.main);
    c.set(ox + 8, oy + 3, t.main);
    for (const [x, y] of [
      [1, 9],
      [2, 8],
      [1, 7],
      [2, 6],
    ] as const)
      c.set(ox + x, oy + y - f, t.light);
    eyes(c, ox + 4, oy + 7);
    c.rect(ox + 4, oy + 10, 1, 2 - f, t.dark);
    c.rect(ox + 7, oy + 10, 1, 1 + f, t.dark);
  },
  pebblet: (c, ox, oy, f) => {
    const t = TONE.stone;
    // A blocky rock with a ledge of a brow.
    c.rect(ox + 2, oy + 4 + f, 8, 7 - f, t.dark);
    c.rect(ox + 2, oy + 3 + f, 8, 7 - f, t.main);
    c.rect(ox + 3, oy + 4 + f, 3, 2, t.light);
    c.rect(ox + 2, oy + 6 + f, 8, 1, t.dark);
    eyes(c, ox + 4, oy + 8);
    c.set(ox + 8, oy + 4 + f, t.light);
  },
  sproutling: (c, ox, oy, f) => {
    const t = TONE.bloom;
    // A bulb with a leaf that sways.
    c.disc(ox + 6, oy + 8, 3.5, t.dark);
    c.disc(ox + 6, oy + 7.5, 3, t.main);
    c.rect(ox + 6, oy + 2, 1, 3, t.dark);
    c.rect(ox + 7 - f * 3, oy + 2, 2, 1, t.light);
    c.set(ox + 7 - f * 3 + (f ? 0 : 1), oy + 1, t.light);
    eyes(c, ox + 4, oy + 8);
  },
};

/** Each enemy kind, likewise; `frame` 1 is the other step of the walk. */
const ENEMIES: Record<(typeof ENEMY_KINDS)[number], Draw> = {
  crawler: (c, ox, oy, f) => {
    const t = TONE.bloom;
    // A beetle with six legs taking turns.
    for (const x of [3, 6, 9]) c.set(ox + x + (f ? 1 : -1) * (x === 6 ? -1 : 1) * 0, oy + 10 - ((x / 3 + f) % 2), t.dark);
    c.disc(ox + 6, oy + 6.5, 4, t.dark);
    c.disc(ox + 6, oy + 6, 3.4, t.main);
    c.rect(ox + 6, oy + 3, 1, 6, t.dark);
    c.set(ox + 9, oy + 5, INK);
  },
  skitter: (c, ox, oy, f) => {
    const t = TONE.tide;
    // A thin runner on long legs.
    c.disc(ox + 6, oy + 5, 2.6, t.dark);
    c.disc(ox + 6, oy + 4.8, 2.1, t.main);
    c.rect(ox + 4 + f, oy + 7, 1, 4, t.dark);
    c.rect(ox + 8 - f, oy + 7, 1, 4, t.dark);
    c.set(ox + 7, oy + 4, INK);
  },
  mite: (c, ox, oy, f) => {
    const t = TONE.ember;
    // A speck with legs.
    c.disc(ox + 6, oy + 6, 2, t.main);
    c.set(ox + 3 + f, oy + 8, t.dark);
    c.set(ox + 9 - f, oy + 8, t.dark);
    c.set(ox + 7, oy + 5, INK);
  },
  shell: (c, ox, oy, f) => {
    const t = TONE.stone;
    // An armoured dome with plates, on stubby feet.
    c.rect(ox + 3 + f, oy + 9, 2, 2, t.dark);
    c.rect(ox + 7 - f, oy + 9, 2, 2, t.dark);
    c.disc(ox + 6, oy + 6, 5, t.dark);
    c.disc(ox + 6, oy + 5.6, 4.4, t.main);
    c.rect(ox + 2, oy + 6, 9, 1, t.dark);
    c.rect(ox + 6, oy + 2, 1, 4, t.dark);
    c.disc(ox + 4.5, oy + 4, 1, t.light);
    c.set(ox + 10, oy + 7, INK);
  },
};

function sheet(name: string, rows: readonly Draw[]): void {
  const c = new Canvas(24, rows.length * 12);
  rows.forEach((draw, row) => {
    for (let f = 0; f < 2; f++) draw(c, f * 12, row * 12, f);
  });
  c.write(name);
}

function tiles(): void {
  const c = new Canvas(48, 16);
  const GRASS: Rgb = [0x22, 0x32, 0x28];
  const GRASS_DARK: Rgb = [0x1d, 0x2a, 0x22];
  const TUFT: Rgb = [0x3a, 0x5a, 0x40];
  const DIRT: Rgb = [0x5b, 0x4d, 0x3a];
  const DIRT_DARK: Rgb = [0x4e, 0x42, 0x32];
  const DIRT_LIGHT: Rgb = [0x6a, 0x5a, 0x44];
  const noise = (x: number, y: number): number => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 9;
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const n = noise(x, y);
      // A dark edge at the bottom and right, so the grid reads as tiles.
      const edge = x === 15 || y === 15;
      c.set(x, y, edge || n === 0 ? GRASS_DARK : GRASS);
      c.set(16 + x, y, edge || n === 0 ? GRASS_DARK : GRASS);
      c.set(32 + x, y, n === 0 ? DIRT_DARK : n === 1 ? DIRT_LIGHT : DIRT);
    }
  for (const [x, y] of [
    [5, 9],
    [6, 8],
    [7, 9],
    [10, 5],
    [11, 4],
  ] as const)
    c.set(16 + x, y, TUFT);
  c.write("tiles.png");
}

sheet(
  "creatures.png",
  SPECIES_IDS.map((id) => CREATURES[id])
);
sheet(
  "enemies.png",
  ENEMY_KINDS.map((k) => ENEMIES[k])
);
tiles();
console.log(`wrote creatures.png, enemies.png and tiles.png to ${assets}`);
