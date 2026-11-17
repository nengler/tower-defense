import { Button, Flex, Menu, Text } from "@tsengine/runtime/jsx";

import { useGame } from "./GameState.ts";
import { MAP_IDS, MAPS } from "./rules/map.ts";

/**
 * The title: the game's name and a menu, a button for each map (with a line on what it is like under it) and Settings. The arrow keys (or the d-pad) move between the buttons, Enter (or the gamepad's A)
 * presses one, and so does a click. `autoFocus` says which starts with the focus.
 */
export function Title({ name }: { name: string }) {
  const { start, openSettings } = useGame.actions();
  return (
    <Flex direction="column" width={320} height={180} alignItems="center" justifyContent="center" gap={16}>
      <Text size={16}>{name}</Text>
      <Menu gap={4} alignItems="stretch" width={180}>
        {MAP_IDS.map((id, i) => (
          <Button key={id} autoFocus={i === 0} onPress={() => start(id)}>
            <Flex direction="column" alignItems="center" gap={1}>
              <Text>{`Play ${MAPS[id].name}`}</Text>
              <Text color="#6a7088">{MAPS[id].blurb}</Text>
            </Flex>
          </Button>
        ))}
        <Button onPress={openSettings}>
          <Text>Settings</Text>
        </Button>
      </Menu>
    </Flex>
  );
}
