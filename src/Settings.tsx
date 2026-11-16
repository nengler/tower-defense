import { Button, Flex, Menu, Text } from "@tsengine/runtime/jsx";

import { useGame } from "./GameState.ts";

/** The settings: left and right change the row with the focus (`onAdjust`), Enter presses it, and Escape goes back (`onBack`). */
export function Settings() {
  const volume = useGame((s) => s.volume);
  const music = useGame((s) => s.music);
  const { changeVolume, toggleMusic, toTitle } = useGame.actions();
  return (
    <Flex direction="column" width={320} height={180} alignItems="center" justifyContent="center" gap={12}>
      <Text size={16}>Settings</Text>
      <Menu gap={4} alignItems="stretch" width={160} onBack={toTitle}>
        <Button autoFocus onPress={() => changeVolume(1)} onAdjust={(direction) => changeVolume(direction)}>
          <Text>{`Volume  < ${volume} >`}</Text>
        </Button>
        <Button onPress={toggleMusic} onAdjust={() => toggleMusic()}>
          <Text>{`Music  ${music ? "on" : "off"}`}</Text>
        </Button>
        <Button onPress={toTitle}>
          <Text>Back</Text>
        </Button>
      </Menu>
    </Flex>
  );
}
