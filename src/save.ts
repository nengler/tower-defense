import { createSave } from "@tsengine/runtime";

import { useGame } from "./GameState.ts";
import { SPECIES_IDS, type SpeciesId } from "./rules/species.ts";
import { TOP_TIER } from "./rules/tiers.ts";

interface Saved {
  /** Mastery points by species. */
  readonly points: Readonly<Partial<Record<SpeciesId, number>>>;
  /** The highest difficulty tier unlocked (missing in older saves: 0). */
  readonly unlocked?: number;
}

/**
 * The game's save: each species' mastery points and the highest difficulty tier unlocked, what a run keeps. Kept in the player's data folder (`<Game id>`), loaded
 * when the game starts (`Main`), and written when a wave ends and when a run does (`Play`). A species the save does not know starts
 * at 0, so adding one needs no new version.
 */
export const save = createSave<Saved>({
  name: "mastery",
  version: 1,
  pick: () => ({ points: { ...useGame.getState().mastery }, unlocked: useGame.getState().unlocked }),
  apply: (data) => {
    const mastery = { ...useGame.getState().mastery };
    for (const id of SPECIES_IDS) mastery[id] = Math.max(0, Math.floor(data.points[id] ?? 0));
    const unlocked = Math.min(TOP_TIER, Math.max(0, Math.floor(data.unlocked ?? 0)));
    useGame.setState({ mastery, unlocked });
  },
});
