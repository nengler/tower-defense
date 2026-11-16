import { Flex, Text } from "@rge/runtime/jsx";

import { FIELD_HEIGHT } from "./rules/map.ts";
import { WAVE_COUNT } from "./rules/waves.ts";

interface BarProps {
  lives: number;
  wave: number;
  /** A wave is on. */
  active: boolean;
  onStartWave: () => void;
}

/** The bottom 36 pixels: lives, the wave, and the button that starts the next one (Space too). */
export function Bar({ lives, wave, active, onStartWave }: BarProps) {
  return (
    <Flex
      float
      anchor="top-left"
      to="top-left"
      y={FIELD_HEIGHT}
      width={320}
      height={36}
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      paddingX={8}
      background="#141824"
    >
      <Flex direction="row" gap={12}>
        <Text color="#f07a8a">{`LIVES ${lives}`}</Text>
        <Text color="#a7b0c8">{`WAVE ${wave}/${WAVE_COUNT}`}</Text>
      </Flex>
      <Flex padding={4} background={active ? "#2a2f40" : "#3a5a8a"} onPress={onStartWave} pressKey="Space">
        <Text color={active ? "#6a7088" : "#ffffff"}>{active ? "WAVE ON" : "SPACE: START WAVE"}</Text>
      </Flex>
    </Flex>
  );
}
