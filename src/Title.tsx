import { Button, Flex, Menu, Text } from "@tsengine/runtime/jsx";

import { useGame } from "./GameState.ts";

/**
 * The title: the game's name and a menu. The arrow keys (or the d-pad) move between the buttons, Enter (or the gamepad's A)
 * presses one, and so does a click. `autoFocus` says which starts with the focus.
 */
export function Title({ name }: { name: string }) {
  const { start, openSettings } = useGame.actions();
  return (
    <Flex direction="column" width={320} height={180} alignItems="center" justifyContent="center" gap={16}>
      <Text size={16}>{name}</Text>
      <Menu gap={4} alignItems="stretch" width={120}>
        <Button autoFocus onPress={start}>
          <Text>Play</Text>
        </Button>
        <Button onPress={openSettings}>
          <Text>Settings</Text>
        </Button>
      </Menu>
    </Flex>
  );
}
