import type { Layer, SceneState } from "../renderer/scene";
import type { Grid } from "../renderer/grid";
import {
  CLOUD_SHAPES, CLOUD_DARK, CLOUD_MASSIVE, CLOUD_MASSIVE_STORM,
  getCloudWidth,
} from "../art/clouds";
import type { WeatherType } from "../data/types";

interface Cloud {
  x: number;
  y: number;
  shape: string[];
  speed: number;
  width: number;
}

function cloudCountForWeather(w: WeatherType): number {
  switch (w) {
    case "CLEAR": return 1;
    case "PARTLY_CLOUDY": return 3;
    case "OVERCAST": return 5;
    case "RAIN": return 4;
    case "THUNDERSTORM": return 6;
    case "SNOW": return 2;
  }
}

export class CloudsLayer implements Layer {
  private clouds: Cloud[] = [];
  private lastWeather: WeatherType | null = null;
  private lastCols = 0;

  private spawnClouds(count: number, cols: number, rows: number, weather: WeatherType) {
    this.clouds = [];
    const skyHeight = Math.floor(rows * 0.3);
    const isDark = weather === "THUNDERSTORM" || weather === "RAIN";

    for (let i = 0; i < count; i++) {
      let shape: string[];

      // First 1-2 clouds use massive shapes for more visual impact
      if (i < 2 && count >= 3) {
        if (isDark && i === 0) {
          shape = CLOUD_MASSIVE_STORM;
        } else {
          shape = CLOUD_MASSIVE[i % CLOUD_MASSIVE.length];
        }
      } else {
        const shapePool = isDark ? [CLOUD_DARK, ...CLOUD_SHAPES.slice(1)] : CLOUD_SHAPES;
        shape = shapePool[i % shapePool.length];
      }

      const width = getCloudWidth(shape);

      this.clouds.push({
        x: (cols / (count + 1)) * (i + 1) - width / 2 + (((i * 137) % 20) - 10),
        y: 2 + (i % Math.max(1, skyHeight - shape.length)),
        shape,
        speed: 0.02 + (((i * 31) % 10) / 100) * 0.4,
        width,
      });
    }
  }

  draw(grid: Grid, state: SceneState, tick: number) {
    const count = cloudCountForWeather(state.weather);
    if (count === 0) {
      this.clouds = [];
      this.lastWeather = state.weather;
      return;
    }

    if (state.weather !== this.lastWeather || state.cols !== this.lastCols) {
      this.spawnClouds(count, state.cols, state.rows, state.weather);
      this.lastWeather = state.weather;
      this.lastCols = state.cols;
    }

    const isDark = state.weather === "THUNDERSTORM" || state.weather === "RAIN";
    const cloudColor = isDark ? "#555" : "#999";

    for (const cloud of this.clouds) {
      cloud.x += cloud.speed;
      if (cloud.x > state.cols + 5) {
        cloud.x = -cloud.width - 5;
      }

      const col = Math.floor(cloud.x);
      grid.drawArt(col, cloud.y, cloud.shape, cloudColor);
    }
  }
}
