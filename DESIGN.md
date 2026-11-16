# Design

A minimalist tower defense at 320×180 where the towers are creatures. Creatures level up on their own, learn more moves than
they can equip, and use their equipped moves automatically, each on its own cooldown. The strategy is in which creatures you
field and which moves they have equipped, in what order.

## Runs

- A **run** is 10 waves on one map. Every run starts fresh: no creatures, no levels.
- **Enemies cannot hurt creatures.** Enemies walk the path; each one that reaches the end costs a life. No lives left ends the run.
- At **milestones** (before waves 1, 2, 4, 6, 8 and 10) you pick one new creature from an offer of three. A run starts with no
  creatures: the first milestone gives the first one. The sixth is one more than the field holds.
- You may own any number of creatures, but **at most 5 are on the field** at once. A creature goes on **any free tile** that is not
  path. Placing, moving and taking a creature off the field are free.
- There are **no items and no money**.

## Creatures

Each creature belongs to a **species**, which sets its type, its base stats, how fast each stat grows, and the moves it can learn
(and at which level).

**Stats** are small numbers: about 1–5 at level 1, growing by 0–2 a level depending on the species.

| Stat | Short | Changes |
| --- | --- | --- |
| Attack | ATK | a move's damage |
| Attack speed | SPD | how long a move's animation takes |
| Range | RNG | a move's reach and radius |
| Cooldown | CD | how long until a move is ready again |
| Type | | how strong a move is against an enemy's type |

**Levels.** A creature earns 1 XP per point of damage it deals; a level costs 40 × the level it is at. On a level-up its stats grow
and it may learn a new move. A learned move goes into its move list; if a slot is free it is equipped, otherwise it waits there for
the player. (A buffer earns nothing for the damage its buff helps deal: something to revisit.)

## Moves

A move has base values, scaled by the creature that uses it:

| Value | Formula | One point is worth |
| --- | --- | --- |
| Damage | `base × (1 + 0.10 × ATK) × type` | +10 % damage |
| Animation | `base ÷ (1 + 0.05 × SPD)` | about 5 % faster |
| Reach / radius | `base × √(1 + 0.10 × RNG)` | +10 % area |
| Cooldown | `base ÷ (1 + 0.05 × CD)` | about 5 % faster, never zero |

`type` is ×1.25 when the move's type is the creature's own, times ×1.5 against a type it beats or ×0.67 against one that resists it.

- A creature has **3 move slots** (4 with mastery). It can know more moves than it has slots; you choose which are equipped and in
  what order, **at any time**, during a wave too. A move just equipped starts on its full cooldown, so swapping is never a way to
  skip one.
- Each equipped move has **its own cooldown**. A creature uses **one move at a time**: when it is not busy, it starts the first
  ready move in slot order that has a use (a target in reach, or, for a buff, an ally in reach), and is busy for that move's
  animation. Damage and effects land at the end of the animation.
- **Buffs** fire as soon as they are ready, whether or not an enemy is near.

**Effects** moves can have:

| Effect | Does |
| --- | --- |
| Damage | to one target, or everything within a radius of the target or of the creature |
| Stun | the enemy stops for a while |
| Slow | the enemy walks slower for a while |
| Burn | damage over time |
| Soak | marks the enemy; Volt moves deal more to soaked enemies and use the soak up |
| Haste | allies in reach use moves faster for a while (a buff) |

**Combos** come from effects: one move leaves a status, another does more to an enemy that has it (×2).

| Status | Left by | Cashed in by |
| --- | --- | --- |
| Soaked | Splash Jet, Undertow | Zap, Arc Storm (and the soak is used up) |
| Burning | Flare Burst, Wildfire | Wildfire |
| Stunned | Static Jolt, Quake | Boulder |
| Slowed | Undertow, Thorn, Spore Cloud | Overgrowth |

## Species

| Species | Type | Learns (level) |
| --- | --- | --- |
| Emberling | Ember | Spark (1), Static Jolt (3), Rally (5), Flare Burst (7), Wildfire (10) |
| Puddlepup | Tide | Splash Jet (1), Rally (3), Zap (5), Undertow (7) |
| Voltkit | Volt | Zap (1), Static Jolt (3), Splash Jet (5), Arc Storm (7) |
| Pebblet | Stone | Pebble (1), Boulder (3), Static Jolt (5), Quake (7) |
| Sproutling | Bloom | Thorn (1), Rally (3), Spore Cloud (5), Overgrowth (7) |

A milestone offers three of the five.

**Targeting.** A damaging move aims at the enemy in reach that is furthest along the path.

## Types

Ember, Tide, Volt, Stone, Bloom. Each beats one and is resisted by one:

| Type | Beats | Resisted by |
| --- | --- | --- |
| Ember | Bloom | Tide |
| Tide | Ember | Bloom |
| Bloom | Tide, Stone | Ember |
| Volt | Tide | Stone |
| Stone | Volt, Ember | Bloom |

Enemies have types too, so the next wave's types are a reason to field one creature over another.

## Mastery

Mastery is the only thing a run keeps. Each **species** has mastery points: 1 for each creature of it on the field when a wave
ends, and 3 when a run ends with it in the roster (won or lost). 5, 15 and 30 points are mastery levels 1, 2 and 3. A creature
joins a run with its species' level then. Mastery adds **options**, not raw power:

| Level | Benefit |
| --- | --- |
| 1 | It starts a run already knowing a second move. |
| 2 | Its later moves are learned two levels earlier. |
| 3 | A fourth move slot. |

It is saved on the player's machine (written at the end of each wave and run), and shown on the offer, on the creature's card
and on the end screen.

## Screen

320 × 180. The field is a 20 × 9 grid of 16 px tiles (320 × 144) with the path drawn on it; the bottom 36 px is a bar with lives,
the wave, and the start-wave button. Under each creature on the field, one pip per equipped move fills as its cooldown runs. Clicking
a creature opens its card: stats, level, and its moves, which can be equipped, unequipped and reordered.

## Enemies

| Enemy | Type | Does |
| --- | --- | --- |
| Crawler | Bloom | Plain and steady. |
| Skitter | Tide | Fast, fragile. |
| Mite | Ember | Tiny, in tight packs: an area move hits most of a pack. |
| Shell | Stone | Slow, armoured: every hit loses 8 damage (burns ignore armour). Takes two lives if it gets through. |

Every wave adds 38 % to every enemy's hit points. The waves start plain and bring in mites (wave 4) and shells (wave 5).

**Why moves need managing.** Each species learns its best area move last, at level 7, when its three slots are already full: it is
only used if the player swaps it in. `tools/balance.ts` plays whole runs headless; its table (`test/balance.expected.json`) shows a
run that re-equips its best moves winning, and the same run that never touches its moves losing. The tests keep it that way.

## The first version

One map, 3 species, about 8 moves (damage, splash, stun, slow, burn, haste, and the soak/Volt combo), 2 enemy types, 5 waves,
levels, moves swapped at any time, three milestones, and mastery saved between runs. Shapes only, no art. Its question: is it fun when
creatures use their own moves on cooldowns and the player manages which moves they have equipped?

## How it is built

The game state (`src/GameState.ts`) holds what the screens share: the screen, the roster, mastery. Each part of the battle is a
component with its own state, as in the engine's Hearth: an enemy walks and takes hits, a creature cools its moves down and uses
them, an effect lands. The tables (species, moves, types, waves) and the formulas are plain `.ts` in `src/rules/`, tested on their own.
