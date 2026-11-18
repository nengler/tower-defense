import { createGameState } from "@tsengine/runtime";

import { setVolume, sfx } from "./effects.ts";

import { MAP_IDS, mapOf, type MapId } from "./rules/map.ts";
import type { MoveId } from "./rules/moves.ts";
import {
  bench,
  creatureById,
  earn,
  equipMove,
  evolve,
  learn,
  newCreature,
  place,
  raiseMove,
  standingAt,
  swap,
  unequipMove,
  type Owned,
} from "./rules/roster.ts";
import { MASTERY_PER_RUN, MASTERY_PER_WAVE, masteryLevel } from "./rules/progress.ts";
import { pick } from "./rules/rng.ts";
import { SPECIES_IDS, type FormId, type SpeciesId } from "./rules/species.ts";
import { ELITE_OFFER, TOP_TIER, type Daily } from "./rules/tiers.ts";
import { OFFER_SIZE } from "./rules/waves.ts";

type Screen = "title" | "settings" | "setup" | "play" | "won" | "lost";

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
    /** The selected creature is being placed or moved: its card is out of the way and a press on a tile puts it there. */
    moving: false,
    /** The move whose numbers the selected creature's card shows, and whose reach the field rings around it, or "". */
    inspected: "" as MoveId | "",
    nextCreature: 1,
    /** The creatures a milestone offers; empty while there is no milestone. */
    offer: [] as readonly SpeciesId[],
    /** What offers are rolled from: each run starts from the next seed, so runs differ but a test can replay one. */
    seed: 1,
    /** Mastery points of each species: kept between runs (see `save.ts`). */
    mastery: { emberling: 0, puddlepup: 0, voltkit: 0, pebblet: 0, sproutling: 0 } as Readonly<Record<SpeciesId, number>>,
    /** The highest difficulty tier unlocked (winning at the top one unlocks the next): kept between runs. */
    unlocked: 0,
    /** The run's map and difficulty tier, chosen on the setup screen (or set by the daily run). */
    map: "meadow" as MapId,
    tier: 0,
    /** The daily run's date while one is played, else "". */
    daily: "",
    /** Game speed: 1, or 2 for fast-forward. */
    speed: 1,
    /** The next wave is elite (tougher, and the milestone after it offers more). */
    elite: false,
    /** Whether elite or not has been chosen for the next wave: once it has, it is locked in until that wave starts. */
    eliteChosen: false,
    /** The creature whose learn prompt is open, or -1. The battle stands still while it is. */
    prompting: -1,
  },
  {
    /** The title's Play: the setup screen, to pick a map and a tier. */
    openSetup(s) {
      s.screen = "setup";
    },
    /** Step through the maps. */
    nextMap(s, by: number) {
      const i = MAP_IDS.indexOf(mapOf(s.map).id);
      s.map = MAP_IDS[(i + by + MAP_IDS.length) % MAP_IDS.length] as MapId;
    },
    /** Step through the tiers unlocked. */
    nextTier(s, by: number) {
      s.tier = Math.min(s.unlocked, Math.max(0, s.tier + by));
    },
    /** A new run on the chosen map and tier: no creatures, and the first milestone's offer. */
    start(s) {
      s.screen = "play";
      s.paused = false;
      s.roster = [];
      s.nextCreature = 1;
      s.selected = -1;
      s.moving = false;
      s.inspected = "";
      s.prompting = -1;
      s.elite = false;
      s.eliteChosen = false;
      s.tier = Math.min(s.tier, s.unlocked);
      s.daily = "";
      const rolled = pick(SPECIES_IDS, OFFER_SIZE, s.seed);
      s.offer = rolled.picked;
      s.seed = rolled.seed;
    },
    /** Today's run: its map, tier and seed are the day's, the same for everyone. */
    startDaily(s, daily: Daily) {
      s.map = daily.map;
      s.seed = daily.seed;
      useGame.actions().start();
      // After `start`, which keeps a chosen tier to what is unlocked: the daily's tier is its own.
      s.tier = daily.tier;
      s.daily = daily.label;
    },
    /** A milestone: roll an offer, of more creatures after an elite wave. */
    milestone(s, afterElite: boolean) {
      const rolled = pick(SPECIES_IDS, afterElite ? ELITE_OFFER : OFFER_SIZE, s.seed);
      s.offer = rolled.picked;
      s.seed = rolled.seed;
    },
    /** Choose whether the next wave is elite. Once chosen it is locked in: a second choice changes nothing. */
    chooseElite(s, elite: boolean) {
      if (s.eliteChosen) return;
      s.elite = elite;
      s.eliteChosen = true;
    },
    /** A wave started: the choice was used, and the next eligible wave asks again. */
    clearElite(s) {
      s.elite = false;
      s.eliteChosen = false;
    },
    /** Fast-forward on or off. */
    toggleSpeed(s) {
      s.speed = s.speed === 1 ? 2 : 1;
    },
    /** Open a creature's learn prompt (it must have a choice waiting). */
    openPrompt(s, id: number) {
      if (creatureById(s.roster, id)?.choice != null) s.prompting = id;
    },
    /** The first creature with a choice waiting: its prompt opens. */
    openNextPrompt(s) {
      const c = s.roster.find((o) => o.choice !== null);
      if (c !== undefined) s.prompting = c.id;
    },
    closePrompt(s) {
      s.prompting = -1;
    },
    /** The prompt's pick: the move learned (in place of `replace`, or into a free slot), and the prompt closed. */
    chooseMove(s, move: MoveId, replace: MoveId | "") {
      s.roster = learn(s.roster, s.prompting, move, replace);
      s.prompting = -1;
      sfx.play("level");
    },
    /** The prompt's pick of a form: it evolves, and learns the form's move. */
    chooseForm(s, form: FormId, replace: MoveId | "") {
      s.roster = evolve(s.roster, s.prompting, form, replace);
      s.prompting = -1;
      sfx.play("level");
    },
    /** Take a creature the offer has: it joins the roster on the bench, selected and being placed, so a press on a tile puts it there. */
    takeOffer(s, species: SpeciesId) {
      if (!s.offer.includes(species)) return;
      s.roster = [...s.roster, newCreature(s.nextCreature, species, masteryLevel(s.mastery[species]))];
      s.selected = s.nextCreature;
      s.moving = true;
      s.inspected = "";
      s.nextCreature += 1;
      s.offer = [];
      sfx.play("pick");
    },
    openSettings(s) {
      s.screen = "settings";
    },
    toTitle(s) {
      s.screen = "title";
      s.paused = false;
      s.daily = "";
    },
    pause(s) {
      s.paused = true;
    },
    resume(s) {
      s.paused = false;
    },
    changeVolume(s, by: number) {
      s.volume = Math.min(10, Math.max(0, s.volume + by));
      setVolume(s.volume / 10);
    },
    toggleMusic(s) {
      s.music = !s.music;
    },
    /** A wave ended: every creature on the field earns its species mastery. */
    awardWave(s) {
      const next = { ...s.mastery };
      for (const c of s.roster) if (c.col >= 0) next[c.species] += MASTERY_PER_WAVE;
      s.mastery = next;
    },
    /** The run is over: `Play` says how it went, every species in the roster earns mastery for the run, and the end screen shows. */
    finish(s, won: boolean, wave: number) {
      const next = { ...s.mastery };
      for (const species of new Set(s.roster.map((c) => c.species))) next[species] += MASTERY_PER_RUN;
      s.mastery = next;
      s.screen = won ? "won" : "lost";
      s.endWave = wave;
      s.paused = false;
      s.prompting = -1;
      s.speed = 1;
      // A win at the top tier unlocked opens the next. The daily run's tier is set for it, so it unlocks nothing.
      if (won && s.daily === "" && s.tier === s.unlocked) s.unlocked = Math.min(TOP_TIER, s.unlocked + 1);
    },
    /** Select the creature at this place in the roster (the bar's order), if there is one. */
    choose(s, index: number) {
      const c = s.roster[index];
      if (c !== undefined && c.id !== s.selected) {
        s.selected = c.id;
        s.inspected = "";
      }
      s.moving = false;
    },
    /** Select a creature (on the field or the bench); selecting the selected one again deselects it. */
    select(s, id: number) {
      s.selected = s.selected === id ? -1 : id;
      s.moving = false;
      s.inspected = "";
    },
    /** Pick the selected creature up, to place it (from the bench) or move it (on the field): its card makes way for the field. */
    startMove(s) {
      if (s.selected >= 0) s.moving = true;
    },
    /**
     * A tile was pressed. While a creature is being moved (MOVE or PLACE on its card, or M): on its own tile, the move is called off;
     * on another creature's, the two trade places (`swap`); on a free tile, it goes there if it may (open ground, at most 5 on the
     * field), and stays selected, its card back. Otherwise a creature on the tile is selected, and a press anywhere else closes the
     * card, as CLOSE does: a creature only moves when asked to.
     */
    tapTile(s, col: number, row: number) {
      const there = standingAt(s.roster, col, row);
      if (s.moving && there !== undefined && s.selected >= 0) {
        s.moving = false;
        if (there.id === s.selected) return;
        s.roster = swap(s.roster, s.selected, there.id);
        sfx.play("pick");
        return;
      }
      if (there !== undefined) {
        if (there.id !== s.selected) s.inspected = "";
        s.selected = there.id;
        s.moving = false;
        return;
      }
      if (s.selected < 0) return;
      if (!s.moving) {
        s.selected = -1;
        s.inspected = "";
        return;
      }
      const before = s.roster;
      s.roster = place(s.roster, s.map, s.selected, col, row);
      if (s.roster !== before) {
        s.moving = false;
        sfx.play("pick");
      }
    },
    /** Take the selected creature off the field. */
    benchSelected(s) {
      if (s.selected >= 0) s.roster = bench(s.roster, s.selected);
      s.moving = false;
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
      s.moving = false;
      s.inspected = "";
    },
    /** Show a move's numbers on the card and its reach on the field; pressing the same move again puts them away. */
    inspect(s, move: MoveId) {
      s.inspected = s.inspected === move ? "" : move;
    },
    /** A creature dealt damage: it earns that much XP. */
    gainXp(s, id: number, amount: number) {
      const before = s.roster.find((c) => c.id === id)?.level ?? 0;
      s.roster = earn(s.roster, id, amount);
      if ((s.roster.find((c) => c.id === id)?.level ?? 0) > before) sfx.play("level");
    },
  }
);
