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

test("the title's Play starts the run with a milestone; taking a creature selects it; Escape closes its card, then pauses", () => {
  const frames = parseInputScript("_*2, Enter, _*5, Enter, _*3, Escape, _*2, Escape, _*5, Enter, _*5", { bindings });
  const { states } = runScript(gameConfig, frames, seen);
  assert.equal(states[1]!.screen, "title");
  assert.equal(states[7]!.screen, "play");
  assert.equal(states[7]!.offer, 3, "the first milestone offers three");
  assert.equal(states[11]!.offer, 0, "Enter took the first");
  assert.equal(states[11]!.roster, 1);
  assert.equal(states[14]!.paused, false, "the first Escape closed the card");
  assert.equal(states[20]!.paused, true, "the second paused");
  assert.equal(states[states.length - 1]!.paused, false, "Resume played on");
});

test("no wave starts while a milestone's offer is open; once a creature is taken, Space starts it and its enemies come", () => {
  const frames = parseInputScript("_*2, Enter, _*3, Space, _*30, Enter, _*3, Space, _*120", { bindings });
  const { states } = runScript(gameConfig, frames, seen);
  assert.equal(states[30]!.enemies, 0, "Space did nothing while the offer was open");
  assert.ok(states[states.length - 1]!.enemies >= 2, "the first enemies are on the field after two seconds");
});

test("Settings: down to it, Enter, then right turns the volume up and Escape goes back", () => {
  const frames = parseInputScript("_*2, down, _*2, Enter, _*3, right, _*2, right, _*2, Escape, _*3", { bindings });
  const { states } = runScript(gameConfig, frames, seen);
  const last = states[states.length - 1]!;
  assert.equal(states[6]!.screen, "settings");
  assert.equal(last.volume, 10);
  assert.equal(last.screen, "title");
});
