import assert from "node:assert/strict";
import { test } from "node:test";

import { MAPS } from "../src/rules/map.ts";
import { bench, canPlace, swap, earn, evolve, FIELD_LIMIT, learn, newCreature, onField, place as placeOn, type Owned } from "../src/rules/roster.ts";
import { EVOLVE_AT } from "../src/rules/species.ts";
import { xpToNext } from "../src/rules/progress.ts";

const place = (r: readonly Owned[], id: number, col: number, row: number) => placeOn(r, "meadow", id, col, row);
const PATH_TILES = MAPS.meadow.pathTiles;
/** XP from level 1 to `level`. */
const xpTo = (level: number) => Array.from({ length: level - 1 }, (_, i) => xpToNext(i + 1)).reduce((a, b) => a + b, 0);

const team = (n: number): readonly Owned[] => Array.from({ length: n }, (_, i) => newCreature(i + 1, "voltkit", 0));

test("a new creature is level 1 on the bench, with its first move equipped (and its first choice waiting with mastery 1)", () => {
  const c = newCreature(1, "emberling", 0);
  assert.equal(c.level, 1);
  assert.equal(c.col, -1);
  assert.deepEqual(c.equipped, ["spark"]);
  assert.equal(c.choice, null);
  assert.deepEqual(newCreature(1, "emberling", 1).choice, { kind: "move", options: ["cinder", "jolt"] });
});

test("a creature goes on any free tile that is not path, and moves from tile to tile", () => {
  const [pathTile] = [...PATH_TILES];
  const [col, row] = pathTile!.split(",").map(Number) as [number, number];
  let r = team(2);
  assert.equal(canPlace(r, "meadow", 1, col, row), false, "not on the path");
  r = place(r, 1, 0, 0);
  assert.equal(r[0]!.col, 0);
  assert.equal(canPlace(r, "meadow", 2, 0, 0), false, "not on another creature");
  assert.equal(canPlace(r, "meadow", 2, 20, 0), false, "not off the grid");
  r = place(r, 1, 0, 8);
  assert.deepEqual([r[0]!.col, r[0]!.row], [0, 8]);
  r = bench(r, 1);
  assert.equal(onField(r).length, 0);
});

test("at most five on the field: a sixth from the bench is refused, but one on the field may still move", () => {
  let r = team(6);
  for (let i = 0; i < FIELD_LIMIT; i++) r = place(r, i + 1, i, 8);
  assert.equal(onField(r).length, 5);
  assert.equal(canPlace(r, "meadow", 6, 10, 8), false);
  assert.equal(place(r, 6, 10, 8), r);
  r = place(r, 1, 10, 8);
  assert.equal(r[0]!.col, 10);
});

test("a level-up to a learn step makes a choice wait; the pick is learned, and equipped while a slot is free", () => {
  // Voltkit: zap (1), then jolt or bubble (3), jet or rally (5), arc or surge (7).
  let r = team(1);
  r = earn(r, 1, xpTo(3));
  assert.equal(r[0]!.level, 3);
  assert.deepEqual(r[0]!.choice, { kind: "move", options: ["jolt", "bubble"] });
  assert.deepEqual(r[0]!.known, ["zap"], "nothing learned until the player picks");
  assert.deepEqual(learn(r, 1, "arc", ""), r, "only one of the options");
  r = learn(r, 1, "bubble", "");
  assert.deepEqual(r[0]!.known, ["zap", "bubble"]);
  assert.deepEqual(r[0]!.equipped, ["zap", "bubble"]);
  assert.equal(r[0]!.choice, null);
});

test("a choice waits in front of the next: two steps reached at once come up one after the other", () => {
  let r = earn(team(1), 1, xpTo(7));
  assert.deepEqual(r[0]!.choice?.options, ["jolt", "bubble"]);
  r = learn(r, 1, "jolt", "");
  assert.deepEqual(r[0]!.choice?.options, ["jet", "rally"]);
  r = learn(r, 1, "jet", "");
  assert.deepEqual(r[0]!.choice?.options, ["arc", "surge"]);
  assert.deepEqual(r[0]!.equipped, ["zap", "jolt", "jet"]);
});

test("with the slots full, the new move replaces the one picked, in its place, or waits in the list", () => {
  let r = earn(team(1), 1, xpTo(7));
  r = learn(learn(r, 1, "jolt", ""), 1, "jet", "");
  const kept = learn(r, 1, "arc", "");
  assert.deepEqual(kept[0]!.equipped, ["zap", "jolt", "jet"]);
  assert.ok(kept[0]!.known.includes("arc"), "it waits in the list");
  const swapped = learn(r, 1, "arc", "jolt");
  assert.deepEqual(swapped[0]!.equipped, ["zap", "arc", "jet"]);
});

test("at level 10, with every step behind it, it may evolve: a form, and the form's move", () => {
  let r = earn(team(1), 1, xpTo(EVOLVE_AT));
  r = learn(learn(learn(r, 1, "jolt", ""), 1, "jet", ""), 1, "arc", "jet");
  assert.deepEqual(r[0]!.choice, { kind: "form", options: ["stormlynx", "dynamo"] });
  r = evolve(r, 1, "stormlynx", "zap");
  assert.equal(r[0]!.form, "stormlynx");
  assert.deepEqual(r[0]!.equipped, ["thunderclap", "jolt", "arc"]);
  assert.equal(r[0]!.choice, null);
  assert.equal(earn(r, 1, 1e6)[0]!.choice, null, "it evolves once");
});

test("swap: two on the field trade tiles; one from the bench takes the other's tile and benches it", () => {
  let r = team(3);
  r = placeOn(r, "meadow", 1, 0, 0);
  r = placeOn(r, "meadow", 2, 0, 8);
  r = swap(r, 1, 2);
  assert.deepEqual([r[0]!.col, r[0]!.row, r[1]!.col, r[1]!.row], [0, 8, 0, 0]);
  r = swap(r, 3, 1);
  assert.deepEqual([r[2]!.col, r[2]!.row], [0, 8]);
  assert.equal(r[0]!.col, -1, "the one it replaced is on the bench");
  assert.equal(onField(r).length, 2);
  assert.equal(swap(r, 1, 1), r);
});

test("on Glowmire, water, lanterns and mushrooms take tiles too", () => {
  const bog = MAPS.glowmire;
  const r = team(1);
  const [water] = [...bog.water];
  const [wc, wr] = water!.split(",").map(Number) as [number, number];
  assert.equal(canPlace(r, "glowmire", 1, wc, wr), false, "not in the water");
  assert.equal(canPlace(r, "glowmire", 1, bog.lanterns[0]![0], bog.lanterns[0]![1]), false, "not on a lantern");
  assert.equal(canPlace(r, "glowmire", 1, bog.mushrooms[0]![0], bog.mushrooms[0]![1]), false, "not on a mushroom");
  assert.equal(canPlace(r, "glowmire", 1, 4, 2), true, "but beside the path, yes");
  assert.equal(canPlace(r, "meadow", 1, wc, wr), true, "the same tile on the Meadow is grass");
});
