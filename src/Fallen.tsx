import { Layer, Sprite, useMutable, useUpdate } from "@tsengine/runtime/jsx";

import { rgbOf } from "./rules/draw.ts";

/** Seconds an enemy takes to crumble away. */
export const FALL_TIME = 0.4;

interface FallenProps {
  id: number;
  /** Its row in `assets/enemies.png` (its kind's place in `ENEMY_KINDS`). */
  row: number;
  x: number;
  y: number;
  scale: number;
  /** Its type's colour: the crumbling edge burns in it. */
  color: string;
  /** It is gone: take it away. */
  onDone: (id: number) => void;
}

/**
 * An enemy that has just died, for the eye only: its sprite stays where it fell and crumbles away pixel by pixel (`dissolve.glsl`),
 * the edge glowing in its type's colour, drifting up a little as it goes. Where shaders do not run it fades out instead.
 */
export function Fallen({ id, row, x, y, scale, color, onDone }: FallenProps) {
  const s = useMutable({ t: 0 });
  const [r, g, b] = rgbOf(color);
  const progress = Math.min(1, s.t / FALL_TIME);

  useUpdate((dt) => {
    if (s.t >= FALL_TIME) {
      onDone(id);
      return;
    }
    s.t += dt;
  });

  return (
    <Layer shader="dissolve.glsl" params={[progress, r, g, b]} opacity={1 - progress * progress}>
      <Sprite
        image="enemies.png"
        frameWidth={16}
        frameHeight={16}
        frame={row * 2}
        originX={8}
        originY={9}
        scaleX={scale}
        scaleY={scale}
        x={x}
        y={y - 4 * progress}
      />
    </Layer>
  );
}
