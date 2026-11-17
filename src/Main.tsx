import { Game, Screen, useMount } from "@tsengine/runtime/jsx";

import { End } from "./End.tsx";
import { useGame } from "./GameState.ts";
import { Play } from "./Play.tsx";
import { save } from "./save.ts";
import { Settings } from "./Settings.tsx";
import { Title } from "./Title.tsx";

/** The root: one screen at a time. While the pause menu is open the world does not step (`paused`), but the menu still works. */
export default function Main() {
  const screen = useGame((s) => s.screen);
  const paused = useGame((s) => s.paused);
  // Mastery is kept between runs: read it once, when the game starts.
  useMount(() => {
    save.load();
  });
  return (
    <Game id="creature-td" title="tower-defense" width={320} height={180} background="#10131c" assets="assets" font="tse:small" textSize={6} paused={paused}>
      <Screen width={320} height={180} fit="integer">
        {screen === "title" && <Title name="tower-defense" />}
        {screen === "settings" && <Settings />}
        {screen === "play" && <Play />}
        {screen === "won" && <End won />}
        {screen === "lost" && <End won={false} />}
      </Screen>
    </Game>
  );
}
