import { Entity, Shape } from "@tsengine/runtime/jsx";

import type { Ring } from "./rules/inspect.ts";

/** Dots around the ring's edge. */
const DOTS = Array.from({ length: 40 }, (_, i) => ({ id: i, angle: (i / 40) * Math.PI * 2 }));


const NONE: Ring = { x: 0, y: 0, radius: 0, color: "#ffffff" };

interface RangeProps {
  /** The ring, or null for none. */
  ring: Ring | null;
}

/** How far a move reaches, around the creature that uses it: a faint disc with a dotted edge, while the move is inspected. */
export function Range({ ring }: RangeProps) {
  const { x, y, radius, color } = ring ?? NONE;
  return (
    <Entity x={x} y={y} opacity={ring === null ? 0 : 1}>
      <Shape kind="circle" width={radius * 2} height={radius * 2} x={-radius} y={-radius} color={color} opacity={0.14} />
      {DOTS.map((d) => (
        <Shape
          key={d.id}
          kind="rect"
          width={1}
          height={1}
          x={Math.round(Math.cos(d.angle) * radius)}
          y={Math.round(Math.sin(d.angle) * radius)}
          color="#ffffff"
          opacity={0.8}
        />
      ))}
    </Entity>
  );
}
