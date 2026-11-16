import assert from "node:assert/strict";
import { test } from "node:test";

import { parseInputScript, runScript, type Player } from "@rge/player";
import { findComponent, findComponents } from "@rge/testing";

import { bindings, gameConfig } from "../game.ts";
import { useGame } from "../src/GameState.ts";

/** Which screen shows, whether play is paused, the volume, and how many enemies are on the field. */
function seen(player: Player): { screen: string; paused: boolean; volume: number; play: boolean; enemies: number } {
  const { screen, paused, volume } = useGame.getState();
  return {
    screen,
    paused,
    volume,
    play: findComponent("Play", player.world.root) !== null,
    enemies: findComponents("Enemy", player.world.root).length,
  };
}

test("the title's Play starts the run; Escape closes the selected creature's card, then pauses; Resume plays on", () => {
  const frames = parseInputScript("_*2, Enter, _*5, Escape, _*2, Escape, _*5, Enter, _*5", { bindings });
  const { states } = runScript(gameConfig, frames, seen);
  assert.equal(states[1]!.screen, "title");
  assert.equal(states[7]!.screen, "play");
  assert.equal(states[7]!.play, true);
  assert.equal(states[10]!.paused, false, "the first Escape closed the card");
  assert.equal(states[16]!.paused, true, "the second paused");
  assert.equal(states[states.length - 1]!.paused, false, "Resume played on");
});

test("Space starts the first wave, and its enemies come", () => {
  const frames = parseInputScript("_*2, Enter, _*3, Space, _*120", { bindings });
  const { states } = runScript(gameConfig, frames, seen);
  assert.equal(states[5]!.enemies, 0, "nothing comes before the wave starts");
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
