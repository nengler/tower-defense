import assert from "node:assert/strict";
import { test } from "node:test";

import { ENEMIES, hpOf } from "../src/rules/enemies.ts";
import { MOVES } from "../src/rules/moves.ts";
import { addXp, knownAt, learnLevel, masteryLevel, MAX_LEVEL, slotsFor, xpToNext } from "../src/rules/progress.ts";
import { pick, roll } from "../src/rules/rng.ts";
import { scaleAnimation, scaleArea, scaleCooldown, scaleDamage, scaled } from "../src/rules/scaled.ts";
import { SPECIES, SPECIES_IDS, statsAt } from "../src/rules/species.ts";
import { BEATS, matchup, TYPES, typeFactor } from "../src/rules/types.ts";
import { MILESTONES, spawnsOf, WAVE_COUNT } from "../src/rules/waves.ts";

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

test("every species learns more moves than it has slots, and every move it learns exists", () => {
  for (const id of SPECIES_IDS) {
    const learns = SPECIES[id].learns;
    assert.ok(learns.length > slotsFor(0), `${id} has a choice to make`);
    assert.equal(learns[0]!.level, 1);
    for (const l of learns) assert.ok(MOVES[l.move]);
  }
});

test("XP: a level costs 20 × level, several can come at once, and it stops at the cap", () => {
  assert.equal(xpToNext(1), 20);
  assert.deepEqual(addXp(1, 0, 19), { level: 1, xp: 19, gained: 0 });
  assert.deepEqual(addXp(1, 0, 20), { level: 2, xp: 0, gained: 1 });
  assert.deepEqual(addXp(1, 10, 70), { level: 3, xp: 20, gained: 2 });
  assert.equal(addXp(MAX_LEVEL - 1, 0, 1e9).level, MAX_LEVEL);
  assert.equal(addXp(MAX_LEVEL, 0, 50).gained, 0);
});

test("mastery: a second move from the start at 1, later moves two levels earlier at 2, a fourth slot at 3", () => {
  assert.deepEqual([0, 4, 5, 14, 15, 30, 99].map(masteryLevel), [0, 0, 1, 1, 2, 3, 3]);
  assert.deepEqual(knownAt("emberling", 1, 0), ["spark"]);
  assert.deepEqual(knownAt("emberling", 1, 1), ["spark", "flare"]);
  assert.equal(learnLevel("emberling", 2, 0), 5);
  assert.equal(learnLevel("emberling", 2, 1), 5);
  assert.equal(learnLevel("emberling", 2, 2), 3);
  assert.deepEqual(knownAt("emberling", 5, 2), ["spark", "flare", "jolt", "rally"]);
  assert.equal(slotsFor(2), 3);
  assert.equal(slotsFor(3), 4);
  assert.equal(learnLevel("emberling", 9, 0), Infinity);
});

test("waves: five, in time order, harder as they go; milestones come before the first wave", () => {
  assert.equal(WAVE_COUNT, 5);
  for (let w = 1; w <= WAVE_COUNT; w++) {
    const spawns = spawnsOf(w);
    assert.ok(spawns.length > 0);
    for (let i = 1; i < spawns.length; i++) assert.ok(spawns[i]!.at >= spawns[i - 1]!.at);
  }
  assert.ok(spawnsOf(5).length > spawnsOf(1).length);
  assert.ok(hpOf("crawler", 5) > hpOf("crawler", 1));
  assert.equal(hpOf("crawler", 1), ENEMIES.crawler.hp);
  assert.equal(MILESTONES[0], 1);
  assert.deepEqual(spawnsOf(99), []);
});

test("the generator: the same seed gives the same numbers, and pick takes different items", () => {
  assert.equal(roll(7).value, roll(7).value);
  assert.notEqual(roll(7).value, roll(8).value);
  const a = pick(SPECIES_IDS, 2, 42);
  assert.deepEqual(a, pick(SPECIES_IDS, 2, 42));
  assert.equal(new Set(a.picked).size, 2);
  assert.equal(pick(SPECIES_IDS, 9, 1).picked.length, SPECIES_IDS.length);
});
