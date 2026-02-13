import type { Layer, SceneState } from "../renderer/scene";
import type { Grid } from "../renderer/grid";
import type { WeatherType } from "../data/types";

const BIRD_COLOR = "#52525b"; // dark gray silhouettes

interface Bird {
  x: number;
  y: number;
  direction: 1 | -1;
  speed: number; // chars per tick
  frame: 0 | 1;
  moveTicks: number; // ticks between moves
  moveCounter: number;
  flapCounter: number;
}

// Small bird: 1 char wide
const BIRD_FRAMES_SMALL = ["v", "^"];
// Wider bird: 3 chars wide
const BIRD_FRAMES_WIDE_R = ["\\v/", "/^\\"];
const BIRD_FRAMES_WIDE_L = ["/v\\", "\\^/"];

function birdCountForWeather(w: WeatherType): number {
  switch (w) {
    case "CLEAR": return 3;
    case "PARTLY_CLOUDY": return 2;
    case "OVERCAST": return 1;
    case "RAIN": return 0;
    case "THUNDERSTORM": return 0;
    case "SNOW": return 0;
  }
}

/** Occasionally spawn a flock (2-4 birds clustered together) */
function shouldSpawnFlock(weather: WeatherType): boolean {
  if (weather !== "CLEAR" && weather !== "PARTLY_CLOUDY") return false;
  return Math.random() < 0.3;
}

export class BirdsLayer implements Layer {
  private birds: Bird[] = [];
  private lastWeather: WeatherType | null = null;
  private spawnTimer = 0;

  private spawnBird(cols: number, rows: number): Bird {
    const dir = Math.random() > 0.5 ? 1 : -1;
    const skyHeight = Math.min(15, Math.floor(rows * 0.3));
    return {
      x: dir === 1 ? -3 : cols + 3,
      y: 3 + Math.floor(Math.random() * Math.max(1, skyHeight - 3)),
      direction: dir as 1 | -1,
      speed: 1,
      frame: 0,
      moveTicks: 8 + Math.floor(Math.random() * 5), // ~1 char per 0.27-0.43s at 30fps
      moveCounter: 0,
      flapCounter: 0,
    };
  }

  draw(grid: Grid, state: SceneState, tick: number) {
    const targetCount = birdCountForWeather(state.weather);

    // Reset birds on weather change
    if (state.weather !== this.lastWeather) {
      this.birds = [];
      this.lastWeather = state.weather;
      this.spawnTimer = 30; // small delay before first spawn
    }

    // Spawn new birds
    this.spawnTimer--;
    if (this.spawnTimer <= 0 && this.birds.length < targetCount) {
      const bird = this.spawnBird(state.cols, state.rows);
      this.birds.push(bird);

      // Flock spawn: add 1-3 more birds near this one
      if (shouldSpawnFlock(state.weather)) {
        const flockSize = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < flockSize && this.birds.length < targetCount + 2; i++) {
          const flock = this.spawnBird(state.cols, state.rows);
          flock.x = bird.x + (Math.random() - 0.5) * 6;
          flock.y = bird.y + Math.floor((Math.random() - 0.5) * 3);
          flock.direction = bird.direction;
          this.birds.push(flock);
        }
      }

      this.spawnTimer = 60 + Math.floor(Math.random() * 120); // 2-6 seconds between spawns
    }

    // Update and draw birds
    for (let i = this.birds.length - 1; i >= 0; i--) {
      const bird = this.birds[i];

      // Move bird
      bird.moveCounter++;
      if (bird.moveCounter >= bird.moveTicks) {
        bird.moveCounter = 0;
        bird.x += bird.direction * bird.speed;

        // Wing flap every 3 movements
        bird.flapCounter++;
        if (bird.flapCounter >= 3) {
          bird.flapCounter = 0;
          bird.frame = (bird.frame === 0 ? 1 : 0) as 0 | 1;
        }
      }

      // Remove if off screen
      if (bird.direction === 1 && bird.x > state.cols + 5) {
        this.birds.splice(i, 1);
        continue;
      }
      if (bird.direction === -1 && bird.x < -5) {
        this.birds.splice(i, 1);
        continue;
      }

      // Draw bird — alternate between small and wide sprites
      const useWide = Math.abs(bird.y) % 2 === 0;
      if (useWide) {
        const frames = bird.direction === 1 ? BIRD_FRAMES_WIDE_R : BIRD_FRAMES_WIDE_L;
        const art = frames[bird.frame];
        const bx = Math.floor(bird.x);
        for (let c = 0; c < art.length; c++) {
          const cx = bx + c;
          if (cx >= 0 && cx < state.cols && bird.y >= 0 && bird.y < state.rows) {
            if (art[c] !== " ") {
              grid.set(cx, bird.y, art[c], BIRD_COLOR);
            }
          }
        }
      } else {
        const ch = BIRD_FRAMES_SMALL[bird.frame];
        const bx = Math.floor(bird.x);
        if (bx >= 0 && bx < state.cols && bird.y >= 0 && bird.y < state.rows) {
          grid.set(bx, bird.y, ch, BIRD_COLOR);
        }
      }
    }
  }
}
