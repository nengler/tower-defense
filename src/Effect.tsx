import { Collider, Entity, Shape, useMutable, useUpdate } from "@rge/runtime/jsx";

import type { Aura, Blast } from "./battle.ts";
import { fadeColor } from "./rules/draw.ts";
import { MOVES, type MoveId } from "./rules/moves.ts";
import { TYPE_COLOR } from "./rules/types.ts";

/** Seconds an effect stays on screen. */
const SHOWN = 0.25;

interface EffectProps {
  id: number;
  kind: "blast" | "aura";
  move: MoveId;
  fromX: number;
  fromY: number;
  x: number;
  y: number;
  radius: number;
  blast: Blast;
  aura: Aura;
  /** It has been shown: take it away. */
  onDone: (id: number) => void;
}

/**
 * A move landing. For its first step it is a collider: a `blast` every enemy it touches decides about (see `Enemy`), or an `aura`
 * every ally it touches decides about (see `Creature`). Then it fades: a line from the creature to its target for a hit, a disc for
 * an area.
 */
export function Effect({ id, kind, move, fromX, fromY, x, y, radius, blast, aura, onDone }: EffectProps) {
  const s = useMutable({ t: 0 });
  const tint = TYPE_COLOR[MOVES[move].type];
  // The collider's box covers the circle, and the box of an enemy whose middle is in it.
  const box = radius + 6;

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
        <Shape
          kind="circle"
          width={radius * 2}
          height={radius * 2}
          x={x - radius}
          y={y - radius}
          color={fadeColor(tint, 0.45, s.t, SHOWN)}
        />
      ) : (
        <Entity x={fromX} y={fromY} rotation={Math.atan2(y - fromY, x - fromX)}>
          <Shape kind="rect" width={Math.hypot(x - fromX, y - fromY)} height={1} y={-0.5} color={fadeColor(tint, 1, s.t, SHOWN)} />
        </Entity>
      )}
      {s.t === 0 && kind === "blast" && (
        <Collider width={box * 2} height={box * 2} x={x - box} y={y - box} tag="blast" layer="blast" hits={["enemy"]} data={blast} />
      )}
      {s.t === 0 && kind === "aura" && (
        <Collider width={box * 2} height={box * 2} x={x - box} y={y - box} tag="aura" layer="aura" hits={["ally"]} data={aura} />
      )}
    </Entity>
  );
}
