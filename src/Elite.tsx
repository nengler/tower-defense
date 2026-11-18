import { Flex, Text } from "@tsengine/runtime/jsx";

import { useGame } from "./GameState.ts";
import { ELITE_WIDTH } from "./rules/hud.ts";
import { FIELD_HEIGHT } from "./rules/map.ts";
import { ELITE_HP, ELITE_OFFER } from "./rules/tiers.ts";
import { OFFER_SIZE } from "./rules/waves.ts";

interface EliteProps {
  /** The wave the choice is for. */
  wave: number;
  /** Pixels from the left of the screen: `Play` keeps it clear of the card. */
  x: number;
}

/**
 * Between waves, when a milestone follows the next one: whether to fight it as an elite wave, and what that means (tougher enemies,
 * a bigger offer after it). NORMAL or ELITE (or E) locks the answer in until the wave starts; the bar's START waits for it. It sits
 * at the bottom of the field, and is not modal, so creatures can still be placed and moved while deciding. It takes the presses that
 * land on it, so none reach the tile under it.
 */
export function Elite({ wave, x }: EliteProps) {
  const { chooseElite } = useGame.actions();
  return (
    <Flex
      float
      anchor="bottom-left"
      to="top-left"
      offsetX={x}
      offsetY={FIELD_HEIGHT - 3}
      width={ELITE_WIDTH}
      direction="column"
      alignItems="center"
      gap={3}
      padding={4}
      background="#141824f0"
      borderWidth={1}
      borderColor="#8a3a5a"
      borderRadius={2}
      onPress={() => {}}
    >
      <Text color="#ffe066">{`WAVE ${wave}: FIGHT IT AS ELITE?`}</Text>
      <Text color="#a7b0c8" maxWidth={ELITE_WIDTH - 10}>
        {`ENEMIES +${Math.round((ELITE_HP - 1) * 100)}% HP. THE PICK AFTER IT OFFERS ${ELITE_OFFER} CREATURES, NOT ${OFFER_SIZE}.`}
      </Text>
      <Flex direction="row" gap={6}>
        <Flex paddingX={5} paddingY={1} borderRadius={2} background="#2a2f40" hoverBackground="#3a4258" onPress={() => chooseElite(false)}>
          <Text>NORMAL</Text>
        </Flex>
        <Flex paddingX={5} paddingY={1} borderRadius={2} background="#8a3a5a" hoverBackground="#a04a6a" onPress={() => chooseElite(true)}>
          <Text>ELITE (E)</Text>
        </Flex>
      </Flex>
    </Flex>
  );
}
