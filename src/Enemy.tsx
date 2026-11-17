import { after, AnimatedSprite, cancelTimer, Collider, Entity, Shape, useMutable, useUpdate } from "@tsengine/runtime/jsx";

import { afterArmor, ENEMIES, type EnemyKind } from "./rules/enemies.ts";
import { ENEMY_ANIMATIONS } from "./rules/draw.ts";
import { mapOf, pathAt } from "./rules/map.ts";
import { useGame } from "./GameState.ts";
import type { Status } from "./rules/moves.ts";
import { TYPE_COLOR, typeFactor } from "./rules/types.ts";

interface EnemyProps {
  id: number;
  kind: EnemyKind;
  maxHp: number;
  /** Its hit points ran out, where it stood. */
  onKilled: (id: number, x: number, y: number) => void;
  /** It reached the end of the path. */
  onLeaked: (id: number, kind: EnemyKind) => void;
  /**
   * It took damage from the creature `from` (for that creature's XP): never more than the hit points it had left. `helper` is the
   * creature whose haste was on the attacker (a share of the XP), or -1.
   */
  onDamaged: (from: number, amount: number, helper: number) => void;
  /** A move hit it (not a burn): how much, and whether a combo made it more. For the number that pops up. */
  onHit: (x: number, y: number, amount: number, combo: boolean) => void;
}

/**
 * One enemy. It walks the map's path at its kind's speed, and takes the blasts sent to it (`onReceive`): a creature sends a move to the
 * enemy it aimed at, or to every enemy whose middle is in its area. What a blast leaves stays on it as state that counts down: stunned (it stops), slowed, burning (damage over time)
 * and soaked. A combo move does more against an enemy with the status it plays off (soaked for Volt moves, burning, stunned,
 * slowed), and a soak is used up by it. An armoured kind takes its armour off every hit (not a burn). It draws its kind's walk
 * (white for a moment when hit), a health bar once hurt, and a mark for each status. Creatures find it by its collider, whose data
 * says where it is.
 */
export function Enemy({ id, kind, maxHp, onKilled, onLeaked, onDamaged, onHit }: EnemyProps) {
  const info = ENEMIES[kind];
  const mapId = useGame((g) => g.map);
  const path = mapOf(mapId).path;
  const s = useMutable({
    dist: 0,
    hp: maxHp,
    stun: 0,
    slow: 0,
    slowFor: 0,
    burn: 0,
    burnFor: 0,
    burnFrom: -1,
    burnHelper: -1,
    soak: 0,
    /** White for a moment after a hit: only for the eye, so a timer turns it off (that timer's id, 0 for none). */
    flash: false,
    flashTimer: 0,
  });
  const at = pathAt(path, s.dist);
  const half = info.size / 2;

  /** Take damage, reporting what was really taken (not past zero). */
  const hurt = (from: number, helper: number, amount: number) => {
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

  useUpdate((dt) => {
    if (s.hp <= 0) {
      onKilled(id, at.x, at.y);
      return;
    }
    if (s.burnFor > 0) {
      hurt(s.burnFrom, s.burnHelper, s.burn * Math.min(dt, s.burnFor));
      s.burnFor = Math.max(0, s.burnFor - dt);
    }
    if (s.soak > 0) s.soak = Math.max(0, s.soak - dt);
    if (s.stun > 0) {
      s.stun = Math.max(0, s.stun - dt);
      return;
    }
    const speed = info.speed * (s.slowFor > 0 ? 1 - s.slow : 1);
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
      <AnimatedSprite
        sheet="enemies.png"
        frameWidth={12}
        frameHeight={12}
        animations={ENEMY_ANIMATIONS}
        animation={kind}
        originX={6}
        originY={6}
        flash={s.flash ? 0.8 : 0}
      />
      {s.stun > 0 && <Shape kind="rect" width={info.size + 2} height={1} x={-half - 1} y={-half - 2} color="#ffffff" />}
      {s.soak > 0 && <Shape kind="rect" width={2} height={2} x={half} y={-half} color={TYPE_COLOR.tide} />}
      {s.burnFor > 0 && <Shape kind="rect" width={2} height={2} x={-half - 2} y={-half} color={TYPE_COLOR.ember} />}
      {s.slowFor > 0 && <Shape kind="rect" width={info.size} height={1} x={-half} y={half + 1} color="#9ee7ff" />}
      {s.hp < maxHp && (
        <Entity x={-6} y={-half - 4}>
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
        data={{ id, dist: s.dist, x: at.x, y: at.y, hp: s.hp }}
        onReceive={(b) => {
          const factor = typeFactor(b.moveType, b.userType, info.type);
          // A combo: more against an enemy with the status it plays off, which it may use up.
          const combo = b.bonusVs !== "" && has(b.bonusVs);
          if (combo && b.consumes) spend(b.bonusVs);
          if (b.damage > 0) {
            const amount = afterArmor(kind, b.damage * factor * (combo ? b.bonus : 1));
            hurt(b.from, b.helper, amount);
            onHit(at.x, at.y, amount, combo);
            cancelTimer(s.flashTimer);
            s.flash = true;
            s.flashTimer = after(0.08, () => {
              s.flash = false;
            });
          }
          if (b.burnFor > 0) {
            s.burn = b.burn * factor;
            s.burnFor = b.burnFor;
            s.burnFrom = b.from;
            s.burnHelper = b.helper;
          }
          if (b.stun > 0) s.stun = Math.max(s.stun, b.stun);
          if (b.slowFor > 0) {
            s.slow = Math.max(s.slowFor > 0 ? s.slow : 0, b.slow);
            s.slowFor = Math.max(s.slowFor, b.slowFor);
          }
          if (b.soak > 0) s.soak = Math.max(s.soak, b.soak);
        }}
      />
    </Entity>
  );
}
