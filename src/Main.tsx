import { Game, Screen, useMount } from "@tsengine/runtime/jsx";

import { End } from "./End.tsx";
import { useGame } from "./GameState.ts";
import { Play } from "./Play.tsx";
import { save } from "./save.ts";
import { Settings } from "./Settings.tsx";
import { Setup } from "./Setup.tsx";
import { Title } from "./Title.tsx";

/**
 * The root: one screen at a time. While the pause menu or a learn prompt is open the world does not step (`paused`), but the menu
 * still works; at 2X (`speed`) it steps twice a frame.
 */
export default function Main() {
  const screen = useGame((s) => s.screen);
  const paused = useGame((s) => s.paused);
  const prompting = useGame((s) => s.prompting >= 0);
  const speed = useGame((s) => s.speed);
  // Mastery is kept between runs: read it once, when the game starts.
  useMount(() => {
    save.load();
  });
  return (
    <Game id="creature-td" title="tower-defense" width={320} height={180} background="#10131c" assets="assets" font="tse:tiny5" textSize={8} paused={paused || prompting} timeScale={speed}>
      <Screen width={320} height={180} fit="integer">
        {screen === "title" && <Title name="tower-defense" />}
        {screen === "settings" && <Settings />}
        {screen === "setup" && <Setup />}
        {screen === "play" && <Play />}
        {screen === "won" && <End won />}
        {screen === "lost" && <End won={false} />}
      </Screen>
    </Game>
  );
}
