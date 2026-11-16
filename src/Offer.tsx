import { AnimatedSprite, Button, Flex, Menu, Text } from "@tsengine/runtime/jsx";

import { useGame } from "./GameState.ts";
import { CREATURE_ANIMATIONS } from "./rules/draw.ts";
import { MOVES } from "./rules/moves.ts";
import { masteryLevel } from "./rules/progress.ts";
import { SPECIES, statsAt } from "./rules/species.ts";
import { TYPE_COLOR } from "./rules/types.ts";

/**
 * A milestone: pick one new creature from the offer. Each is a card with its name, type, level-1 stats, the move it starts with and
 * its species' mastery;
 * the arrow keys move between them, Enter (or a click) takes one. It is `modal`, so nothing under it hears the keys meanwhile.
 */
export function Offer() {
  const offer = useGame((s) => s.offer);
  const points = useGame((s) => s.mastery);
  const { takeOffer } = useGame.actions();
  return (
    <Flex modal width={320} height={180} background="#10131ce0" direction="column" alignItems="center" justifyContent="center" gap={8}>
      <Text size={16}>CHOOSE A CREATURE</Text>
      <Menu direction="row" gap={6}>
        {offer.map((id) => (
          <Button key={id} autoFocus={id === offer[0]} onPress={() => takeOffer(id)} padding={4} width={96} direction="column" gap={3}>
            <AnimatedSprite sheet="creatures.png" frameWidth={12} frameHeight={12} animations={CREATURE_ANIMATIONS} animation={id} />
            <Text color={TYPE_COLOR[SPECIES[id].type]}>{SPECIES[id].name}</Text>
            <Text color="#6a7088">{SPECIES[id].type.toUpperCase()}</Text>
            <Text color="#a7b0c8">{`ATK ${statsAt(id, 1).atk} SPD ${statsAt(id, 1).spd}`}</Text>
            <Text color="#a7b0c8">{`RNG ${statsAt(id, 1).rng} CD ${statsAt(id, 1).cd}`}</Text>
            <Text color={TYPE_COLOR[MOVES[SPECIES[id].learns[0]!.move].type]}>{MOVES[SPECIES[id].learns[0]!.move].name}</Text>
            <Text color={masteryLevel(points[id]) > 0 ? "#f0d84a" : "#4a5068"}>{`MASTERY ${masteryLevel(points[id])}`}</Text>
          </Button>
        ))}
      </Menu>
    </Flex>
  );
}
