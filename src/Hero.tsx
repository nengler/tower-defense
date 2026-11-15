import { Entity, Sprite, useBody, useUpdate } from "@rge/runtime/jsx";

interface HeroProps {
  /** Pixels a second. */
  speed?: number;
}

/**
 * The hero keeps where it is and moves itself, as a React component keeps its own state. `useBody` holds its position (`x` and
 * `y` are state, so it renders where it is) and moves it a pixel at a time: put a `<Tilemap solid>` or a `<Collider solid>` in
 * the level and `move` stops at it, in the same step.
 */
export function Hero({ speed = 120 }: HeroProps) {
  const { x, y, move } = useBody({ x: 152, y: 82, width: 16, height: 16 });

  // Movement is over time: it reads the held keys in useUpdate.
  useUpdate((dt, input) => {
    const dirX = (input.down("ArrowRight") ? 1 : 0) - (input.down("ArrowLeft") ? 1 : 0);
    const dirY = (input.down("ArrowDown") ? 1 : 0) - (input.down("ArrowUp") ? 1 : 0);
    move(dirX * speed * dt, dirY * speed * dt);
  });

  return (
    <Entity x={x} y={y}>
      <Sprite image="hero.png" />
    </Entity>
  );
}
