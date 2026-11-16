/** The five types. Each beats some and is resisted by others (DESIGN.md, "Types"). */
export type Type = "ember" | "tide" | "volt" | "stone" | "bloom";

export const TYPES: readonly Type[] = ["ember", "tide", "volt", "stone", "bloom"];

/** What each type beats. Whatever beats a type is what it is resisted by. */
export const BEATS: Readonly<Record<Type, readonly Type[]>> = {
  ember: ["bloom"],
  tide: ["ember"],
  bloom: ["tide", "stone"],
  volt: ["tide"],
  stone: ["volt", "ember"],
};

/** A move of the creature's own type. */
export const SAME_TYPE = 1.25;
/** Against a type the move beats. */
export const STRONG = 1.5;
/** Against a type that beats the move's type. */
export const WEAK = 0.67;

/** How strong a move of `move` type is against an enemy of `enemy` type: STRONG, WEAK, or 1. */
export function matchup(move: Type, enemy: Type): number {
  if (BEATS[move].includes(enemy)) return STRONG;
  if (BEATS[enemy].includes(move)) return WEAK;
  return 1;
}

/** The whole type factor of a move's damage: its own-type bonus times its matchup against the enemy. */
export function typeFactor(move: Type, user: Type, enemy: Type): number {
  return (move === user ? SAME_TYPE : 1) * matchup(move, enemy);
}

/** The colour each type is drawn in. */
export const TYPE_COLOR: Readonly<Record<Type, string>> = {
  ember: "#f07a3a",
  tide: "#4aa3f0",
  volt: "#f0d84a",
  stone: "#a08a6a",
  bloom: "#6ad06a",
};
