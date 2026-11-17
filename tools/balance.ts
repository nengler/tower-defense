/**
 * Plays whole runs headless against fixed strategies and prints the lives left after each wave. The battle is the game's own `Play`,
 * mounted alone with collisions on (`@tsengine/testing`), and a strategy does what a player does: take a creature at each milestone,
 * put it on a tile, start each wave, and answer each learn prompt.
 *
 * - **lazy** takes the first option of every prompt, never swaps a move in when its slots are full, and stands its creatures at fixed
 *   spots beside the bends.
 * - **managed** picks the better option and re-equips each creature's best moves whenever it learns one, at the same fixed spots.
 * - **skilled** does what managed does, and also picks a team that sets up combos and stands each creature where it covers the most
 *   path, on its own type's terrain when it can.
 * - **no creatures placed** takes creatures but never fields them.
 *
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
import { centre, COLS, mapOf, ROWS, TERRAIN_BONUS, isPath, terrainAt, type MapId } from "../src/rules/map.ts";
import { MOVES, type MoveId } from "../src/rules/moves.ts";
import { slotsFor } from "../src/rules/progress.ts";
import { canPlace, equipMove, unequipMove, type Owned } from "../src/rules/roster.ts";
import { FORMS, SPECIES, type FormId, type SpeciesId } from "../src/rules/species.ts";
import { WAVE_COUNT } from "../src/rules/waves.ts";

export interface Strategy {
  readonly name: string;
  readonly map: MapId;
  /** The species it prefers at each milestone, best first: it takes the first the offer has. */
  readonly prefer: readonly SpeciesId[];
  /** "fixed": the next of `BENDS`; "best": the free tile covering the most path, attuned if it can be. "none": never fielded. */
  readonly placing: "fixed" | "best" | "none";
  /** "first": the first option, never replacing a move. "best": the better option, and the best moves re-equipped. */
  readonly learning: "first" | "best";
  /** The seed its offers are rolled from: one whose run is typical of many (`--seeds=12` shows the spread). */
  readonly seed: number;
}

/** Beside the meadow's bends, where a creature covers two stretches of it. */
const BENDS: readonly (readonly [number, number])[] = [
  [3, 2],
  [5, 5],
  [8, 5],
  [10, 3],
  [13, 3],
  [15, 6],
];

/** The team a strong player builds: soak and Volt for chains, stone for stuns and shatters, then fire and growth. */
const COMBO_TEAM: readonly SpeciesId[] = ["puddlepup", "voltkit", "pebblet", "emberling", "voltkit", "sproutling"];
const PLAIN: readonly SpeciesId[] = ["emberling", "puddlepup", "voltkit", "emberling", "voltkit", "puddlepup"];

export const STRATEGIES: readonly Strategy[] = [
  { name: "skilled", map: "meadow", prefer: COMBO_TEAM, placing: "best", learning: "best", seed: 3 },
  { name: "managed", map: "meadow", prefer: PLAIN, placing: "fixed", learning: "best", seed: 1 },
  { name: "lazy", map: "meadow", prefer: PLAIN, placing: "fixed", learning: "first", seed: 1 },
  { name: "no creatures placed", map: "meadow", prefer: PLAIN, placing: "none", learning: "first", seed: 1 },
  { name: "skilled, riverbend", map: "riverbend", prefer: COMBO_TEAM, placing: "best", learning: "best", seed: 3 },
  { name: "skilled, gauntlet", map: "gauntlet", prefer: COMBO_TEAM, placing: "best", learning: "best", seed: 3 },
  { name: "skilled, glowmire", map: "glowmire", prefer: COMBO_TEAM, placing: "best", learning: "best", seed: 3 },
];

/**
 * How a move ranks for a creature with nothing to go on: roughly its damage a second (a combo counted at half again, a burn's whole
 * damage in it), three times that for an area (crowds), plus something for a stun, a soak, a mark or a buff.
 */
function rank(move: MoveId): number {
  const m = MOVES[move];
  const e = m.effects;
  const area = m.shape === "splash" || m.shape === "pulse" ? 3 : 1;
  const dps = ((m.damage * (e.bonusVs !== undefined ? 1.5 : 1) + (e.burn ?? 0) * (e.burnFor ?? 0)) / m.cooldown) * area;
  return dps + ((e.stun ?? 0) * 4) / m.cooldown + (e.soak !== undefined ? 2 : 0) + (e.mark !== undefined ? 2 : 0) + (m.shape === "buff" ? 6 : 0);
}

