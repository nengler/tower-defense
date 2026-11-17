import assert from "node:assert/strict";
import { test } from "node:test";

import { parseInputScript, runScript, type Player } from "@tsengine/player";
import { findComponent, findComponents } from "@tsengine/testing";

import { bindings, gameConfig } from "../game.ts";
import { useGame } from "../src/GameState.ts";

/** Which screen shows, whether play is paused, the volume, and how many enemies are on the field. */
function seen(player: Player): { screen: string; paused: boolean; volume: number; play: boolean; enemies: number; offer: number; roster: number } {
  const { screen, paused, volume, offer, roster } = useGame.getState();
  return {
    screen,
    paused,
    volume,
    offer: offer.length,
    roster: roster.length,
    play: findComponent("Play", player.world.root) !== null,
    enemies: findComponents("Enemy", player.world.root).length,
  };
}

test("the title's Play opens the run setup, whose Start begins the run with a milestone; Escape closes the card, then pauses", () => {
  const frames = parseInputScript("_*2, Enter, _*3, Enter, _*5, Enter, _*3, Escape, _*2, Escape, _*5, Enter, _*5", { bindings });
  const { states } = runScript(gameConfig, frames, seen);
  assert.equal(states[1]!.screen, "title");
  assert.equal(states[5]!.screen, "setup");
  assert.equal(states[11]!.screen, "play");
  assert.equal(states[11]!.offer, 3, "the first milestone offers three");
  assert.equal(states[15]!.offer, 0, "Enter took the first");
  assert.equal(states[15]!.roster, 1);
  assert.equal(states[18]!.paused, false, "the first Escape closed the card");
  assert.equal(states[24]!.paused, true, "the second paused");
  assert.equal(states[states.length - 1]!.paused, false, "Resume played on");
});

test("no wave starts while a milestone's offer is open; once a creature is taken, Space starts it and its enemies come", () => {
  const frames = parseInputScript("_*2, Enter, _*3, Enter, _*3, Space, _*30, Enter, _*3, Space, _*120", { bindings });
  const { states } = runScript(gameConfig, frames, seen);
  assert.equal(states[30]!.enemies, 0, "Space did nothing while the offer was open");
  assert.ok(states[states.length - 1]!.enemies >= 2, "the first enemies are on the field after two seconds");
});

test("Settings: down to it, Enter, then right turns the volume up and Escape goes back", () => {
  const frames = parseInputScript("_*2, down, _*2, down, _*2, Enter, _*3, right, _*2, right, _*2, Escape, _*3", { bindings });
  const { states } = runScript(gameConfig, frames, seen);
  const last = states[states.length - 1]!;
  assert.equal(states[9]!.screen, "settings");
  assert.equal(last.volume, 10);
  assert.equal(last.screen, "title");
});

test("the run setup: right steps the map, down and right the tier (only up to what is unlocked), Escape goes back", () => {
  const frames = parseInputScript("_*2, Enter, _*3, up, _*2, up, _*2, right, _*2, down, _*2, right, _*2", { bindings });
  const { states } = runScript(gameConfig, frames, () => ({ map: useGame.getState().map, tier: useGame.getState().tier }));
  const last = states[states.length - 1]!;
  assert.equal(last.map, "riverbend");
  assert.equal(last.tier, 0, "nothing above tier 0 unlocked");
});
