/**
 * Draws the game's pixel art into `assets/`, in code: no drawn or downloaded images. Run it again after changing a sprite; the
 * files are committed.
 *
 * - `creatures.png`: 12 × 12 frames, two to a row (an idle bob), one row a species in `SPECIES_IDS` order, then one a form in
 *   `FORM_IDS` order (each form is its species drawn again, with something added).
 * - `enemies.png`: 12 × 12 frames, two to a row (a walk), one row a kind in `ENEMY_KINDS` order.
 * - `tiles.png`: 16 × 16 tiles in a row: grass, grass with a tuft, path, then a terrain tile per type in `TYPES` order (ash, pool,
 *   pylon, rock, grove).
 *
 *   node tools/make-art.ts
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { encodePng } from "@tsengine/player-node";

import { ENEMY_KINDS } from "../src/rules/enemies.ts";
import { FORM_IDS, FORMS, SPECIES_IDS } from "../src/rules/species.ts";

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

/** Each enemy kind, likewise; `frame` 1 is the other step of the walk. */
const ENEMIES: Record<(typeof ENEMY_KINDS)[number], Draw> = {
  crawler: (c, ox, oy, f) => {
    const t = TONE.bloom;
    // A beetle with six legs taking turns.
    for (const x of [3, 6, 9]) c.set(ox + x, oy + 10 - ((x / 3 + f) % 2), t.dark);
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
  sprinter: (c, ox, oy, f) => {
    const t = TONE.volt;
    // A lean dart, streaks behind it.
    c.disc(ox + 7, oy + 6, 2.5, t.dark);
    c.disc(ox + 7, oy + 5.8, 2, t.main);
    c.rect(ox + 1, oy + 5, 3, 1, t.light);
    c.rect(ox + 2 + f, oy + 7, 2, 1, t.light);
    c.set(ox + 6 + f, oy + 9, t.dark);
    c.set(ox + 8 - f, oy + 9, t.dark);
    c.set(ox + 8, oy + 5, INK);
  },
  cleanser: (c, ox, oy, f) => {
    const t = TONE.tide;
    // A jelly with a ring of foam, its fringe swaying.
    c.disc(ox + 6, oy + 5, 3.6, t.dark);
    c.disc(ox + 6, oy + 4.6, 3, t.light);
    for (const x of [3, 5, 7, 9]) c.rect(ox + x, oy + 8, 1, 2 + ((x + f) % 2), t.main);
    c.set(ox + 5, oy + 4, INK);
    c.set(ox + 7, oy + 4, INK);
  },
  brood: (c, ox, oy, f) => {
    const t = TONE.ember;
    // A sac full of mites.
    c.disc(ox + 6, oy + 6, 4.5, t.dark);
    c.disc(ox + 6, oy + 5.6, 3.9, t.main);
    for (const [x, y] of [[4, 4], [7, 5], [5, 7], [8, 7]] as const) c.set(ox + x + f * ((x + y) % 2), oy + y, t.light);
    c.set(ox + 3 + f, oy + 11, t.dark);
    c.set(ox + 9 - f, oy + 11, t.dark);
  },
  burrower: (c, ox, oy, f) => {
    const t = TONE.stone;
    // A mole with big claws.
    c.disc(ox + 6, oy + 6.5, 3.8, t.dark);
    c.disc(ox + 6, oy + 6, 3.2, t.main);
    c.rect(ox + 9, oy + 8 - f, 2, 2, t.light);
    c.rect(ox + 1, oy + 8 + f - 1, 2, 2, t.light);
    c.set(ox + 8, oy + 5, INK);
    c.set(ox + 10, oy + 6, [0xf0, 0xa0, 0xa0]);
  },
  jammer: (c, ox, oy, f) => {
    const t = TONE.volt;
    // A box on legs with an antenna that blinks.
    c.rect(ox + 3, oy + 4, 6, 5, t.dark);
    c.rect(ox + 4, oy + 5, 4, 3, t.main);
    c.rect(ox + 6, oy + 1, 1, 3, INK);
    c.set(ox + 6, oy + 0, f ? WHITE : t.light);
    c.set(ox + 4 + f, oy + 10, t.dark);
    c.set(ox + 7 - f, oy + 10, t.dark);
    c.set(ox + 7, oy + 6, INK);
  },
  shepherd: (c, ox, oy, f) => {
    const t = TONE.bloom;
    // A woolly walker with a crook.
    c.disc(ox + 6, oy + 6, 4, t.light);
    c.disc(ox + 5, oy + 5, 2, WHITE);
    c.disc(ox + 9, oy + 5, 1.6, t.dark);
    c.set(ox + 10, oy + 5, INK);
    c.rect(ox + 1, oy + 2, 1, 7, t.dark);
    c.set(ox + 2, oy + 2, t.dark);
    c.set(ox + 4 + f, oy + 10, t.dark);
    c.set(ox + 8 - f, oy + 10, t.dark);
  },
  mosshorn: (c, ox, oy, f) => {
    const t = TONE.stone;
    // A horned beast with moss on its back.
    c.disc(ox + 6, oy + 6.5, 5, t.dark);
    c.disc(ox + 6, oy + 6, 4.4, t.main);
    c.rect(ox + 3, oy + 2, 5, 2, TONE.bloom.main);
    c.set(ox + 4, oy + 1, TONE.bloom.light);
    c.rect(ox + 10, oy + 3, 1, 3, WHITE);
    c.set(ox + 11, oy + 2, WHITE);
    c.set(ox + 9, oy + 6, INK);
    c.rect(ox + 3 + f, oy + 10, 2, 2, t.dark);
    c.rect(ox + 7 - f, oy + 10, 2, 2, t.dark);
  },
  prism: (c, ox, oy, f) => {
    // A crystal with a facet of every type.
    const order = [TONE.ember, TONE.tide, TONE.volt, TONE.stone, TONE.bloom];
    for (let y = 0; y < 11; y++) {
      const w = 5 - Math.abs(5 - y);
      for (let x = -w; x <= w; x++) c.set(ox + 6 + x, oy + y + 0.5, order[(Math.abs(x) + y + f) % 5]!.main);
    }
    c.set(ox + 6, oy + 2, WHITE);
    c.set(ox + 5, oy + 5, INK);
    c.set(ox + 7, oy + 5, INK);
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
  const c = new Canvas(128, 16);
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
  // The terrain: grass underneath (the same dark edge), with each type's ground on it.
  const terrain = (n: number, draw: (x: number, y: number) => Rgb | null) => {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const edge = x === 15 || y === 15;
        c.set(n * 16 + x, y, edge ? GRASS_DARK : (draw(x, y) ?? GRASS));
      }
  };
  // Ash: dark ground with glowing cracks.
  terrain(3, (x, y) => ((x * 3 + y * 5) % 11 === 0 ? TONE.ember.main : noise(x, y) < 2 ? [0x3a, 0x2a, 0x26] : [0x2e, 0x24, 0x22]));
  // Pool: water with a light ripple, a grass rim.
  terrain(4, (x, y) => {
    if (x < 2 || y < 2 || x > 12 || y > 12) return null;
    return (x + y * 2) % 7 === 0 ? TONE.tide.light : TONE.tide.dark;
  });
  // Pylon: a crystal standing in the grass.
  terrain(5, (x, y) => {
    const w = 3 - Math.abs(7 - y) / 2;
    if (y >= 3 && y <= 12 && Math.abs(x - 7) <= w) return x <= 7 ? TONE.volt.light : TONE.volt.main;
    return null;
  });
  // Rock: a few stones.
  terrain(6, (x, y) => {
    const stone = (cx: number, cy: number, r: number) => Math.hypot(x - cx, y - cy) <= r;
    if (stone(5, 6, 3.2) || stone(10, 10, 2.6) || stone(11, 4, 1.8)) return noise(x, y) < 3 ? TONE.stone.light : TONE.stone.main;
    return null;
  });
  // Grove: lush grass with flowers.
  terrain(7, (x, y) => {
    if ((x === 4 && y === 4) || (x === 11 && y === 9) || (x === 6 && y === 11)) return [0xf0, 0xa0, 0xd0];
    return noise(x, y) < 4 ? TONE.bloom.dark : [0x2a, 0x5a, 0x34];
  });
  c.write("tiles.png");
}

sheet("creatures.png", [
  ...SPECIES_IDS.map((id) => CREATURES[id]),
  ...FORM_IDS.map((id): Draw => (c, ox, oy, f) => {
    CREATURES[FORMS[id].species](c, ox, oy, f);
    FORM_EXTRAS[id](c, ox, oy, f);
  }),
]);
sheet(
  "enemies.png",
  ENEMY_KINDS.map((k) => ENEMIES[k])
);
tiles();
console.log(`wrote creatures.png, enemies.png and tiles.png to ${assets}`);
