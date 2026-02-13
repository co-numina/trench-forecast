import { Grid } from "./grid";
import type { WeatherType, TrenchState, TrendSnapshot } from "../data/types";

export const TICKER_ROWS = 2; // ticker + footer occupy bottom 2 rows
export const GROUND_ROWS = 4; // street level: bases, sidewalk, road, gutter

/** Oracle overlay state */
export interface OracleState {
  visible: boolean;
  loading: boolean;
  reading: string | null;
}

export interface SceneState {
  cols: number;
  rows: number;
  weather: WeatherType;
  /** Total ground rows (street area above ticker) */
  groundRows: number;
  /** Row where street starts (rows - groundRows - TICKER_ROWS) */
  streetRow: number;
  /** total bottom zone = groundRows + TICKER_ROWS */
  bottomZone: number;
  /** Car density 0-1, driven by weather */
  carDensity: number;
  /** Window brightness 0-1, driven by weather */
  windowBrightness: number;
  /** People density 0-1, driven by weather */
  peopleDensity: number;
  trenchState: TrenchState | null;
  /** Rolling trend snapshots for metrics panel (last 4 readings, ~15min apart) */
  trendHistory: TrendSnapshot[];
  /** AUTO = data-driven weather, MANUAL = user-set via [W] */
  weatherMode: "AUTO" | "MANUAL";
  /** Oracle overlay state */
  oracleState?: OracleState;
  /** Currently selected building index (-1 or null = none) */
  selectedBuilding?: number | null;
  /** Building positions for detail overlay positioning */
  buildingPositions?: { col: number; width: number }[];
  /** Buy ratio sparkline history (rolling buffer of last 12 readings) */
  sparklineData?: number[];
  /** Sky tint color for time-of-day effect */
  skyTint?: string;
}

export interface Layer {
  draw(grid: Grid, state: SceneState, tick: number): void;
}

export class SceneComposer {
  private layers: Layer[] = [];

  addLayer(layer: Layer) {
    this.layers.push(layer);
  }

  drawAll(grid: Grid, state: SceneState, tick: number) {
    for (const layer of this.layers) {
      layer.draw(grid, state, tick);
    }
  }
}
