import { Entity, Text, useMutable, useUpdate } from "@tsengine/runtime/jsx";

/** Seconds a number stays up. */
const SHOWN = 0.6;

interface PopupProps {
  id: number;
  x: number;
  y: number;
  amount: number;
  /** A combo's damage: yellow, so a combo is seen working. */
  combo: boolean;
  onDone: (id: number) => void;
}

/** The damage a hit did, rising from where it landed for a moment. */
export function Popup({ id, x, y, amount, combo, onDone }: PopupProps) {
  const s = useMutable({ t: 0 });
  useUpdate((dt) => {
    if (s.t >= SHOWN) {
      onDone(id);
      return;
    }
    s.t += dt;
  });
  return (
    <Entity x={x} y={y - 12 - s.t * 16}>
      <Text align="center" color={combo ? "#ffe066" : "#ffffff"} shadow="#000000">
        {`${Math.max(1, Math.round(amount))}`}
      </Text>
    </Entity>
  );
}
