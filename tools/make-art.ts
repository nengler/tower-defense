/**
 * Draws the game's pixel art into `assets/`, in code: no drawn or downloaded images. Run it again after changing a sprite; the
 * files are committed.
 *
 * - `creatures.png`: 12 × 12 frames, two to a row (an idle bob), one row a species in `SPECIES_IDS` order, then one a form in
 *   `FORM_IDS` order (each form is its species drawn again, with something added).
 * - `enemies.png` is not drawn here: `tools/make-enemies.ts` lays it out from the Tiny Creatures sprites.
 * - `tiles.png`: 16 × 16 tiles in a row: grass, grass with flowers, road, then a terrain tile per type in `TYPES` order (ash, pool,
 *   pylon, rock, grove), all from or in the style of Kenney's Tiny Town (CC0, `tools/kenney/`); then Glowmire's grass, grass with
 *   reeds, cobbled path and water, and a lantern and a glow-mushroom (on a clear background, drawn over the grass); then sixteen road
 *   tiles, each joined to the neighbours that are road too.
 *
 *   node tools/make-art.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { decodePng, encodePng } from "@tsengine/player-node";

import { FORM_IDS, FORMS, SPECIES_IDS } from "../src/rules/species.ts";

const here = dirname(fileURLToPath(import.meta.url));
const assets = join(here, "../assets");

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

/** Each form: its species, with something added that says which way it grew. */
const FORM_EXTRAS: Record<(typeof FORM_IDS)[number], Draw> = {
  blazefang: (c, ox, oy, f) => {
    const t = TONE.ember;
    // A mane of flame spikes and a fang.
    for (const [x, y] of [[1, 6], [2, 4], [10, 6], [9, 4], [3, 2 + f], [8, 2 + f]] as const) c.set(ox + x, oy + y, t.light);
    c.set(ox + 6, oy + 10, WHITE);
  },
  kilnback: (c, ox, oy, f) => {
    const t = TONE.stone;
    // A kiln of a shell on its back, glowing through the cracks.
    c.rect(ox + 2, oy + 3 + f, 3, 3, t.dark);
    c.rect(ox + 3, oy + 4 + f, 1, 1, TONE.ember.light);
    c.rect(ox + 8, oy + 4 + f, 2, 2, t.main);
  },
  tidehound: (c, ox, oy, f) => {
    const t = TONE.tide;
    // A fin on its head and a grin.
    c.rect(ox + 6, oy + 0 + f, 1, 3, t.light);
    c.set(ox + 5, oy + 1 + f, t.light);
    c.set(ox + 5, oy + 9 + f, WHITE);
    c.set(ox + 7, oy + 9 + f, WHITE);
  },
  wellspring: (c, ox, oy, f) => {
    const t = TONE.tide;
    // A spout on its head, drops falling.
    c.rect(ox + 6, oy + 0, 1, 2, t.light);
    c.set(ox + 4, oy + 1 + f, t.light);
    c.set(ox + 8, oy + 2 - f, t.light);
  },
  stormlynx: (c, ox, oy, f) => {
    const t = TONE.volt;
    // Tall tufted ears and a crackle.
    c.rect(ox + 3, oy + 0, 1, 3, t.light);
    c.rect(ox + 9, oy + 0, 1, 3, t.light);
    c.set(ox + 11, oy + 5 + f, WHITE);
    c.set(ox + 10, oy + 6 - f, t.light);
  },
  dynamo: (c, ox, oy, f) => {
    const t = TONE.volt;
    // A coil turning around it.
    for (let a = 0; a < 6; a++) {
      const angle = (a / 6) * Math.PI * 2 + f * 0.5;
      c.set(ox + 6 + Math.cos(angle) * 5.5, oy + 6.5 + Math.sin(angle) * 5, t.light);
    }
  },
  cragjaw: (c, ox, oy, f) => {
    // A jaw of a crack, with teeth.
    c.rect(ox + 3, oy + 9, 6, 1, INK);
    c.set(ox + 4, oy + 9 - f, WHITE);
    c.set(ox + 7, oy + 9 - f, WHITE);
  },
  bastion: (c, ox, oy, f) => {
    const t = TONE.stone;
    // Battlements on top.
    for (const x of [2, 5, 8]) c.rect(ox + x, oy + 1 + f, 2, 2, t.light);
  },
  briarwolf: (c, ox, oy, f) => {
    const t = TONE.bloom;
    // Thorns all round.
    for (const [x, y] of [[1, 7], [11, 7], [2, 4], [10, 4], [6, 11]] as const) c.set(ox + x, oy + y - f * (x % 2), t.dark);
    c.set(ox + 3, oy + 3, t.light);
  },
  elderbloom: (c, ox, oy, f) => {
    // A flower opening on top.
    const petal: Rgb = [0xf0, 0xa0, 0xd0];
    c.set(ox + 6, oy + 1, [0xff, 0xe0, 0x66]);
    for (const [x, y] of [[5, 1], [7, 1], [6, 0], [6, 2]] as const) c.set(ox + x + (f && x === 6 ? 0 : 0), oy + y, petal);
    c.set(ox + 4 - f, oy + 3, TONE.bloom.light);
  },
};

