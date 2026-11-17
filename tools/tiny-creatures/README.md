# Tiny Creatures

The enemy sprites in this folder are from **Tiny Creatures** by Clint Bellanger (https://clintbellanger.net), from
https://opengameart.org/content/tiny-creatures, released under Creative Commons Zero (CC0 1.0): free to use in any project,
commercial or not, with no attribution required (credit is appreciated). `License.txt` is the pack's own. The pack expands
Kenney's Tiny Dungeon and Tiny Town, with Kenney's permission.

`tiny-creatures-0147.png` is the pack's tile 147 (`Tiles/tile_0147.png`), cut from `Tilemap/tilemap_packed.png`, which has the
same sprites on a transparent background (the files in `Tiles/` are on black); likewise for the rest. `tools/make-enemies.ts` lays them out
as `assets/enemies.png`, one row a kind:

| Kind | Type | Sprite |
| --- | --- | --- |
| Crawler | Bloom | 0147, a green lizard |
| Skitter | Tide | 0057, a water wisp |
| Mite | Ember | 0056, an ember wisp |
| Shell | Stone | 0048, a rock golem |
| Sprinter | Volt | 0141, a bee |
| Cleanser | Tide | 0047, a water elemental |
| Brood | Ember | 0046, a fire elemental (it splits into ember wisps) |
| Burrower | Stone | 0138, a mole |
| Jammer | Volt | 0146, a scorpion |
| Shepherd | Bloom | 0008, a leafy creature |
| Mosshorn (boss) | Stone, then Bloom | 0016, an antlered beast |
| Prism (boss) | every type in turn | 0050, a crystal |
