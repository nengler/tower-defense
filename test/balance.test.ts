import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { table } from "../tools/balance.ts";

const expected = JSON.parse(readFileSync(new URL("balance.expected.json", import.meta.url), "utf8")) as ReturnType<typeof table>;
const result = table();

/** Lives lost over waves `from` to `to` (counted from 1). */
function lost(lives: readonly (number | null)[], from: number, to: number): number {
  const before = from === 1 ? 10 : (lives[from - 2] ?? 0);
  return before - (lives[to - 1] ?? 0);
}

test("the balance table is what it was: a change to a number in the rules shows here (node tools/balance.ts --write if meant)", () => {
  assert.deepEqual(result, expected);
});

test("a skilled run wins on every map, but not for free: the last three waves cost more than the first seven", () => {
  for (const name of ["skilled", "skilled, riverbend", "skilled, gauntlet", "skilled, glowmire"]) {
    const r = result[name]!;
    assert.equal(r.won, true, name);
    assert.ok(r.lives.at(-1)! < 10, `${name} loses lives`);
    assert.ok(lost(r.lives, 8, 10) > lost(r.lives, 1, 7), `${name}: the last waves are the hardest`);
  }
});

test("playing well matters: picking moves well beats taking the first, and placing well beats fixed spots", () => {
  const managed = result["managed"]!;
  const lazy = result["lazy"]!;
  assert.equal(managed.won, false, "fixed spots, however well its moves are chosen, do not hold");
  assert.equal(lazy.won, false);
  assert.ok(managed.lives.filter((l) => l !== null).length >= lazy.lives.filter((l) => l !== null).length);
});

test("creatures are needed: with none on the field the run is lost early", () => {
  assert.equal(result["no creatures placed"]!.won, false);
  assert.ok(result["no creatures placed"]!.lives.indexOf(0) <= 2);
});
