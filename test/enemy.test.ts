import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

import { render } from "@tsengine/testing";

import { PLAIN_BLAST, type Blast } from "../src/battle.ts";
import { Enemy } from "../generated/Enemy.ts";
import { Play } from "../generated/Play.ts";
import { useGame } from "../src/GameState.ts";
import { ENEMIES } from "../src/rules/enemies.ts";
import { BUFF_XP_SHARE } from "../src/rules/progress.ts";
import { newCreature } from "../src/rules/roster.ts";
import { PATH, pathAt } from "../src/rules/map.ts";
import { spawnsOf } from "../src/rules/waves.ts";

const STEPS_A_SECOND = 60;
const START = pathAt(PATH, 0);

function enemy(kind: "crawler" | "skitter" = "crawler", maxHp = 1000) {
  const onKilled = mock.fn();
  const onLeaked = mock.fn();
  const onDamaged = mock.fn();
  const onHit = mock.fn();
  const t = render(Enemy, { id: 1, kind, maxHp, onKilled, onLeaked, onDamaged, onHit });
  return { t, onKilled, onLeaked, onDamaged, onHit };
}

const fields = (t: { state(): Record<string, unknown> }) => t.state().s as Record<string, number>;

/** A blast. Stone against a crawler (bloom) is resisted: use Volt, neutral. */
const blast = (over: Partial<Blast> = {}): Blast => ({ ...PLAIN_BLAST, moveType: "volt", userType: "tide", from: 7, ...over });

