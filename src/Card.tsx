import { Flex, Text } from "@tsengine/runtime/jsx";

import { useGame } from "./GameState.ts";
import { percent } from "./rules/draw.ts";
import { FIELD_HEIGHT } from "./rules/map.ts";
import { MOVES } from "./rules/moves.ts";
import { MAX_LEVEL, slotsFor, xpToNext } from "./rules/progress.ts";
import type { Owned } from "./rules/roster.ts";
import { SPECIES, statsAt } from "./rules/species.ts";
import { TYPE_COLOR } from "./rules/types.ts";

/** Pixels across. */
const WIDTH = 124;

interface CardProps {
  creature: Owned;
}

/**
 * The selected creature's card, over the side of the field it is not on: its name, level and XP, its stats, and its moves. The
 * equipped moves are listed in the order it tries them, each with `UP` (try it earlier) and `x` (unequip); the moves it knows but has
 * not equipped follow, and pressing one equips it while a slot is free. All of it works mid-wave. `BENCH` takes it off the field,
 * `CLOSE` (or Escape) deselects it.
 */
export function Card({ creature }: CardProps) {
  const { equip, unequip, raise, benchSelected, deselect } = useGame.actions();
  const info = SPECIES[creature.species];
  const stats = statsAt(creature.species, creature.level);
  const slots = slotsFor(creature.mastery);
  const spare = creature.known.filter((m) => !creature.equipped.includes(m));
  const full = creature.equipped.length >= slots;
  const maxed = creature.level >= MAX_LEVEL;

  return (
    <Flex
      float
      anchor="top-left"
      to="top-left"
      x={creature.col >= 10 ? 2 : 320 - WIDTH - 2}
      y={2}
      width={WIDTH}
      height={FIELD_HEIGHT - 4}
      direction="column"
      gap={2}
      padding={4}
      background="#141824f0"
      borderWidth={1}
      borderColor={TYPE_COLOR[info.type]}
    >
      <Flex direction="row" justifyContent="space-between" width="grow">
        <Text color={TYPE_COLOR[info.type]}>{info.name}</Text>
        <Text>{`LV${creature.level}`}</Text>
      </Flex>
      <Flex width="grow" height={2} background="#2a2f40">
        <Flex width={percent(maxed ? 100 : (100 * creature.xp) / xpToNext(creature.level))} height={2} background="#a7b0c8" />
      </Flex>
      <Text color="#a7b0c8">{`ATK ${stats.atk} SPD ${stats.spd}`}</Text>
      <Text color="#a7b0c8">{`RNG ${stats.rng} CD ${stats.cd}`}</Text>
      {creature.mastery > 0 && <Text color="#f0d84a">{`MASTERY ${creature.mastery}`}</Text>}
      <Text color="#6a7088">{`MOVES ${creature.equipped.length}/${slots}`}</Text>
      {creature.equipped.map((move, i) => (
        <Flex key={move} direction="row" gap={2} width="grow" alignItems="center">
          <Flex width="grow" paddingX={2} background="#2a2f40">
            <Text color={TYPE_COLOR[MOVES[move].type]}>{MOVES[move].name}</Text>
          </Flex>
          <Flex paddingX={2} background={i > 0 ? "#3a5a8a" : "#2a2f40"} onPress={() => raise(move)}>
            <Text color={i > 0 ? "#ffffff" : "#6a7088"}>UP</Text>
          </Flex>
          <Flex paddingX={2} background="#6a3040" onPress={() => unequip(move)}>
            <Text>x</Text>
          </Flex>
        </Flex>
      ))}
      {spare.length > 0 && <Text color="#6a7088">{full ? "KNOWN (SLOTS FULL)" : "KNOWN: PRESS TO EQUIP"}</Text>}
      {spare.map((move) => (
        <Flex key={move} width="grow" paddingX={2} background={full ? "#1c2030" : "#2a3a30"} onPress={() => equip(move)}>
          <Text color={full ? "#6a7088" : TYPE_COLOR[MOVES[move].type]}>{MOVES[move].name}</Text>
        </Flex>
      ))}
      <Flex width="grow" height="grow" />
      <Flex direction="row" gap={4} width="grow">
        {creature.col >= 0 && (
          <Flex paddingX={3} paddingY={1} background="#2a2f40" onPress={benchSelected}>
            <Text>BENCH</Text>
          </Flex>
        )}
        <Flex paddingX={3} paddingY={1} background="#2a2f40" onPress={deselect}>
          <Text>CLOSE</Text>
        </Flex>
      </Flex>
    </Flex>
  );
}