function sheet(name: string, rows: readonly Draw[]): void {
  const c = new Canvas(24, rows.length * 12);
  rows.forEach((draw, row) => {
    for (let f = 0; f < 2; f++) draw(c, f * 12, row * 12, f);
  });
  c.write(name);
}

/** Tile `n` of Kenney's Tiny Town (CC0), as copied into `tools/kenney/`. */
function tinyTown(n: number): { readonly width: number; readonly height: number; readonly rgba: Uint8Array } {
  return decodePng(readFileSync(join(here, "kenney", `tiny-town-${String(n).padStart(4, "0")}.png`)));
}

/** Draw the `w` × `h` part of `img` at (sx, sy) onto `c` at (ox, oy), skipping clear pixels. */
function blit(c: Canvas, img: { readonly width: number; readonly rgba: Uint8Array }, ox: number, oy: number, sx = 0, sy = 0, w = 16, h = 16): void {
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = ((sy + y) * img.width + sx + x) * 4;
      if ((img.rgba[i + 3] ?? 0) === 0) continue;
      c.set(ox + x, oy + y, [img.rgba[i]!, img.rgba[i + 1]!, img.rgba[i + 2]!]);
    }
}

/** Where the road tile for the neighbour mask `mask` is (`pathFrame` in `src/rules/draw.ts`): N 1, E 2, S 4, W 8. */
const PATH_FIRST = 14;

/**
 * Tiny Town's dirt road is drawn for areas two or more tiles wide: an edge piece for each side, an outer corner for each corner, and
 * an inner corner for each bend. The maps' paths are one tile wide, so each path tile is put together from four 8 × 8 quarters, each
 * quarter taken from the piece that fits the two neighbours on its side: grass on both, an outer corner; path on one, that edge;
 * path on both, the inner corner (the tile between them, diagonally, is never path).
 */
function pathTile(c: Canvas, ox: number, mask: number): void {
  const n = (mask & 1) !== 0;
  const e = (mask & 2) !== 0;
  const s = (mask & 4) !== 0;
  const w = (mask & 8) !== 0;
  // For each quarter: [its x and y in the tile, the outer corner, the edge across (path above or below only), the edge along
  // (path beside only), the inner corner], and which two neighbours decide it.
  const quarters = [
    { qx: 0, qy: 0, v: n, h: w, outer: 12, vertical: 24, horizontal: 13, inner: 39 },
    { qx: 8, qy: 0, v: n, h: e, outer: 14, vertical: 26, horizontal: 13, inner: 40 },
    { qx: 0, qy: 8, v: s, h: w, outer: 36, vertical: 24, horizontal: 37, inner: 42 },
    { qx: 8, qy: 8, v: s, h: e, outer: 38, vertical: 26, horizontal: 37, inner: 41 },
  ];
  for (const q of quarters) {
    const piece = q.v && q.h ? q.inner : q.v ? q.vertical : q.h ? q.horizontal : q.outer;
    blit(c, tinyTown(piece), ox + q.qx, q.qy, q.qx, q.qy, 8, 8);
  }
}

