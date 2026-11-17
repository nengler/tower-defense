import { after, AnimatedSprite, cancelTimer, Collider, Entity, Layer, send, Shape, useMutable, useUpdate } from "@tsengine/runtime/jsx";

import { PLAIN_BLAST, type Reacted } from "./battle.ts";
import { useGame } from "./GameState.ts";
import {
  afterArmor,
  armorNow,
  burrowed,
  BURROW,
  CLEANSE_EVERY,
  ENEMIES,
  HEAL_EVERY,
  jamOf,
  speedNow,
  SPRINT_CAP,
  typeNow,
  type EnemyKind,
} from "./rules/enemies.ts";
import { ENEMY_ANIMATIONS, rgbOf } from "./rules/draw.ts";
import { mapOf, pathAt } from "./rules/map.ts";
import { CHAIN_SHARE, REACTION_OF, REACTION_RADIUS, ROOT_FOR, SHATTER_SHARE, type Status } from "./rules/moves.ts";
import { TYPE_COLOR, typeFactor, type Type } from "./rules/types.ts";

interface EnemyProps {
  id: number;
  kind: EnemyKind;
  maxHp: number;
  /** Where along the path it starts (a mite split from a brood starts where the brood fell). */
  startDist: number;
  /** Its kind's speed is multiplied by this (a difficulty tier). */
  pace: number;
  /** Its hit points ran out, where it stood and how far along the path. */
  onKilled: (id: number, x: number, y: number, dist: number) => void;
  /** It reached the end of the path. */
  onLeaked: (id: number, kind: EnemyKind) => void;
  /** It took damage from the creature `from` (for that creature's XP): never more than the hit points it had left. */
  onDamaged: (from: number, amount: number, helper: number) => void;
  /** A move hit it (not a burn): how much, and whether a combo made it more. For the number that pops up. */
  onHit: (x: number, y: number, amount: number, combo: boolean) => void;
  /** A combo on it set off a reaction: for `Play` to show. */
  onReaction: (r: Reacted) => void;
}

/**
 * One enemy. It walks the path at its kind's speed, and takes the blasts sent to it (`onReceive`): a creature sends a move to the
 * enemy it aimed at, or to every enemy whose middle is in its area. What a blast leaves stays on it as state that counts down:
 * stunned (it stops), slowed, burning (damage over time) and soaked. A combo move does more against an enemy with the status it plays
 * off, and sets off that status's reaction around it (`REACTION_OF`): the hit chains to other soaked enemies, the fire spreads, the
 * stunned enemy shatters onto its neighbours, or the slowed ones near are rooted. A reaction's own blasts set off nothing more.
 *
 * Its kind may do more: a cleanser washes statuses off the enemies near it and takes none; a shepherd heals them; a jammer's
 * collider says how far it jams creatures (they read it); a burrower is underground for stretches (untargetable, and every blast
 * misses it); a sprinter speeds up when hit; a boss sheds its armour at half its hit points, or changes type as it goes.
 */
