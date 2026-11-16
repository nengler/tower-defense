import { Entity, Text, useInput } from "@rge/runtime/jsx";

import { useGame } from "./GameState.ts";
import { Hero } from "./Hero.tsx";
import { Pause } from "./Pause.tsx";

/** Playing: the hero, and Escape opens the pause menu over it. */
export function Play() {
  const paused = useGame((s) => s.paused);
  const { pause } = useGame.actions();
  useInput((input) => {
    if (input.pressed("Escape")) pause();
  });
  return (
    <Entity>
      <Hero />
      <Text x={8} y={8} color="#a7b0c8">
        Esc: pause
      </Text>
      {paused && <Pause />}
    </Entity>
  );
}
