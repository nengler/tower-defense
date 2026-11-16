/**
 * Plays a short run against a recording backend and prints everything the player did as one line of JSON (numbers rounded to
 * 1e-9). It runs unchanged under Node and, bundled, under the Rust host (QuickJS-ng): `rge check` requires the two outputs to
 * be identical, and two runs under Node to be identical too.
 */
import { createPlayer, parseInputScript, RecordingBackend } from "@rge/player";

import { bindings, gameConfig } from "./game.ts";

const frames = parseInputScript("_*3, right*30, Z, down*20", { bindings });
const backend = new RecordingBackend();
const warnings: string[] = [];
for (const frame of frames) backend.queueInput(frame);
const player = createPlayer(backend, { ...gameConfig, warn: (message) => warnings.push(message) });
for (let i = 0; i < frames.length + 1; i++) player.step();
const records = backend.lastFrame.records.length;
player.close();

const round = (_key: string, value: unknown): unknown => (typeof value === "number" ? Math.round(value * 1e9) / 1e9 : value);
console.log(JSON.stringify({ plays: backend.plays, textureLoads: backend.textureLoads, records, warnings }, round));