function tiles(): void {
  const c = new Canvas(16 * (PATH_FIRST + 16), 16);
  const noise = (x: number, y: number): number => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 9;
  // The day maps' ground is Kenney's Tiny Town (CC0, tools/kenney/): grass, grass with flowers, and the road's middle.
  const grass = tinyTown(0);
  blit(c, grass, 0, 0);
  blit(c, tinyTown(2), 16, 0);
  blit(c, tinyTown(25), 32, 0);
  // The terrain, on grass: an autumn tree (ash, Ember), a pond (pool, Tide), a gold crystal (pylon, Volt), cobbles (rock, Stone)
  // and a green tree (grove, Bloom).
  for (const n of [3, 4, 5, 7]) blit(c, grass, n * 16, 0);
  blit(c, tinyTown(27), 3 * 16, 0);
  blit(c, tinyTown(93), 5 * 16, 0);
  blit(c, tinyTown(43), 6 * 16, 0);
  blit(c, tinyTown(16), 7 * 16, 0);
  // The pond is drawn, in Tiny Town's way (the same dark outline), since the pack has no water.
  const OUTLINE: Rgb = [0x3f, 0x26, 0x31];
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const d = Math.hypot((x + 0.5 - 8) / 6.5, (y + 0.5 - 8.5) / 5.5);
      if (d > 1) continue;
      const rim = d > 0.82;
      c.set(4 * 16 + x, y, rim ? OUTLINE : (x + y * 2) % 7 === 0 && d < 0.7 ? TONE.tide.light : y < 7 ? TONE.tide.main : TONE.tide.dark);
    }
  for (let mask = 0; mask < 16; mask++) pathTile(c, (PATH_FIRST + mask) * 16, mask);
  // Glowmire, a bog at night: cooler, bluer grass (the light map darkens it further), cobbles, and water with ripple lines.
  const BOG: Rgb = [0x2a, 0x40, 0x44];
  const BOG_DARK: Rgb = [0x22, 0x34, 0x3a];
  const REED: Rgb = [0x4a, 0x6a, 0x58];
  const REED_TIP: Rgb = [0x7a, 0x5a, 0x3a];
  const COBBLE: Rgb = [0x6a, 0x6e, 0x7a];
  const COBBLE_LIGHT: Rgb = [0x84, 0x88, 0x94];
  const MORTAR: Rgb = [0x3c, 0x3e, 0x4a];
  const WATER: Rgb = [0x1e, 0x46, 0x6e];
  const WATER_DEEP: Rgb = [0x18, 0x38, 0x5a];
  const RIPPLE: Rgb = [0x4a, 0x7e, 0xaa];
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const n = noise(x, y);
      const edge = x === 15 || y === 15;
      c.set(128 + x, y, edge || n === 0 ? BOG_DARK : BOG);
      c.set(144 + x, y, edge || n === 0 ? BOG_DARK : BOG);
      // Cobbles: a brick bond of 5 × 4 stones, each lit on its top-left.
      const row = Math.floor(y / 4);
      const sx = (x + (row % 2) * 2) % 5;
      const sy = y % 4;
      c.set(160 + x, y, sx === 4 || sy === 3 ? MORTAR : sx === 0 || sy === 0 ? COBBLE_LIGHT : n === 0 ? MORTAR : COBBLE);
      c.set(176 + x, y, (x + y * 3) % 11 === 0 ? WATER_DEEP : WATER);
    }
  for (const [x, y, h] of [
    [3, 12, 6],
    [5, 13, 8],
    [7, 12, 5],
    [11, 10, 6],
    [12, 11, 7],
  ] as const) {
    c.rect(144 + x, y - h, 1, h, REED);
    c.rect(144 + x, y - h - 2, 1, 2, REED_TIP);
  }
  for (const [x, y, w] of [
    [2, 3, 5],
    [9, 6, 4],
    [4, 10, 6],
    [11, 13, 3],
  ] as const)
    c.rect(176 + x, y, w, 1, RIPPLE);

  // A lantern on a post: its glass is what the light seems to come from.
  const POST: Rgb = [0x3a, 0x2e, 0x2a];
  const BRASS: Rgb = [0x9a, 0x7a, 0x3a];
  const GLASS: Rgb = [0xff, 0xd8, 0x80];
  const FLAME: Rgb = [0xff, 0xf6, 0xd0];
  c.rect(192 + 7, 7, 2, 8, POST);
  c.rect(192 + 5, 14, 6, 1, POST);
  c.rect(192 + 5, 2, 6, 1, BRASS);
  c.rect(192 + 5, 3, 6, 4, GLASS);
  c.rect(192 + 5, 3, 1, 4, BRASS);
  c.rect(192 + 10, 3, 1, 4, BRASS);
  c.rect(192 + 7, 4, 2, 2, FLAME);
  c.rect(192 + 6, 7, 4, 1, BRASS);
  c.set(192 + 7, 1, BRASS);
  c.set(192 + 8, 1, BRASS);

  // Glow-mushrooms: a tall one and a small one, teal caps with pale spots.
  const STEM: Rgb = [0xc8, 0xd8, 0xd0];
  const CAP: Rgb = [0x3a, 0xd8, 0xc0];
  const CAP_DARK: Rgb = [0x22, 0x90, 0x88];
  const SPOT: Rgb = [0xd0, 0xff, 0xf4];
  c.rect(208 + 5, 7, 2, 7, STEM);
  c.disc(208 + 6, 5.5, 3.6, CAP);
  c.rect(208 + 2, 7, 9, 1, CAP_DARK);
  c.set(208 + 4, 4, SPOT);
  c.set(208 + 7, 3, SPOT);
  c.set(208 + 8, 5, SPOT);
  c.rect(208 + 11, 11, 1, 3, STEM);
  c.disc(208 + 11.5, 10.5, 2, CAP);
  c.set(208 + 11, 10, SPOT);
  c.write("tiles.png");
}

sheet("creatures.png", [
  ...SPECIES_IDS.map((id) => CREATURES[id]),
  ...FORM_IDS.map((id): Draw => (c, ox, oy, f) => {
    CREATURES[FORMS[id].species](c, ox, oy, f);
    FORM_EXTRAS[id](c, ox, oy, f);
  }),
]);
tiles();
console.log(`wrote creatures.png and tiles.png to ${assets}`);
