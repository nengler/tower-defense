import { MOVES, type MoveId } from "./moves.ts";
import { FORMS, type FormId } from "./species.ts";

/** The prompt keeps its pick as a string (a move or a form): these read it back. */
export const asMove = (option: string): MoveId => option as MoveId;
export const asForm = (option: string): FormId => option as FormId;

/** An option's name, line and detail, for a move or a form. */
export function optionName(option: string, isForm: boolean): string {
  return isForm ? FORMS[asForm(option)].name : MOVES[asMove(option)].name;
}
export function optionText(option: string, isForm: boolean): string {
  return isForm ? FORMS[asForm(option)].text : MOVES[asMove(option)].text;
}
export function optionDetail(option: string, isForm: boolean): string {
  return isForm ? `LEARNS ${MOVES[FORMS[asForm(option)].move].name}` : summary(asMove(option));
}
/** The move picking this option teaches. */
export function optionMove(option: string, isForm: boolean): MoveId {
  return isForm ? FORMS[asForm(option)].move : asMove(option);
}

/** A move in a few words: its shape, damage and cooldown. */
export function summary(move: MoveId): string {
  const m = MOVES[move];
  const shape = m.shape === "buff" ? "BUFF" : m.shape.toUpperCase();
  return m.damage > 0 ? `${shape} ${m.damage} DMG ${m.cooldown}S` : `${shape} ${m.cooldown}S`;
}

