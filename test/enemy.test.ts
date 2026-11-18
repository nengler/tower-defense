import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

import { render } from "@tsengine/testing";

import { PLAIN_BLAST, type Blast } from "../src/battle.ts";
import { Enemy } from "../generated/Enemy.ts";
import { Play } from "../generated/Play.ts";
import { useGame } from "../src/GameState.ts";
import { BURROW, ENEMIES, SPRINT_CAP, type EnemyKind } from "../src/rules/enemies.ts";
import { MAPS, pathAt } from "../src/rules/map.ts";
import { CHAIN_SHARE, ROOT_FOR, SHATTER_SHARE } from "../src/rules/moves.ts";
import { BUFF_XP_SHARE } from "../src/rules/progress.ts";
import { newCreature } from "../src/rules/roster.ts";
import { spawnsOf } from "../src/rules/waves.ts";

const STEPS_A_SECOND = 60;
const PATH = MAPS.meadow.path;
const START = pathAt(PATH, 0);

function enemy(kind: EnemyKind = "crawler", maxHp = 1000, startDist = 0) {
  const onKilled = mock.fn();
  const onLeaked = mock.fn();
  const onDamaged = mock.fn();
  const onHit = mock.fn();
  const onReaction = mock.fn();
  const t = render(Enemy, { id: 1, kind, maxHp, startDist, pace: 1, onKilled, onLeaked, onDamaged, onHit, onReaction }, { collisions: true });
  /** What the enemy sent each placed collider, by its id (not the test's own blasts, which reach them too). */
  const sent = new Map<number, Blast[]>();
  /** Another enemy near it (a collider standing in for one), `dx` to its right. */
  const neighbour = (nid: number, dx: number) => {
    sent.set(nid, []);
    const at = pathAt(PATH, startDist);
    t.place({
      tag: "enemy",
      data: { id: nid, dist: 0, x: at.x + dx, y: at.y, hp: 10, hidden: false, jam: 0 },
      x: at.x + dx - 4,
      y: at.y - 4,
      width: 8,
      height: 8,
      onReceive: (v) => {
        if ((v as Blast).skip === 1) sent.get(nid)!.push(v as Blast);
      },
    });
  };
  return { t, onKilled, onLeaked, onDamaged, onHit, onReaction, neighbour, sent };
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
    assert.deepEqual(onKilled.mock.calls[0]?.arguments, [1, START.x, START.y, 0]);
  });

  it("says when it reaches the end of the path", () => {
    const { t, onLeaked } = enemy("skitter");
    t.step(Math.ceil((PATH.length / ENEMIES.skitter.speed) * STEPS_A_SECOND) + 1);
    assert.deepEqual(onLeaked.mock.calls[0]?.arguments, [1, "skitter"]);
  });
});

describe("reactions: a combo sets off its status's reaction around the enemy", () => {
  it("soaked: the hit chains to the soaked enemies near, at a share of its damage, and only them", () => {
    const { t, neighbour, sent, onReaction } = enemy();
    neighbour(2, 12);
    hit(t, blast({ soak: 3 }));
    hit(t, blast({ damage: 10, bonusVs: "soaked", bonus: 2, consumes: true }));
    t.step();
    const chained = sent.get(2)!;
    assert.equal(chained.length, 1);
    assert.equal(chained[0]!.only, "soaked");
    assert.equal(chained[0]!.reacted, true, "a reaction's blast sets off nothing more");
    assert.ok(near(chained[0]!.damage, 10 * 2 * CHAIN_SHARE));
    assert.equal(onReaction.mock.calls[0]?.arguments[0].reaction, "chain");
  });

  it("stunned: a stone combo shatters onto its neighbours", () => {
    const { t, neighbour, sent } = enemy();
    neighbour(2, 10);
    hit(t, blast({ stun: 3 }));
    hit(t, blast({ damage: 20, bonusVs: "stunned", bonus: 2 }));
    t.step();
    assert.ok(near(sent.get(2)![0]!.damage, 20 * 2 * SHATTER_SHARE));
  });

  it("slowed: it and the slowed enemies near are rooted", () => {
    const { t, neighbour, sent } = enemy("skitter");
    neighbour(2, 10);
    hit(t, blast({ slow: 0.3, slowFor: 5 }));
    hit(t, blast({ damage: 5, bonusVs: "slowed", bonus: 2 }));
    t.step();
    assert.equal(sent.get(2)![0]!.stun, ROOT_FOR);
    assert.equal(sent.get(2)![0]!.only, "slowed");
    assert.ok(fields(t).stun! > 0, "it is rooted too");
  });

  it("burning: the fire spreads to the enemies near", () => {
    const { t, neighbour, sent } = enemy();
    neighbour(2, 10);
    hit(t, blast({ burn: 4, burnFor: 3, moveType: "ember", userType: "ember" }));
    hit(t, blast({ damage: 5, bonusVs: "burning", bonus: 2 }));
    t.step();
    assert.equal(sent.get(2)![0]!.burn, 4);
    assert.ok(sent.get(2)![0]!.burnFor > 0);
  });

  it("a reaction's own blasts, and a quiet combo (a douse), set off nothing", () => {
    const { t, neighbour, sent } = enemy();
    neighbour(2, 10);
    hit(t, blast({ stun: 3 }));
    hit(t, blast({ damage: 20, bonusVs: "stunned", bonus: 2, reacted: true }));
    hit(t, blast({ burn: 4, burnFor: 3 }));
    hit(t, blast({ damage: 20, bonusVs: "burning", bonus: 2, consumes: true, quiet: true }));
    t.step();
    assert.equal(sent.get(2)!.length, 0);
    assert.equal(fields(t).burnFor, 0, "the douse put the fire out");
  });

  it("a blast for one status only does nothing to an enemy without it", () => {
    const { t } = enemy();
    hit(t, blast({ damage: 10, only: "soaked" }));
    assert.equal(fields(t).hp, 1000);
  });
});

