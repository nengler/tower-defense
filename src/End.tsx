import { Button, Flex, Menu, Text } from "@rge/runtime/jsx";

import { useGame } from "./GameState.ts";
import { MASTERY_TEXT, masteryLevel, nextMasteryAt } from "./rules/progress.ts";
import { SPECIES, SPECIES_IDS } from "./rules/species.ts";
import { TYPE_COLOR } from "./rules/types.ts";
import { WAVE_COUNT } from "./rules/waves.ts";

interface EndProps {
  won: boolean;
}

/** The end of a run: how it went, each species' mastery (what the run kept), and back to the title. */
export function End({ won }: EndProps) {
  const wave = useGame((s) => s.endWave);
  const points = useGame((s) => s.mastery);
  const { toTitle } = useGame.actions();
  return (
    <Flex direction="column" width={320} height={180} alignItems="center" justifyContent="center" gap={12}>
      <Text size={16} color={won ? "#7ad07a" : "#f07a8a"}>
        {won ? "YOU HELD" : "OVERRUN"}
      </Text>
      <Text color="#a7b0c8">{won ? `ALL ${WAVE_COUNT} WAVES CLEARED` : `REACHED WAVE ${wave}`}</Text>
      <Flex direction="column" gap={2} alignItems="center">
        {SPECIES_IDS.map((id) => (
          <Text key={id} color={TYPE_COLOR[SPECIES[id].type]}>
            {`${SPECIES[id].name} M${masteryLevel(points[id])} ${nextMasteryAt(points[id]) === null ? "MAX" : `${points[id]}/${nextMasteryAt(points[id])}`} ${MASTERY_TEXT[masteryLevel(points[id])]}`}
          </Text>
        ))}
      </Flex>
      <Menu gap={4} alignItems="stretch" width={120}>
        <Button autoFocus onPress={toTitle}>
          <Text>Title</Text>
        </Button>
      </Menu>
    </Flex>
  );
}
