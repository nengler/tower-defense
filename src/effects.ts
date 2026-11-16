import { createParticles, createSounds } from "@tsengine/runtime";

/**
 * The game's one-off effects, kept like a toast library's store and called from handlers: sounds (`sfx.play("hit")`, made by
 * `tools/make-sounds.ts`) and particles (`fx.burst("die", x, y)`, drawn by the `<ParticleLayer>` in `Play`). A sound marked `once`
 * plays once a step however often it is asked for, so a pack of mites dying together is one puff, not twenty.
 */
const store = createSounds({
  hit: { src: "hit.wav", once: true, volume: 0.6 },
  area: { src: "area.wav", once: true },
  combo: { src: "combo.wav", once: true },
  buff: { src: "buff.wav", once: true },
  die: { src: "die.wav", once: true, volume: 0.7 },
  leak: { src: "leak.wav", once: true },
  level: { src: "level.wav", once: true },
  wave: "wave.wav",
  pick: "pick.wav",
});

/** The master volume, 0 to 1: the settings screen's volume (`changeVolume`). */
let master = 0.8;
export function setVolume(volume: number): void {
  master = Math.min(1, Math.max(0, volume));
}

/** Play a sound at the master volume. `sfx.plays(name)` is how many times it was played (what a test checks). */
export const sfx = {
  play: (name: Parameters<typeof store.play>[0]) => store.play(name, master),
  plays: (name: Parameters<typeof store.plays>[0]) => store.plays(name),
};

export const fx = createParticles({
  /** Where an enemy dies: a puff of bits, in its type's colour (`fx.burst("die", x, y, { color })`) fading to grey. */
  die: { burst: 7, lifetime: 0.35, speed: 40, spread: 180, size: 2, shrink: true, color: "#fff1d6", endColor: "#7a6a8a", max: 120 },
  /** A combo landing: a bright spark. */
  combo: { burst: 5, lifetime: 0.3, speed: 55, spread: 180, size: 2, fade: true, color: "#ffe066", max: 60 },
});
