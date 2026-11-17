import assert from "node:assert/strict";
import { test } from "node:test";

import { PATH_TILES } from "../src/rules/map.ts";
import { bench, canPlace, swap, earn, FIELD_LIMIT, newCreature, onField, place, type Owned } from "../src/rules/roster.ts";

const team = (n: number): readonly Owned[] => Array.from({ length: n }, (_, i) => newCreature(i + 1, "voltkit", 0));

test("a new creature is level 1 on the bench, with its first move equipped (and its second too with mastery 1)", () => {
  const c = newCreature(1, "emberling", 0);
  assert.equal(c.level, 1);
  assert.equal(c.col, -1);
  assert.deepEqual(c.equipped, ["spark"]);
  assert.deepEqual(newCreature(1, "emberling", 1).equipped, ["spark", "jolt"]);
});

test("a creature goes on any free tile that is not path, and moves from tile to tile", () => {
  const [pathTile] = [...PATH_TILES];
  const [col, row] = pathTile!.split(",").map(Number) as [number, number];
  let r = team(2);
  assert.equal(canPlace(r, 1, col, row), false, "not on the path");
  r = place(r, 1, 0, 0);
  assert.equal(r[0]!.col, 0);
  assert.equal(canPlace(r, 2, 0, 0), false, "not on another creature");
  assert.equal(canPlace(r, 2, 20, 0), false, "not off the grid");
  r = place(r, 1, 0, 8);
  assert.deepEqual([r[0]!.col, r[0]!.row], [0, 8]);
  r = bench(r, 1);
  assert.equal(onField(r).length, 0);
});

test("at most five on the field: a sixth from the bench is refused, but one on the field may still move", () => {
  let r = team(6);
  for (let i = 0; i < FIELD_LIMIT; i++) r = place(r, i + 1, i, 8);
  assert.equal(onField(r).length, 5);
  assert.equal(canPlace(r, 6, 10, 8), false);
  assert.equal(place(r, 6, 10, 8), r);
  r = place(r, 1, 10, 8);
  assert.equal(r[0]!.col, 10);
});

test("XP levels a creature up; a move it learns is equipped if a slot is free, and waits in its list if not", () => {
  // Voltkit: zap (1), jolt (3), jet (5), arc (7). 40 + 80 = 120 XP to level 3.
  let r = team(1);
  r = earn(r, 1, 120);
  assert.equal(r[0]!.level, 3);
  assert.deepEqual(r[0]!.known, ["zap", "jolt"]);
  assert.deepEqual(r[0]!.equipped, ["zap", "jolt"]);
  // To level 7: 120 + 160 + 200 + 240 = 720 more.
  r = earn(r, 1, 720);
  assert.equal(r[0]!.level, 7);
  assert.deepEqual(r[0]!.known, ["zap", "jolt", "jet", "arc"]);
  assert.deepEqual(r[0]!.equipped, ["zap", "jolt", "jet"], "three slots: Arc Storm waits");
});

test("swap: two on the field trade tiles; one from the bench takes the other's tile and benches it", () => {
  let r = team(3);
  r = place(r, 1, 0, 0);
  r = place(r, 2, 0, 8);
  r = swap(r, 1, 2);
  assert.deepEqual([r[0]!.col, r[0]!.row, r[1]!.col, r[1]!.row], [0, 8, 0, 0]);
  r = swap(r, 3, 1);
  assert.deepEqual([r[2]!.col, r[2]!.row], [0, 8]);
  assert.equal(r[0]!.col, -1, "the one it replaced is on the bench");
  assert.equal(onField(r).length, 2);
  assert.equal(swap(r, 1, 1), r);
});
