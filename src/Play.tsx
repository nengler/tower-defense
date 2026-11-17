import { Entity, Flex, Hud, ParticleLayer, Text, useInput, useMutable, useUpdate } from "@tsengine/runtime/jsx";

import { Bar } from "./Bar.tsx";
import { Card } from "./Card.tsx";
import type { Effect as Used, Foe, Placed } from "./battle.ts";
import { Creature } from "./Creature.tsx";
import { Effect } from "./Effect.tsx";
import { fx, sfx } from "./effects.ts";
import { Enemy } from "./Enemy.tsx";
import { Field } from "./Field.tsx";
import { Offer } from "./Offer.tsx";
import { useGame } from "./GameState.ts";
import { Pause } from "./Pause.tsx";
import { Popup } from "./Popup.tsx";
import { save } from "./save.ts";
import { ENEMIES, hpOf, type EnemyKind } from "./rules/enemies.ts";
import { MOVES } from "./rules/moves.ts";
import { BUFF_XP_SHARE } from "./rules/progress.ts";
import { TYPE_COLOR } from "./rules/types.ts";
import { centre, MAPS, toughnessAt } from "./rules/map.ts";
import { SPECIES } from "./rules/species.ts";
import { Night } from "./Night.tsx";
import { creatureById, onField } from "./rules/roster.ts";
import { Spots } from "./Spots.tsx";
import { Tiles } from "./Tiles.tsx";
import { MILESTONES, spawnsOf, WAVE_COUNT } from "./rules/waves.ts";

/** Lives a run starts with. */
export const START_LIVES = 10;

/**
 * The battle. It keeps what the whole battle shares: the lives, the wave and its spawner, and the lists of enemies and of moves
 * landing, which it draws as components that each keep their own state; the creatures on the field come from the roster. An enemy
 * reports up when it dies, gets through or takes damage (its attacker's XP, and a share for the ally that hasted it); a creature when a move lands. Pressing a tile selects
 * the creature on it or puts the selected one there (its card's MOVE hides the card and marks where it may go, and a press on
 * another creature then trades their places); Backspace benches the selected one, M picks it up to move, and 1 to 9 select a creature by its place
 * in the bar. The bar's button (or Space) starts the next wave. The selected creature's card shows over the field (its moves can
 * be changed at any time); Escape closes it, or pauses. Before each wave in `MILESTONES` a milestone offers a new creature, and no
 * wave starts until one is taken.
 */
export function Play() {
  const paused = useGame((s) => s.paused);
  const team = useGame((s) => s.roster);
  const selectedId = useGame((s) => s.selected);
  const chosen = creatureById(team, selectedId);
  const offering = useGame((s) => s.offer.length > 0);
  const moving = useGame((s) => s.moving);
  const mapId = useGame((s) => s.map);
  const night = MAPS[mapId].night;
  const { pause, finish, gainXp, benchSelected, startMove, choose, deselect, milestone, awardWave } = useGame.actions();

  const s = useMutable({
    lives: START_LIVES as number,
    /** Waves started so far, and whether one is on (enemies still to come or alive). */
    wave: 0,
    active: false,
    /** Seconds since the wave started, and how many of its enemies have come. */
    clock: 0,
    spawned: 0,
    enemies: [] as readonly Foe[],
    /** Moves landing on the field. */
    effects: [] as readonly Placed[],
    /** Damage numbers rising from hits (the newest 30). */
    popups: [] as readonly { readonly id: number; readonly x: number; readonly y: number; readonly amount: number; readonly combo: boolean }[],
    nextId: 1,
  });
  const spawns = spawnsOf(s.wave);

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
      else if (MILESTONES.includes(s.wave + 1)) milestone();
      save.write();
      return;
    }
    s.clock += dt;
    while (s.spawned < spawns.length && spawns[s.spawned]!.at <= s.clock) {
      const kind = spawns[s.spawned]!.kind;
      s.enemies = [...s.enemies, { id: s.nextId, kind, maxHp: hpOf(kind, s.wave) * toughnessAt(MAPS[mapId], s.wave) }];
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
    for (let n = 1; n <= 9; n++) if (input.pressed(`${n}`)) choose(n - 1);
  });

  const startWave = () => {
    if (s.active || s.wave >= WAVE_COUNT || offering) return;
    s.wave += 1;
    s.active = true;
    sfx.play("wave");
    s.clock = 0;
    s.spawned = 0;
  };
  const killed = (id: number, x: number, y: number) => {
    // The puff in the fallen enemy's type colour.
    const kind = s.enemies.find((e) => e.id === id)?.kind ?? "crawler";
    s.enemies = s.enemies.filter((e) => e.id !== id);
    fx.burst("die", x, y, { color: TYPE_COLOR[ENEMIES[kind].type] });
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
    s.effects = [...s.effects, { ...effect, id: s.nextId }];
    s.nextId += 1;
  };
  const shown = (id: number) => {
    s.effects = s.effects.filter((e) => e.id !== id);
  };

  return (
    <Entity>
      <Field />
      <Tiles />
      {onField(team).map((c) => (
        <Creature
          key={c.id}
          id={c.id}
          species={c.species}
          level={c.level}
          equipped={c.equipped}
          x={centre(c.col, c.row).x}
          y={centre(c.col, c.row).y}
          selected={c.id === selectedId}
          onUse={used}
        />
      ))}
      {s.enemies.map((e) => (
        <Enemy key={e.id} {...e} onKilled={killed} onLeaked={leaked} onDamaged={damaged} onHit={hit} />
      ))}
      {s.effects.map((e) => (
        <Effect key={e.id} {...e} onDone={shown} />
      ))}
      {night && (
        <Night
          map={mapId}
          creatures={onField(team).map((c) => ({ id: c.id, x: centre(c.col, c.row).x, y: centre(c.col, c.row).y, type: SPECIES[c.species].type }))}
          effects={s.effects}
        />
      )}
      <Spots />
      <ParticleLayer particles={fx} />
      {s.popups.map((p) => (
        <Popup key={p.id} {...p} onDone={popped} />
      ))}
      <Hud>
        <Bar lives={s.lives} wave={s.wave} active={s.active} onStartWave={startWave} />
        {chosen !== undefined && !moving && <Card creature={chosen} />}
        {chosen !== undefined && moving && (
          <Flex float anchor="top-left" to="top-left" x={0} y={0} width={320} paddingY={1} justifyContent="center" background="#141824c0">
            <Text color="#f0d84a">{chosen.col >= 0 ? "MOVE: PRESS A TILE, OR A CREATURE TO SWAP. ESC CANCELS" : "PLACE: PRESS A TILE, OR A CREATURE TO SWAP. ESC CANCELS"}</Text>
          </Flex>
        )}
        {offering && <Offer />}
        {paused && <Pause />}
      </Hud>
    </Entity>
  );
}
