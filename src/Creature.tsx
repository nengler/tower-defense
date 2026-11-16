import { AnimatedSprite, Collider, Entity, Shape, useBody, useMutable, useUpdate } from "@rge/runtime/jsx";

import { NO_AURA, PLAIN_BLAST, type Effect } from "./battle.ts";
import { CREATURE_ANIMATIONS, pipFill, withCooldown } from "./rules/draw.ts";
import { comboOf, MOVES, type MoveId } from "./rules/moves.ts";
import { scaled } from "./rules/scaled.ts";
import { SPECIES, statsAt, type SpeciesId } from "./rules/species.ts";
import { anyWithin, pickTarget } from "./rules/targeting.ts";
import { TYPE_COLOR } from "./rules/types.ts";

/** How far around itself a creature looks for enemies: more than any move reaches. */
const LOOK = 120;
/** Pixels of the box drawn for a creature. */
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
 * which the move lands (`onUse`). A haste on it (from an ally's buff) makes its animations and cooldowns run faster.
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
  });
  const { overlapping } = useBody({ x: x - LOOK, y: y - LOOK, width: LOOK * 2, height: LOOK * 2 });

  /** The move as this creature uses it. */
  const use = (move: MoveId) => scaled(move, stats);
  /** The enemies around it, as their colliders describe them. */
  const enemies = () => overlapping("enemy").map((e) => e.data);

  /** Has this move something to do now. */
  const hasUse = (move: MoveId) => {
    const m = MOVES[move];
    if (m.shape === "buff") return true;
    if (m.shape === "pulse") return anyWithin(x, y, use(move).radius, enemies());
    return pickTarget(x, y, use(move).reach, enemies()) !== null;
  };

  /** The move's animation ended: put it on the field. A hit or splash with nothing left in reach does nothing. */
  const land = (move: MoveId) => {
    const m = MOVES[move];
    const u = use(move);
    if (m.shape === "buff") {
      const aura = { x, y, radius: u.radius, haste: m.effects.haste ?? 0, hasteFor: m.effects.hasteFor ?? 0 };
      onUse({ kind: "aura", move, fromX: x, fromY: y, x, y, radius: aura.radius, blast: PLAIN_BLAST, aura });
      return;
    }
    const seen = enemies();
    const aimed = seen.find((e) => e.id === s.target && e.hp > 0 && Math.hypot(e.x - x, e.y - y) <= u.reach);
    const target = m.shape === "pulse" ? null : (aimed ?? pickTarget(x, y, u.reach, seen));
    if (m.shape !== "pulse" && target === null) return;
    const blast = {
      ...PLAIN_BLAST,
      target: m.shape === "hit" && target !== null ? target.id : -1,
      x: target === null ? x : target.x,
      y: target === null ? y : target.y,
      radius: m.shape === "hit" ? 0 : u.radius,
      from: id,
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
    onUse({ kind: "blast", move, fromX: x, fromY: y, x: blast.x, y: blast.y, radius: blast.radius, blast, aura: NO_AURA });
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
        <Shape kind="circle" width={SIZE + 6} height={SIZE + 6} x={-SIZE / 2 - 3} y={-SIZE / 2 - 4} color={`${TYPE_COLOR[MOVES[s.busy].type]}80`} />
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
      <Collider
        width={SIZE}
        height={SIZE}
        x={-SIZE / 2}
        y={-SIZE / 2}
        tag="ally"
        layer="ally"
        hits={["aura"]}
        data={{ id }}
        onCollisionEnter={(other) => {
          if (other.tag !== "aura") return;
          const a = other.data;
          if (Math.hypot(a.x - x, a.y - y) > a.radius) return;
          s.haste = Math.max(s.hasteFor > 0 ? s.haste : 0, a.haste);
          s.hasteFor = Math.max(s.hasteFor, a.hasteFor);
        }}
      />
    </Entity>
  );
}
