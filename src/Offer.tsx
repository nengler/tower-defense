import { Button, Flex, Menu, Text } from "@rge/runtime/jsx";

import { useGame } from "./GameState.ts";
import { MOVES } from "./rules/moves.ts";
import { SPECIES, statsAt } from "./rules/species.ts";
import { TYPE_COLOR } from "./rules/types.ts";

/**
 * A milestone: pick one new creature from the offer. Each is a card with its name, type, level-1 stats and the move it starts with;
 * the arrow keys move between them, Enter (or a click) takes one. It is `modal`, so nothing under it hears the keys meanwhile.
 */
export function Offer() {
  const offer = useGame((s) => s.offer);
  const { takeOffer } = useGame.actions();
  return (
    <Flex modal width={320} height={180} background="#10131ce0" direction="column" alignItems="center" justifyContent="center" gap={8}>
      <Text size={16}>CHOOSE A CREATURE</Text>
      <Menu direction="row" gap={6}>
        {offer.map((id) => (
          <Button key={id} autoFocus={id === offer[0]} onPress={() => takeOffer(id)} padding={4} width={96} direction="column" gap={3}>
            <Text color={TYPE_COLOR[SPECIES[id].type]}>{SPECIES[id].name}</Text>
            <Text color="#6a7088">{SPECIES[id].type.toUpperCase()}</Text>
            <Text color="#a7b0c8">{`ATK ${statsAt(id, 1).atk} SPD ${statsAt(id, 1).spd}`}</Text>
            <Text color="#a7b0c8">{`RNG ${statsAt(id, 1).rng} CD ${statsAt(id, 1).cd}`}</Text>
            <Text color={TYPE_COLOR[MOVES[SPECIES[id].learns[0]!.move].type]}>{MOVES[SPECIES[id].learns[0]!.move].name}</Text>
          </Button>
        ))}
      </Menu>
    </Flex>
  );
}
