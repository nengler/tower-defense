import type { MapId } from "./map.ts";

/**
 * Each map's palette, applied to the whole battle by `assets/palette.glsl` (`Play`): every pixel becomes one of these, by lightness
 * and hue, in the manner of City of None. A dark background (the map's mood), three mid colours (cool, green, warm) for the world
 * and what is in it, and white for what matters most.
 *
 * The colours are chosen to `PALETTE_RULES`, which `test/palette.test.ts` checks: each mid colour stands out from the background,
 * the three hues are far apart (a Tide thing, a Bloom thing and an Ember thing never look alike), their colourfulness is alike (none
 * shouts over the others), and their lightness steps up from cool to warm, so they stay apart for a player who cannot tell the hues.
 */
export interface Palette {
  readonly bg: string;
  readonly cool: string;
  readonly green: string;
  readonly warm: string;
  readonly white: string;
  /** OKLab lightness: below `bg` is background, below `texture` a shade above it, from `white` up white. */
  readonly cuts: { readonly bg: number; readonly texture: number; readonly white: number };
}

export const PALETTE_RULES = {
  /** WCAG contrast of each mid colour against the background. */
  minContrast: 3,
  /** Degrees of OKLCH hue between any two of the mid colours. */
  minHueGap: 75,
  /** How far apart (OKLCH chroma) the mid colours' colourfulness may be. */
  maxChromaSpread: 0.01,
  /** OKLab lightness between the mid colours, in the order cool, green, warm. */
  minLightnessStep: 0.06,
} as const;

const DAY = { bg: 0.39, texture: 0.47, white: 0.8 } as const;

export const PALETTES: Readonly<Record<MapId, Palette>> = {
  /** Navy, with blue, green and sand. */
  meadow: { bg: "#0c0f1b", cool: "#2f679d", green: "#47996e", warm: "#d4aa60", white: "#fffef8", cuts: DAY },
  /** Slate greys, with blue, sage and sand. */
  riverbend: { bg: "#3e4456", cool: "#7097c0", green: "#7fb899", warm: "#d9ba88", white: "#f6f6f2", cuts: DAY },
  /** City of None's Outskirts Station: brown, with blue, jade and its olive. */
  gauntlet: { bg: "#2e1a18", cool: "#406ea8", green: "#249b86", warm: "#beb461", white: "#fffcf2", cuts: DAY },
  /** Night: violet, with violet, teal and gold; its cuts are lower, since the light map darkens it. */
  glowmire: { bg: "#150f22", cool: "#615ca3", green: "#2a9b7c", warm: "#daa75d", white: "#f6f0fa", cuts: { bg: 0.16, texture: 0.24, white: 0.8 } },
};

/** A `#rrggbb` colour as one number, r × 65536 + g × 256 + b: exact in a float, so a shader can unpack it. */
export function packColor(hex: string): number {
  return parseInt(hex.slice(1, 7), 16);
}

/** `palette.glsl`'s params for a map: the five colours packed, then the three cuts. */
export function paletteParams(map: MapId): number[] {
  const p = PALETTES[map];
  return [packColor(p.bg), packColor(p.cool), packColor(p.green), packColor(p.warm), packColor(p.white), p.cuts.bg, p.cuts.texture, p.cuts.white];
}
