import assert from "node:assert/strict";
import { test } from "node:test";

import { afterArmor, burrowed, BURROW, cycleType, ENEMIES, ENEMY_KINDS, hpOf } from "../src/rules/enemies.ts";
import { MAP_IDS, MAPS, isPath, mapOf, terrainAt } from "../src/rules/map.ts";
import { MARKS, tilesUnder } from "../src/rules/marks.ts";
import { MOVE_IDS, MOVES, REACTION_OF } from "../src/rules/moves.ts";
import { addXp, learnLevel, masteryLevel, MAX_LEVEL, slotsFor, xpToNext } from "../src/rules/progress.ts";
import { pick, roll } from "../src/rules/rng.ts";
import { scaleAnimation, scaleArea, scaleCooldown, scaleDamage, scaled } from "../src/rules/scaled.ts";
import { EVOLVE_AT, FORM_IDS, FORMS, SPECIES, SPECIES_IDS, statsAt, statsOf } from "../src/rules/species.ts";
import { dailyOf, ELITE_OFFER, hpScale, milestonesFor, speedScale, startLives, TIERS } from "../src/rules/tiers.ts";
import { BEATS, matchup, TYPES, typeFactor } from "../src/rules/types.ts";
import { BOSS_WAVES, MILESTONES, previewOf, spawnsOf, WAVE_COUNT } from "../src/rules/waves.ts";

const close = (actual: number, expected: number, message?: string) =>
  assert.ok(Math.abs(actual - expected) < 1e-6, `${message ?? ""} ${actual} is not ${expected}`);

test("the design doc's example: 30 damage, 1 s, radius 9, 12 s cooldown at ATK 4, SPD 3, RNG 2, CD 2", () => {
  const stats = { atk: 4, spd: 3, rng: 2, cd: 2 };
  close(scaleDamage(30, stats), 42);
  close(scaleAnimation(1, stats), 1 / 1.15);
  close(scaleArea(9, stats), 9 * Math.sqrt(1.2));
  close(scaleCooldown(12, stats), 12 / 1.1);
});

test("zero stats leave a move as it is, and more of a stat is always better", () => {
  const zero = { atk: 0, spd: 0, rng: 0, cd: 0 };
  const more = { atk: 10, spd: 10, rng: 10, cd: 10 };
  for (const move of Object.values(MOVES)) {
    const base = scaled(move.id, zero);
    assert.equal(base.damage, move.damage);
    assert.equal(base.cooldown, move.cooldown);
    const better = scaled(move.id, more);
    assert.ok(better.damage >= base.damage && better.animation < base.animation && better.cooldown < base.cooldown);
    assert.ok(better.radius >= base.radius && better.reach >= base.reach);
  }
});

test("a cooldown never reaches zero, however high the stat", () => {
  assert.ok(scaleCooldown(1, { atk: 0, spd: 0, rng: 0, cd: 1000 }) > 0);
});

test("types: each beats something and is beaten by something, and the factors multiply", () => {
  for (const t of TYPES) {
    assert.ok(BEATS[t].length > 0, `${t} beats something`);
    assert.ok(
      TYPES.some((o) => BEATS[o].includes(t)),
      `${t} is beaten by something`
    );
    assert.ok(!BEATS[t].includes(t));
  }
  assert.equal(matchup("tide", "ember"), 1.5);
  assert.equal(matchup("ember", "tide"), 0.67);
  assert.equal(matchup("volt", "bloom"), 1);
  close(typeFactor("volt", "volt", "tide"), 1.25 * 1.5);
  close(typeFactor("volt", "ember", "tide"), 1.5);
});

test("stats start small and grow by their species' rates", () => {
  for (const id of SPECIES_IDS) {
    const at1 = statsAt(id, 1);
    assert.deepEqual(at1, SPECIES[id].base);
    for (const v of Object.values(at1)) assert.ok(v >= 1 && v <= 5, `${id} starts low`);
    const at10 = statsAt(id, 10);
    for (const k of ["atk", "spd", "rng", "cd"] as const) assert.ok(at10[k] >= at1[k]);
  }
  // Emberling's attack: 4 + 1.5 a level.
  assert.equal(statsAt("emberling", 3).atk, 7);
  assert.equal(statsAt("emberling", 2).atk, 5);
});

test("every type has a species, and every move is learned by some species or form", () => {
  for (const t of TYPES) assert.ok(SPECIES_IDS.some((id) => SPECIES[id].type === t), t);
  for (const m of MOVE_IDS) {
    const learned = SPECIES_IDS.some((id) => SPECIES[id].learns.some((l) => l.options.includes(m)));
    const signature = FORM_IDS.some((f) => FORMS[f].move === m);
    assert.ok(learned || signature, m);
  }
});

