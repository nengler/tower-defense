import { Entity, Hud, useInput, useMutable, useUpdate } from "@rge/runtime/jsx";

import { Bar } from "./Bar.tsx";
import type { Foe } from "./battle.ts";
import { Enemy } from "./Enemy.tsx";
import { Field } from "./Field.tsx";
import { useGame } from "./GameState.ts";
import { Pause } from "./Pause.tsx";
import { ENEMIES, hpOf, type EnemyKind } from "./rules/enemies.ts";
import { spawnsOf, WAVE_COUNT } from "./rules/waves.ts";

/** Lives a run starts with. */
export const START_LIVES = 10;

/**
 * The battle. It keeps what the whole battle shares: the lives, the wave and its spawner, and the list of enemies, which it draws
 * as components that each keep their own state. An enemy reports up when it dies or gets through. The bar's button (or Space) starts
 * the next wave; Escape pauses.
 */
export function Play() {
  const paused = useGame((s) => s.paused);
  const { pause, finish } = useGame.actions();

  const s = useMutable({
    lives: START_LIVES as number,
    /** Waves started so far, and whether one is on (enemies still to come or alive). */
    wave: 0,
    active: false,
    /** Seconds since the wave started, and how many of its enemies have come. */
    clock: 0,
    spawned: 0,
    enemies: [] as readonly Foe[],
    nextId: 1,
  });
  const spawns = spawnsOf(s.wave);

  useUpdate((dt) => {
    if (s.lives <= 0) {
      finish(false, s.wave);
      return;
    }
    if (!s.active) return;
    if (s.spawned >= spawns.length && s.enemies.length === 0) {
      s.active = false;
      if (s.wave >= WAVE_COUNT) finish(true, s.wave);
      return;
    }
    s.clock += dt;
    while (s.spawned < spawns.length && spawns[s.spawned]!.at <= s.clock) {
      const kind = spawns[s.spawned]!.kind;
      s.enemies = [...s.enemies, { id: s.nextId, kind, maxHp: hpOf(kind, s.wave) }];
      s.spawned += 1;
      s.nextId += 1;
    }
  });
  useInput((input) => {
    if (input.pressed("Escape")) pause();
  });

  const startWave = () => {
    if (s.active || s.wave >= WAVE_COUNT) return;
    s.wave += 1;
    s.active = true;
    s.clock = 0;
    s.spawned = 0;
  };
  const killed = (id: number) => {
    s.enemies = s.enemies.filter((e) => e.id !== id);
  };
  const leaked = (id: number, kind: EnemyKind) => {
    s.enemies = s.enemies.filter((e) => e.id !== id);
    s.lives = Math.max(0, s.lives - ENEMIES[kind].lives);
  };
  const damaged = (_from: number, _amount: number) => {};

  return (
    <Entity>
      <Field />
      {s.enemies.map((e) => (
        <Enemy key={e.id} {...e} onKilled={killed} onLeaked={leaked} onDamaged={damaged} />
      ))}
      <Hud>
        <Bar lives={s.lives} wave={s.wave} active={s.active} onStartWave={startWave} />
        {paused && <Pause />}
      </Hud>
    </Entity>
  );
}
