import { Button, Flex, Menu, Text, useMutable } from "@tsengine/runtime/jsx";

import { useGame } from "./GameState.ts";
import { asForm, asMove, optionDetail, optionMove, optionName, optionText } from "./rules/choice.ts";
import { MOVES, type MoveId } from "./rules/moves.ts";
import { slotsFor } from "./rules/progress.ts";
import { creatureById } from "./rules/roster.ts";
import { SPECIES } from "./rules/species.ts";
import { TYPE_COLOR } from "./rules/types.ts";

/**
 * The learn prompt, for the creature whose choice is waiting (`prompting`): pick one of two moves, or one of two forms to evolve
 * into. When its slots are full it asks next which equipped move the new one replaces, or whether it waits in the move list; with a
 * free slot it is equipped there. LATER (or Escape) closes it with the choice still waiting. It is `modal`, and the battle stands still while it
 * is open (`Main`), so a choice made mid-wave costs no time.
 */
export function Prompt() {
  const id = useGame((s) => s.prompting);
  const roster = useGame((s) => s.roster);
  const { chooseMove, chooseForm, closePrompt } = useGame.actions();
  const c = creatureById(roster, id);
  const s = useMutable({ picked: "" as string });
  const choice = c?.choice ?? null;
  const isForm = choice?.kind === "form";
  const full = (c?.equipped.length ?? 0) >= slotsFor(c?.mastery ?? 0);
  /** The move the pick teaches: the move itself, or the form's. */
  const teaches = s.picked === "" ? "" : MOVES[optionMove(s.picked, isForm)].name;
  const species = SPECIES[c?.species ?? "emberling"];
  const color = TYPE_COLOR[species.type];

  const take = (option: string) => {
    if (full) {
      s.picked = option;
      return;
    }
    if (isForm) chooseForm(asForm(option), "");
    else chooseMove(asMove(option), "");
  };
  const replace = (move: MoveId | "") => {
    if (isForm) chooseForm(asForm(s.picked), move);
    else chooseMove(asMove(s.picked), move);
  };

  return (
    <Flex modal width={480} height={270} background="#10131ce8" direction="column" alignItems="center" justifyContent="center" gap={6}>
      <Text size={16} color={color}>
        {isForm ? "EVOLVE" : "NEW MOVE"}
      </Text>
      <Text color="#a7b0c8">{`${species.name} LV${c?.level ?? 1}`}</Text>
      <Text color="#6a7088">{`EQUIPPED: ${(c?.equipped ?? []).map((m) => MOVES[m].name).join(", ")}`}</Text>
      {s.picked === "" && (
        <Menu direction="row" gap={6} onBack={closePrompt}>
          {(choice?.options ?? []).map((option) => (
            <Button key={option} autoFocus={option === choice?.options[0]} onPress={() => take(option)} padding={6} width={160} direction="column" gap={3}>
              <Text color={isForm ? color : TYPE_COLOR[MOVES[optionMove(option, false)].type]}>{optionName(option, isForm)}</Text>
              <Text color="#a7b0c8">{optionText(option, isForm)}</Text>
              <Text color="#6a7088">{optionDetail(option, isForm)}</Text>
            </Button>
          ))}
        </Menu>
      )}
      {s.picked !== "" && <Text color="#ffe066">{`SLOTS FULL: ${teaches} REPLACES`}</Text>}
      {s.picked !== "" && (
        <Menu direction="row" gap={4} onBack={closePrompt}>
          {(c?.equipped ?? []).map((move) => (
            <Button key={move} autoFocus={move === c?.equipped[0]} onPress={() => replace(move)} padding={3}>
              <Text color={TYPE_COLOR[MOVES[move].type]}>{MOVES[move].name}</Text>
            </Button>
          ))}
        </Menu>
      )}
      <Menu direction="row" gap={6} onBack={closePrompt}>
        {s.picked !== "" && (
          <Button onPress={() => replace("")} padding={3}>
            <Text color="#a7b0c8">KEEP IN LIST</Text>
          </Button>
        )}
        <Button onPress={closePrompt} padding={3}>
          <Text color="#6a7088">LATER</Text>
        </Button>
      </Menu>
    </Flex>
  );
}
