import { AnimatedSprite, Collider, Entity, nearby, send, Shape, useMutable, useUpdate } from "@tsengine/runtime/jsx";

import { PLAIN_BLAST, type Aura, type Effect } from "./battle.ts";
import { CREATURE_ANIMATIONS, pipFill, withCooldown } from "./rules/draw.ts";
import { comboOf, MOVES, type MoveId } from "./rules/moves.ts";
import { scaled } from "./rules/scaled.ts";
import { SPECIES, statsAt, type SpeciesId } from "./rules/species.ts";
import { anyWithin, pickTarget } from "./rules/targeting.ts";
import { TYPE_COLOR } from "./rules/types.ts";

/** How far around itself a creature looks for enemies: more than any move reaches. */
const LOOK = 120;
/** Pixels across a creature: its collider, and what its selection frame, move ring and cooldown pips are placed around. */
const SIZE = 10;

interface CreatureProps {
  id: number;
  species: SpeciesId;
  level: number;
  /** The moves it uses, in the order it tries them. */
  equipped: readonly MoveId[];
  /** Where it stands (its tile's middle). */
  x: number;
  y: number;
  selected: boolean;
  /** A move's animation ended: what it puts on the field. */
  onUse: (effect: Effect) => void;
}

/**
 * A creature on the field. Each equipped move has its own cooldown, which starts full when the move is equipped (or the creature
 * placed), so swapping is never a way to skip one. It uses one move at a time: when it is not busy, it starts the first ready move,
 * in equip order, that has a use (an enemy in reach; a buff always has one), and is busy for that move's animation, at the end of
 * which the move lands: it is sent to the enemies (or, for a buff, the allies) it lands on, and shown (`onUse`). A haste on it
 * (from a buff, its own or an ally's) makes its animations and cooldowns run faster, and an ally's haste earns that ally a share of the
 * XP for what it deals meanwhile (`helper` on what it sends).
 *
 * It draws its species' sprite (an idle bob), a ring while it is using a move, and under it one pip per equipped move that fills as the
 * move's cooldown runs.
 */