test("each species: one move at level 1, then steps of two to choose from, its area moves last, after its three slots are full", () => {
  for (const id of SPECIES_IDS) {
    const learns = SPECIES[id].learns;
    assert.equal(learns[0]!.level, 1);
    assert.equal(learns[0]!.options.length, 1);
    for (const step of learns.slice(1)) assert.equal(step.options.length, 2, `${id} at ${step.level} offers a choice`);
    assert.ok(learns.length > slotsFor(0), `${id} learns more than it can equip`);
    const last = learns.at(-1)!;
    assert.ok(
      last.options.every((m) => ["splash", "pulse"].includes(MOVES[m].shape)),
      `${id}'s last step is two area moves`
    );
    for (let i = 1; i < learns.length; i++) assert.ok(learns[i]!.level > learns[i - 1]!.level);
    assert.ok(learns.at(-1)!.level < EVOLVE_AT, "every step comes before it can evolve");
  }
});

test("forms: each species has two, each with stats on top and a move of its own; a form's stats add to its species'", () => {
  for (const id of SPECIES_IDS) {
    const [a, b] = SPECIES[id].forms;
    assert.notEqual(a, b);
    for (const f of [a, b]) assert.equal(FORMS[f].species, id);
  }
  const plain = statsAt("emberling", 10);
  const blaze = statsOf("emberling", 10, "blazefang", 0);
  assert.equal(blaze.atk, plain.atk + 3);
  assert.equal(statsOf("emberling", 10, "", 2).rng, plain.rng + 2, "terrain adds to every stat");
});

test("XP: a level costs 40 × level, several can come at once, and it stops at the cap", () => {
  assert.equal(xpToNext(1), 40);
  assert.deepEqual(addXp(1, 0, 39), { level: 1, xp: 39, gained: 0 });
  assert.deepEqual(addXp(1, 0, 40), { level: 2, xp: 0, gained: 1 });
  assert.deepEqual(addXp(1, 10, 140), { level: 3, xp: 30, gained: 2 });
  assert.equal(addXp(MAX_LEVEL - 1, 0, 1e9).level, MAX_LEVEL);
  assert.equal(addXp(MAX_LEVEL, 0, 50).gained, 0);
});

test("mastery: the first choice at level 1 from mastery 1, later steps two levels earlier at 2, a fourth slot at 3", () => {
  assert.deepEqual([0, 4, 5, 14, 15, 30, 99].map(masteryLevel), [0, 0, 1, 1, 2, 3, 3]);
  assert.equal(learnLevel("emberling", 0, 0), 1);
  assert.equal(learnLevel("emberling", 1, 0), 3);
  assert.equal(learnLevel("emberling", 1, 1), 1);
  assert.equal(learnLevel("emberling", 2, 0), 5);
  assert.equal(learnLevel("emberling", 2, 1), 5);
  assert.equal(learnLevel("emberling", 2, 2), 3);
  assert.equal(slotsFor(2), 3);
  assert.equal(slotsFor(3), 4);
  assert.equal(learnLevel("emberling", 9, 0), Infinity);
});

test("waves: ten, in time order, harder as they go; bosses at 5 and 10; milestones come before the first wave", () => {
  assert.equal(WAVE_COUNT, 10);
  for (let w = 1; w <= WAVE_COUNT; w++) {
    const spawns = spawnsOf(w);
    assert.ok(spawns.length > 0);
    for (let i = 1; i < spawns.length; i++) assert.ok(spawns[i]!.at >= spawns[i - 1]!.at);
    assert.equal(spawns.some((sp) => ENEMIES[sp.kind].boss === true), BOSS_WAVES.includes(w), `wave ${w}`);
  }
  assert.ok(spawnsOf(10).length > spawnsOf(5).length && spawnsOf(5).length > spawnsOf(1).length);
  assert.ok(hpOf("crawler", 5) > hpOf("crawler", 1));
  assert.equal(hpOf("crawler", 1), ENEMIES.crawler.hp);
  assert.equal(hpOf("mosshorn", 5), ENEMIES.mosshorn.hp, "a boss's hit points are its own");
  assert.equal(MILESTONES[0], 1);
  assert.deepEqual(spawnsOf(99), []);
});

test("every enemy kind comes in some wave, and every type has an enemy", () => {
  for (const kind of ENEMY_KINDS) assert.ok([...Array(WAVE_COUNT).keys()].some((w) => spawnsOf(w + 1).some((sp) => sp.kind === kind)), kind);
  for (const t of TYPES) assert.ok(ENEMY_KINDS.some((k) => ENEMIES[k].type === t), t);
});

