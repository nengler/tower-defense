import type { InputBindings, PlayerConfig } from "@rge/player";

import { Main } from "./generated/Main.ts";

/**
 * The game's entry: just its root. The window, background, assets folder and game state are the root's `<Game>` props.
 * `Main` is the component of src/Main.tsx. `rge` writes each component out as a class in generated/ (never edit that folder), so
 * the root is made with `new`; everywhere else you work in the .tsx, and an error names its line.
 */
export const gameConfig: PlayerConfig = {
  root: () => new Main(),
};

/** Names for the input scripts that tests, parity and `rge screenshot` use (`right*30, down*10`); anything else is a key name. */
export const bindings: InputBindings = {
  left: ["ArrowLeft"],
  right: ["ArrowRight"],
  up: ["ArrowUp"],
  down: ["ArrowDown"],
};