export function Creature({ id, species, level, equipped, x, y, selected, onUse }: CreatureProps) {
  const type = SPECIES[species].type;
  const stats = statsAt(species, level);
  const s = useMutable({
    /** Seconds left on each equipped move's cooldown. A move that is not in it has just been equipped. */
    cooldowns: {} as Readonly<Partial<Record<MoveId, number>>>,
    /** The move being used ("" for none), the seconds left of its animation, and the enemy it is aimed at. */
    busy: "" as MoveId | "",
    left: 0,
    target: -1,
    haste: 0,
    hasteFor: 0,
    /** The creature whose haste is on it (itself, for its own buff): it earns a share of the XP this one earns while hasted. */
    hasteFrom: -1,
  });
  /** The move as this creature uses it. */
  const use = (move: MoveId) => scaled(move, stats);
  /** The enemies around it, as their colliders describe them. */
  const enemies = () => nearby("enemy", x, y, LOOK).map((e) => e.data);
  /** A haste landing on it: the stronger of this and one still running, for the longer time. The newest buffer gets the credit. */
  const hasten = (a: Aura) => {
    s.hasteFrom = a.from;
    s.haste = Math.max(s.hasteFor > 0 ? s.haste : 0, a.haste);
    s.hasteFor = Math.max(s.hasteFor, a.hasteFor);
  };

  /** Has this move something to do now. */
  const hasUse = (move: MoveId) => {
    const m = MOVES[move];
    if (m.shape === "buff") return true;
    if (m.shape === "pulse") return anyWithin(x, y, use(move).radius, enemies());
    return pickTarget(x, y, use(move).reach, enemies()) !== null;
  };

  /**
   * The move's animation ended: send it to what it lands on, and show it. A hit lands on the enemy it was aimed at if that one is
   * still in reach, else the best one now; an area on every enemy (a buff: every ally, itself included) whose middle is in it. A hit
   * or splash with nothing left in reach does nothing.
   */
  const land = (move: MoveId) => {
    const m = MOVES[move];
    const u = use(move);
    if (m.shape === "buff") {
      const aura = { from: id, haste: m.effects.haste ?? 0, hasteFor: m.effects.hasteFor ?? 0 };
      // `nearby` leaves out its own collider: it takes its own buff here.
      hasten(aura);
      for (const ally of nearby("ally", x, y, u.radius)) if (Math.hypot(ally.data.x - x, ally.data.y - y) <= u.radius) send("ally", ally, aura);
      onUse({ move, fromX: x, fromY: y, x, y, radius: u.radius });
      return;
    }
    const seen = nearby("enemy", x, y, LOOK);
    const data = seen.map((e) => e.data);
    const aimed = data.find((e) => e.id === s.target && e.hp > 0 && Math.hypot(e.x - x, e.y - y) <= u.reach);
    const target = m.shape === "pulse" ? null : (aimed ?? pickTarget(x, y, u.reach, data));
    if (m.shape !== "pulse" && target === null) return;
    const blast = {
      ...PLAIN_BLAST,
      from: id,
      helper: s.hasteFor > 0 && s.hasteFrom !== id ? s.hasteFrom : -1,
      moveType: m.type,
      userType: type,
      damage: u.damage,
      burn: u.burn,
      burnFor: m.effects.burnFor ?? 0,
      stun: m.effects.stun ?? 0,
      slow: m.effects.slow ?? 0,
      slowFor: m.effects.slowFor ?? 0,
      soak: m.effects.soak ?? 0,
      ...comboOf(move),
    };
    const at = target === null ? { x, y } : { x: target.x, y: target.y };
    const radius = m.shape === "hit" ? 0 : u.radius;
    if (m.shape === "hit") {
      const hit = seen.find((e) => e.data.id === target?.id);
      if (hit !== undefined) send("enemy", hit, blast);
    } else {
      for (const e of nearby("enemy", at.x, at.y, radius)) if (Math.hypot(e.data.x - at.x, e.data.y - at.y) <= radius) send("enemy", e, blast);
    }
    onUse({ move, fromX: x, fromY: y, x: at.x, y: at.y, radius });
  };

  useUpdate((dt) => {
    // Hasted, time runs faster for its moves.
    const rate = s.hasteFor > 0 ? 1 / (1 - s.haste) : 1;
    if (s.hasteFor > 0) s.hasteFor = Math.max(0, s.hasteFor - dt);

    // A move just equipped starts on its full cooldown; one no longer equipped forgets it. The others cool down.
    const next: Partial<Record<MoveId, number>> = {};
    for (const move of equipped) {
      const left = s.cooldowns[move];
      next[move] = left === undefined ? use(move).cooldown : Math.max(0, left - dt * rate);
    }
    s.cooldowns = next;

    if (s.busy !== "") {
      s.left -= dt * rate;
      if (s.left > 0) return;
      const done = s.busy;
      s.busy = "";
      if (equipped.includes(done)) land(done);
      return;
    }
    for (const move of equipped) {
      if ((s.cooldowns[move] ?? 1) > 0 || !hasUse(move)) continue;
      s.busy = move;
      s.left = use(move).animation;
      s.target = pickTarget(x, y, use(move).reach, enemies())?.id ?? -1;
      s.cooldowns = withCooldown(s.cooldowns, move, use(move).cooldown);
      return;
    }
  });

  return (
    <Entity x={x} y={y}>
      {selected && <Shape kind="rect" width={SIZE + 4} height={SIZE + 4} x={-SIZE / 2 - 2} y={-SIZE / 2 - 3} color="#ffffff" />}
      {s.busy !== "" && (
        <Shape
          kind="circle"
          width={SIZE + 6}
          height={SIZE + 6}
          x={-SIZE / 2 - 3}
          y={-SIZE / 2 - 4}
          color={TYPE_COLOR[MOVES[s.busy].type]}
          opacity={0.5}
        />
      )}
      <AnimatedSprite
        sheet="creatures.png"
        frameWidth={12}
        frameHeight={12}
        animations={CREATURE_ANIMATIONS}
        animation={species}
        originX={6}
        originY={7}
      />
      {s.hasteFor > 0 && <Shape kind="rect" width={2} height={2} x={SIZE / 2 - 1} y={-SIZE / 2 - 2} color={TYPE_COLOR.bloom} />}
      {equipped.map((move, i) => (
        <Entity key={move} x={-SIZE / 2 + i * 3} y={SIZE / 2 + 1}>
          <Shape kind="rect" width={2} height={3} color="#00000080" />
          <Shape
            kind="rect"
            width={2}
            height={3 * pipFill(s.cooldowns, move, stats)}
            color={TYPE_COLOR[MOVES[move].type]}
          />
        </Entity>
      ))}
      <Collider width={SIZE} height={SIZE} x={-SIZE / 2} y={-SIZE / 2} tag="ally" data={{ id, x, y }} onReceive={(a) => hasten(a)} />
    </Entity>
  );
}
