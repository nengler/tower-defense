import { Entity, Layer, Light, Lighting, nearby, Shape, useMutable, useUpdate } from "@tsengine/runtime/jsx";

import type { Placed } from "./battle.ts";
import { centre, FIELD_HEIGHT, mapOf } from "./rules/map.ts";
import { MOVES } from "./rules/moves.ts";
import { TYPE_COLOR, type Type } from "./rules/types.ts";

/** A creature as the night sees it: where it stands and the colour of its light. */
export interface Glow {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly type: Type;
}

interface NightProps {
  /** The map's id (see `mapOf`). */
  map: string;
  creatures: readonly Glow[];
  /** Moves landing now: each lights up where it lands, in its type's colour. */
  effects: readonly Placed[];
}

/** Fireflies: each drifts around its own home on a slow loop, and blinks. */
const FIREFLIES = Array.from({ length: 9 }, (_, i) => ({
  id: i,
  x: 20 + ((i * 97) % 290),
  y: 12 + ((i * 53) % 120),
  speed: 0.35 + (i % 4) * 0.12,
  phase: i * 1.7,
}));

/**
 * The night over a dark map, drawn after the world it covers. Mist drifts over it all (`fog.glsl`), then the light map
 * (`<Lighting>`, through `night.glsl`) darkens everything to a moonlit blue except where a light reaches: the lanterns (which flicker)
 * and the glow-mushrooms (which breathe), a light around every creature in its type's colour, a dim one on every enemy (so a crowd
 * in the dark can still be seen coming), a flash where each move lands, and fireflies. Light laid on by multiplying can only bring
 * the picture back to its own colours, so a glow layer adds the brightest of them (lanterns, mushrooms, moves, fireflies) on top,
 * past them.
 */
/** How strong the glow layer's lights are, against their lights in the light map. */
const GLOW = 0.45;

/** A lantern's flame at time `t`: two waves out of step, so no two lanterns (`i`) flicker alike. */
const flicker = (t: number, i: number) => 0.82 + 0.1 * Math.sin(t * 9.1 + i * 2.3) * Math.sin(t * 5.7 + i);

/** Each map's lanterns and mushrooms as lights: where, and a number that sets each one's own rhythm. */
const lampsOf = (tiles: readonly (readonly [number, number])[]) => tiles.map(([col, row], i) => ({ id: i, x: centre(col, row).x, y: centre(col, row).y }));

export function Night({ map, creatures, effects }: NightProps) {
  const lanterns = lampsOf(mapOf(map).lanterns);
  const mushrooms = lampsOf(mapOf(map).mushrooms);
  const s = useMutable({
    t: 0,
    /** Where each enemy is, read from their colliders each step. */
    enemies: [] as readonly { readonly id: number; readonly x: number; readonly y: number }[],
  });
  useUpdate((dt) => {
    s.t += dt;
    s.enemies = nearby("enemy", 160, FIELD_HEIGHT / 2, 400).map((e) => ({ id: e.data.id, x: e.data.x, y: e.data.y }));
  });

  return (
    <Entity>
      <Layer shader="fog.glsl" params={[0.3]}>
        <Shape kind="rect" width={320} height={FIELD_HEIGHT} color="#c8d0ff" opacity={0.06} />
      </Layer>
      <Lighting ambient="#464a80" shader="night.glsl" params={[6, 0.7]}>
        {lanterns.map((l) => (
          <Light key={`l${l.id}`} radius={44} color="#ffc070" intensity={flicker(s.t, l.id)} x={l.x} y={l.y - 4} />
        ))}
        {mushrooms.map((m) => (
          <Light key={`m${m.id}`} radius={22} color="#50f0d0" intensity={0.5 + 0.2 * Math.sin(s.t * 1.4 + m.id * 1.9)} x={m.x} y={m.y} />
        ))}
        {creatures.map((c) => (
          <Light key={`c${c.id}`} radius={30} color={TYPE_COLOR[c.type]} intensity={0.6} x={c.x} y={c.y} />
        ))}
        {s.enemies.map((e) => (
          <Light key={`e${e.id}`} radius={12} color="#ffb0a0" intensity={0.45} x={e.x} y={e.y} />
        ))}
        {effects.map((e) => (
          <Light key={`f${e.id}`} radius={Math.max(18, e.radius * 1.5)} color={TYPE_COLOR[MOVES[e.move].type]} intensity={0.9} x={e.x} y={e.y} />
        ))}
        {FIREFLIES.map((f) => (
          <Light
            key={`ff${f.id}`}
            radius={7}
            color="#e8ff8a"
            intensity={Math.max(0, Math.sin(s.t * 1.3 + f.phase))}
            x={f.x + 14 * Math.sin(s.t * f.speed + f.phase)}
            y={f.y + 8 * Math.sin(s.t * f.speed * 1.7 + f.phase)}
          />
        ))}
      </Lighting>
      {/* Its lights are dimmed (GLOW) rather than the layer made translucent: the software renderer lays a translucent add layer over as a
          normal one, which would show each light's dark edge. */}
      <Layer blend="add" childBlend="add">
        {lanterns.map((l) => (
          <Light key={`gl${l.id}`} radius={20} color="#ffb060" intensity={GLOW * flicker(s.t, l.id)} x={l.x} y={l.y - 5} />
        ))}
        {mushrooms.map((m) => (
          <Light key={`gm${m.id}`} radius={10} color="#40e0c0" intensity={GLOW * (0.5 + 0.2 * Math.sin(s.t * 1.4 + m.id * 1.9))} x={m.x} y={m.y - 2} />
        ))}
        {effects.map((e) => (
          <Light key={`gf${e.id}`} radius={Math.max(10, e.radius)} color={TYPE_COLOR[MOVES[e.move].type]} intensity={GLOW * 0.8} x={e.x} y={e.y} />
        ))}
        {FIREFLIES.map((f) => (
          <Light
            key={`gff${f.id}`}
            radius={3}
            color="#f4ff9a"
            intensity={GLOW * Math.max(0, Math.sin(s.t * 1.3 + f.phase))}
            x={f.x + 14 * Math.sin(s.t * f.speed + f.phase)}
            y={f.y + 8 * Math.sin(s.t * f.speed * 1.7 + f.phase)}
          />
        ))}
      </Layer>
    </Entity>
  );
}
