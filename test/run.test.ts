import assert from "node:assert/strict";
import { test } from "node:test";

import { parseInputScript, runScript, type Player } from "@tsengine/player";
import { findComponent } from "@tsengine/testing";

import { bindings, gameConfig, screen } from "../game.ts";
import { useGame } from "../src/GameState.ts";
import { sfx } from "../src/effects.ts";
import { centre } from "../src/rules/map.ts";

/** A click on a tile's middle. */
const tile = (col: number, row: number) => `click@${centre(col, row).x},${centre(col, row).y}`;

function play(script: string) {
  const frames = parseInputScript(script, { bindings, screen });
  return runScript(gameConfig, frames, (player: Player) => {
    const play = findComponent("Play", player.world.root);
    const battle = play === null ? null : ((play as unknown as { $s_lives: number; $s_wave: number; $s_active: boolean }));
    const { screen: shown, roster, offer } = useGame.getState();
    return {
      screen: shown,
      lives: battle?.$s_lives ?? -1,
      wave: battle?.$s_wave ?? -1,
      active: battle?.$s_active ?? false,
      xp: roster.map((c) => c.xp + c.level * 1000),
      species: roster.map((c) => c.species),
      placed: roster.filter((c) => c.col >= 0).length,
      at: roster.map((c) => `${c.col},${c.row}`),
      offer: offer.length,
    };
  });
}

test("the game itself: the creature taken at the start, placed by a click, holds most of wave 1 and earns XP", () => {
  const { states } = play(`_*2, Enter, _*3, Enter, _*3, Enter, _*2, ${tile(3, 2)}, _, Space, _*2100`);
  const last = states[states.length - 1]!;
  assert.equal(last.placed, 1);
  assert.equal(last.wave, 1);
  assert.equal(last.active, false, "the wave is over");
  assert.ok(last.lives >= 7, `lives ${last.lives}`);
  assert.ok(last.xp[0]! > 1000, "it earned XP");
});

test("a milestone comes before wave 2: after wave 1 a second creature is offered, and Space waits for it", () => {
  const wave = `Space, _*2100`;
  // The second creature offered (right, then Enter): the Emberling, which holds the first two waves alone.
  const { states } = play(`_*2, Enter, _*3, Enter, _*5, right, _, Enter, _*2, ${tile(3, 2)}, _, ${wave}, Space, _*5`);
  const last = states[states.length - 1]!;
  assert.equal(last.screen, "play");
  assert.equal(last.wave, 1, "wave 2 did not start");
  assert.equal(last.offer, 3);
});

test("the same wave with nobody on the field costs a life per enemy", () => {
  const { states } = play(`_*2, Enter, _*3, Enter, _*3, Enter, _*3, Space, _*2100`);
  assert.equal(states[states.length - 1]!.lives, 5);
});

test("a wave sounds like one: its horn, hits landing, enemies dying, and a level-up", () => {
  const before = { wave: sfx.plays("wave"), hit: sfx.plays("hit"), die: sfx.plays("die"), level: sfx.plays("level"), pick: sfx.plays("pick") };
  play(`_*2, Enter, _*3, Enter, _*5, right, _, Enter, _*2, ${tile(3, 2)}, _, Space, _*2100`);
  assert.equal(sfx.plays("wave") - before.wave, 1);
  assert.equal(sfx.plays("pick") - before.pick, 2, "taken, then placed");
  assert.ok(sfx.plays("hit") - before.hit > 5);
  assert.ok(sfx.plays("die") - before.die >= 3);
  assert.ok(sfx.plays("level") - before.level >= 1);
});

test("the card is in the side panel: the field stays free, and a press on the panel never moves the creature", () => {
  // The creature goes on (3, 2) and stays selected, so its card shows in the panel. A press on the panel leaves it where it is; a
  // press on a free tile anywhere on the field moves it there.
  const { states } = play(`_*2, Enter, _*3, Enter, _*3, Enter, _*2, ${tile(3, 2)}, _*2, click@400,200, _*2`);
  assert.deepEqual(states[states.length - 1]!.at, ["3,2"], "the panel took the press");
  const moved = play(`_*2, Enter, _*3, Enter, _*3, Enter, _*2, ${tile(3, 2)}, _*2, ${tile(16, 6)}, _*2`);
  assert.deepEqual(moved.states[moved.states.length - 1]!.at, ["16,6"], "every tile of the field takes one");
});
