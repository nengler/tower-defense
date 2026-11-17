import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { table } from "../tools/balance.ts";

const expected = JSON.parse(readFileSync(new URL("balance.expected.json", import.meta.url), "utf8")) as ReturnType<typeof table>;
const result = table();

test("the balance table is what it was: a change to a number in the rules shows here (node tools/balance.ts --write if meant)", () => {
  assert.deepEqual(result, expected);
});

test("managing moves matters: the managed run wins, the same run that never touches its moves loses", () => {
  assert.equal(result["managed"]!.won, true);
  assert.ok(result["managed"]!.lives.at(-1)! < 10, "but it is not free: some lives are lost");
  assert.equal(result["never touches moves"]!.won, false);
});

test("Glowmire too: its tougher waves are won by managing moves and lost without", () => {
  assert.equal(result["managed, Glowmire"]!.won, true);
  assert.ok(result["managed, Glowmire"]!.lives.at(-1)! < 10, "but it is not free: some lives are lost");
  assert.equal(result["never touches moves, Glowmire"]!.won, false);
});

test("creatures are needed: with none on the field the run is lost early", () => {
  assert.equal(result["no creatures placed"]!.won, false);
  assert.ok(result["no creatures placed"]!.lives.indexOf(0) <= 2);
});
