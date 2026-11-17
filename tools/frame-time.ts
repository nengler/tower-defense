/**
 * Script time of each step of a whole managed run (the balance tool's winning strategy) in the game itself: the root, every
 * screen, the draw list, collisions, against a recording backend under Node. It prints the mean, the 99th percentile and the
 * slowest step of each wave, and the most draw records a frame of it had. Drawing in libtse is not in it.
 *
 *   node tools/frame-time.ts
 */
import { createPlayer, parseInputScript, RecordingBackend } from "@tsengine/player";
import { findComponent } from "@tsengine/testing";

import { bindings, gameConfig } from "../game.ts";
import { useGame } from "../src/GameState.ts";
import { WAVE_COUNT } from "../src/rules/waves.ts";
import { manage, STRATEGIES } from "./balance.ts";

const strategy = STRATEGIES[0]!;
// Only the latest frame is kept, and it is decoded (for its record count) once a second: decoding every frame costs more than the game.
const backend = new RecordingBackend({ keepFrames: 1 });
const player = createPlayer(backend, { ...gameConfig, warn: () => {} });
const { start, takeOffer, tapTile } = useGame.actions();
const space = parseInputScript("Space", { bindings })[0]!;

player.step();
start();
player.step();
const battle = findComponent("Play", player.world.root) as unknown as { $s_active: boolean; $s_lives: number };

const rows: Record<string, unknown>[] = [];
let joined = 0;
for (let wave = 1; wave <= WAVE_COUNT && useGame.getState().screen === "play"; wave++) {
  const offer = useGame.getState().offer;
  if (offer.length > 0) {
    const want = strategy.picks[joined] ?? offer[0]!;
    takeOffer(offer.includes(want) ? want : offer[0]!);
    const spot = strategy.spots[joined];
    if (spot !== undefined) tapTile(spot[0], spot[1]);
    joined += 1;
  }
  player.step();
  backend.queueInput(space);
  player.step();
  player.step();
  const times: number[] = [];
  let records = 0;
  for (let step = 0; step < 60 * 180 && useGame.getState().screen === "play" && battle.$s_active; step++) {
    if (step % 60 === 0) {
      useGame.setState({ roster: manage(useGame.getState().roster) });
      records = Math.max(records, backend.lastFrame.records.length);
    }
    const from = performance.now();
    player.step();
    times.push(performance.now() - from);
  }
  const sorted = [...times].sort((a, b) => a - b);
  rows.push({
    wave,
    steps: times.length,
    meanMs: +(times.reduce((a, b) => a + b, 0) / Math.max(1, times.length)).toFixed(3),
    p99Ms: +(sorted[Math.floor(sorted.length * 0.99)] ?? 0).toFixed(3),
    maxMs: +(sorted.at(-1) ?? 0).toFixed(3),
    records,
    lives: battle.$s_lives,
  });
}
player.close();
console.table(rows);
