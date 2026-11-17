import { Flex, Text } from "@tsengine/runtime/jsx";

import { useGame } from "./GameState.ts";
import { FIELD_HEIGHT, TERRAIN_BONUS, terrainAt } from "./rules/map.ts";
import { MOVES } from "./rules/moves.ts";
import { MAX_LEVEL, slotsFor, statBarPercent, xpToNext } from "./rules/progress.ts";
import type { Owned } from "./rules/roster.ts";
import { FORMS, SPECIES, statsOf } from "./rules/species.ts";
import { TYPE_COLOR } from "./rules/types.ts";

/** Pixels across. */
const WIDTH = 124;

/** The stats, as the card's bars list them. */
const STAT_ROWS = [
  { key: "atk", label: "ATTACK" },
  { key: "spd", label: "SPEED" },
  { key: "rng", label: "RANGE" },
  { key: "cd", label: "COOLDOWN" },
] as const;

interface CardProps {
  creature: Owned;
}

/**
 * The selected creature's card, over the side of the field it is not on: its name (or its form's), level and XP, its stats, each
 * named in full over a bar the card's width, filled out of the highest that stat can reach (`STAT_CEILING`, as a Pokémon summary
 * does), its terrain's bonus a yellow end on each when it stands on its own type's terrain (ATTUNED), a CHOOSE button while a choice waits, and its moves. The
 * equipped moves are listed in the order it tries them, each with `UP` (try it earlier) and `x` (unequip); the moves it knows but has
 * not equipped follow, and pressing one equips it while a slot is free. All of it works mid-wave. `MOVE` (`PLACE` on the bench, or M) puts the card away so any tile can be pressed, `BENCH` takes it off the field,
 * `CLOSE` (or Escape) deselects it.
 *
 * The card takes every press that lands on it (`onPress`), its buttons first as they are drawn over it: without that, a press on a gap
 * between two rows went through to the tile under the card and moved the creature there.
 */
export function Card({ creature }: CardProps) {
  const { equip, unequip, raise, benchSelected, deselect, openPrompt, startMove } = useGame.actions();
  const map = useGame((s) => s.map);
  const info = SPECIES[creature.species];
  const attuned = creature.col >= 0 && terrainAt(map, creature.col, creature.row) === info.type;
  /** What standing on its own terrain adds to each stat: the bars show it in yellow at their end. */
  const bonus = attuned ? TERRAIN_BONUS : 0;
  const stats = statsOf(creature.species, creature.level, creature.form, bonus);
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
      gap={1}
      padding={4}
      background="#141824"
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
      <Flex direction="column" gap={2} width="grow">
        {STAT_ROWS.map((r) => (
          <Flex key={r.key} direction="column" gap={1} width="grow">
            <Flex direction="row" justifyContent="space-between" width="grow">
              <Text color="#6a7088">{r.label}</Text>
              <Text color="#a7b0c8">{`${stats[r.key]}`}</Text>
            </Flex>
            <Flex direction="row" width="grow" height={2} background="#4c5466">
              <Flex width={`${statBarPercent(r.key, stats[r.key] - bonus)}%`} height={2} background="#a7b0c8" />
              {bonus > 0 && <Flex width={`${statBarPercent(r.key, bonus)}%`} height={2} background="#f0d84a" />}
            </Flex>
          </Flex>
        ))}
      </Flex>
      {(creature.mastery > 0 || attuned) && (
        <Text color="#f0d84a">{`${creature.mastery > 0 ? `MASTERY ${creature.mastery} ` : ""}${attuned ? "ATTUNED" : ""}`}</Text>
      )}
      {creature.choice !== null && (
        <Flex width="grow" paddingX={2} background="#5a4a1a" onPress={() => openPrompt(creature.id)}>
          <Text color="#ffe066">{creature.choice.kind === "form" ? "EVOLVE: CHOOSE" : "NEW MOVE: CHOOSE"}</Text>
        </Flex>
      )}
      {/* A gap between the stats and the moves. */}
      <Flex height={5} />
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
      {/* The spare moves as chips that wrap, so a creature that knows many still fits on the card. */}
      <Flex direction="row" wrap gap={2} width="grow">
        {spare.map((move) => (
          <Flex key={move} paddingX={2} background={full ? "#1c2030" : "#2a3a30"} onPress={() => equip(move)}>
            <Text color={full ? "#6a7088" : TYPE_COLOR[MOVES[move].type]}>{MOVES[move].name}</Text>
          </Flex>
        ))}
      </Flex>
      <Flex width="grow" height="grow" />
      <Flex direction="row" gap={4} width="grow">
        <Flex paddingX={3} paddingY={1} background="#3a5a8a" onPress={startMove}>
          <Text>{creature.col >= 0 ? "MOVE" : "PLACE"}</Text>
        </Flex>
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
