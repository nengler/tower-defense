import { AnimatedSprite, Button, Entity, Flex, Menu, Shape, Text, useInput, useMutable } from "@tsengine/runtime/jsx";

import { useGame } from "./GameState.ts";
import { CREATURE_ANIMATIONS } from "./rules/draw.ts";
import { MOVES } from "./rules/moves.ts";
import { masteryLevel } from "./rules/progress.ts";
import { SPECIES, statsAt } from "./rules/species.ts";
import { TYPE_COLOR } from "./rules/types.ts";

/** An eye, drawn in shapes: the button that looks past the offer at the board. */
function Eye({ open }: { open: boolean }) {
  return (
    <Entity x={8} y={5}>
      <Shape kind="circle" width={12} height={7} x={-6} y={-3.5} color="#e8ecf8" />
      <Shape kind="circle" width={5} height={5} x={-2.5} y={-2.5} color="#3a5a8a" />
      <Shape kind="circle" width={2} height={2} x={-1} y={-1} color="#10131c" />
      {!open && <Shape kind="rect" width={14} height={1} x={-7} y={0} color="#10131c" />}
    </Entity>
  );
}

/**
 * A milestone: pick one new creature from the offer (three, or four after an elite wave). Each is a card with its name, type, level-1 stats, the move it starts with and
 * its species' mastery;
 * the arrow keys move between them, Enter (or a click) takes one. It is `modal`, so nothing under it hears the keys meanwhile.
 *
 * The eye in its corner (or V) looks at the board: the cards are put away and the field shows through a faint veil, so where the
 * team stands can be weighed before choosing; the eye (or V) brings the offer back.
 */
export function Offer() {
  const offer = useGame((s) => s.offer);
  const points = useGame((s) => s.mastery);
  const { takeOffer } = useGame.actions();
  const s = useMutable({ peek: false });
  const toggle = () => {
    s.peek = !s.peek;
  };
  useInput((input) => {
    if (input.pressed("V")) toggle();
  });
  return (
    <Flex
      modal
      width={320}
      height={180}
      background={s.peek ? "#10131c30" : "#10131ce0"}
      direction="column"
      alignItems="center"
      justifyContent="center"
      gap={8}
    >
      <Flex float anchor="top-right" to="top-right" offsetX={-3} offsetY={3} direction="row" gap={3} alignItems="center" paddingX={3} paddingY={2} background="#10131cc0" borderRadius={2} onPress={toggle}>
        <Text color="#a7b0c8">{s.peek ? "BACK TO OFFER" : "VIEW BOARD"}</Text>
        <Flex width={16} height={10}>
          <Eye open={!s.peek} />
        </Flex>
      </Flex>
      {!s.peek && <Text size={16}>CHOOSE A CREATURE</Text>}
      {!s.peek && (
        <Menu direction="row" gap={offer.length > 3 ? 3 : 6}>
          {offer.map((id) => (
            <Button key={id} autoFocus={id === offer[0]} onPress={() => takeOffer(id)} padding={3} width={offer.length > 3 ? 74 : 96} direction="column" gap={3}>
              <AnimatedSprite sheet="creatures.png" frameWidth={12} frameHeight={12} animations={CREATURE_ANIMATIONS} animation={id} />
              <Text color={TYPE_COLOR[SPECIES[id].type]}>{SPECIES[id].name}</Text>
              <Text color="#6a7088">{SPECIES[id].type.toUpperCase()}</Text>
              <Text color="#a7b0c8">{`ATK ${statsAt(id, 1).atk} SPD ${statsAt(id, 1).spd}`}</Text>
              <Text color="#a7b0c8">{`RNG ${statsAt(id, 1).rng} CD ${statsAt(id, 1).cd}`}</Text>
              <Text color={TYPE_COLOR[MOVES[SPECIES[id].learns[0]!.options[0]!].type]}>{MOVES[SPECIES[id].learns[0]!.options[0]!].name}</Text>
              <Text color={masteryLevel(points[id]) > 0 ? "#f0d84a" : "#4a5068"}>{`MASTERY ${masteryLevel(points[id])}`}</Text>
            </Button>
          ))}
        </Menu>
      )}
    </Flex>
  );
}
