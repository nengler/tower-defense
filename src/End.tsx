import { Button, Flex, Menu, Text } from "@rge/runtime/jsx";

import { useGame } from "./GameState.ts";
import { WAVE_COUNT } from "./rules/waves.ts";

interface EndProps {
  won: boolean;
}

/** The end of a run: how it went, and back to the title. */
export function End({ won }: EndProps) {
  const wave = useGame((s) => s.endWave);
  const { toTitle } = useGame.actions();
  return (
    <Flex direction="column" width={320} height={180} alignItems="center" justifyContent="center" gap={12}>
      <Text size={16} color={won ? "#7ad07a" : "#f07a8a"}>
        {won ? "YOU HELD" : "OVERRUN"}
      </Text>
      <Text color="#a7b0c8">{won ? `ALL ${WAVE_COUNT} WAVES CLEARED` : `REACHED WAVE ${wave}`}</Text>
      <Menu gap={4} alignItems="stretch" width={120}>
        <Button autoFocus onPress={toTitle}>
          <Text>Title</Text>
        </Button>
      </Menu>
    </Flex>
  );
}