test("the preview counts each kind a wave brings, in the order they come", () => {
  const preview = previewOf(1);
  assert.deepEqual(preview, [
    { kind: "crawler", count: 3 },
    { kind: "skitter", count: 2 },
  ]);
  assert.equal(
    previewOf(10).reduce((n, g) => n + g.count, 0),
    spawnsOf(10).length
  );
});

test("tiers: each adds a change on top of the ones below", () => {
  assert.equal(TIERS.length, 6);
  assert.equal(startLives(0), 10);
  assert.equal(startLives(2), 8);
  assert.equal(hpScale(0, false), 1);
  assert.ok(hpScale(1, false) > 1);
  assert.ok(hpScale(0, true) > hpScale(0, false), "an elite wave is tougher");
  assert.deepEqual(milestonesFor(2, MILESTONES), MILESTONES);
  assert.ok(!milestonesFor(3, MILESTONES).includes(8));
  assert.ok(spawnsOf(3, 4).some((sp) => sp.kind === "shepherd") && !spawnsOf(3, 3).some((sp) => sp.kind === "shepherd"));
  assert.equal(speedScale(4), 1);
  assert.ok(speedScale(5) > 1);
  assert.ok(ELITE_OFFER > 3);
});

test("the daily run: the same date gives the same run; days differ", () => {
  assert.deepEqual(dailyOf(2026, 11, 17), dailyOf(2026, 11, 17));
  assert.equal(dailyOf(2026, 1, 5).label, "2026-01-05");
  assert.notEqual(dailyOf(2026, 11, 17).seed, dailyOf(2026, 11, 18).seed);
  assert.ok(MAP_IDS.includes(dailyOf(2026, 11, 17).map));
});

test("maps: terrain is never on the path, every type has terrain on every map, and an unknown id is the first map", () => {
  for (const id of MAP_IDS) {
    const m = MAPS[id];
    for (const [key, type] of m.terrain) {
      assert.ok(!m.pathTiles.has(key), `${id} ${key}`);
      assert.ok(TYPES.includes(type));
    }
    for (const t of TYPES) assert.ok([...m.terrain.values()].includes(t), `${id} has ${t} terrain`);
  }
  assert.ok(isPath("meadow", 0, 1));
  assert.equal(terrainAt("meadow", 5, 5), "tide");
  assert.equal(terrainAt("meadow", 0, 0), null);
  assert.equal(mapOf("nowhere").id, "meadow");
  assert.ok(MAPS.gauntlet.path.length < MAPS.meadow.path.length, "the gauntlet is the short one");
});

test("marks: an area marks the path tiles under it, at least the one it lands on", () => {
  const tiles = MAPS.meadow.pathTiles;
  assert.deepEqual(tilesUnder(tiles, 8, 24, 0, 16), ["0,1"]);
  assert.ok(tilesUnder(tiles, 40, 24, 20, 16).length >= 3);
  for (const kind of Object.keys(MARKS) as (keyof typeof MARKS)[]) assert.ok(MARKS[kind].lasts > 0);
  for (const m of MOVE_IDS) if (MOVES[m].effects.mark !== undefined) assert.notEqual(MOVES[m].shape, "hit", `${m} marks an area`);
});

test("reactions: one for each status a combo cashes in", () => {
  assert.deepEqual(new Set(Object.values(REACTION_OF)).size, 4);
});

test("enemy rules: armour, a burrower's rhythm, a cycling boss's type", () => {
  assert.equal(afterArmor(8, 10), 2);
  assert.equal(afterArmor(8, 3), 1);
  assert.equal(afterArmor(0, 0), 0);
  assert.equal(burrowed(0), false);
  assert.equal(burrowed(BURROW.up + 1), true);
  assert.equal(burrowed(BURROW.up + BURROW.under + 1), false);
  const cycle = ENEMIES.prism.cycle!;
  assert.equal(cycleType(cycle, 0, 100), cycle[0]);
  assert.equal(cycleType(cycle, 99.9, 100), cycle.at(-1));
  assert.equal(cycleType(cycle, 100, 100), cycle.at(-1));
});

test("the generator: the same seed gives the same numbers, and pick takes different items", () => {
  assert.equal(roll(7).value, roll(7).value);
  assert.notEqual(roll(7).value, roll(8).value);
  const a = pick(SPECIES_IDS, 2, 42);
  assert.deepEqual(a, pick(SPECIES_IDS, 2, 42));
  assert.equal(new Set(a.picked).size, 2);
  assert.equal(pick(SPECIES_IDS, 9, 1).picked.length, SPECIES_IDS.length);
});
