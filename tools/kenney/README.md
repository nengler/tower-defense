# Kenney's Tiny Town

The tiles in this folder are from **Tiny Town** by Kenney (https://kenney.nl), from https://opengameart.org/content/tiny-town,
released under Creative Commons Zero (CC0 1.0): free to use in any project, commercial or not, with no attribution required (credit
is appreciated). `License.txt` is the pack's own. The enemies' Tiny Creatures (`tools/tiny-creatures/`) are made to match it.

`tiny-town-0025.png` is `Tiles/tile_0025.png` of the pack, and likewise for the rest. `tools/make-art.ts` lays them out in
`assets/tiles.png`, the day maps' ground:

| Tiles | Used as |
| --- | --- |
| 0000, 0002 | grass, and grass with flowers |
| 0012–0014, 0024–0026, 0036–0042 | the road: each path tile is put together from quarters of these edge and corner pieces, so a road one tile wide joins up |
| 0027 | ash terrain (Ember): an autumn tree |
| 0093 | pylon terrain (Volt): a gold crystal |
| 0043 | rock terrain (Stone): cobbles |
| 0016 | grove terrain (Bloom): a green tree |

Every colour is put to a small, quiet day palette (`DAY` in `make-art.ts`): two greens for grass, three tans for the road, one ink for
outlines, one for flowers, and a dark and a light of each type's colour for its terrain. The pack has no water, so the pool terrain (Tide) and Glowmire's night tiles are drawn in `make-art.ts`.
