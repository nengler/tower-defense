# Design

A minimalist tower defense at 320×180 where the towers are creatures. Creatures level up on their own, learn more moves than
they can equip, and use their equipped moves automatically, each on its own cooldown. The strategy is in which creatures you
field and which moves they have equipped, in what order.

## Runs

- A **run** is 10 waves on one of four maps, at a difficulty tier. Every run starts fresh: no creatures, no levels.
- **Enemies cannot hurt creatures.** Enemies walk the path; each one that reaches the end costs a life. No lives left ends the run.
- At **milestones** (before waves 1, 2, 4, 6, 8 and 10) you pick one new creature from an offer of three (four after an elite
  wave, below). A run starts with no
  creatures: the first milestone gives the first one. The sixth is one more than the field holds.
- You may own any number of creatures, but **at most 5 are on the field** at once. A creature goes on **any free tile** that is not
  path. Placing, moving and taking a creature off the field cost nothing, but a creature put on a tile (or moved) **settles for
  1.5 s** before it acts, so chasing enemies around mid-wave is not free.
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

**Levels.** A creature earns 1 XP per point of damage it deals; a level costs 40 × the level it is at. On a level-up its stats grow.

**Learning is a choice.** A species learns in steps: one move at level 1, then at levels 3, 5 and 7 a **choice of two**. Two
Emberlings in one run can grow apart (Cinder or Static Jolt, Rally or Heat Wave, Flare Burst or Wildfire). When a step is reached the
choice waits: a banner says so, the creature's chip and card show `!`, and **N** (or the banner) opens the **learn prompt**, which
stops the battle while it is open. With a free slot the pick is equipped there. With the slots full the prompt asks which equipped
move it replaces, or whether it waits in the move list. A move is never learned without the player seeing it, so the best move
coming last is a decision, not a trap.

**Evolution.** At level 10, with every step behind it, a creature may **evolve into one of two forms**: a hard hitter (+3 ATK,
+2 SPD) or a wider, slower support (+3 RNG, +2 CD). Each form has its own look and learns a move of its own (Blazefang: Inferno;
Kilnback: Ember Rain; Tidehound: Riptide; Wellspring: Deluge; Stormlynx: Thunderclap; Dynamo: Overcharge; Cragjaw: Landslide;
Bastion: Tremor; Briarwolf: Bramble Lash; Elderbloom: Verdant Field).

A buffer earns **half the XP** of the damage an ally deals while the buffer's haste is on it (burns included; the ally still earns
all of its own), so a support creature levels up by helping.

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
| Mark | leaves puddles, embers or spores on the path tiles its area covers (below) |

**Combos** come from effects: one move leaves a status, another does more to an enemy that has it (×2).

| Status | Left by | Cashed in by |
| --- | --- | --- |
| Soaked | Splash Jet, Undertow | Zap, Arc Storm (and the soak is used up) |
| Burning | Flare Burst, Wildfire | Wildfire |
| Stunned | Static Jolt, Quake | Boulder |
| Slowed | Undertow, Thorn, Spore Cloud | Overgrowth |

**Reactions.** A combo also sets something off around the enemy it lands on. What the reaction's own blasts do sets off nothing
more, so reactions never cascade.

| Status cashed in | Reaction | Around the enemy |
| --- | --- | --- |
| Soaked | Chain | the hit jumps to every other soaked enemy within 30 px, at 60 % of its damage, using their soak up |
| Burning | Spread | the fire spreads to every enemy within 20 px |
| Stunned | Shatter | 50 % of the damage splashes onto every enemy within 22 px |
| Slowed | Root | it and every slowed enemy within 24 px stop for 0.7 s (which a Boulder can then cash in) |

A douse (Torrent, a Tide hit that does double to a burning enemy and puts the fire out) sets off no reaction.

