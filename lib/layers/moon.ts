import type { Layer, SceneState } from "../renderer/scene";
import type { Grid } from "../renderer/grid";

const MOON_ART: string[] = [
  "    _.._   ",
  "  .'    '. ",
  " /   ()   \\",
  "|  ()  ()  |",
  "|    ()    |",
  " \\   ()  / ",
  "  '._  _.' ",
  "    ''     ",
];
const MOON_WIDTH = 11;
const MOON_HEIGHT = MOON_ART.length;
const MOON_COLOR = "#EEE";
const MOON_DIM = "#666";

export class MoonLayer implements Layer {
  draw(grid: Grid, state: SceneState, tick: number) {
    const visible =
      state.weather === "CLEAR" ||
      state.weather === "PARTLY_CLOUDY" ||
      state.weather === "SNOW";

    if (!visible) return;

    const col = state.cols - MOON_WIDTH - 8;
    const row = 2;

    const color = state.weather === "SNOW" ? MOON_DIM : MOON_COLOR;

    const charColors = new Map<string, string>();
    charColors.set("(", "#FFE");
    charColors.set(")", "#FFE");

    grid.drawArt(col, row, MOON_ART, color, charColors);

    // Subtle glow around moon
    const glowChars = [
      [col - 1, row + 2, "."],
      [col + MOON_WIDTH, row + 3, "."],
      [col + 3, row - 1, "'"],
      [col + MOON_WIDTH - 3, row + MOON_HEIGHT, "'"],
    ] as const;

    const glowCycle = (tick % 60) < 30;
    if (glowCycle && state.weather === "CLEAR") {
      for (const [gc, gr, ch] of glowChars) {
        grid.set(gc, gr, ch, "#444");
      }
    }
  }
}
