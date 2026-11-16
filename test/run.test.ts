import assert from "node:assert/strict";
import { test } from "node:test";

import { parseInputScript, runScript, type Player } from "@rge/player";
import { findComponent } from "@rge/testing";

import { bindings, gameConfig, screen } from "../game.ts";
import { useGame } from "../src/GameState.ts";
import { centre } from "../src/rules/map.ts";

/** A click on a tile's middle. */
const tile = (col: number, row: number) => `click@${centre(col, row).x},${centre(col, row).y}`;

function play(script: string) {
  const frames = parseInputScript(script, { bindings, screen });
  return runScript(gameConfig, frames, (player: Player) => {
    const play = findComponent("Play", player.world.root);
    const battle = play === null ? null : ((play as unknown as { $s_lives: number; $s_wave: number; $s_active: boolean }));
    const { screen: shown, roster } = useGame.getState();
    return {
      screen: shown,
      lives: battle?.$s_lives ?? -1,
      wave: battle?.$s_wave ?? -1,
      active: battle?.$s_active ?? false,
      xp: roster.map((c) => c.xp + c.level * 1000),
      placed: roster.filter((c) => c.col >= 0).length,
    };
  });
}

test("the game itself: three creatures placed by clicks hold wave 1 far better than nobody, and earn XP", () => {
  // Title → Play. Creature 1 is selected at the start; 2 and 3 by their keys. Each goes beside the path's first bend.
  const place = `first, _, ${tile(3, 2)}, _, second, _, ${tile(5, 2)}, _, third, _, ${tile(5, 4)}, _`;
  const { states } = play(`_*2, Enter, _*3, ${place}, Space, _*2100`);
  const last = states[states.length - 1]!;
  assert.equal(last.placed, 3);
  assert.equal(last.wave, 1);
  assert.equal(last.active, false, "the wave is over");
  assert.ok(last.lives >= 8, `lives ${last.lives}`);
  assert.ok(
    last.xp.every((x) => x > 1000),
    `every creature earned XP: ${last.xp.join(", ")}`
  );
});

test("the same wave with nobody on the field costs a life per enemy", () => {
  const { states } = play(`_*2, Enter, _*3, Space, _*2100`);
  assert.equal(states[states.length - 1]!.lives, 4);
});
