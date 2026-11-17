import { AnimatedSprite, Entity, Flex, Text } from "@tsengine/runtime/jsx";

import { useGame } from "./GameState.ts";
import { CREATURE_ANIMATIONS } from "./rules/draw.ts";
import { FIELD_HEIGHT, FIELD_WIDTH, SCREEN_HEIGHT } from "./rules/map.ts";
import { FIELD_LIMIT, onField } from "./rules/roster.ts";
import { SPECIES } from "./rules/species.ts";
import { TYPE_COLOR } from "./rules/types.ts";
import { WAVE_COUNT } from "./rules/waves.ts";

interface BarProps {
  lives: number;
  wave: number;
  /** A wave is on. */
  active: boolean;
  /** The next wave may be made elite (a milestone follows it). */
  canElite: boolean;
  onStartWave: () => void;
}

/**
 * The bar under the field: lives and the wave; a chip for every creature owned (its sprite and level; dark while it is on the
 * field, white-edged while selected, yellow-edged with a `!` when a choice waits), which selects it; and on the right the button that
 * starts the next wave (Space too), the speed (F) and, when a milestone follows the next wave, ELITE (E): a tougher wave for a bigger
 * offer after it.
 */
export function Bar({ lives, wave, active, canElite, onStartWave }: BarProps) {
  const roster = useGame((s) => s.roster);
  const selected = useGame((s) => s.selected);
  const speed = useGame((s) => s.speed);
  const elite = useGame((s) => s.elite);
  const { select, toggleSpeed, toggleElite } = useGame.actions();
  return (
    <Flex
      float
      anchor="top-left"
      to="top-left"
      y={FIELD_HEIGHT}
      width={FIELD_WIDTH}
      height={SCREEN_HEIGHT - FIELD_HEIGHT}
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      paddingX={6}
      gap={6}
      background="#141824"
    >
      <Flex direction="column" gap={4} width={52}>
        <Text color="#f07a8a">{`LIVES ${lives}`}</Text>
        <Text color="#a7b0c8">{`WAVE ${wave}/${WAVE_COUNT}`}</Text>
      </Flex>
      <Flex direction="column" gap={3} width="grow">
        <Flex direction="row" gap={3}>
          {roster.map((c) => (
            <Flex
              key={c.id}
              width={26}
              height={22}
              direction="column"
              alignItems="center"
              justifyContent="center"
              background={c.col >= 0 ? "#2a2f40" : "#1c2030"}
              borderWidth={1}
              borderColor={c.choice !== null ? "#ffe066" : c.id === selected ? "#ffffff" : TYPE_COLOR[SPECIES[c.species].type]}
              onPress={() => select(c.id)}
            >
              <Flex width={12} height={12}>
                <Entity x={6} y={6}>
                  <AnimatedSprite
                    sheet="creatures.png"
                    frameWidth={12}
                    frameHeight={12}
                    animations={CREATURE_ANIMATIONS}
                    animation={c.form === "" ? c.species : c.form}
                    originX={6}
                    originY={6}
                    opacity={c.col >= 0 ? 1 : 0.5}
                  />
                </Entity>
              </Flex>
              <Text color={c.choice !== null ? "#ffe066" : "#a7b0c8"}>{`${c.choice !== null ? "!" : ""}${c.level}`}</Text>
            </Flex>
          ))}
        </Flex>
        <Text color="#6a7088">{`ON FIELD ${onField(roster).length}/${FIELD_LIMIT}`}</Text>
      </Flex>
      <Flex direction="column" gap={3} alignItems="end">
        <Flex paddingX={6} paddingY={3} background={active ? "#2a2f40" : "#3a5a8a"} onPress={onStartWave} pressKey="Space">
          <Text color={active ? "#6a7088" : "#ffffff"}>{active ? "WAVE ON" : "START [SPACE]"}</Text>
        </Flex>
        <Flex direction="row" gap={3}>
          {canElite && (
            <Flex paddingX={3} paddingY={1} background={elite ? "#8a3a5a" : "#2a2f40"} onPress={toggleElite}>
              <Text color={elite ? "#ffffff" : "#a7b0c8"}>ELITE [E]</Text>
            </Flex>
          )}
          <Flex paddingX={3} paddingY={1} background={speed > 1 ? "#3a5a8a" : "#2a2f40"} onPress={toggleSpeed}>
            <Text color={speed > 1 ? "#ffffff" : "#a7b0c8"}>{`${speed}X [F]`}</Text>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
}