/** The moves a managing player equips: the best `slots` it knows, best first. */
export function bestLoadout(c: Owned): MoveId[] {
  return [...c.known].sort((a, b) => rank(b) - rank(a)).slice(0, slotsFor(c.mastery));
}

/** Equip a creature's best loadout if it is not already what it has (so a cooldown is only reset when something changes). */
export function manage(roster: readonly Owned[]): readonly Owned[] {
  let r = roster;
  for (const c of roster) {
    const best = bestLoadout(c);
    if (best.join() === c.equipped.join()) continue;
    for (const m of c.equipped) r = unequipMove(r, c.id, m);
    for (const m of best) r = equipMove(r, c.id, m);
  }
  return r;
}

/** Answer every waiting learn prompt as the strategy would. */
export function answer(strategy: Strategy): void {
  const { openPrompt, chooseMove, chooseForm } = useGame.actions();
  for (let guard = 0; guard < 20; guard++) {
    const c = useGame.getState().roster.find((o) => o.choice !== null);
    if (c === undefined || c.choice === null) return;
    openPrompt(c.id);
    const options = c.choice.options;
    if (c.choice.kind === "form") {
      const forms = options as readonly FormId[];
      const pick = strategy.learning === "first" ? forms[0]! : [...forms].sort((a, b) => rank(FORMS[b].move) - rank(FORMS[a].move))[0]!;
      chooseForm(pick, "");
    } else {
      const moves = options as readonly MoveId[];
      const pick = strategy.learning === "first" ? moves[0]! : [...moves].sort((a, b) => rank(b) - rank(a))[0]!;
      chooseMove(pick, "");
    }
  }
}

/** The path points (every 4 px, by distance along it) a creature on (col, row) covers within its typical reach. */
function covered(map: MapId, col: number, row: number): number[] {
  const path = mapOf(map).path;
  const at = centre(col, row);
  const out: number[] = [];
  for (let d = 0; d < path.length; d += 4) {
    const p = pathPoint(map, d);
    if (Math.hypot(p.x - at.x, p.y - at.y) <= 40) out.push(d);
  }
  return out;
}