export function Enemy({ id, kind, maxHp, startDist, pace, onKilled, onLeaked, onDamaged, onHit, onReaction }: EnemyProps) {
  const info = ENEMIES[kind];
  const map = useGame((s) => s.map);
  const path = mapOf(map).path;
  const s = useMutable({
    dist: startDist,
    hp: maxHp,
    stun: 0,
    slow: 0,
    slowFor: 0,
    /** The burn a second as it lands (the type factor in it), and as it was sent (for a spread), with its types and creature. */
    burn: 0,
    burnBase: 0,
    burnFor: 0,
    burnFrom: -1,
    /** The creature whose haste was on the burn's user (a share of its XP), or -1. */
    burnHelper: -1,
    burnType: "ember" as Type,
    burnUser: "ember" as Type,
    soak: 0,
    /** A sprinter's speed, as a multiple of its kind's. */
    boost: 1,
    /** A boss that has shed its shell. */
    shed: false,
    /** Seconds until a cleanser washes or a shepherd heals again. */
    pulse: 0,
    /** White for a moment after a hit: only for the eye, so a timer turns it off (that timer's id, 0 for none). */
    flash: false,
    flashTimer: 0,
  });
  const at = pathAt(path, s.dist);
  const half = info.size / 2;
  const hidden = info.burrow === true && burrowed(s.dist);
  const type = typeNow(kind, s.shed, s.dist, path.length);
  const armor = armorNow(kind, s.shed);
  const jam = jamOf(kind);
  const scale = info.boss === true ? 1.6 : 1;

  /** Take damage, reporting what was really taken (not past zero). */
  const hurt = (from: number, amount: number, helper: number) => {
    const taken = Math.min(amount, Math.max(0, s.hp));
    s.hp -= amount;
    if (taken > 0) onDamaged(from, taken, helper);
  };

  /** Does it have this status now. */
  const has = (status: Status) =>
    status === "soaked" ? s.soak > 0 : status === "burning" ? s.burnFor > 0 : status === "stunned" ? s.stun > 0 : s.slowFor > 0;
  /** Use a status up. */
  const spend = (status: Status) => {
    if (status === "soaked") s.soak = 0;
    else if (status === "burning") s.burnFor = 0;
    else if (status === "stunned") s.stun = 0;
    else s.slowFor = 0;
  };
  const washed = () => {
    s.soak = 0;
    s.burnFor = 0;
    s.stun = 0;
    s.slowFor = 0;
  };

  useUpdate((dt) => {
    if (s.hp <= 0) {
      onKilled(id, at.x, at.y, s.dist);
      return;
    }
    if (s.burnFor > 0) {
      hurt(s.burnFrom, s.burn * Math.min(dt, s.burnFor), s.burnHelper);
      s.burnFor = Math.max(0, s.burnFor - dt);
    }
    if (s.soak > 0) s.soak = Math.max(0, s.soak - dt);
    if (!s.shed && s.hp <= maxHp * (info.shed?.at ?? 0)) {
      s.shed = true;
      washed();
    }
    // A cleanser washes and a shepherd heals the enemies near it (not itself: a send never reaches its sender).
    if (info.cleanse !== undefined || info.heal !== undefined) {
      s.pulse -= dt;
      if (s.pulse <= 0) {
        if (info.cleanse !== undefined) {
          s.pulse = CLEANSE_EVERY;
          send("enemy", { x: at.x, y: at.y, radius: info.cleanse ?? 0 }, { ...PLAIN_BLAST, cleanse: true, skip: id });
        } else {
          s.pulse = HEAL_EVERY;
          send("enemy", { x: at.x, y: at.y, radius: info.healRadius ?? 0 }, { ...PLAIN_BLAST, heal: (info.heal ?? 0) * HEAL_EVERY, skip: id });
        }
      }
    }
    if (s.stun > 0) {
      s.stun = Math.max(0, s.stun - dt);
      return;
    }
    const own = speedNow(kind, s.shed);
    const under = hidden ? BURROW.speed : 1;
    const speed = own * pace * s.boost * under * (s.slowFor > 0 ? 1 - s.slow : 1);
    if (s.slowFor > 0) s.slowFor = Math.max(0, s.slowFor - dt);
    const next = s.dist + speed * dt;
    if (next >= path.length) {
      onLeaked(id, kind);
      return;
    }
    s.dist = next;
  });

  return (
    <Entity x={at.x} y={at.y}>
      {jam > 0 && <Shape kind="circle" width={jam * 2} height={jam * 2} x={-jam} y={-jam} color={TYPE_COLOR.volt} opacity={0.12} />}
      {info.boss === true && (
        <Shape kind="circle" width={info.size * scale + 4} height={info.size * scale + 4} x={-(info.size * scale) / 2 - 2} y={-(info.size * scale) / 2 - 2} color={TYPE_COLOR[type]} opacity={0.45} />
      )}
      {hidden && <Shape kind="rect" width={8} height={3} x={-4} y={1} color="#4e4232" />}
      {s.flash ? (
        <Layer shader="hit.glsl" params={rgbOf(TYPE_COLOR[type])}>
          <AnimatedSprite
            sheet="enemies.png"
            frameWidth={16}
            frameHeight={16}
            animations={ENEMY_ANIMATIONS}
            animation={kind}
            originX={8}
            originY={9}
            scaleX={scale}
            scaleY={scale}
            flash={0.5}
            opacity={hidden ? 0.3 : 1}
          />
        </Layer>
      ) : (
        <AnimatedSprite
          sheet="enemies.png"
          frameWidth={16}
          frameHeight={16}
          animations={ENEMY_ANIMATIONS}
          animation={kind}
          originX={8}
          originY={9}
          scaleX={scale}
          scaleY={scale}
          opacity={hidden ? 0.3 : 1}
        />
      )}
      {s.stun > 0 && <Shape kind="rect" width={info.size + 2} height={1} x={-half - 1} y={-half - 2} color="#ffffff" />}
      {s.soak > 0 && <Shape kind="rect" width={2} height={2} x={half} y={-half} color={TYPE_COLOR.tide} />}
      {s.burnFor > 0 && <Shape kind="rect" width={2} height={2} x={-half - 2} y={-half} color={TYPE_COLOR.ember} />}
      {s.slowFor > 0 && <Shape kind="rect" width={info.size} height={1} x={-half} y={half + 1} color="#9ee7ff" />}
      {s.hp < maxHp && (
        <Entity x={-6} y={-half * scale - 4}>
          <Shape kind="rect" width={12} height={2} color="#5a1f24" />
          <Shape kind="rect" width={(12 * Math.max(s.hp, 0)) / maxHp} height={2} color="#7ad07a" />
        </Entity>
      )}
      <Collider
        width={info.size}
        height={info.size}
        x={-half}
        y={-half}
        tag="enemy"
        data={{ id, dist: s.dist, x: at.x, y: at.y, hp: s.hp, hidden, jam }}
        onReceive={(b) => {
          // Underground, nothing reaches it; nor does what it sent itself.
          if (hidden || b.skip === id) return;
          if (b.heal > 0) {
            s.hp = Math.min(maxHp, s.hp + maxHp * b.heal);
            return;
          }
          if (b.cleanse) {
            washed();
            return;
          }
          if (b.only !== "") {
            if (!has(b.only)) return;
            if (b.consumes) spend(b.only);
          }
          const factor = typeFactor(b.moveType, b.userType, type);
          // A combo: more against an enemy with the status it plays off, which it may use up.
          const combo = b.bonusVs !== "" && has(b.bonusVs);
          if (combo && b.consumes) spend(b.bonusVs);
          if (b.damage > 0) {
            const amount = afterArmor(armor, b.damage * factor * (combo ? b.bonus : 1));
            hurt(b.from, amount, b.helper);
            onHit(at.x, at.y, amount, combo);
            s.boost = Math.min(SPRINT_CAP, s.boost * (info.sprint ?? 1));
            cancelTimer(s.flashTimer);
            s.flash = true;
            s.flashTimer = after(0.1, () => {
              s.flash = false;
            });
          }
          if (info.immune !== true) {
            if (b.burnFor > 0) {
              s.burn = b.burn * factor;
              s.burnBase = b.burn;
              s.burnFor = Math.max(s.burnFor, b.burnFor);
              s.burnFrom = b.from;
              s.burnHelper = b.helper;
              s.burnType = b.moveType;
              s.burnUser = b.userType;
            }
            if (b.stun > 0) s.stun = Math.max(s.stun, b.stun);
            if (b.slowFor > 0) {
              s.slow = Math.max(s.slowFor > 0 ? s.slow : 0, b.slow);
              s.slowFor = Math.max(s.slowFor, b.slowFor);
            }
            if (b.soak > 0) s.soak = Math.max(s.soak, b.soak);
          }
          if (!combo || b.reacted || b.quiet) return;
          // The combo's reaction, around it. What it sends is marked `reacted`, so it sets off nothing more.
          const reaction = REACTION_OF[b.bonusVs];
          const where = { x: at.x, y: at.y, radius: REACTION_RADIUS[reaction] };
          const base = { ...PLAIN_BLAST, from: b.from, moveType: b.moveType, userType: b.userType, reacted: true, skip: id };
          if (reaction === "chain") send("enemy", where, { ...base, damage: b.damage * b.bonus * CHAIN_SHARE, only: "soaked", consumes: true });
          else if (reaction === "shatter") send("enemy", where, { ...base, damage: b.damage * b.bonus * SHATTER_SHARE });
          else if (reaction === "root") {
            s.stun = Math.max(s.stun, ROOT_FOR);
            send("enemy", where, { ...base, stun: ROOT_FOR, only: "slowed" });
          } else if (s.burnBase > 0) {
            send("enemy", where, { ...base, moveType: s.burnType, userType: s.burnUser, burn: s.burnBase, burnFor: 3 });
          }
          onReaction({ reaction, x: at.x, y: at.y });
        }}
      />
    </Entity>
  );
}
