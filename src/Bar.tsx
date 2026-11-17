import { AnimatedSprite, Entity, Flex, Text } from "@tsengine/runtime/jsx";

import { useGame } from "./GameState.ts";
import { ENEMY_ANIMATIONS } from "./rules/draw.ts";
import { FIELD_HEIGHT } from "./rules/map.ts";
import { FIELD_LIMIT, onField } from "./rules/roster.ts";
import { SPECIES } from "./rules/species.ts";
import { TYPE_COLOR } from "./rules/types.ts";
import { previewOf, WAVE_COUNT } from "./rules/waves.ts";

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
 * The bottom 36 pixels: lives and the wave; a chip for every creature owned (its type's colour and level; dark while it is on the
 * field, white-edged while selected, a yellow `!` when a choice waits), which selects it; under the chips, between waves, what the
 * next wave brings (each kind's walk and how many); and on the right the button that starts the next wave (Space too), the speed
 * (F) and, when a milestone follows the next wave, ELITE (E): a tougher wave for a bigger offer after it.
 */
export function Bar({ lives, wave, active, canElite, onStartWave }: BarProps) {
  const roster = useGame((s) => s.roster);
  const selected = useGame((s) => s.selected);
  const tier = useGame((s) => s.tier);
  const speed = useGame((s) => s.speed);
  const elite = useGame((s) => s.elite);
  const { select, toggleSpeed, toggleElite } = useGame.actions();
  const next = previewOf(wave + 1, tier);
  return (
    <Flex
      float
      anchor="top-left"
      to="top-left"
      y={FIELD_HEIGHT}
      width={320}
      height={36}
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      paddingX={4}
      gap={4}
      background="#141824"
    >
      <Flex direction="column" gap={2} width={42}>
        <Text color="#f07a8a">{`LIVES ${lives}`}</Text>
        <Text color="#a7b0c8">{`WAVE ${wave}/${WAVE_COUNT}`}</Text>
      </Flex>
      <Flex direction="column" gap={2} width="grow">
        <Flex direction="row" gap={2}>
          {roster.map((c) => (
            <Flex
              key={c.id}
              width={16}
              height={12}
              alignItems="center"
              justifyContent="center"
              background={c.col >= 0 ? "#2a2f40" : TYPE_COLOR[SPECIES[c.species].type]}
              borderWidth={1}
              borderColor={c.choice !== null ? "#ffe066" : c.id === selected ? "#ffffff" : "#141824"}
              onPress={() => select(c.id)}
            >
              <Text color={c.col >= 0 ? TYPE_COLOR[SPECIES[c.species].type] : "#141824"}>{`${c.choice !== null ? "!" : ""}${c.level}`}</Text>
            </Flex>
          ))}
        </Flex>
        {active || wave >= WAVE_COUNT ? (
          <Text color="#6a7088">{`ON FIELD ${onField(roster).length}/${FIELD_LIMIT}`}</Text>
        ) : (
          <Flex direction="row" gap={1} alignItems="center" height={12}>
            <Text color="#6a7088">NEXT</Text>
            {next.map((g) => (
              <Flex key={g.kind} direction="row" alignItems="center" gap={1} height={12}>
                <Flex width={12} height={12}>
                  <Entity x={6} y={6}>
                    <AnimatedSprite
                      sheet="enemies.png"
                      frameWidth={12}
                      frameHeight={12}
                      animations={ENEMY_ANIMATIONS}
                      animation={g.kind}
                      originX={6}
                      originY={6}
                    />
                  </Entity>
                </Flex>
                <Text color="#a7b0c8">{`${g.count}`}</Text>
              </Flex>
            ))}
          </Flex>
        )}
      </Flex>
      <Flex direction="column" gap={2} alignItems="end">
        <Flex paddingX={4} paddingY={2} background={active ? "#2a2f40" : "#3a5a8a"} onPress={onStartWave} pressKey="Space">
          <Text color={active ? "#6a7088" : "#ffffff"}>{active ? "WAVE ON" : "START"}</Text>
        </Flex>
        <Flex direction="row" gap={2}>
          {canElite && (
            <Flex paddingX={2} background={elite ? "#8a3a5a" : "#2a2f40"} onPress={toggleElite}>
              <Text color={elite ? "#ffffff" : "#a7b0c8"}>ELITE</Text>
            </Flex>
          )}
          <Flex paddingX={2} background={speed > 1 ? "#3a5a8a" : "#2a2f40"} onPress={toggleSpeed}>
            <Text color={speed > 1 ? "#ffffff" : "#a7b0c8"}>{`${speed}X`}</Text>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
}