/** Send a blast to the enemy, delivered as `send` delivers it (which enemies a move lands on is the creature's choice). */
function hit(t: ReturnType<typeof enemy>["t"], b: Blast) {
  t.send("enemy", { x: 0, y: 0, radius: 10_000 }, b);
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

describe("an enemy", () => {
  it("walks the path at its kind's speed", () => {
    const { t } = enemy("skitter");
    t.step(STEPS_A_SECOND);
    assert.ok(near(fields(t).dist!, ENEMIES.skitter.speed), `walked ${fields(t).dist}`);
  });

  it("takes a blast's damage, scaled by type, and reports it for XP", () => {
    const { t, onDamaged } = enemy();
    hit(t, blast({ damage: 10 }));
    assert.equal(fields(t).hp, 990, "volt against bloom is neutral, and not the user's type");
    assert.deepEqual(onDamaged.mock.calls[0]?.arguments, [7, 10, -1]);
    hit(t, blast({ damage: 10, moveType: "ember", userType: "ember" }));
    assert.ok(near(fields(t).hp!, 990 - 10 * 1.25 * 1.5), "ember beats bloom, and is its user's type");
  });

  it("stands still while stunned", () => {
    const { t } = enemy("skitter");
    hit(t, blast({ stun: 0.5 }));
    t.step(30);
    assert.equal(fields(t).dist, 0);
    t.step(30);
    assert.ok(fields(t).dist! > 0, "and walks on after");
  });

  it("walks slower while slowed", () => {
    const { t } = enemy("skitter");
    hit(t, blast({ slow: 0.4, slowFor: 2 }));
    t.step(STEPS_A_SECOND);
    assert.ok(near(fields(t).dist!, ENEMIES.skitter.speed * 0.6), `walked ${fields(t).dist}`);
  });

  it("burns for as long as the burn lasts, and the burn counts as its user's damage", () => {
    const { t, onDamaged } = enemy();
    hit(t, blast({ burn: 4, burnFor: 1 }));
    t.step(2 * STEPS_A_SECOND);
    assert.ok(near(fields(t).hp!, 996), `hp ${fields(t).hp}`);
    const total = onDamaged.mock.calls.reduce((sum, c) => sum + (c.arguments[1] as number), 0);
    assert.ok(near(total, 4));
  });

  it("names the ally whose haste was on the attacker, for a hit and for the burn it leaves", () => {
    const { t, onDamaged } = enemy();
    hit(t, blast({ damage: 10, burn: 4, burnFor: 1, helper: 9 }));
    t.step(STEPS_A_SECOND);
    assert.ok(onDamaged.mock.calls.length > 1);
    for (const call of onDamaged.mock.calls) assert.deepEqual([call.arguments[0], call.arguments[2]], [7, 9]);
  });

  it("a soak makes the next Volt move hit twice as hard, and is used up by it", () => {
    const { t } = enemy();
    hit(t, blast({ soak: 3 }));
    assert.equal(fields(t).soak, 3);
    hit(t, blast({ damage: 10, bonusVs: "soaked", bonus: 2, consumes: true }));
    assert.equal(fields(t).hp, 980);
    assert.equal(fields(t).soak, 0);
    hit(t, blast({ damage: 10, bonusVs: "soaked", bonus: 2, consumes: true }));
    assert.equal(fields(t).hp, 970, "no soak left: normal damage");
  });

  it("combos: more against a burning, stunned or slowed enemy; only a soak is used up", () => {
    for (const [status, setup] of [
      ["burning", { burn: 1, burnFor: 5 }],
      ["stunned", { stun: 5 }],
      ["slowed", { slow: 0.3, slowFor: 5 }],
    ] as const) {
      const { t } = enemy();
      hit(t, blast({ damage: 10, bonusVs: status, bonus: 2 }));
      assert.equal(fields(t).hp, 990, `${status}: no bonus before the status`);
      hit(t, blast(setup));
      const before = fields(t).hp!;
      hit(t, blast({ damage: 10, bonusVs: status, bonus: 2 }));
      assert.equal(before - fields(t).hp!, 20, `${status}: twice the damage`);
      hit(t, blast({ damage: 10, bonusVs: status, bonus: 2 }));
      assert.equal(before - fields(t).hp!, 40, `${status}: the status stays`);
    }
  });

  it("a hit is reported for its number (a combo's flagged) and flashes it white for a moment; a burn is not", () => {
    const { t, onHit } = enemy();
    hit(t, blast({ damage: 10 }));
    assert.deepEqual(onHit.mock.calls[0]?.arguments, [START.x, START.y, 10, false]);
    assert.equal((t.state().s as { flash: boolean }).flash, true);
    t.step(6);
    assert.equal((t.state().s as { flash: boolean }).flash, false);
    hit(t, blast({ soak: 3 }));
    hit(t, blast({ damage: 10, bonusVs: "soaked", bonus: 2, consumes: true }));
    assert.deepEqual(onHit.mock.calls.at(-1)?.arguments.slice(2), [20, true], "it has walked on: only the amount and the combo");
    const hits = onHit.mock.callCount();
    hit(t, blast({ burn: 5, burnFor: 1 }));
    t.step(60);
    assert.equal(onHit.mock.callCount(), hits);
  });

  it("never reports more damage than it had left, and says it died the step after", () => {
    const { t, onDamaged, onKilled } = enemy("skitter", 20);
    hit(t, blast({ damage: 50 }));
    assert.equal(onDamaged.mock.calls[0]?.arguments[1], 20);
    assert.equal(onKilled.mock.callCount(), 0);
    t.step();
    assert.deepEqual(onKilled.mock.calls[0]?.arguments, [1, START.x, START.y]);
  });

  it("says when it reaches the end of the path", () => {
    const { t, onLeaked } = enemy("skitter");
    t.step(Math.ceil((PATH.length / ENEMIES.skitter.speed) * STEPS_A_SECOND) + 1);
    assert.deepEqual(onLeaked.mock.calls[0]?.arguments, [1, "skitter"]);
  });
});

describe("the battle", () => {
  it("a wave nobody defends: every enemy gets through, and lives go down by one each", () => {
    useGame.store.reset();
    const t = render(Play, {});
    const s = () => t.state().s as { lives: number; wave: number; active: boolean };
    // Space starts the wave.
    t.input("Space");
    assert.equal(s().wave, 1);
    assert.equal(s().active, true);
    const lastSpawn = spawnsOf(1).at(-1)!.at;
    t.step(Math.ceil((lastSpawn + PATH.length / ENEMIES.crawler.speed + 1) * STEPS_A_SECOND));
    assert.equal(s().lives, 10 - spawnsOf(1).length);
    assert.equal(s().active, false, "the wave is over");
  });

  it("a hit earns its attacker that much XP, and the ally whose haste was on it half as much", () => {
    useGame.store.reset();
    const t = render(Play, {});
    useGame.setState({ roster: [newCreature(1, "voltkit", 0), newCreature(2, "puddlepup", 0)] });
    t.input("Space");
    t.step(STEPS_A_SECOND);
    t.send("enemy", { x: 0, y: 0, radius: 10_000 }, blast({ from: 1, helper: 2, damage: 2, moveType: "volt", userType: "volt" }));
    const xp = useGame.getState().roster.map((c) => c.xp);
    // The first enemy is a crawler (Bloom): Volt is neutral against it, and ×1.25 in a Voltkit's hands.
    assert.ok(near(xp[0]!, 2.5), `attacker ${xp[0]}`);
    assert.ok(near(xp[1]!, 2.5 * BUFF_XP_SHARE), `helper ${xp[1]}`);
  });
});

