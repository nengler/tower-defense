import assert from "node:assert/strict";
import { test } from "node:test";

import { parseInputScript, runScript, type Player } from "@rge/player";
import { findComponent } from "@rge/testing";

import { bindings, gameConfig } from "../game.ts";
import { useGame } from "../src/GameState.ts";

/** Which screen shows, whether play is paused, the volume, and whether the hero is in the world. */
function seen(player: Player): { screen: string; paused: boolean; volume: number; hero: boolean } {
  const { screen, paused, volume } = useGame.getState();
  return { screen, paused, volume, hero: findComponent("Hero", player.world.root) !== null };
}

test("the title's Play starts the game, Escape pauses it, and the pause menu's Resume plays on", () => {
  // Enter presses the focused button (Play); Escape opens the pause menu; Enter presses its first button (Resume).
  const frames = parseInputScript("_*2, Enter, _*5, Escape, _*5, Enter, _*5", { bindings });
  const { states } = runScript(gameConfig, frames, seen);
  assert.deepEqual(states[1], { screen: "title", paused: false, volume: 8, hero: false });
  assert.equal(states[7]!.screen, "play");
  assert.equal(states[7]!.hero, true);
  assert.equal(states[13]!.paused, true, "Escape paused it");
  assert.equal(states[19]!.paused, false, "Resume played on");
});

test("Settings: down to it, Enter, then right turns the volume up and Escape goes back", () => {
  const frames = parseInputScript("_*2, down, _*2, Enter, _*3, right, _*2, right, _*2, Escape, _*3", { bindings });
  const { states } = runScript(gameConfig, frames, seen);
  const last = states[states.length - 1]!;
  assert.equal(states[6]!.screen, "settings");
  assert.equal(last.volume, 10);
  assert.equal(last.screen, "title");
});
