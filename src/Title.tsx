import { Button, Flex, Menu, Text } from "@tsengine/runtime/jsx";

import { useGame } from "./GameState.ts";
import { today } from "./rules/tiers.ts";

/**
 * The title: the game's name and a menu. The arrow keys (or the d-pad) move between the buttons, Enter (or the gamepad's A)
 * presses one, and so does a click. `autoFocus` says which starts with the focus. Play goes to the run setup; Daily starts today's
 * run, the same map, tier and offers for everyone playing that day.
 */
export function Title({ name }: { name: string }) {
  const { openSetup, startDaily, openSettings } = useGame.actions();
  return (
    <Flex direction="column" width={480} height={270} alignItems="center" justifyContent="center" gap={16}>
      <Text size={16}>{name}</Text>
      <Menu gap={4} alignItems="stretch" width={160}>
        <Button autoFocus onPress={openSetup}>
          <Text>Play</Text>
        </Button>
        <Button onPress={() => startDaily(today())}>
          <Text>Daily run</Text>
        </Button>
        <Button onPress={openSettings}>
          <Text>Settings</Text>
        </Button>
      </Menu>
    </Flex>
  );
}
