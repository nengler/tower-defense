import assert from "node:assert/strict";
import { test } from "node:test";

import { MAP_IDS } from "../src/rules/map.ts";
import { packColor, PALETTE_RULES, PALETTES, paletteParams } from "../src/rules/palette.ts";

const channels = (hex: string): [number, number, number] => {
  const n = packColor(hex);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** WCAG relative luminance, and the contrast of two colours. */
const luminance = (hex: string) => {
  const [r, g, b] = channels(hex).map(linear) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (x: string, y: string) => {
  const [a, b] = [luminance(x), luminance(y)].sort((p, q) => q - p) as [number, number];
  return (a + 0.05) / (b + 0.05);
};

/** OKLCH: lightness, chroma and hue (degrees). */
function oklch(hex: string): { L: number; C: number; H: number } {
  const [r, g, b] = channels(hex).map(linear) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.hypot(A, B), H: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
}

for (const map of MAP_IDS) {
  const p = PALETTES[map];
  const mids = [p.cool, p.green, p.warm];

  test(`${map}'s palette: each mid colour and white stand out from the background`, () => {
    for (const c of [...mids, p.white]) assert.ok(contrast(c, p.bg) >= PALETTE_RULES.minContrast, `${c} on ${p.bg}: ${contrast(c, p.bg).toFixed(2)}:1`);
  });

  test(`${map}'s palette: the three mid hues are far apart, and alike in colourfulness`, () => {
    const hues = mids.map((c) => oklch(c).H).sort((a, b) => a - b) as [number, number, number];
    const gaps = [hues[1] - hues[0], hues[2] - hues[1], 360 - hues[2] + hues[0]];
    assert.ok(Math.min(...gaps) >= PALETTE_RULES.minHueGap, `hue gaps ${gaps.map(Math.round).join(", ")}`);
    const chroma = mids.map((c) => oklch(c).C);
    assert.ok(Math.max(...chroma) - Math.min(...chroma) <= PALETTE_RULES.maxChromaSpread, `chroma ${chroma.map((c) => c.toFixed(3)).join(", ")}`);
  });

  test(`${map}'s palette: lightness steps up from cool to green to warm, so the colours stay apart without their hues`, () => {
    const [cool, green, warm] = mids.map((c) => oklch(c).L) as [number, number, number];
    assert.ok(green - cool >= PALETTE_RULES.minLightnessStep, `cool ${cool.toFixed(2)}, green ${green.toFixed(2)}`);
    assert.ok(warm - green >= PALETTE_RULES.minLightnessStep, `green ${green.toFixed(2)}, warm ${warm.toFixed(2)}`);
  });
}

test("the shader's params: five colours packed exactly, then the cuts in order", () => {
  const params = paletteParams("meadow");
  assert.equal(params.length, 8, "a layer takes eight numbers");
  assert.equal(params[0], 0x0c0f1b);
  for (const v of params.slice(0, 5)) assert.equal(Math.fround(v), v, "exact in a 32-bit float");
  assert.ok(params[5]! < params[6]! && params[6]! < params[7]!);
});