**Marks.** Some area moves leave a mark on the path tiles they cover: Undertow and Deluge leave **puddles** (soak), Flare Burst,
Wildfire and Ember Rain leave **embers** (burn, at the maker's attack), Spore Cloud, Bramble and Verdant Field leave **spores**
(slow). An enemy on a marked tile keeps getting its status while it is there. A tile holds one mark, and a new one replaces it, so a
puddle puts out embers. Marks make where an area lands along the path matter, and let one creature lay the status another cashes in.

## Species

| Species | Type | Level 1 | Level 3 | Level 5 | Level 7 | Forms (level 10) |
| --- | --- | --- | --- | --- | --- | --- |
| Emberling | Ember | Spark | Cinder / Static Jolt | Rally / Heat Wave | Flare Burst / Wildfire | Blazefang / Kilnback |
| Puddlepup | Tide | Splash Jet | Bubble / Rally | Zap / Torrent | Undertow / Spore Cloud | Tidehound / Wellspring |
| Voltkit | Volt | Zap | Static Jolt / Bubble | Splash Jet / Rally | Arc Storm / Surge | Stormlynx / Dynamo |
| Pebblet | Stone | Pebble | Boulder / Gravel | Static Jolt / Rally | Quake / Rubble | Cragjaw / Bastion |
| Sproutling | Bloom | Thorn | Rally / Vine | Spore Cloud / Heat Wave | Overgrowth / Bramble | Briarwolf / Elderbloom |

A milestone offers three of the five. Some choices cross types (a Puddlepup may learn Spore Cloud): it loses the same-type bonus but
lays a status its team cashes in.

**Targeting.** A damaging move aims at the enemy in reach that is furthest along the path and above ground.

## Types

Ember, Tide, Volt, Stone, Bloom. Each beats one and is resisted by one:

| Type | Beats | Resisted by |
| --- | --- | --- |
| Ember | Bloom | Tide |
| Tide | Ember | Bloom |
| Bloom | Tide, Stone | Ember |
| Volt | Tide | Stone |
| Stone | Volt, Ember | Bloom |

Enemies have types too, and every type has an enemy, so the next wave's types (the bar shows them, below) are a reason to field one
creature over another.

## Mastery

Mastery is the only thing a run keeps. Each **species** has mastery points: 1 for each creature of it on the field when a wave
ends, and 3 when a run ends with it in the roster (won or lost). 5, 15 and 30 points are mastery levels 1, 2 and 3. A creature
joins a run with its species' level then. Mastery adds **options**, not raw power:

| Level | Benefit |
| --- | --- |
| 1 | Its first choice (the level 3 step) comes at level 1. |
| 2 | Its later steps come two levels earlier. |
| 3 | A fourth move slot. |

It is saved on the player's machine (written at the end of each wave and run) with the highest difficulty tier unlocked, and shown
on the offer, on the creature's card and on the end screen.

## Maps and terrain

Four maps, chosen on the run setup screen: **Meadow** (a long winding path), **Riverbend** (tight bends, far apart),
**Gauntlet** (one bend that all of it passes) and **Glowmire** (a bog at night: the longest path, through three bends, but ponds fill
the hollows inside them and lanterns and glow-mushrooms take tiles, so the spots beside two stretches are few; its enemies gain 6 %
more hit points each wave than elsewhere, since the long path gives the creatures more time). Each has **terrain tiles**, two for each type: ash (Ember), pool (Tide), pylon
(Volt), rock (Stone) and grove (Bloom). A creature standing on its own type's terrain is **attuned**: +2 to every stat (shown on its
card, and as a dot by it). Terrain sits beside the bends, so the best tiles for coverage and for attunement pull against each other.

**Effects drawn with shaders** (each a layer holding just what it changes; the software renderer runs none, and shows the plain
picture: a white flash, a fade, still tiles):

- **A hit** (`hit.glsl`): for a tenth of a second the enemy's sprite gets a rim in its type's colour, a red and blue split and a
  pixel of shake, over the engine's white flash.
- **A death** (`dissolve.glsl`, `src/Fallen.tsx`): the sprite stays where it fell and crumbles away pixel by pixel over 0.4 s, the
  crumbling edge burning in its type's colour.
- **Terrain** (`terrain.glsl`): each type's tiles are a layer that keeps moving, so attuning tiles stand out: ash embers twinkle
  over a heat shimmer, pools ripple, pylons crackle, rock glints, groves rustle.

**Glowmire's night** is drawn with the engine's layers, lights and shaders (`src/Night.tsx`, `assets/*.glsl`):

- A light map (`<Lighting>`) darkens the field to a moonlit blue except where a light reaches: flickering lanterns, breathing
  mushrooms, a light around each creature in its type's colour, a dim one on each enemy (a crowd in the dark can still be seen
  coming), a flash where each move lands, and fireflies. `night.glsl` cuts the light into bands with an ordered dither (pixel-art
  light pools, not a smooth gradient), tints the shadows blue and darkens the corners.
- An additive glow layer puts the brightest lights on top, past the colours of the art, which a multiplied light map cannot do.
- The ponds are a layer of their own; `water.glsl` sways each row sideways by whole pixels and drifts glints across them.
- `fog.glsl` drifts two octaves of noise over the field as mist.

The software renderer (tests, `tse screenshot` without `--gpu`) runs no shaders: the night is still lit, without the bands, ripples
and mist.

## Difficulty

**The curve.** Every wave adds 28 % of an enemy's first-wave hit points, plus 4 % times the square of the waves gone by, so the
last waves pull ahead of a team that has grown strong. Bosses' hit points are their own.

**Elite waves.** Before a wave that a milestone follows, ELITE (or E) makes it elite: its enemies have 50 % more hit points, and the
milestone after it offers four creatures instead of three.

**Tiers.** A run is played at a difficulty tier; winning at the highest tier unlocked opens the next. Each adds one change to the
ones below it:

| Tier | Adds |
| --- | --- |
| 0 | the game as designed |
| 1 | enemies 20 % tougher |
| 2 | 8 lives, not 10 |
| 3 | no milestone before wave 8 |
| 4 | two shepherds join every wave from wave 3 |
| 5 | enemies 10 % faster |

