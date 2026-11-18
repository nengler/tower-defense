import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import { useGame } from "../src/GameState.ts";
import { moveDetails, rangeOf } from "../src/rules/inspect.ts";
import { scaled } from "../src/rules/scaled.ts";
import { statsAt } from "../src/rules/species.ts";

beforeEach(() => {
  useGame.store.reset();
});

test("a move's details are its numbers as this creature uses them", () => {
  const stats = statsAt("emberling", 1);
  const u = scaled("spark", stats);
  const lines = Object.fromEntries(moveDetails("spark", stats).map((d) => [d.label, d.value]));
  assert.equal(lines.DAMAGE, `${Math.round(u.damage)}`);
  assert.equal(lines.REACH, `${Math.round(u.reach)}`);
  assert.equal(lines.COOLDOWN, `${Math.round(u.cooldown * 10) / 10}S`);
  assert.equal(lines.RADIUS, undefined, "a hit has a reach, not a radius");
});

test("the ring is the reach of a hit or splash, the radius of a pulse or buff", () => {
  const stats = statsAt("pebblet", 5);
  assert.equal(rangeOf("pebble", stats), scaled("pebble", stats).reach);
  assert.equal(rangeOf("rally", stats), scaled("rally", stats).radius);
});

test("inspecting a move toggles it; selecting another creature, or closing the card, puts it away", () => {
  const { start, takeOffer, tapTile, inspect, deselect, select } = useGame.actions();
  start();
  useGame.setState({ offer: ["emberling"] });
  takeOffer("emberling");
  tapTile(0, 0);
  inspect("spark");
  assert.equal(useGame.getState().inspected, "spark");
  inspect("spark");
  assert.equal(useGame.getState().inspected, "");
  inspect("spark");
  deselect();
  assert.equal(useGame.getState().inspected, "");
  select(1);
  inspect("spark");
  select(1);
  assert.equal(useGame.getState().inspected, "", "selecting it again deselects it");
});
