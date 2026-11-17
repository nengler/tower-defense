import { Button, Flex, Menu, Text } from "@tsengine/runtime/jsx";

import { useGame } from "./GameState.ts";
import { mapOf } from "./rules/map.ts";
import { TIERS } from "./rules/tiers.ts";

/**
 * Before a run: the map (left and right step through them) and the difficulty tier (left and right, up to the highest unlocked),
 * then Start. Each tier adds one change to the ones below it; winning at the highest unlocked tier opens the next. Escape goes back.
 */
export function Setup() {
  const map = useGame((s) => s.map);
  const tier = useGame((s) => s.tier);
  const unlocked = useGame((s) => s.unlocked);
  const { nextMap, nextTier, start, toTitle } = useGame.actions();
  return (
    <Flex direction="column" width={320} height={180} alignItems="center" justifyContent="center" gap={8}>
      <Text size={16}>NEW RUN</Text>
      <Menu gap={4} alignItems="stretch" width={200} onBack={toTitle}>
        <Button onPress={() => nextMap(1)} onAdjust={(direction) => nextMap(direction)} direction="column" gap={2}>
          <Text>{`MAP  < ${mapOf(map).name} >`}</Text>
          <Text color="#6a7088">{mapOf(map).text}</Text>
        </Button>
        <Button onPress={() => nextTier(1)} onAdjust={(direction) => nextTier(direction)} direction="column" gap={2}>
          <Text>{`${unlocked > 0 ? "<" : " "} ${TIERS[tier]!.name} ${tier < unlocked ? ">" : " "}  (${unlocked} UNLOCKED)`}</Text>
          <Text color="#6a7088">{TIERS[tier]!.text}</Text>
        </Button>
        <Button autoFocus onPress={start}>
          <Text>Start</Text>
        </Button>
        <Button onPress={toTitle}>
          <Text>Back</Text>
        </Button>
      </Menu>
    </Flex>
  );
}
