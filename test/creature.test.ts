import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

import { render } from "@rge/testing";

import type { Effect } from "../src/battle.ts";
import { Creature } from "../generated/Creature.ts";
import type { MoveId } from "../src/rules/moves.ts";
import { scaled } from "../src/rules/scaled.ts";
import { statsAt } from "../src/rules/species.ts";

const STEPS_A_SECOND = 60;
const X = 100;
const Y = 60;

/** A creature alone at (X, Y), and a way to put an enemy near it (its collider, with what it says about itself). */
function creature(equipped: readonly MoveId[], species: "emberling" | "puddlepup" | "voltkit" = "voltkit", level = 1) {
  const onUse = mock.fn((_e: Effect) => {});
  const t = render(Creature, { id: 3, species, level, equipped, x: X, y: Y, selected: false, onUse });
  const near = (id: number, dx: number, dist = 50, hp = 10) =>
    t.place({ tag: "enemy", data: { id, dist, x: X + dx, y: Y, hp }, x: X + dx - 4, y: Y - 4, width: 8, height: 8 });
  const used = () => onUse.mock.calls.map((c) => c.arguments[0]!);
  return { t, onUse, near, used };
}

const fields = (t: { state(): Record<string, unknown> }) => t.state().s as { busy: string; left: number; cooldowns: Record<string, number> };

/** Steps until (and including) the step a move's cooldown and animation say it lands, plus one. */
const secondsToSteps = (seconds: number) => Math.ceil(seconds * STEPS_A_SECOND) + 1;

describe("a creature", () => {
  it("a move just equipped (or placed) starts on its full cooldown, then is used on an enemy in reach and lands after its animation", () => {
    const { t, near, used } = creature(["zap"]);
    near(1, 20);
    const zap = scaled("zap", statsAt("voltkit", 1));
    t.step(secondsToSteps(zap.cooldown) - 2);
    assert.equal(fields(t).busy, "", "still cooling down");
    t.step(2);
    assert.equal(fields(t).busy, "zap");
    assert.equal(used().length, 0, "nothing lands before the animation ends");
    t.step(secondsToSteps(zap.animation));
    assert.equal(used().length, 1);
    const e = used()[0]!;
    assert.equal(e.kind, "blast");
    assert.equal(e.blast.target, 1);
    assert.equal(e.blast.from, 3);
    assert.equal(e.blast.moveType, "volt");
    assert.equal(e.blast.userType, "volt");
    assert.ok(Math.abs(e.blast.damage - zap.damage) < 1e-9, "damage is the move's, scaled by the creature's attack");
    assert.equal(e.blast.soakedBonus, 2);
  });

  it("does nothing with no enemy in reach, and waits with the move ready", () => {
    const { t, near, used } = creature(["zap"]);
    near(1, 200);
    t.step(5 * STEPS_A_SECOND);
    assert.equal(used().length, 0);
    assert.equal(fields(t).cooldowns.zap, 0, "ready, waiting for a target");
  });

  it("uses one move at a time: the first ready one in equip order, and each keeps its own cooldown", () => {
    const { t, near, used } = creature(["jolt", "zap"]);
    near(1, 20);
    // Zap's cooldown (1 s) runs out before Jolt's (8 s): it is used first, then again and again, until Jolt is ready.
    t.step(8 * STEPS_A_SECOND);
    const order = used().map((e) => e.move);
    assert.ok(order.length >= 3, `used ${order.join(", ")}`);
    assert.ok(order.slice(0, 3).every((m) => m === "zap"));
    t.step(3 * STEPS_A_SECOND);
    assert.ok(
      used().some((e) => e.move === "jolt"),
      "Jolt is used once ready"
    );
  });

  it("never starts a move while another's animation runs: lands are at least an animation apart", () => {
    const { t, near, used } = creature(["zap", "jolt", "arc"], "voltkit", 5);
    near(1, 20, 50, 1e9);
    const stats = statsAt("voltkit", 5);
    const landedAt: { step: number; move: string }[] = [];
    for (let step = 0; step < 20 * STEPS_A_SECOND; step++) {
      t.step();
      while (landedAt.length < used().length) landedAt.push({ step, move: used()[landedAt.length]!.move });
    }
    assert.ok(new Set(landedAt.map((l) => l.move)).size === 3, "all three moves were used");
    for (let i = 1; i < landedAt.length; i++) {
      const animation = scaled(landedAt[i]!.move as MoveId, stats).animation;
      assert.ok(landedAt[i]!.step - landedAt[i - 1]!.step >= Math.floor(animation * STEPS_A_SECOND), `lands ${i - 1} and ${i}`);
    }
  });

  it("swapping a move out and back in puts it on its full cooldown again", () => {
    const { t } = creature(["zap"]);
    t.step(3 * STEPS_A_SECOND);
    assert.equal(fields(t).cooldowns.zap, 0);
    t.setProps({ equipped: [] });
    t.step();
    t.setProps({ equipped: ["zap"] });
    t.step();
    const zap = scaled("zap", statsAt("voltkit", 1));
    assert.ok(fields(t).cooldowns.zap! > zap.cooldown - 0.05, `cooldown ${fields(t).cooldowns.zap}`);
  });

  it("a buff is used as soon as it is ready, with no enemy anywhere, and lands as an aura on itself", () => {
    const { t, used } = creature(["rally"], "puddlepup");
    const rally = scaled("rally", statsAt("puddlepup", 1));
    t.step(secondsToSteps(rally.cooldown + rally.animation) + 1);
    assert.equal(used().length, 1);
    const e = used()[0]!;
    assert.equal(e.kind, "aura");
    assert.equal(e.aura.x, X);
    assert.equal(e.aura.haste, 0.3);
    assert.ok(Math.abs(e.aura.radius - rally.radius) < 1e-9);
  });

  it("a pulse needs an enemy within its radius, and lands around the creature", () => {
    const { t, near, used } = creature(["undertow"], "puddlepup");
    const u = scaled("undertow", statsAt("puddlepup", 1));
    near(1, u.radius + 10);
    t.step(secondsToSteps(u.cooldown + u.animation) + 5);
    assert.equal(used().length, 0, "nothing within the radius");
    near(2, u.radius - 5);
    t.step(secondsToSteps(u.animation) + 1);
    assert.equal(used().length, 1);
    const e = used()[0]!;
    assert.equal(e.blast.x, X);
    assert.equal(e.blast.target, -1);
    assert.equal(e.blast.slow, 0.4);
    assert.equal(e.blast.soak, 4);
  });

  it("a haste makes its cooldowns run faster while it lasts", () => {
    const plain = creature(["zap"]);
    plain.t.step(10);
    const hasted = creature(["zap"]);
    hasted.t.collide("ally", { tag: "aura", data: { x: X, y: Y, radius: 40, haste: 0.5, hasteFor: 5 } });
    hasted.t.step(10);
    const zap = scaled("zap", statsAt("voltkit", 1));
    const spentPlain = zap.cooldown - fields(plain.t).cooldowns.zap!;
    const spentHasted = zap.cooldown - fields(hasted.t).cooldowns.zap!;
    assert.ok(Math.abs(spentHasted - 2 * spentPlain) < 1e-6, `plain ${spentPlain}, hasted ${spentHasted}`);
  });

  it("an aura it is outside of does not haste it", () => {
    const { t } = creature(["zap"]);
    t.collide("ally", { tag: "aura", data: { x: X + 100, y: Y, radius: 40, haste: 0.5, hasteFor: 5 } });
    assert.equal((t.state().s as { hasteFor: number }).hasteFor, 0);
  });
});
