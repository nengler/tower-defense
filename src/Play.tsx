import { Entity, Flex, Hud, Layer, ParticleLayer, Text, useInput, useMutable, useUpdate } from "@tsengine/runtime/jsx";

import { Banner } from "./Banner.tsx";
import { Bar } from "./Bar.tsx";
import { Card } from "./Card.tsx";
import type { Effect as Used, Foe, Mark as Laid, Placed, Reacted } from "./battle.ts";
import { Creature } from "./Creature.tsx";
import { Effect } from "./Effect.tsx";
import { fx, sfx } from "./effects.ts";
import { Enemy } from "./Enemy.tsx";
import { Fallen } from "./Fallen.tsx";
import { Field } from "./Field.tsx";
import { Mark } from "./Mark.tsx";
import { Night } from "./Night.tsx";
import { Offer } from "./Offer.tsx";
import { useGame } from "./GameState.ts";
import { Pause } from "./Pause.tsx";
import { Popup } from "./Popup.tsx";
import { Prompt } from "./Prompt.tsx";
import { Range } from "./Range.tsx";
import { save } from "./save.ts";
import { ENEMIES, ENEMY_KINDS, hpOf, type EnemyKind } from "./rules/enemies.ts";
import { rangeOf, type Ring } from "./rules/inspect.ts";
import { BUFF_XP_SHARE } from "./rules/progress.ts";
import { centre, mapOf, type MapId, TERRAIN_BONUS, TILE, terrainAt, toughnessAt } from "./rules/map.ts";
import { tilesUnder } from "./rules/marks.ts";
import { paletteParams } from "./rules/palette.ts";
import { MOVES, REACTION_COLOR, REACTION_RADIUS, type MoveId } from "./rules/moves.ts";
import { creatureById, onField, type Owned } from "./rules/roster.ts";
import { SPECIES, statsOf } from "./rules/species.ts";
import { hpScale, milestonesFor, speedScale, startLives } from "./rules/tiers.ts";
import { TYPE_COLOR } from "./rules/types.ts";
import { Spots } from "./Spots.tsx";
import { Tiles } from "./Tiles.tsx";
import { MILESTONES, spawnsOf, WAVE_COUNT } from "./rules/waves.ts";

/** The inspected move's reach around the selected creature, when it stands on the field and knows the move; else null. */
function ringOf(chosen: Owned | undefined, map: MapId, inspected: MoveId | ""): Ring | null {
  if (chosen === undefined || chosen.col < 0 || inspected === "" || !chosen.known.includes(inspected)) return null;
  const at = centre(chosen.col, chosen.row);
  const bonus = terrainAt(map, chosen.col, chosen.row) === SPECIES[chosen.species].type ? TERRAIN_BONUS : 0;
  return { x: at.x, y: at.y, radius: rangeOf(inspected, statsOf(chosen.species, chosen.level, chosen.form, bonus)), color: TYPE_COLOR[MOVES[inspected].type] };
}

/**
 * The battle. It keeps what the whole battle shares: the lives, the wave and its spawner, and the lists of enemies, of moves landing
 * and of marks on the path, which it draws as components that each keep their own state; the creatures on the field come from the
 * roster. An enemy reports up when it dies (a brood splits into mites where it fell), gets through, takes damage (its attacker's XP)
 * or sets off a reaction; a creature when a move lands, which may lay marks on the path tiles it covers.
 *
 * Pressing a tile selects the creature on it, and pressing an empty one closes the card; Backspace benches the selected one, M (or
 * MOVE on its card) picks it up to move (the card makes way, the tiles it may go to are marked, a press on one puts it there, and a
 * press on another creature trades their places), and 1 to 9 select a
 * creature by its place in the bar. The bar's button (or Space) starts the next wave; its ELITE (or E) makes that wave elite, when a
 * milestone follows it. When a creature has a choice waiting, a banner says so and N (or the banner) opens its prompt; the battle
 * stands still while the prompt is open. The selected creature's card shows over the field (its moves can be changed at any time,
 * and the move inspected on it has its reach ringed on the field);
 * Escape closes it, or pauses. Before each milestone wave a creature is offered, and no wave starts until one is taken.
 */