function pathPoint(map: MapId, d: number): { x: number; y: number } {
  const path = mapOf(map).path;
  let i = 1;
  while (i < path.points.length - 1 && path.offsets[i]! < d) i++;
  const a = path.points[i - 1]!;
  const b = path.points[i]!;
  const seg = path.offsets[i]! - path.offsets[i - 1]!;
  const t = seg === 0 ? 0 : (d - path.offsets[i - 1]!) / seg;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/**
 * The free tile covering the most path for this creature, counting path its team already covers as worth more (focused fire lands
 * combos and reactions), and its own type's terrain as worth more.
 */
function bestSpot(map: MapId, roster: readonly Owned[], c: Owned): readonly [number, number] | null {
  const team = new Set(roster.filter((o) => o.col >= 0 && o.id !== c.id).flatMap((o) => covered(map, o.col, o.row)));
  let best: readonly [number, number] | null = null;
  let score = -1;
  for (let row = 0; row < ROWS; row++)
    for (let col = 0; col < COLS; col++) {
      if (isPath(map, col, row) || !canPlace(roster, map, c.id, col, row)) continue;
      const attuned = terrainAt(map, col, row) === SPECIES[c.species].type;
      const points = covered(map, col, row);
      const shared = points.filter((d) => team.has(d)).length;
      const sc = (points.length + shared) * (attuned ? 1 + TERRAIN_BONUS * 0.12 : 1);
      if (sc > score) {
        score = sc;
        best = [col, row];
      }
    }
  return best;
}

/**
 * A milestone as the strategy plays it: take the species it prefers from the offer (its `joined`th pick), and put it on its tile.
 * False when there is no offer.
 */
export function takeAndPlace(strategy: Strategy, joined: number): boolean {
  const offer = useGame.getState().offer;
  if (offer.length === 0) return false;
  const { takeOffer, tapTile, deselect } = useGame.actions();
  const want = strategy.prefer.slice(joined).find((s) => offer.includes(s)) ?? strategy.prefer.find((s) => offer.includes(s)) ?? offer[0]!;
  takeOffer(want);
  const roster = useGame.getState().roster;
  const c = roster.at(-1)!;
  const spot = strategy.placing === "fixed" ? BENDS[joined] : strategy.placing === "best" ? bestSpot(strategy.map, roster, c) : undefined;
  if (spot != null) tapTile(spot[0], spot[1]);
  deselect();
  return true;
}

export interface Result {
  /** Lives left after each wave; null for the waves after the run was lost. */
  readonly lives: readonly (number | null)[];
  readonly won: boolean;
}

/** One run of a strategy, its offers rolled from `seed` (its own by default). */
export function run(strategy: Strategy, seed = strategy.seed): Result {
  const t = render(Play, {}, { collisions: true });
  useGame.setState({ map: strategy.map, seed });
  const { start } = useGame.actions();
  start();
  let joined = 0;
  const takeMilestone = () => {
    if (takeAndPlace(strategy, joined)) joined += 1;
  };
  const battle = () => t.state().s as { lives: number; wave: number; active: boolean };
  const lives: (number | null)[] = [];
  for (let wave = 1; wave <= WAVE_COUNT; wave++) {
    takeMilestone();
    answer(strategy);
    if (strategy.learning === "best") useGame.setState({ roster: manage(useGame.getState().roster) });
    t.world.flush();
    t.input("Space");
    // Play a wave out (at most four minutes at 60 steps a second), answering prompts and checking the moves once a second.
    let step = 0;
    const leaks: Record<string, number> = {};
    let lastLives = battle().lives;
    let lastEnemies = (t.state().s as { enemies: { id: number; kind: string }[] }).enemies;
    t.stepUntil(
      () => {
        if (process.env.BALANCE_DEBUG) {
          const now = (t.state().s as { enemies: { id: number; kind: string }[] }).enemies;
          if (battle().lives < lastLives) {
            for (const e of lastEnemies) if (!now.some((n) => n.id === e.id)) leaks[e.kind] = (leaks[e.kind] ?? 0) + 1;
          }
          lastLives = battle().lives;
          lastEnemies = now;
        }
        if (step++ % 60 === 0) {
          answer(strategy);
          if (strategy.learning === "best") useGame.setState({ roster: manage(useGame.getState().roster) });
        }
        return useGame.getState().screen !== "play" || !battle().active;
      },
      { maxSteps: 60 * 240, throws: false }
    );
    const screen = useGame.getState().screen;
    const debug = () =>
      useGame
        .getState()
        .roster.map((c) => `${c.form || c.species}@${c.level}[${c.equipped.join(",")}]${c.col >= 0 ? `(${c.col},${c.row})` : ""}`)
        .join(" ");
    if (screen === "lost") {
      if (process.env.BALANCE_DEBUG) console.log(strategy.name, `w${wave} lost`, JSON.stringify(leaks), debug());
      lives.push(0);
      while (lives.length < WAVE_COUNT) lives.push(null);
      return { lives, won: false };
    }
    lives.push(battle().lives);
    if (process.env.BALANCE_DEBUG) console.log(strategy.name, `w${wave}`, battle().lives, JSON.stringify(leaks), debug());
  }
  return { lives, won: useGame.getState().screen === "won" };
}

export function table(): Record<string, Result> {
  return Object.fromEntries(STRATEGIES.map((s) => [s.name, run(s)]));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1] && process.argv.some((a) => a.startsWith("--seeds="))) {
  // Tuning: every strategy over many offer rolls, so a number is not tuned to one lucky (or unlucky) run.
  const seeds = Number(process.argv.find((a) => a.startsWith("--seeds="))!.slice(8));
  const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
  for (const strategy of STRATEGIES.filter((st) => only === undefined || st.name.startsWith(only))) {
    const runs = Array.from({ length: seeds }, (_, i) => run(strategy, 1 + i * 7919));
    const won = runs.filter((r) => r.won).length;
    const avg = (w: number) => runs.reduce((sum, r) => sum + (r.lives[w] ?? 0), 0) / runs.length;
    console.log(
      `${strategy.name.padEnd(22)} won ${won}/${seeds}  mean lives by wave: ${Array.from({ length: WAVE_COUNT }, (_, w) => avg(w).toFixed(1)).join(" ")}`
    );
  }
  process.exit(0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
  const result = only === undefined ? table() : Object.fromEntries(STRATEGIES.filter((s) => s.name.startsWith(only)).map((s) => [s.name, run(s)]));
  for (const [name, r] of Object.entries(result)) {
    console.log(`${name.padEnd(22)} ${r.won ? "WON " : "LOST"} lives by wave: ${r.lives.map((l) => (l === null ? "-" : l)).join(" ")}`);
  }
  if (process.argv.includes("--write")) {
    const out = join(dirname(fileURLToPath(import.meta.url)), "../test/balance.expected.json");
    writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);
    console.log(`wrote ${out}`);
  }
}
