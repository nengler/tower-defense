import { AnimatedSprite, Entity, Flex, Text } from "@tsengine/runtime/jsx";

import { Card } from "./Card.tsx";
import { useGame } from "./GameState.ts";
import { ENEMIES } from "./rules/enemies.ts";
import { ENEMY_ANIMATIONS } from "./rules/draw.ts";
import { FIELD_WIDTH, SCREEN_HEIGHT, SCREEN_WIDTH } from "./rules/map.ts";
import { creatureById } from "./rules/roster.ts";
import { TYPE_COLOR } from "./rules/types.ts";
import { previewOf, WAVE_COUNT } from "./rules/waves.ts";

interface PanelProps {
  /** Waves started so far, and whether one is on. */
  wave: number;
  active: boolean;
}

/**
 * The side panel, right of the field. On top, the wave: between waves what the next one brings, during one what this one brought
 * (each kind's walk, name, type and how many). Under it the selected creature's card, or, with none selected, how to play.
 */
export function Panel({ wave, active }: PanelProps) {
  const tier = useGame((s) => s.tier);
  const roster = useGame((s) => s.roster);
  const selectedId = useGame((s) => s.selected);
  const chosen = creatureById(roster, selectedId);
  const shown = active || wave >= WAVE_COUNT ? wave : wave + 1;
  const groups = previewOf(shown, tier);
  return (
    <Flex
      float
      anchor="top-left"
      to="top-left"
      x={FIELD_WIDTH}
      width={SCREEN_WIDTH - FIELD_WIDTH}
      height={SCREEN_HEIGHT}
      direction="column"
      gap={4}
      padding={4}
      background="#141824"
    >
      <Text color="#a7b0c8">{active ? `WAVE ${shown}` : shown > WAVE_COUNT ? "NO MORE WAVES" : `NEXT: WAVE ${shown}`}</Text>
      <Flex direction="column" gap={1} width="grow">
        {groups.map((g) => (
          <Flex key={g.kind} direction="row" alignItems="center" gap={3} height={12} width="grow">
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
            <Text color={TYPE_COLOR[ENEMIES[g.kind].type]}>{ENEMIES[g.kind].name}</Text>
            <Flex width="grow" />
            <Text color="#a7b0c8">{`x${g.count}`}</Text>
          </Flex>
        ))}
      </Flex>
      {chosen !== undefined && <Card creature={chosen} />}
      {chosen === undefined && (
        <Flex direction="column" gap={3} width="grow" height="grow" padding={4} background="#1a1f2e">
          <Text color="#6a7088">CLICK A CREATURE OR CHIP</Text>
          <Text color="#6a7088">TO SEE ITS CARD.</Text>
          <Text color="#6a7088">1-9 SELECT, BACKSPACE BENCHES</Text>
          <Text color="#6a7088">N: NEW MOVE  F: SPEED</Text>
          <Text color="#6a7088">E: ELITE  ESC: PAUSE</Text>
        </Flex>
      )}
    </Flex>
  );
}