describe("enemies that get in the way", () => {
  it("a cleanser washes the statuses off the enemies near it, and takes none itself", () => {
    const { t, neighbour, sent } = enemy("cleanser");
    neighbour(2, 12);
    hit(t, blast({ soak: 3, stun: 2, slow: 0.5, slowFor: 2 }));
    assert.equal(fields(t).soak, 0);
    assert.equal(fields(t).stun, 0);
    t.step();
    assert.ok(sent.get(2)!.some((b) => b.cleanse));
  });

  it("a cleansing blast washes every status off", () => {
    const { t } = enemy();
    hit(t, blast({ soak: 3, stun: 2, burn: 1, burnFor: 3 }));
    hit(t, blast({ cleanse: true }));
    assert.deepEqual([fields(t).soak, fields(t).stun, fields(t).burnFor], [0, 0, 0]);
  });

  it("a shepherd heals the enemies near it, and a heal never goes past full", () => {
    const { t, neighbour, sent } = enemy("shepherd");
    neighbour(2, 12);
    t.step();
    assert.ok(sent.get(2)!.some((b) => b.heal > 0));
    const other = enemy();
    hit(other.t, blast({ damage: 100 }));
    hit(other.t, blast({ heal: 0.05 }));
    assert.equal(fields(other.t).hp, 950);
    hit(other.t, blast({ heal: 1 }));
    assert.equal(fields(other.t).hp, 1000);
  });

  it("a burrower underground is hidden and nothing hits it", () => {
    const { t } = enemy("burrower", 1000, BURROW.up + 5);
    hit(t, blast({ damage: 10 }));
    assert.equal(fields(t).hp, 1000);
    assert.equal((t.find("Collider") as unknown as { data: { hidden: boolean } }).data.hidden, true);
    const up = enemy("burrower", 1000, 5);
    hit(up.t, blast({ damage: 10 }));
    assert.ok(fields(up.t).hp! < 1000, "on the surface it is hit");
  });

  it("a sprinter speeds up with every hit, up to its cap", () => {
    const { t } = enemy("sprinter");
    hit(t, blast({ damage: 1 }));
    assert.ok(near(fields(t).boost!, ENEMIES.sprinter.sprint!));
    for (let i = 0; i < 40; i++) hit(t, blast({ damage: 1 }));
    assert.equal(fields(t).boost, SPRINT_CAP);
  });

  it("the Mosshorn sheds its shell at half its hit points: no armour, a new type, faster", () => {
    const { t } = enemy("mosshorn", 1000);
    hit(t, blast({ damage: 10 + ENEMIES.mosshorn.armor, moveType: "tide", userType: "volt" }));
    assert.equal(fields(t).hp, 990, "armour takes its share off a hit");
    hit(t, blast({ damage: 600, moveType: "tide", userType: "volt" }));
    t.step();
    assert.equal((t.state().s as { shed: boolean }).shed, true);
    const before = fields(t).hp!;
    hit(t, blast({ damage: 10, moveType: "ember", userType: "tide" }));
    assert.ok(near(before - fields(t).hp!, 15), "no armour, and ember beats bloom");
  });
});

describe("the battle", () => {
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

  it("an elite wave: tougher enemies, and the milestone after it offers four creatures", () => {
    useGame.store.reset();
    const t = render(Play, {});
    const { start, takeOffer, chooseElite } = useGame.actions();
    start();
    takeOffer(useGame.getState().offer[0]!);
    chooseElite(true);
    t.step();
    t.input("Space");
    t.step(2);
    const play = t.state().s as { elite: boolean; enemies: { kind: string; maxHp: number }[]; active: boolean };
    assert.equal(play.elite, true);
    assert.equal(useGame.getState().elite, false, "the choice is used up");
    assert.equal(useGame.getState().eliteChosen, false, "and the next eligible wave asks again");
    const first = play.enemies[0]!;
    assert.equal(first.maxHp, Math.round(ENEMIES.crawler.hp * 1.5));
    t.stepUntil(() => !(t.state().s as { active: boolean }).active, { maxSteps: 60 * 120 });
    assert.equal(useGame.getState().offer.length, 4);
  });
});

