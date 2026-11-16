/**
 * Plays whole runs headless against fixed strategies and prints the lives left after each wave. The battle is the game's own `Play`,
 * mounted alone with collisions on (`@tsengine/testing`), and a strategy does what a player does: take a creature at each milestone, put
 * it on a tile, start each wave, and (if it manages its moves) re-equip each creature's best moves whenever it learns one.
 * `test/balance.test.ts` checks the table against `test/balance.expected.json`, so a change to a number in the rules shows up as a
 * change in difficulty. `--write` updates the expected table after a change you meant to make.
 *
 *   node tools/balance.ts [--write]
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { render } from "@tsengine/testing";

import { Play } from "../generated/Play.ts";
import { useGame } from "../src/GameState.ts";
import { MOVES, type MoveId } from "../src/rules/moves.ts";
import { slotsFor } from "../src/rules/progress.ts";
import { equipMove, unequipMove, type Owned } from "../src/rules/roster.ts";
import type { SpeciesId } from "../src/rules/species.ts";
import { WAVE_COUNT } from "../src/rules/waves.ts";

export interface Strategy {
  readonly name: string;
  /** The species it takes at each milestone, if offered (otherwise the offer's first). */
  readonly picks: readonly SpeciesId[];
  /** Where each creature goes, in the order they join. */
  readonly spots: readonly (readonly [number, number])[];
  /** Re-equip each creature's best moves (areas first) whenever it learns one; otherwise never touch them. */
  readonly manage: boolean;
}

/** Beside the path's bends, where a creature covers two stretches of it. */
const BENDS: readonly (readonly [number, number])[] = [
  [3, 2],
  [5, 5],
  [8, 5],
  [10, 3],
  [13, 3],
  [15, 6],
];

export const STRATEGIES: readonly Strategy[] = [
  { name: "managed", picks: ["emberling", "puddlepup", "voltkit", "emberling", "voltkit", "puddlepup"], spots: BENDS, manage: true },
  { name: "never touches moves", picks: ["emberling", "puddlepup", "voltkit", "emberling", "voltkit", "puddlepup"], spots: BENDS, manage: false },
  { name: "no creatures placed", picks: ["emberling", "puddlepup", "voltkit", "emberling", "voltkit", "puddlepup"], spots: [], manage: false },
];

/** How a move ranks for a creature with nothing to go on: areas first (crowds and armour), then the hardest-hitting hits. */
function rank(move: MoveId): number {
  const m = MOVES[move];
  const area = m.shape === "splash" || m.shape === "pulse" ? 100 : 0;
  const buff = m.shape === "buff" ? 50 : 0;
  return area + buff + m.damage / m.cooldown + (m.effects.burn ?? 0) + (m.effects.stun ?? 0) * 5;
}

/** The moves a managing player equips: the best `slots` it knows, best first. */
export function bestLoadout(c: Owned): MoveId[] {
  return [...c.known].sort((a, b) => rank(b) - rank(a)).slice(0, slotsFor(c.mastery));
}

/** Equip a creature's best loadout if it is not already what it has (so a cooldown is only reset when something changes). */
function manage(roster: readonly Owned[]): readonly Owned[] {
  let r = roster;
  for (const c of roster) {
    const best = bestLoadout(c);
    if (best.join() === c.equipped.join()) continue;
    for (const m of c.equipped) r = unequipMove(r, c.id, m);
    for (const m of best) r = equipMove(r, c.id, m);
  }
  return r;
}

export interface Result {
  /** Lives left after each wave; null for the waves after the run was lost. */
  readonly lives: readonly (number | null)[];
  readonly won: boolean;
}

/** One run of a strategy. */
export function run(strategy: Strategy): Result {
  const t = render(Play, {}, { collisions: true });
  const { start, takeOffer, tapTile } = useGame.actions();
  start();
  let joined = 0;
  const takeMilestone = () => {
    const offer = useGame.getState().offer;
    if (offer.length === 0) return;
    const want = strategy.picks[joined] ?? offer[0]!;
    takeOffer(offer.includes(want) ? want : offer[0]!);
    const spot = strategy.spots[joined];
    if (spot !== undefined) tapTile(spot[0], spot[1]);
    joined += 1;
  };
  const battle = () => t.state().s as { lives: number; wave: number; active: boolean };
  const lives: (number | null)[] = [];
  for (let wave = 1; wave <= WAVE_COUNT; wave++) {
    takeMilestone();
    t.world.flush();
    t.input("Space");
    // Play a wave out: about 60 steps a second, checking the moves once a second.
    for (let step = 0; step < 60 * 180; step++) {
      t.step();
      if (strategy.manage && step % 60 === 0) useGame.setState({ roster: manage(useGame.getState().roster) });
      if (useGame.getState().screen !== "play" || !battle().active) break;
    }
    const screen = useGame.getState().screen;
    if (screen === "lost") {
      if (process.env.BALANCE_DEBUG)
        console.log(strategy.name, `w${wave} lost`, useGame.getState().roster.map((c) => `${c.species}@${c.level}[${c.equipped.join(",")}]`).join(" "));
      lives.push(0);
      while (lives.length < WAVE_COUNT) lives.push(null);
      return { lives, won: false };
    }
    lives.push(battle().lives);
    if (process.env.BALANCE_DEBUG)
      console.log(
        strategy.name,
        `w${wave}`,
        battle().lives,
        useGame
          .getState()
          .roster.map((c) => `${c.species}@${c.level}[${c.equipped.join(",")}|${c.known.length}]`)
          .join(" ")
      );
  }
  return { lives, won: useGame.getState().screen === "won" };
}

export function table(): Record<string, Result> {
  return Object.fromEntries(STRATEGIES.map((s) => [s.name, run(s)]));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const result = table();
  for (const [name, r] of Object.entries(result)) {
    console.log(`${name.padEnd(22)} ${r.won ? "WON " : "LOST"} lives by wave: ${r.lives.map((l) => (l === null ? "-" : l)).join(" ")}`);
  }
  if (process.argv.includes("--write")) {
    const out = join(dirname(fileURLToPath(import.meta.url)), "../test/balance.expected.json");
    writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);
    console.log(`wrote ${out}`);
  }
}
