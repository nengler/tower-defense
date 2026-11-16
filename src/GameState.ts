import { createGameState } from "@rge/runtime";

type Screen = "title" | "settings" | "play" | "won" | "lost";

/**
 * The game's state, in one place: which screen shows, whether play is paused, and the settings. A component reads one value with
 * `useGame((s) => s.screen)` and takes the actions it calls with `const { start } = useGame.actions()`. An action is given the state
 * and writes it directly.
 */
export const useGame = createGameState(
  {
    screen: "title" as Screen,
    paused: false,
    /** The volume, 0 to 10. */
    volume: 8,
    music: true,
    /** The wave the last run reached, for the end screen. */
    endWave: 0,
  },
  {
    start(s) {
      s.screen = "play";
      s.paused = false;
    },
    openSettings(s) {
      s.screen = "settings";
    },
    toTitle(s) {
      s.screen = "title";
      s.paused = false;
    },
    pause(s) {
      s.paused = true;
    },
    resume(s) {
      s.paused = false;
    },
    changeVolume(s, by: number) {
      s.volume = Math.min(10, Math.max(0, s.volume + by));
    },
    toggleMusic(s) {
      s.music = !s.music;
    },
    /** The run is over: `Play` says how it went, and the end screen shows. */
    finish(s, won: boolean, wave: number) {
      s.screen = won ? "won" : "lost";
      s.endWave = wave;
      s.paused = false;
    },
  }
);
