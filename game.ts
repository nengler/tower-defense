import type { InputBindings, PlayerConfig } from "@tsengine/player";

import { Main } from "./generated/Main.ts";

/**
 * The game's entry: just its root. The window, background, assets folder and game state are the root's `<Game>` props.
 * `Main` is the component of src/Main.tsx. `tse` writes each component out as a class in generated/ (never edit that folder), so
 * the root is made with `new`; everywhere else you work in the .tsx, and an error names its line.
 */
export const gameConfig: PlayerConfig = {
  root: () => new Main(),
};

/** The screen as the input scripts' clicks see it (`click@x,y` in game pixels). */
export const screen = { width: 320, height: 180, windowWidth: 320, windowHeight: 180, fit: "integer" } as const;

/** Names for the input scripts that tests, parity and `tse screenshot` use (`right*30, down*10`); anything else is a key name. */
export const bindings: InputBindings = {
  left: ["ArrowLeft"],
  right: ["ArrowRight"],
  up: ["ArrowUp"],
  down: ["ArrowDown"],
  /** Select the first, second, … creature in the bar. */
  first: ["1"],
  second: ["2"],
  third: ["3"],
};
