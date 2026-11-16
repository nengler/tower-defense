import assert from "node:assert/strict";
import { test } from "node:test";

import { earn, equipMove, newCreature, raiseMove, unequipMove, type Owned } from "../src/rules/roster.ts";

/** A Voltkit at level 7: knows zap, jolt, jet, arc; equips the first three. */
const leveled = (): readonly Owned[] => earn([newCreature(1, "voltkit", 0)], 1, 40 + 80 + 120 + 160 + 200 + 240);

test("unequip frees a slot, and a known move can then be equipped into it, at the end of the order", () => {
  let r = leveled();
  assert.deepEqual(r[0]!.equipped, ["zap", "jolt", "jet"]);
  assert.deepEqual(equipMove(r, 1, "arc"), r, "slots full: nothing changes");
  r = unequipMove(r, 1, "jolt");
  assert.deepEqual(r[0]!.equipped, ["zap", "jet"]);
  assert.deepEqual(r[0]!.known, ["zap", "jolt", "jet", "arc"], "it still knows it");
  r = equipMove(r, 1, "arc");
  assert.deepEqual(r[0]!.equipped, ["zap", "jet", "arc"]);
});

test("a move it does not know, or has equipped already, is not equipped", () => {
  const r = [newCreature(1, "voltkit", 0)];
  assert.deepEqual(equipMove(r, 1, "flare"), r);
  assert.deepEqual(equipMove(r, 1, "zap"), r);
});

test("raise moves an equipped move one place earlier; the first stays first", () => {
  let r = leveled();
  r = raiseMove(r, 1, "jet");
  assert.deepEqual(r[0]!.equipped, ["zap", "jet", "jolt"]);
  r = raiseMove(r, 1, "jet");
  assert.deepEqual(r[0]!.equipped, ["jet", "zap", "jolt"]);
  assert.deepEqual(raiseMove(r, 1, "jet"), r);
});

test("with mastery 3 there is a fourth slot", () => {
  let r: readonly Owned[] = earn([newCreature(1, "voltkit", 3)], 1, 1000);
  r = equipMove(r, 1, "arc");
  assert.equal(r[0]!.equipped.length, 4);
});
