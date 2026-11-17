import { Entity, send, Shape, useMutable, useUpdate } from "@tsengine/runtime/jsx";

import { PLAIN_BLAST } from "./battle.ts";
import { LINGER, MARK_COLOR, MARKS, PULSE, type MarkKind } from "./rules/marks.ts";
import { centre, TILE } from "./rules/map.ts";
import type { Type } from "./rules/types.ts";

/** The type a mark's statuses count as, for the type factor of its burn. */
const MARK_TYPE: Readonly<Record<MarkKind, Type>> = { puddle: "tide", embers: "ember", spores: "bloom" };

interface MarkProps {
  id: number;
  col: number;
  row: number;
  kind: MarkKind;
  /** The creature that laid it, its type, and its burn a second (its attack in it). */
  from: number;
  userType: Type;
  burn: number;
  /** It has run out: take it away. */
  onDone: (id: number) => void;
}

/**
 * A mark on a path tile (`rules/marks.ts`). Every `PULSE` seconds it gives the enemies on its tile its status for `LINGER` seconds:
 * a puddle soaks, embers burn, spores slow. What it sends sets off no reaction. It fades as it runs out.
 */
export function Mark({ id, col, row, kind, from, userType, burn, onDone }: MarkProps) {
  const info = MARKS[kind];
  const at = centre(col, row);
  const s = useMutable({ age: 0, pulse: 0 });

  useUpdate((dt) => {
    s.age += dt;
    if (s.age >= info.lasts) {
      onDone(id);
      return;
    }
    s.pulse -= dt;
    if (s.pulse > 0) return;
    s.pulse = PULSE;
    send(
      "enemy",
      { x: at.x, y: at.y, radius: TILE / 2 - 1 },
      {
        ...PLAIN_BLAST,
        from,
        moveType: MARK_TYPE[kind],
        userType,
        soak: info.soak,
        burn,
        burnFor: burn > 0 ? LINGER : 0,
        slow: info.slow,
        slowFor: info.slow > 0 ? LINGER : 0,
        reacted: true,
      }
    );
  });

  return (
    <Entity x={col * TILE} y={row * TILE} opacity={0.4 * Math.min(1, (info.lasts - s.age) / 1)}>
      <Shape kind="rect" width={TILE - 2} height={TILE - 2} x={1} y={1} color={MARK_COLOR[kind]} />
    </Entity>
  );
}
