import { Button, Flex, Menu, Text } from "@tsengine/runtime/jsx";

import { useGame } from "./GameState.ts";

/**
 * The pause menu, over the game. It is `modal`: while it is open only it hears the keys, so Escape here closes the menu
 * (`onBack`) and does not reach the play screen's Escape.
 */
export function Pause() {
  const { resume, toTitle } = useGame.actions();
  return (
    <Flex modal width={480} height={270} background="#10131cd0" alignItems="center" justifyContent="center">
      <Menu gap={4} padding={8} background="#1c2235" borderRadius={3} width={140} alignItems="stretch" onBack={resume}>
        <Text>Paused</Text>
        <Button autoFocus onPress={resume}>
          <Text>Resume</Text>
        </Button>
        <Button onPress={toTitle}>
          <Text>Quit to title</Text>
        </Button>
      </Menu>
    </Flex>
  );
}
