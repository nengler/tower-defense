import { createGameState } from "@rge/runtime";

import type { MoveId } from "./rules/moves.ts";
import { bench, earn, equipMove, newCreature, place, raiseMove, standingAt, unequipMove, type Owned } from "./rules/roster.ts";
import { SPECIES_IDS } from "./rules/species.ts";

type Screen = "title" | "settings" | "play" | "won" | "lost";

/**
 * What the screens share: which screen shows, whether play is paused, the settings, and the run's roster (the creatures owned,
 * where each stands, its level and moves) with the one selected. The battle itself (lives, waves, enemies) is `Play`'s own, and
 * each creature's cooldowns are its own.
 */
export const useGame = createGameState(
  {
    screen: "title" as Screen,
    paused: false,
    /** The volume, 0 to 10. */
    volume: 8,
    music: true,
    /** The wave the last run reached, for the end screen. */
    endWave: 0,
    roster: [] as readonly Owned[],
    /** The selected creature's id, or -1. */
    selected: -1,
    nextCreature: 1,
  },
  {
    /** A new run: every species once, on the bench. (Milestone picks replace this.) */
    start(s) {
      s.screen = "play";
      s.paused = false;
      s.roster = SPECIES_IDS.map((species, i) => newCreature(i + 1, species, 0));
      s.nextCreature = SPECIES_IDS.length + 1;
      s.selected = 1;
    },
    openSettings(s) {
      s.screen = "settings";
    },
    toTitle(s) {
      s.screen = "title";
      s.paused = false;
    },
    pause(s) {
      s.paused = true;
    },
    resume(s) {
      s.paused = false;
    },
    changeVolume(s, by: number) {
      s.volume = Math.min(10, Math.max(0, s.volume + by));
    },
    toggleMusic(s) {
      s.music = !s.music;
    },
    /** The run is over: `Play` says how it went, and the end screen shows. */
    finish(s, won: boolean, wave: number) {
      s.screen = won ? "won" : "lost";
      s.endWave = wave;
      s.paused = false;
    },
    /** Select the creature at this place in the roster (the bar's order), if there is one. */
    choose(s, index: number) {
      const c = s.roster[index];
      if (c !== undefined) s.selected = c.id;
    },
    /** Select a creature (on the field or the bench); selecting the selected one again deselects it. */
    select(s, id: number) {
      s.selected = s.selected === id ? -1 : id;
    },
    /**
     * A tile was pressed. With a creature on it, that creature is selected. Otherwise the selected creature goes there, if it may
     * (not path, at most 5 on the field), and stays selected.
     */
    tapTile(s, col: number, row: number) {
      const there = standingAt(s.roster, col, row);
      if (there !== undefined) {
        s.selected = there.id;
        return;
      }
      if (s.selected >= 0) s.roster = place(s.roster, s.selected, col, row);
    },
    /** Take the selected creature off the field. */
    benchSelected(s) {
      if (s.selected >= 0) s.roster = bench(s.roster, s.selected);
    },
    /** Equip a move the selected creature knows into a free slot. */
    equip(s, move: MoveId) {
      s.roster = equipMove(s.roster, s.selected, move);
    },
    /** Take a move out of the selected creature's slots. */
    unequip(s, move: MoveId) {
      s.roster = unequipMove(s.roster, s.selected, move);
    },
    /** Move one of the selected creature's moves a place earlier in the order it tries them. */
    raise(s, move: MoveId) {
      s.roster = raiseMove(s.roster, s.selected, move);
    },
    deselect(s) {
      s.selected = -1;
    },
    /** A creature dealt damage: it earns that much XP. */
    gainXp(s, id: number, amount: number) {
      s.roster = earn(s.roster, id, amount);
    },
  }
);
