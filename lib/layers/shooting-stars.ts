import type { Layer, SceneState } from "../renderer/scene";
import type { Grid } from "../renderer/grid";

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  trail: Array<{ x: number; y: number }>;
}

export class ShootingStarsLayer implements Layer {
  private stars: ShootingStar[] = [];
  private spawnTimer = 0;
  private previousAddresses = new Set<string>();

  private spawnStar(cols: number, rows: number): ShootingStar {
    const skyHeight = Math.floor(rows * 0.3);
    return {
      x: Math.random() * cols * 0.5,
      y: 1 + Math.floor(Math.random() * skyHeight),
      vx: 1.2 + Math.random() * 0.8,
      vy: 0.2 + Math.random() * 0.2,
      life: 15 + Math.floor(Math.random() * 10),
      trail: [],
    };
  }

  draw(grid: Grid, state: SceneState, tick: number) {
    // Don't show in heavy weather
    if (state.weather === "THUNDERSTORM" || state.weather === "OVERCAST") return;

    // Spawn rate based on daily launches — more launches = more shooting stars
    const launchedToday = state.trenchState?.market.launchedToday ?? 10000;
    const launchesPerHour = launchedToday / 24;
    const spawnInterval = Math.max(60, 300 - Math.floor(launchesPerHour / 2));

    // ─── Detect new tokens → spawn extra shooting stars ───
    const runners = state.trenchState?.runners ?? [];
    const currentAddresses = new Set(runners.map((r) => r.mint).filter(Boolean));
    if (this.previousAddresses.size > 0) {
      let newCount = 0;
      for (const addr of currentAddresses) {
        if (!this.previousAddresses.has(addr)) newCount++;
      }
      // Spawn a shooting star for each new token (max 3)
      for (let i = 0; i < Math.min(newCount, 3); i++) {
        this.stars.push(this.spawnStar(state.cols, state.rows));
      }
    }
    this.previousAddresses = currentAddresses;

    // Regular timed spawning
    this.spawnTimer--;
    if (this.spawnTimer <= 0) {
      this.stars.push(this.spawnStar(state.cols, state.rows));
      this.spawnTimer = spawnInterval;
    }

    // Update + draw
    for (let i = this.stars.length - 1; i >= 0; i--) {
      const s = this.stars[i];

      // Store trail
      s.trail.push({ x: s.x, y: s.y });
      if (s.trail.length > 4) s.trail.shift();

      s.x += s.vx;
      s.y += s.vy;
      s.life--;

      if (s.life <= 0 || s.x > state.cols || s.y > state.rows * 0.5) {
        this.stars.splice(i, 1);
        continue;
      }

      // Draw trail (dim)
      for (let t = 0; t < s.trail.length; t++) {
        const tp = s.trail[t];
        const brightness = Math.floor(40 + (t / s.trail.length) * 60);
        const hex = brightness.toString(16).padStart(2, "0");
        grid.set(Math.floor(tp.x), Math.floor(tp.y), "-", `#${hex}${hex}${hex}`);
      }

      // Draw head (bright)
      grid.set(Math.floor(s.x), Math.floor(s.y), "*", "#FFF");
    }
  }
}
