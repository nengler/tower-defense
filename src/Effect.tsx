import { Entity, Line, Shape, useMutable, useUpdate } from "@tsengine/runtime/jsx";

import { MOVES, type MoveId } from "./rules/moves.ts";
import { TYPE_COLOR } from "./rules/types.ts";

/** Seconds an effect stays on screen. */
const SHOWN = 0.25;

interface EffectProps {
  id: number;
  move: MoveId;
  fromX: number;
  fromY: number;
  x: number;
  y: number;
  /** The area it covered; 0 for a hit. */
  radius: number;
  /** It has been shown: take it away. */
  onDone: (id: number) => void;
}

/**
 * A move landing, for the eye only (the move itself was sent to what it landed on): a line from the creature to its target for a
 * hit, a disc for an area, fading out.
 */
export function Effect({ id, move, fromX, fromY, x, y, radius, onDone }: EffectProps) {
  const s = useMutable({ t: 0 });
  const tint = TYPE_COLOR[MOVES[move].type];
  const left = Math.max(0, 1 - s.t / SHOWN);

  useUpdate((dt) => {
    if (s.t >= SHOWN) {
      onDone(id);
      return;
    }
    s.t += dt;
  });

  return (
    <Entity>
      {radius > 0 ? (
        <Shape kind="circle" width={radius * 2} height={radius * 2} x={x - radius} y={y - radius} color={tint} opacity={0.45 * left} />
      ) : (
        <Line x={fromX} y={fromY} x2={x} y2={y} color={tint} opacity={left} />
      )}
    </Entity>
  );
}
