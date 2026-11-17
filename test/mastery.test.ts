import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import { createMemoryStorage, setStorage } from "@tsengine/runtime";

import { useGame } from "../src/GameState.ts";
import { MASTERY_AT, MASTERY_PER_RUN, MASTERY_PER_WAVE, slotsFor } from "../src/rules/progress.ts";
import { save } from "../src/save.ts";

beforeEach(() => {
  useGame.store.reset();
  setStorage(null);
});

/** Start a run and take this species from the first offer (whatever it rolled, the offer is replaced so the test picks). */
function takeFirst(species: "emberling" | "puddlepup" | "voltkit") {
  const { start, takeOffer } = useGame.actions();
  start();
  useGame.setState({ offer: [species] });
  takeOffer(species);
}

test("a wave earns mastery for every creature on the field, not for the bench", () => {
  takeFirst("emberling");
  const { tapTile, takeOffer, awardWave } = useGame.actions();
  tapTile(0, 0);
  useGame.setState({ offer: ["voltkit"] });
  takeOffer("voltkit");
  awardWave();
  assert.equal(useGame.getState().mastery.emberling, MASTERY_PER_WAVE);
  assert.equal(useGame.getState().mastery.voltkit, 0, "on the bench");
});

test("the end of a run earns mastery once for each species the roster has", () => {
  takeFirst("puddlepup");
  const { takeOffer, finish } = useGame.actions();
  useGame.setState({ offer: ["puddlepup"] });
  takeOffer("puddlepup");
  finish(false, 2);
  assert.equal(useGame.getState().mastery.puddlepup, MASTERY_PER_RUN, "two puddlepups, one run");
  assert.equal(useGame.getState().screen, "lost");
});

test("a creature joins with its species' mastery: its first choice waiting at 1, a fourth slot at 3", () => {
  useGame.setState({ mastery: { emberling: MASTERY_AT[0]!, puddlepup: 0, voltkit: MASTERY_AT[2]!, pebblet: 0, sproutling: 0 } });
  takeFirst("emberling");
  const ember = useGame.getState().roster[0]!;
  assert.equal(ember.mastery, 1);
  assert.deepEqual(ember.equipped, ["spark"]);
  assert.deepEqual(ember.choice?.options, ["cinder", "jolt"]);
  takeFirst("voltkit");
  const volt = useGame.getState().roster[0]!;
  assert.equal(volt.mastery, 3);
  assert.equal(slotsFor(volt.mastery), 4);
  takeFirst("puddlepup");
  assert.deepEqual(useGame.getState().roster[0]!.equipped, ["jet"], "no mastery: one move");
  assert.equal(useGame.getState().roster[0]!.choice, null);
});

test("mastery is saved and loaded back; a new run keeps it", () => {
  const storage = createMemoryStorage();
  setStorage(storage);
  useGame.setState({ mastery: { emberling: 7, puddlepup: 0, voltkit: 31, pebblet: 0, sproutling: 0 } });
  assert.equal(save.write(), true);
  useGame.store.reset();
  assert.equal(useGame.getState().mastery.emberling, 0);
  assert.equal(save.load(), true);
  assert.deepEqual(useGame.getState().mastery, { emberling: 7, puddlepup: 0, voltkit: 31, pebblet: 0, sproutling: 0 });
  useGame.actions().start();
  assert.equal(useGame.getState().mastery.voltkit, 31, "a run starts fresh, but mastery stays");
});

test("a save missing a species, or with odd numbers in it, loads what makes sense and starts the rest at 0", () => {
  setStorage(createMemoryStorage({ mastery: JSON.stringify({ version: 1, data: { points: { emberling: 4.9, voltkit: -3 } } }) }));
  assert.equal(save.load(), true);
  assert.deepEqual(useGame.getState().mastery, { emberling: 4, puddlepup: 0, voltkit: 0, pebblet: 0, sproutling: 0 });
});

test("no save at all: nothing loads and mastery stays at 0", () => {
  setStorage(createMemoryStorage());
  assert.equal(save.load(), false);
  assert.deepEqual(useGame.getState().mastery, { emberling: 0, puddlepup: 0, voltkit: 0, pebblet: 0, sproutling: 0 });
});

test("the highest tier unlocked is saved with the mastery; a win at it unlocks the next, a daily run unlocks nothing", () => {
  const storage = createMemoryStorage();
  setStorage(storage);
  const { start, finish, startDaily, toTitle } = useGame.actions();
  start();
  finish(true, 10);
  assert.equal(useGame.getState().unlocked, 1);
  useGame.setState({ tier: 0 });
  start();
  finish(true, 10);
  assert.equal(useGame.getState().unlocked, 1, "a win below the top unlocks nothing");
  toTitle();
  startDaily({ seed: 5, map: "gauntlet", tier: 2, label: "2026-11-17" });
  assert.equal(useGame.getState().tier, 2);
  assert.equal(useGame.getState().map, "gauntlet");
  finish(true, 10);
  assert.equal(useGame.getState().unlocked, 1);
  save.write();
  useGame.store.reset();
  save.load();
  assert.equal(useGame.getState().unlocked, 1);
});
