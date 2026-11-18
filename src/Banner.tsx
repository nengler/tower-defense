import { Flex, Text } from "@tsengine/runtime/jsx";

import { useGame } from "./GameState.ts";
import { BANNER_WIDTH } from "./rules/hud.ts";
import { SPECIES } from "./rules/species.ts";
import { TYPE_COLOR } from "./rules/types.ts";

/**
 * Over the top of the field while a creature has a choice waiting (a move to learn, or a form to evolve into): who, and how to open
 * it. Pressing it (or N) opens the prompt. A move only gets used once it is learned, so the banner stays until every choice is made.
 */
interface BannerProps {
  /** Pixels from the left of the screen: `Play` moves it clear of the card. */
  x: number;
}

export function Banner({ x }: BannerProps) {
  const roster = useGame((s) => s.roster);
  const { openNextPrompt } = useGame.actions();
  const waiting = roster.filter((c) => c.choice !== null);
  const evolving = waiting[0]?.choice?.kind === "form";
  const species = waiting[0]?.species ?? "emberling";
  return (
    <Flex
      float
      anchor="top-left"
      to="top-left"
      x={x}
      y={2}
      width={BANNER_WIDTH}
      direction="row"
      justifyContent="center"
      gap={3}
      paddingX={3}
      paddingY={2}
      background="#2a3a5af0"
      borderWidth={1}
      borderColor={TYPE_COLOR[SPECIES[species].type]}
      onPress={openNextPrompt}
    >
      <Text color="#ffe066">{evolving ? "EVOLVE!" : "NEW MOVE!"}</Text>
      <Text>{`${SPECIES[species].name}${waiting.length > 1 ? ` +${waiting.length - 1}` : ""} [N]`}</Text>
    </Flex>
  );
}
