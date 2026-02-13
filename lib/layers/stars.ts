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

// ============================================================
// City glow — faint horizon line above buildings
// ============================================================

const GLOW_CHARS = ["·", " ", "·", " ", "·", "·", " ", "·", " ", " ", "·", " ", "·", "·", " ", "·"];
const GLOW_COLOR = "#1a1a1a";

// ============================================================
// Satellite — slow-moving dot across the sky
// ============================================================

const SATELLITE_COLOR = "#888888";
const SATELLITE_SPEED = 0.008; // chars per tick — ~0.24 chars/sec at 30fps, ~7min to cross 100 cols

export class StarsLayer implements Layer {
  private stars: Star[] = [];
  private initialized = false;
  private lastCols = 0;
  private lastRows = 0;

  // Satellite state
  private satelliteX = -10;
  private satelliteY = 3;
  private satellitePause = 0;

  private seed(cols: number, rows: number) {
    this.stars = [];
    this.lastCols = cols;
    this.lastRows = rows;

    const skyHeight = Math.floor(rows * 0.6);

    // Regular stars — deterministic pseudo-random using simple hash
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

    // Reset satellite
    this.satelliteX = -5;
    this.satelliteY = 2 + Math.floor(Math.random() * Math.max(1, skyHeight * 0.3));

    this.initialized = true;
  }

  draw(grid: Grid, state: SceneState, tick: number) {
    // Hide stars in heavy weather
    if (state.weather === "OVERCAST" || state.weather === "THUNDERSTORM") return;

    if (!this.initialized || state.cols !== this.lastCols || state.rows !== this.lastRows) {
      this.seed(state.cols, state.rows);
    }

    const dimInRain = state.weather === "RAIN";
    const skyHeight = Math.floor(state.rows * 0.6);

    // --- Regular stars ---
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

    // --- City glow horizon (just above buildings) ---
    const glowRow = state.streetRow - 1;
    if (glowRow > 0 && glowRow < state.rows) {
      for (let c = 0; c < state.cols; c++) {
        const ch = GLOW_CHARS[c % GLOW_CHARS.length];
        if (ch !== " ") {
          grid.set(c, glowRow, ch, GLOW_COLOR);
        }
      }
    }

    // --- Satellite (slow-moving dot) ---
    if (!dimInRain) {
      if (this.satellitePause > 0) {
        this.satellitePause--;
      } else {
        this.satelliteX += SATELLITE_SPEED;

        const sx = Math.floor(this.satelliteX);
        if (sx >= 0 && sx < state.cols && this.satelliteY < skyHeight) {
          grid.set(sx, this.satelliteY, ".", SATELLITE_COLOR);
        }

        // Wrap when off-screen
        if (sx > state.cols + 5) {
          this.satelliteX = -5;
          this.satelliteY = 2 + Math.floor(Math.random() * Math.max(1, skyHeight * 0.3));
          this.satellitePause = 300; // ~10 sec pause at 30fps
        }
      }
    }
  }
}
