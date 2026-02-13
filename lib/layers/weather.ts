import type { Layer, SceneState } from "../renderer/scene";
import type { Grid } from "../renderer/grid";
import { ParticleSystem } from "../engine/particles";

type LightningState = "IDLE" | "FLASH" | "FADE";

export class WeatherLayer implements Layer {
  private rain = new ParticleSystem(200);
  private snow = new ParticleSystem(100);
  private lightningState: LightningState = "IDLE";
  private lightningTimer = 0;
  private flashFrames = 0;
  private lastWeather: string | null = null;

  draw(grid: Grid, state: SceneState, tick: number) {
    // Clear particles on weather change
    if (state.weather !== this.lastWeather) {
      this.rain.clear();
      this.snow.clear();
      this.lightningState = "IDLE";
      this.lightningTimer = 60 + Math.floor(Math.random() * 140);
      this.lastWeather = state.weather;
    }

    if (state.weather === "RAIN" || state.weather === "THUNDERSTORM") {
      this.drawRain(grid, state, tick);
    }

    if (state.weather === "THUNDERSTORM") {
      this.drawLightning(grid, state, tick);
    }

    if (state.weather === "SNOW") {
      this.drawSnow(grid, state, tick);
    }
  }

  private drawRain(grid: Grid, state: SceneState, tick: number) {
    const isStorm = state.weather === "THUNDERSTORM";
    const spawnRate = isStorm ? 8 : 3;
    const maxY = state.streetRow; // rain stops at street level

    // Spawn rain drops
    for (let i = 0; i < spawnRate; i++) {
      const x = Math.random() * state.cols;
      this.rain.spawn({
        x,
        y: 1,
        vx: 0.1 + Math.random() * 0.3,
        vy: 0.5 + Math.random() * 0.4,
        char: Math.random() > 0.5 ? "/" : "|",
        fg: isStorm ? "#668" : "#446",
        maxLife: maxY * 2.5,
      });
    }

    this.rain.update(state.cols, state.rows);

    // Don't render below street
    for (const p of this.rain.particles) {
      if (Math.floor(p.y) >= maxY) continue;
      const col = Math.floor(p.x);
      const row = Math.floor(p.y);
      grid.set(col, row, p.char, p.fg);
    }
  }

  private drawSnow(grid: Grid, state: SceneState, tick: number) {
    // Spawn snowflakes
    if (tick % 3 === 0) {
      const x = Math.random() * state.cols;
      this.snow.spawn({
        x,
        y: 1,
        vx: 0,
        vy: 0.1 + Math.random() * 0.15,
        char: Math.random() > 0.6 ? "*" : ".",
        fg: Math.random() > 0.5 ? "#AAA" : "#777",
        maxLife: state.rows * 8,
      });
    }

    // Update with sinusoidal sway
    for (const p of this.snow.particles) {
      p.vx = Math.sin(p.y * 0.3 + tick * 0.02) * 0.05;
    }

    this.snow.update(state.cols, state.rows);

    const maxY = state.streetRow;
    for (const p of this.snow.particles) {
      if (Math.floor(p.y) >= maxY) continue;
      const col = Math.floor(p.x);
      const row = Math.floor(p.y);
      grid.set(col, row, p.char, p.fg);
    }
  }

  private drawLightning(grid: Grid, state: SceneState, tick: number) {
    this.lightningTimer--;

    if (this.lightningState === "IDLE" && this.lightningTimer <= 0) {
      this.lightningState = "FLASH";
      this.flashFrames = 3;
    }

    if (this.lightningState === "FLASH") {
      // Brighten everything above the street for a few frames
      for (let r = 0; r < state.streetRow; r++) {
        for (let c = 0; c < state.cols; c++) {
          const cell = grid.get(c, r);
          if (cell && cell.char !== " ") {
            cell.fg = "#FFF";
          }
        }
      }
      // Draw bolt
      const boltX = Math.floor(state.cols * 0.2 + Math.random() * state.cols * 0.5);
      let y = 3;
      let x = boltX;
      while (y < state.streetRow - 2) {
        grid.set(x, y, "|", "#FFE");
        y++;
        x += Math.floor(Math.random() * 3) - 1;
      }

      this.flashFrames--;
      if (this.flashFrames <= 0) {
        this.lightningState = "FADE";
        this.lightningTimer = 2;
      }
    }

    if (this.lightningState === "FADE") {
      if (this.lightningTimer <= 0) {
        this.lightningState = "IDLE";
        this.lightningTimer = 60 + Math.floor(Math.random() * 140);
      }
    }
  }
}