export function Play() {
  const paused = useGame((s) => s.paused);
  const team = useGame((s) => s.roster);
  const selectedId = useGame((s) => s.selected);
  const map = useGame((s) => s.map);
  const tier = useGame((s) => s.tier);
  const eliteNext = useGame((s) => s.elite);
  const prompting = useGame((s) => s.prompting);
  const moving = useGame((s) => s.moving);
  const inspected = useGame((s) => s.inspected);
  const chosen = creatureById(team, selectedId);
  const ring = !moving ? ringOf(chosen, map, inspected) : null;
  const offering = useGame((s) => s.offer.length > 0);
  const waiting = team.some((c) => c.choice !== null);
  const { pause, finish, gainXp, benchSelected, startMove, choose, deselect, milestone, awardWave, toggleElite, toggleSpeed, openNextPrompt } =
    useGame.actions();

  const s = useMutable({
    lives: startLives(tier) as number,
    /** Waves started so far, and whether one is on (enemies still to come or alive), and whether it is elite. */
    wave: 0,
    active: false,
    elite: false,
    /** Seconds since the wave started, and how many of its enemies have come. */
    clock: 0,
    spawned: 0,
    enemies: [] as Foe[],
    /** Moves and reactions landing on the field. */
    effects: [] as Placed[],
    /** Marks on path tiles, one a tile. */
    marks: [] as Laid[],
    /** Enemies crumbling away where they died (the newest 40), for the eye only. */
    fallen: [] as readonly { readonly id: number; readonly row: number; readonly x: number; readonly y: number; readonly scale: number; readonly color: string }[],
    /** Damage numbers rising from hits (the newest 30). */
    popups: [] as readonly { readonly id: number; readonly x: number; readonly y: number; readonly amount: number; readonly combo: boolean }[],
    nextId: 1,
  });
  const spawns = spawnsOf(s.wave, tier);
  const milestones = milestonesFor(tier, MILESTONES);
  /** A milestone follows the next wave: it may be made elite. */
  const canElite = !s.active && s.wave < WAVE_COUNT && milestones.includes(s.wave + 2);

  useUpdate((dt) => {
    if (s.lives <= 0) {
      finish(false, s.wave);
      save.write();
      return;
    }
    if (!s.active) return;
    if (s.spawned >= spawns.length && s.enemies.length === 0) {
      s.active = false;
      awardWave();
      if (s.wave >= WAVE_COUNT) finish(true, s.wave);
      else if (milestones.includes(s.wave + 1)) milestone(s.elite);
      save.write();
      return;
    }
    s.clock += dt;
    while (s.spawned < spawns.length && spawns[s.spawned]!.at <= s.clock) {
      const kind = spawns[s.spawned]!.kind;
      s.enemies.push({ id: s.nextId, kind, maxHp: Math.round(hpOf(kind, s.wave) * hpScale(tier, s.elite) * toughnessAt(map, s.wave)), startDist: 0 });
      s.spawned += 1;
      s.nextId += 1;
    }
  });
  useInput((input) => {
    // Escape closes the card first, and pauses when there is none.
    if (input.pressed("Escape")) {
      if (selectedId >= 0) deselect();
      else pause();
    }
    if (input.pressed("Backspace")) benchSelected();
    if (input.pressed("M")) startMove();
    if (input.pressed("N")) openNextPrompt();
    if (input.pressed("F")) toggleSpeed();
    if (input.pressed("E") && canElite) toggleElite();
    for (let n = 1; n <= 9; n++) if (input.pressed(`${n}`)) choose(n - 1);
  });

  const startWave = () => {
    if (s.active || s.wave >= WAVE_COUNT || offering) return;
    s.wave += 1;
    s.active = true;
    s.elite = eliteNext && milestones.includes(s.wave + 1);
    if (eliteNext) toggleElite();
    sfx.play("wave");
    s.clock = 0;
    s.spawned = 0;
  };
  const killed = (id: number, x: number, y: number, dist: number) => {
    // The puff in the fallen enemy's type colour; a brood's mites start where it fell.
    const foe = s.enemies.find((e) => e.id === id);
    const kind = foe?.kind ?? "crawler";
    s.enemies = s.enemies.filter((e) => e.id !== id);
    const split = ENEMIES[kind].split;
    if (split !== undefined) {
      for (let i = 0; i < split.count; i++) {
        s.enemies.push({
          id: s.nextId,
          kind: split.into,
          maxHp: Math.round(hpOf(split.into, s.wave) * hpScale(tier, s.elite) * toughnessAt(map, s.wave)),
          startDist: Math.max(0, dist - i * 5),
        });
        s.nextId += 1;
      }
    }
    fx.burst("die", x, y, { color: TYPE_COLOR[ENEMIES[kind].type] });
    s.fallen = [
      ...s.fallen.slice(-39),
      { id: s.nextId, row: ENEMY_KINDS.indexOf(kind), x, y, scale: ENEMIES[kind].boss === true ? 1.6 : 1, color: TYPE_COLOR[ENEMIES[kind].type] },
    ];
    s.nextId += 1;
    sfx.play("die");
  };
  const leaked = (id: number, kind: EnemyKind) => {
    s.enemies = s.enemies.filter((e) => e.id !== id);
    s.lives = Math.max(0, s.lives - ENEMIES[kind].lives);
    sfx.play("leak");
  };
  const hit = (x: number, y: number, amount: number, combo: boolean) => {
    s.popups = [...s.popups.slice(-29), { id: s.nextId, x, y, amount, combo }];
    s.nextId += 1;
    if (combo) {
      fx.burst("combo", x, y);
      sfx.play("combo");
    }
  };
  const reacted = (r: Reacted) => {
    const radius = REACTION_RADIUS[r.reaction];
    s.effects.push({
      id: s.nextId,
      // A reaction is no creature's move: only its colour, place and size are drawn.
      move: "spark",
      color: REACTION_COLOR[r.reaction],
      from: -1,
      userType: "ember",
      mark: "",
      markBurn: 0,
      fromX: r.x,
      fromY: r.y,
      x: r.x,
      y: r.y,
      radius,
    });
    s.nextId += 1;
    fx.burst("combo", r.x, r.y, { color: REACTION_COLOR[r.reaction] });
  };
  const crumbled = (id: number) => {
    s.fallen = s.fallen.filter((f) => f.id !== id);
  };
  const popped = (id: number) => {
    s.popups = s.popups.filter((p) => p.id !== id);
  };
  const damaged = (from: number, amount: number, helper: number) => {
    if (from >= 0) gainXp(from, amount);
    // A buffer earns a share of what the creature it hasted deals.
    if (helper >= 0 && helper !== from) gainXp(helper, amount * BUFF_XP_SHARE);
  };
  const used = (effect: Used) => {
    const shape = MOVES[effect.move].shape;
    sfx.play(shape === "buff" ? "buff" : shape === "hit" ? "hit" : "area");
    s.effects.push({ ...effect, id: s.nextId });
    s.nextId += 1;
    if (effect.mark === "") return;
    // The mark goes on every path tile the area covers, in place of what was there.
    const mark = effect.mark;
    const keys = tilesUnder(mapOf(map).pathTiles, effect.x, effect.y, effect.radius, TILE);
    const kept = s.marks.filter((m) => !keys.includes(m.key));
    const laid: Laid[] = [];
    for (const key of keys) {
      const parts = key.split(",");
      laid.push({ id: s.nextId, key, col: Number(parts[0]), row: Number(parts[1]), kind: mark, from: effect.from, burn: effect.markBurn, userType: effect.userType });
      s.nextId += 1;
    }
    s.marks = [...kept, ...laid];
  };
  const shown = (id: number) => {
    s.effects = s.effects.filter((e) => e.id !== id);
  };
  const faded = (id: number) => {
    s.marks = s.marks.filter((m) => m.id !== id);
  };

  return (
    <Entity>
      {/* The map's palette (`palette.glsl`) over all of the battle, and again over the HUD: every pixel becomes one of its five colours. */}
      <Layer shader="palette.glsl" params={paletteParams(map)}>
        <Field />
        {s.marks.map((m) => (
          <Mark key={m.id} id={m.id} col={m.col} row={m.row} kind={m.kind} from={m.from} userType={m.userType} burn={m.burn} onDone={faded} />
        ))}
        <Tiles />
        <Range ring={ring} />
        {onField(team).map((c) => (
          <Creature
            key={c.id}
            id={c.id}
            species={c.species}
            level={c.level}
            form={c.form}
            terrain={terrainAt(map, c.col, c.row) === SPECIES[c.species].type ? TERRAIN_BONUS : 0}
            equipped={c.equipped}
            x={centre(c.col, c.row).x}
            y={centre(c.col, c.row).y}
            selected={c.id === selectedId}
            onUse={used}
          />
        ))}
        {s.enemies.map((e) => (
          <Enemy
            key={e.id}
            id={e.id}
            kind={e.kind}
            maxHp={e.maxHp}
            startDist={e.startDist}
            pace={speedScale(tier)}
            onKilled={killed}
            onLeaked={leaked}
            onDamaged={damaged}
            onHit={hit}
            onReaction={reacted}
          />
        ))}
        {s.fallen.map((f) => (
          <Fallen key={f.id} id={f.id} row={f.row} x={f.x} y={f.y} scale={f.scale} color={f.color} onDone={crumbled} />
        ))}
        {s.effects.map((e) => (
          <Effect key={e.id} id={e.id} color={e.color} fromX={e.fromX} fromY={e.fromY} x={e.x} y={e.y} radius={e.radius} onDone={shown} />
        ))}
        {mapOf(map).night && (
          <Night
            map={map}
            creatures={onField(team).map((c) => ({ id: c.id, x: centre(c.col, c.row).x, y: centre(c.col, c.row).y, type: SPECIES[c.species].type }))}
            effects={s.effects}
          />
        )}
        <Spots />
        <ParticleLayer particles={fx} />
        {s.popups.map((p) => (
          <Popup key={p.id} {...p} onDone={popped} />
        ))}
      </Layer>
      <Hud>
        <Layer shader="palette.glsl" params={paletteParams(map)}>
          <Bar lives={s.lives} wave={s.wave} active={s.active} canElite={canElite} onStartWave={startWave} />
          {waiting && prompting < 0 && <Banner />}
          {chosen !== undefined && prompting < 0 && !moving && <Card creature={chosen} />}
          {chosen !== undefined && prompting < 0 && moving && (
            <Flex float anchor="top-left" to="top-left" x={0} y={0} width={320} paddingY={1} justifyContent="center" background="#141824c0">
              <Text color="#f0d84a">{chosen.col >= 0 ? "MOVE: PRESS A TILE, OR A CREATURE TO SWAP. ESC CANCELS" : "PLACE: PRESS A TILE, OR A CREATURE TO SWAP. ESC CANCELS"}</Text>
            </Flex>
          )}
          {prompting >= 0 && <Prompt />}
          {offering && <Offer />}
          {paused && <Pause />}
        </Layer>
      </Hud>
    </Entity>
  );
}