**The daily run.** Daily run on the title starts today's run: its map, its offers and tier 2 come from the date, so everyone playing
on a day plays the same run. It unlocks nothing.

## Screen

320 × 180. The field is a 20 × 9 grid of 16 px tiles (320 × 144) with the path drawn on it; the bottom 36 px is a bar with lives,
the wave, and the start-wave button. Under each creature on the field, one pip per equipped move fills as its cooldown runs; dots
over it while it settles, a yellow bar while jammed. Clicking a creature opens its card: stats, level, and its moves, which can be
equipped, unequipped and reordered.

**Moving.** The card's MOVE (PLACE for a creature on the bench, or the M key) puts the card away and marks every tile the creature
may go to; pressing one moves it there, and pressing another creature trades their places (one from the bench sends the other to the
bench). A creature just taken at a milestone starts out being placed, so its card never covers half of the field before it has a
tile. Escape calls it off.

Between waves the bar shows **what the next wave brings**: each enemy kind's walk and how many. It also has the speed button (1X or
2X, or F) and, when a milestone follows the next wave, ELITE.

## Enemies

Enemies never hurt creatures. The first four are plain; the rest get in the way of a plan instead.

Their sprites are from **Tiny Creatures** by Clint Bellanger (CC0; `tools/tiny-creatures/`), each picked so its colour is its type's. The day maps' ground
(grass, the road, and the ash, pylon, rock and grove terrain) is Kenney's **Tiny Town** (CC0; `tools/kenney/`), which Tiny Creatures
is made to match.

| Enemy | Type | Does |
| --- | --- | --- |
| Crawler | Bloom | Plain and steady. |
| Skitter | Tide | Fast, fragile. |
| Mite | Ember | Tiny, in tight packs: an area move hits most of a pack. |
| Shell | Stone | Slow, armoured: every hit loses 6 damage (burns ignore armour). Takes two lives if it gets through. |
| Sprinter | Volt | 12 % faster with every hit, up to 2.2 times its speed: chip damage backfires, one big hit is best. |
| Cleanser | Tide | Washes every status off the enemies within 26 px every 1.5 s, and takes none itself: combos break unless it goes first. |
| Brood | Ember | Splits into two mites where it falls, so an area move is needed further down the path too. |
| Burrower | Stone | Underground for stretches of the path (48 px up, 72 down, faster under): nothing can target or hit it there, so stacking every creature at one bend fails. |
| Jammer | Volt | Creatures within 28 px of it stop: their cooldowns stand still. Its radius is drawn. |
| Shepherd | Bloom | Heals the enemies within 30 px by 3 % of their hit points a second: something has to reach it. |
| **Mosshorn** (wave 5) | Stone, then Bloom | A boss: 450 hit points and 6 armour, until half are gone; then it sheds its shell, turns Bloom and runs. Takes three lives. |
| **Prism** (wave 10) | every type | A boss: 3000 hit points and 4 armour, its type changing every fifth of the path, so one type of team cannot carry it. Takes six lives. |

The waves bring them in one or two at a time: sprinters (wave 2), cleansers (3), burrowers and mites (4), the Mosshorn (5), broods
and jammers (6), shepherds (7), and the Prism (10).

**Why moves need managing, and where creatures stand.** `tools/balance.ts` plays whole runs headless. A *skilled* run (it picks the
better move at every step, re-equips its best moves, picks a team that sets up combos, and stands each creature where it shares the
most path with its team, attuned when it can) wins on every map, losing its lives in the last three waves. A *managed* run that picks
moves as well but stands its creatures at fixed spots loses by wave 6, and a *lazy* run that takes the first option of every prompt
loses too. `--seeds=12` plays each strategy over twelve offer rolls: the skilled run wins about half of them at tier 0. The tests
keep the table (`test/balance.expected.json`) as it is.

## The first version

One map, 3 species, about 8 moves (damage, splash, stun, slow, burn, haste, and the soak/Volt combo), 2 enemy types, 5 waves,
levels, moves swapped at any time, three milestones, and mastery saved between runs. Shapes only, no art. Its question: is it fun when
creatures use their own moves on cooldowns and the player manages which moves they have equipped?

## How it is built

The game state (`src/GameState.ts`) holds what the screens share: the screen, the roster, mastery, the map and tier, the speed and
the open prompt. Each part of the battle is a
component with its own state, as in the engine's Hearth: an enemy walks and takes hits, a creature cools its moves down and uses
them, an effect lands, a mark on the path touches the enemies on it. Enemies talk to each other the same way creatures talk to
them (`send`): a reaction, a cleanse and a heal are blasts sent to the enemies around one. The tables (species, forms, moves, marks, types, enemies, waves, maps, tiers) and the formulas are plain `.ts` in `src/rules/`, tested
on their own.
