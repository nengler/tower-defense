import { Flex, Text } from "@tsengine/runtime/jsx";

import { useGame } from "./GameState.ts";
import { TERRAIN_BONUS, terrainAt } from "./rules/map.ts";
import { MOVES } from "./rules/moves.ts";
import { MAX_LEVEL, slotsFor, xpToNext } from "./rules/progress.ts";
import type { Owned } from "./rules/roster.ts";
import { FORMS, SPECIES, statsOf } from "./rules/species.ts";
import { TYPE_COLOR } from "./rules/types.ts";

interface CardProps {
  creature: Owned;
}

/**
 * The selected creature's card, in the side panel beside the field (so the field stays in view while it is open): its name (or its form's), level and XP, its stats (with
 * its terrain's bonus when it stands on its own type's terrain, ATTUNED), a CHOOSE button while a choice waits, and its moves. The
 * equipped moves are listed in the order it tries them, each with `UP` (try it earlier) and `x` (unequip); the moves it knows but has
 * not equipped follow, and pressing one equips it while a slot is free. All of it works mid-wave. `BENCH` takes it off the field,
 * `CLOSE` (or Escape) deselects it.
 *
 * The card takes every press that lands on it (`onPress`), its buttons first as they are drawn over it, so a press never reaches
 * what is under it.
 */
export function Card({ creature }: CardProps) {
  const { equip, unequip, raise, benchSelected, deselect, openPrompt } = useGame.actions();
  const map = useGame((s) => s.map);
  const info = SPECIES[creature.species];
  const attuned = creature.col >= 0 && terrainAt(map, creature.col, creature.row) === info.type;
  const stats = statsOf(creature.species, creature.level, creature.form, attuned ? TERRAIN_BONUS : 0);
  const slots = slotsFor(creature.mastery);
  const spare = creature.known.filter((m) => !creature.equipped.includes(m));
  const full = creature.equipped.length >= slots;
  const maxed = creature.level >= MAX_LEVEL;

  return (
    <Flex
      width="grow"
      height="grow"
      direction="column"
      gap={3}
      padding={4}
      background="#1a1f2e"
      borderWidth={1}
      borderColor={TYPE_COLOR[info.type]}
      onPress={() => {}}
    >
      <Flex direction="row" justifyContent="space-between" width="grow">
        <Text color={TYPE_COLOR[info.type]}>{creature.form === "" ? info.name : FORMS[creature.form].name}</Text>
        <Text>{`LV${creature.level}`}</Text>
      </Flex>
      <Flex width="grow" height={2} background="#2a2f40">
        <Flex width={`${maxed ? 100 : (100 * creature.xp) / xpToNext(creature.level)}%`} height={2} background="#a7b0c8" />
      </Flex>
      <Text color="#a7b0c8">{`ATK ${stats.atk} SPD ${stats.spd}`}</Text>
      <Text color="#a7b0c8">{`RNG ${stats.rng} CD ${stats.cd}`}</Text>
      {(creature.mastery > 0 || attuned) && (
        <Text color="#f0d84a">{`${creature.mastery > 0 ? `MASTERY ${creature.mastery} ` : ""}${attuned ? "ATTUNED" : ""}`}</Text>
      )}
      {creature.choice !== null && (
        <Flex width="grow" paddingX={2} background="#5a4a1a" onPress={() => openPrompt(creature.id)}>
          <Text color="#ffe066">{creature.choice.kind === "form" ? "EVOLVE: CHOOSE" : "NEW MOVE: CHOOSE"}</Text>
        </Flex>
      )}
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
