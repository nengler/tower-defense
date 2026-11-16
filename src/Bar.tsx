import { Flex, Text } from "@tsengine/runtime/jsx";

import { useGame } from "./GameState.ts";
import { FIELD_HEIGHT } from "./rules/map.ts";
import { FIELD_LIMIT, onField } from "./rules/roster.ts";
import { SPECIES } from "./rules/species.ts";
import { TYPE_COLOR } from "./rules/types.ts";
import { WAVE_COUNT } from "./rules/waves.ts";

interface BarProps {
  lives: number;
  wave: number;
  /** A wave is on. */
  active: boolean;
  onStartWave: () => void;
}

/**
 * The bottom 36 pixels: lives and the wave; a chip for every creature owned (its type's colour and level; dark while it is on the
 * field, white-edged while selected), which selects it; and the button that starts the next wave (Space too).
 */
export function Bar({ lives, wave, active, onStartWave }: BarProps) {
  const roster = useGame((s) => s.roster);
  const selected = useGame((s) => s.selected);
  const { select } = useGame.actions();
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
      paddingX={6}
      gap={6}
      background="#141824"
    >
      <Flex direction="column" gap={2}>
        <Text color="#f07a8a">{`LIVES ${lives}`}</Text>
        <Text color="#a7b0c8">{`WAVE ${wave}/${WAVE_COUNT}`}</Text>
      </Flex>
      <Flex direction="column" gap={2} width="grow">
        <Flex direction="row" gap={3}>
          {roster.map((c) => (
            <Flex
              key={c.id}
              width={18}
              height={14}
              alignItems="center"
              justifyContent="center"
              background={c.col >= 0 ? "#2a2f40" : TYPE_COLOR[SPECIES[c.species].type]}
              borderWidth={1}
              borderColor={c.id === selected ? "#ffffff" : "#141824"}
              onPress={() => select(c.id)}
            >
              <Text color={c.col >= 0 ? TYPE_COLOR[SPECIES[c.species].type] : "#141824"}>{`${c.level}`}</Text>
            </Flex>
          ))}
        </Flex>
        <Text color="#6a7088">{`ON FIELD ${onField(roster).length}/${FIELD_LIMIT}`}</Text>
      </Flex>
      <Flex padding={4} background={active ? "#2a2f40" : "#3a5a8a"} onPress={onStartWave} pressKey="Space">
        <Text color={active ? "#6a7088" : "#ffffff"}>{active ? "WAVE ON" : "START"}</Text>
      </Flex>
    </Flex>
  );
}
