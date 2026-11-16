/**
 * Writes the game's sound effects into `assets/` as small 16-bit mono WAVs, made from sweeps, notes and filtered noise: no
 * recorded or downloaded sound. Run it again after changing one; the files are committed.
 *
 *   node tools/make-sounds.ts
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const assets = join(dirname(fileURLToPath(import.meta.url)), "../assets");
const RATE = 22050;

function wav(samples: Float32Array): Buffer {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i] ?? 0)) * 32767), i * 2);
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const square = (phase: number): number => (phase % 1 < 0.5 ? 1 : -1);
const triangle = (phase: number): number => 1 - 4 * Math.abs((phase % 1) - 0.5);
const sine = (phase: number): number => Math.sin(phase * 2 * Math.PI);

let seed = 7;
const random = (): number => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return (seed / 4294967296) * 2 - 1;
};

/** A tone gliding from `from` to `to` Hz, fading out. */
function sweep(seconds: number, from: number, to: number, shape: (p: number) => number, volume: number, decay = 4): Float32Array {
  const n = Math.round(seconds * RATE);
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    phase += (from + (to - from) * t) / RATE;
    out[i] = shape(phase) * volume * Math.exp(-decay * t) * Math.min(1, i / 40);
  }
  return out;
}

/** Noise through a one-pole low-pass (`lowpass` near 0 is dull, near 1 bright), fading out. */
function noise(seconds: number, volume: number, lowpass: number): Float32Array {
  const n = Math.round(seconds * RATE);
  const out = new Float32Array(n);
  let last = 0;
  for (let i = 0; i < n; i++) {
    last += (random() - last) * lowpass;
    out[i] = last * volume * (1 - i / n) ** 2;
  }
  return out;
}

/** Notes one after another, `[hz, seconds]` each. */
function notes(list: readonly (readonly [number, number])[], shape: (p: number) => number, volume: number): Float32Array {
  const total = list.reduce((a, [, s]) => a + s, 0);
  const out = new Float32Array(Math.round(total * RATE) + 400);
  let at = 0;
  for (const [hz, seconds] of list) {
    sweep(seconds * 1.5, hz, hz, shape, volume, 3).forEach((v, i) => {
      const j = Math.round(at * RATE) + i;
      if (j < out.length) out[j] = (out[j] ?? 0) + v;
    });
    at += seconds;
  }
  return out;
}

const mix = (...parts: Float32Array[]): Float32Array => {
  const out = new Float32Array(Math.max(...parts.map((p) => p.length)));
  for (const p of parts) p.forEach((v, i) => (out[i] = (out[i] ?? 0) + v));
  return out;
};

const SOUNDS: Record<string, Float32Array> = {
  /** A hit lands: a short blip. */
  "hit.wav": sweep(0.06, 900, 500, square, 0.18, 6),
  /** An area lands: a soft thump with a little hiss. */
  "area.wav": mix(sweep(0.18, 180, 60, sine, 0.5, 5), noise(0.15, 0.25, 0.3)),
  /** A combo: two bright notes up. */
  "combo.wav": notes(
    [
      [988, 0.05],
      [1319, 0.08],
    ],
    square,
    0.16
  ),
  /** A buff: a rising shimmer. */
  "buff.wav": sweep(0.3, 400, 900, triangle, 0.25, 2),
  /** An enemy dies: a puff. */
  "die.wav": noise(0.12, 0.35, 0.5),
  /** An enemy gets through: a falling buzz. */
  "leak.wav": sweep(0.35, 300, 90, square, 0.22, 2),
  /** A level-up: a quick arpeggio up. */
  "level.wav": notes(
    [
      [523, 0.06],
      [659, 0.06],
      [784, 0.06],
      [1047, 0.12],
    ],
    triangle,
    0.25
  ),
  /** A wave starts: a low horn. */
  "wave.wav": notes(
    [
      [196, 0.15],
      [262, 0.3],
    ],
    square,
    0.15
  ),
  /** A creature is taken or placed: a chime. */
  "pick.wav": notes(
    [
      [784, 0.06],
      [1175, 0.12],
    ],
    sine,
    0.3
  ),
};

for (const [name, samples] of Object.entries(SOUNDS)) writeFileSync(join(assets, name), wav(samples));
console.log(`wrote ${Object.keys(SOUNDS).length} sounds to ${assets}`);
