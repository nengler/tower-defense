import { AnimatedSprite, Entity, Flex, Text } from "@tsengine/runtime/jsx";

import { useGame } from "./GameState.ts";
import { CREATURE_ANIMATIONS, ENEMY_ANIMATIONS } from "./rules/draw.ts";
import { FIELD_HEIGHT } from "./rules/map.ts";
import { FIELD_LIMIT, onField } from "./rules/roster.ts";
import { previewOf, WAVE_COUNT } from "./rules/waves.ts";

interface BarProps {
  lives: number;
  wave: number;
  /** A wave is on. */
  active: boolean;
  /** Whether the next wave is elite is still being chosen (`Elite`): START waits for it. */
  waiting: boolean;
  onStartWave: () => void;
}

/** The see-through panel colour every part of the bar sits on, so the ground shows through. */
const GLASS = "#10131c99";
/** Where the bar's strip starts: just under the grid, over the ground drawn past it. */
const TOP = FIELD_HEIGHT + 2;

/**
 * The HUD along the bottom, as separate see-through panels over the ground under the grid (none of it covers a tile a creature can
 * stand on). On the left the lives and the wave. In the middle a chip for every creature owned, showing the creature itself: bright on
 * the field, faded on the bench, white-edged while selected, a yellow `!` when a choice waits; pressing one selects it. On the
 * right, between waves, what the next wave brings (each kind's walk and how many) over the button that starts it (Space too), and
 * the speed (F) and, when the next wave was chosen to be elite (`Elite`), an ELITE tag. START waits while that choice is open.
 */
export function Bar({ lives, wave, active, waiting, onStartWave }: BarProps) {
  const roster = useGame((s) => s.roster);
  const selected = useGame((s) => s.selected);
  const tier = useGame((s) => s.tier);
  const speed = useGame((s) => s.speed);
  const elite = useGame((s) => s.elite);
  const { select, toggleSpeed } = useGame.actions();
  const next = previewOf(wave + 1, tier);
  const between = !active && wave < WAVE_COUNT;
  return (
    <Flex float anchor="top-left" to="top-left" x={2} y={TOP} width={316} height={180 - TOP - 2} direction="row" alignItems="end" justifyContent="space-between" gap={4}>
      <Flex direction="column" gap={2} paddingX={3} paddingY={3} background={GLASS} borderRadius={2}>
        <Text color="#f07a8a">{`LIVES ${lives}`}</Text>
        <Text color="#a7b0c8">{`WAVE ${wave}/${WAVE_COUNT}`}</Text>
      </Flex>
      <Flex direction="row" gap={2} alignItems="end">
        {roster.length > 0 && (
          <Flex paddingX={1} paddingY={2} background={GLASS} borderRadius={2}>
            <Text color="#6a7088">{`${onField(roster).length}/${FIELD_LIMIT}`}</Text>
          </Flex>
        )}
        {roster.map((c) => (
          <Flex
            key={c.id}
            width={16}
            height={16}
            background={GLASS}
            borderRadius={2}
            borderWidth={1}
            borderColor={c.id === selected ? "#ffffff" : c.choice !== null ? "#ffe066" : "#00000000"}
            onPress={() => select(c.id)}
          >
            <Entity x={8} y={8}>
              <AnimatedSprite
                sheet="creatures.png"
                frameWidth={12}
                frameHeight={12}
                animations={CREATURE_ANIMATIONS}
                animation={c.form === "" ? c.species : c.form}
                originX={6}
                originY={6}
                opacity={c.col >= 0 ? 1 : 0.6}
              />
            </Entity>
            {c.choice !== null && (
              <Flex float anchor="top-right" to="top-right" offsetX={0} offsetY={-1}>
                <Text color="#ffe066" outline="#10131c">!</Text>
              </Flex>
            )}
          </Flex>
        ))}
      </Flex>
      <Flex direction="column" gap={2} alignItems="end">
        {between && (
          <Flex direction="row" gap={1} alignItems="center" height={12} paddingX={2} background={GLASS} borderRadius={2}>
            <Text color="#6a7088">NEXT</Text>
            {next.map((g) => (
              <Flex key={g.kind} direction="row" alignItems="center" gap={1} height={12}>
                <Flex width={12} height={12}>
                  <Entity x={6} y={6}>
                    <AnimatedSprite
                      sheet="enemies.png"
                      frameWidth={16}
                      frameHeight={16}
                      animations={ENEMY_ANIMATIONS}
                      animation={g.kind}
                      originX={8}
                      originY={8}
                      scaleX={0.75}
                      scaleY={0.75}
                    />
                  </Entity>
                </Flex>
                <Text color="#a7b0c8">{`${g.count}`}</Text>
              </Flex>
            ))}
          </Flex>
        )}
        <Flex direction="row" gap={2}>
          {between && elite && (
            <Flex paddingX={3} paddingY={2} borderRadius={2} background="#8a3a5ae0">
              <Text color="#ffffff">ELITE</Text>
            </Flex>
          )}
          <Flex paddingX={3} paddingY={2} borderRadius={2} background={speed > 1 ? "#3a5a8ae0" : GLASS} onPress={toggleSpeed}>
            <Text color={speed > 1 ? "#ffffff" : "#a7b0c8"}>{`${speed}X`}</Text>
          </Flex>
          {between && !waiting && (
            <Flex paddingX={4} paddingY={2} borderRadius={2} background="#3a5a8ae0" onPress={onStartWave} pressKey="Space">
              <Text color="#ffffff">START</Text>
            </Flex>
          )}
        </Flex>
      </Flex>
    </Flex>
  );
}
