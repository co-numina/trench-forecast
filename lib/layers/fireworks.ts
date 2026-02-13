import type { Layer, SceneState } from "../renderer/scene";
import type { Grid } from "../renderer/grid";

interface Firework {
  x: number;
  y: number;
  frame: number;
  maxFrames: number;
  color: string;
}

// Firework explosion patterns per frame
const EXPLOSION_FRAMES: string[][] = [
  // Frame 0: single point
  ["*"],
  // Frame 1: small cross
  [" * ", "*.*", " * "],
  // Frame 2: expanded
  ["  |  ", "\\   /", "-- --", "/   \\", "  |  "],
  // Frame 3: larger burst
  ["  \\|/  ", "-- * --", "  /|\\  "],
  // Frame 4: sparkle ring
  [" . * . ", "*     *", " . * . "],
  // Frame 5: scatter
  [" .   . ", "  . .  ", " .   . "],
  // Frame 6: fading
  ["  .  ", " . . ", "  .  "],
  // Frame 7: almost gone
  [" . ", "   ", " . "],
];

const FIREWORK_COLORS = [
  "#fbbf24", // amber
  "#f87171", // red
  "#4ade80", // green
  "#60a5fa", // blue
  "#c084fc", // purple
  "#e4e4e7", // white
];

export class FireworksLayer implements Layer {
  private fireworks: Firework[] = [];
  private previousGradAddresses = new Set<string>();
  private tickCounter = 0;

  /** Manually trigger a firework at a specific position */
  triggerFirework(x: number, skyHeight: number) {
    const y = 2 + Math.floor(Math.random() * Math.max(1, skyHeight - 5));
    this.fireworks.push({
      x,
      y,
      frame: 0,
      maxFrames: EXPLOSION_FRAMES.length,
      color: FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)],
    });
  }

  draw(grid: Grid, state: SceneState, tick: number) {
    this.tickCounter++;

    // Detect new graduated tokens
    const runners = state.trenchState?.runners ?? [];
    const graduated = runners.filter((r) => r.isGraduated);
    const gradAddresses = new Set(graduated.map((r) => r.mint));

    if (this.previousGradAddresses.size > 0) {
      for (const addr of gradAddresses) {
        if (!this.previousGradAddresses.has(addr)) {
          // New graduation! Spawn firework
          const skyHeight = Math.floor(state.rows * 0.4);
          const x = Math.floor(Math.random() * (state.cols - 10)) + 5;
          this.triggerFirework(x, skyHeight);
        }
      }
    }
    this.previousGradAddresses = gradAddresses;

    // Update and draw fireworks
    for (let i = this.fireworks.length - 1; i >= 0; i--) {
      const fw = this.fireworks[i];

      // Advance frame every 4 ticks
      if (this.tickCounter % 4 === 0) {
        fw.frame++;
      }

      if (fw.frame >= fw.maxFrames) {
        this.fireworks.splice(i, 1);
        continue;
      }

      // Draw current frame
      const pattern = EXPLOSION_FRAMES[fw.frame];
      const brightness = 1 - fw.frame / fw.maxFrames;
      const alpha = Math.floor(brightness * 255);
      const hex = alpha.toString(16).padStart(2, "0");

      for (let r = 0; r < pattern.length; r++) {
        for (let c = 0; c < pattern[r].length; c++) {
          const ch = pattern[r][c];
          if (ch === " ") continue;

          const screenX = fw.x - Math.floor(pattern[r].length / 2) + c;
          const screenY = fw.y - Math.floor(pattern.length / 2) + r;

          if (screenX >= 0 && screenX < state.cols && screenY >= 0 && screenY < state.rows) {
            // Fade color based on frame
            const color = fw.frame < 3 ? fw.color : `#${hex}${hex}${hex}`;
            grid.set(screenX, screenY, ch, color);
          }
        }
      }
    }
  }
}
