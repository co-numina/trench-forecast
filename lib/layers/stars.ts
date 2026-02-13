import type { Layer, SceneState } from "../renderer/scene";
import type { Grid } from "../renderer/grid";

interface Star {
  col: number;
  row: number;
  char: string;
  phase: number; // random offset for twinkle
}

const STAR_CHARS = [".", "*", "+", "."];
const DIM_COLOR = "#333";
const MID_COLOR = "#666";
const BRIGHT_COLOR = "#CCC";
const TWINKLE_PERIOD = 80; // frames per twinkle cycle

export class StarsLayer implements Layer {
  private stars: Star[] = [];
  private initialized = false;
  private lastCols = 0;
  private lastRows = 0;

  private seed(cols: number, rows: number) {
    this.stars = [];
    this.lastCols = cols;
    this.lastRows = rows;

    // Deterministic pseudo-random using simple hash
    const skyHeight = Math.floor(rows * 0.6);
    for (let r = 1; r < skyHeight; r++) {
      for (let c = 0; c < cols; c++) {
        const hash = ((c * 7919 + r * 104729) ^ 0x5DEECE66D) & 0x7FFFFFFF;
        if (hash % 70 === 0) {
          this.stars.push({
            col: c,
            row: r,
            char: STAR_CHARS[hash % STAR_CHARS.length],
            phase: hash % TWINKLE_PERIOD,
          });
        }
      }
    }
    this.initialized = true;
  }

  draw(grid: Grid, state: SceneState, tick: number) {
    // Apply subtle sky tint based on time of day
    if (state.skyTint) {
      const skyHeight = Math.floor(state.rows * 0.5);
      for (let r = 0; r < skyHeight; r++) {
        for (let c = 0; c < state.cols; c++) {
          const cell = grid.get(c, r);
          if (cell && cell.char === " " && !cell.bg) {
            cell.bg = state.skyTint;
          }
        }
      }
    }

    // Hide stars in heavy weather
    if (state.weather === "OVERCAST" || state.weather === "THUNDERSTORM") return;

    if (!this.initialized || state.cols !== this.lastCols || state.rows !== this.lastRows) {
      this.seed(state.cols, state.rows);
    }

    const dimInRain = state.weather === "RAIN";

    for (const star of this.stars) {
      const cycle = (tick + star.phase) % TWINKLE_PERIOD;
      let color: string;

      if (dimInRain) {
        color = cycle < 10 ? DIM_COLOR : "#222";
      } else if (state.weather === "SNOW") {
        color = cycle < 20 ? MID_COLOR : DIM_COLOR;
      } else {
        // CLEAR or PARTLY_CLOUDY
        if (cycle < 15) color = BRIGHT_COLOR;
        else if (cycle < 40) color = MID_COLOR;
        else color = DIM_COLOR;
      }

      grid.set(star.col, star.row, star.char, color);
    }
  }
}
