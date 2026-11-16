import { createGameState } from "@rge/runtime";

type Screen = "title" | "settings" | "play";

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
  }
);
