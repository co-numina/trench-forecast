import type { Layer, SceneState } from "./renderer/scene";
import type { Grid } from "./renderer/grid";

const TICKER_FG = "#777";
const TICKER_BG = "#0a0a0a";
const SEPARATOR = " \u2500\u2500\u2500 "; // ───

export class TickerLayer implements Layer {
  private scrollOffset = 0;
  private cachedText = "";

  draw(grid: Grid, state: SceneState, tick: number) {
    const events = state.trenchState?.events ?? [];
    const row = state.rows - 1; // very bottom row

    // Build ticker text from events
    let text: string;
    if (events.length > 0) {
      text = events.map((e) => e.text).join(SEPARATOR);
    } else {
      text =
        "TRENCH FORECAST" +
        SEPARATOR +
        "Press [W] to cycle weather" +
        SEPARATOR +
        "Press [D] to toggle mock data" +
        SEPARATOR +
        "ASCII townscape visualization of the Solana memecoin trenches";
    }

    // Ensure text is long enough to scroll
    while (text.length < state.cols * 2) {
      text = text + SEPARATOR + text;
    }
    this.cachedText = text;

    // Scroll
    if (tick % 3 === 0) {
      this.scrollOffset++;
      if (this.scrollOffset >= text.length / 2) {
        this.scrollOffset = 0;
      }
    }

    // Draw
    for (let c = 0; c < state.cols; c++) {
      const idx = (c + this.scrollOffset) % text.length;
      const ch = text[idx];
      grid.set(c, row, ch, TICKER_FG, TICKER_BG);
    }

  }
}
