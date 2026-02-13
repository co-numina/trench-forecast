import type { Layer, SceneState } from "../renderer/scene";
import type { Grid } from "../renderer/grid";
import type { WeatherType, TrendSnapshot } from "../data/types";

// ============================================================
// Weather Icons — small ASCII art for each weather type
// ============================================================

const ICON_CLEAR: string[] = [
  "  \\   |   /  ",
  " --  .---.  --",
  "    | o   |   ",
  " --  '---'  --",
  "  /   |   \\  ",
];

const ICON_PARTLY_CLOUDY: string[] = [
  " -  (   .   ) - ",
  " - ( .   . ) -  ",
  " -  ( .  . ) -  ",
  "     ---------  ",
];

const ICON_OVERCAST: string[] = [
  "  .---(-----)--.  ",
  " (  (  .  .  )  ) ",
  "  `--(-------)--' ",
];

const ICON_RAIN: string[] = [
  "   (  .---.  )  ",
  "   ( .  .  . )  ",
  "    ---------   ",
  "    / /  / /    ",
  "   / /  / /     ",
];

const ICON_THUNDERSTORM: string[] = [
  "   (  .---.  )  ",
  "   ( .  .  . )  ",
  "    ---------   ",
  "    / /_/ / /   ",
  "   / / /_/ /    ",
  "      /\\        ",
];

const ICON_SNOW: string[] = [
  "   (  .---.  )  ",
  "   ( .  .  . )  ",
  "    ---------   ",
  "    *  .  *     ",
  "   .  *  .  *   ",
];

function getWeatherIcon(w: WeatherType): string[] {
  switch (w) {
    case "CLEAR": return ICON_CLEAR;
    case "PARTLY_CLOUDY": return ICON_PARTLY_CLOUDY;
    case "OVERCAST": return ICON_OVERCAST;
    case "RAIN": return ICON_RAIN;
    case "THUNDERSTORM": return ICON_THUNDERSTORM;
    case "SNOW": return ICON_SNOW;
  }
}

// ============================================================
// Colors
// ============================================================

const PANEL_TEXT = "#a1a1aa";
const LABEL_DIM = "#71717a";
const VALUE_BRIGHT = "#e4e4e7";
const SEPARATOR_COLOR = "#3f3f46";
const GREEN = "#4ade80";
const AMBER = "#fbbf24";
const RED = "#f87171";
const TREND_DIM = "#71717a";
const TREND_CURRENT = "#a1a1aa";
const ORACLE_TV_COLOR = "#52525b";
const ORACLE_FLASH = "#fbbf24";

// Small TV monitor icon — oracle intel
const TV_ICON: string[] = [
  ".----------.",
  "|  TRENCH  |",
  "|   NEWS   |",
  "'----------'",
];

// ============================================================
// Helpers
// ============================================================

function formatVol(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}


function sentimentColor(ratio: number): string {
  if (ratio > 60) return GREEN;
  if (ratio >= 45) return AMBER;
  return RED;
}

function weatherAbbrev(w: WeatherType): string {
  switch (w) {
    case "CLEAR": return "CLEAR";
    case "PARTLY_CLOUDY": return "PT.CLOUD";
    case "OVERCAST": return "OVERCAST";
    case "RAIN": return "RAIN";
    case "THUNDERSTORM": return "T-STORM";
    case "SNOW": return "SNOW";
  }
}

function timeAgo(ms: number): string {
  const mins = Math.floor(ms / 60000);
  if (mins <= 0) return "Now";
  return `${mins}m ago`;
}

// ============================================================
// Panel Layer
// ============================================================

export class MetricsPanelLayer implements Layer {
  draw(grid: Grid, state: SceneState, tick: number) {
    const market = state.trenchState?.market;
    const startCol = 2;
    const startRow = 2;

    // Without data, show minimal panel
    if (!market) {
      this.drawNoDataPanel(grid, state, startCol, startRow, tick);
      return;
    }

    // --- Top Section: Weather Icon + Current Metrics ---
    const icon = getWeatherIcon(state.weather);
    const iconWidth = Math.max(...icon.map((l) => l.length));

    // Draw weather icon
    for (let r = 0; r < icon.length; r++) {
      const line = icon[r];
      for (let i = 0; i < line.length; i++) {
        if (line[i] !== " ") {
          grid.set(startCol + i, startRow + r, line[i], PANEL_TEXT);
        }
      }
    }

    // Metrics to the right of the icon
    const metricsCol = startCol + iconWidth + 2;
    let metricsRow = startRow;

    // Weather type label + mode tag
    const modeTag = state.weatherMode === "MANUAL" ? " [MANUAL]" : " [AUTO]";
    this.drawLabel(grid, metricsCol, metricsRow, "Trenches: ", LABEL_DIM);
    this.drawLabel(grid, metricsCol + 10, metricsRow, weatherAbbrev(state.weather), VALUE_BRIGHT);
    this.drawLabel(grid, metricsCol + 10 + weatherAbbrev(state.weather).length, metricsRow, modeTag, LABEL_DIM);
    metricsRow++;

    // Sentiment
    this.drawLabel(grid, metricsCol, metricsRow, "Sentiment: ", LABEL_DIM);
    const sentStr = `${market.buyRatio}% buys`;
    this.drawLabel(grid, metricsCol + 11, metricsRow, sentStr, sentimentColor(market.buyRatio));
    metricsRow++;

    // Vol/5m
    this.drawLabel(grid, metricsCol, metricsRow, "Vol/5m:    ", LABEL_DIM);
    this.drawLabel(grid, metricsCol + 11, metricsRow, formatVol(market.totalVolume5m), VALUE_BRIGHT);
    metricsRow++;

    // Vol/1h
    this.drawLabel(grid, metricsCol, metricsRow, "Vol/1h:    ", LABEL_DIM);
    this.drawLabel(grid, metricsCol + 11, metricsRow, formatVol(market.totalVolume1h), VALUE_BRIGHT);
    metricsRow++;

    // Launched today
    this.drawLabel(grid, metricsCol, metricsRow, "Launched:  ", LABEL_DIM);
    const launchedStr = market.launchedToday != null
      ? market.launchedToday.toLocaleString()
      : "\u2014";
    this.drawLabel(grid, metricsCol + 11, metricsRow, launchedStr, VALUE_BRIGHT);
    metricsRow++;

    // Graduated today
    this.drawLabel(grid, metricsCol, metricsRow, "Graduated: ", LABEL_DIM);
    const gradStr = market.graduatedToday != null
      ? market.graduatedToday.toLocaleString()
      : "\u2014";
    this.drawLabel(grid, metricsCol + 11, metricsRow, gradStr, VALUE_BRIGHT);
    metricsRow++;

    // Grad rate
    this.drawLabel(grid, metricsCol, metricsRow, "Grad rate: ", LABEL_DIM);
    const rateStr = market.gradRate != null ? `${market.gradRate}%` : "\u2014";
    const rateColor = market.gradRate != null
      ? (market.gradRate >= 3 ? GREEN : market.gradRate >= 1.5 ? AMBER : RED)
      : LABEL_DIM;
    this.drawLabel(grid, metricsCol + 11, metricsRow, rateStr, rateColor);
    metricsRow++;

    // --- Sparkline: buy ratio over last hour ---
    const sparkData = state.sparklineData;
    if (sparkData && sparkData.length >= 2) {
      metricsRow++; // blank line
      const sparkChars = ["\u2581", "\u2582", "\u2583", "\u2584", "\u2585", "\u2586", "\u2587", "\u2588"];
      const min = Math.min(...sparkData);
      const max = Math.max(...sparkData);
      const range = max - min || 1;
      const spark = sparkData.map((v) => {
        const idx = Math.floor(((v - min) / range) * 7);
        return sparkChars[idx];
      }).join("");

      // Determine trend direction for color
      const first = sparkData[0];
      const last = sparkData[sparkData.length - 1];
      const sparkColor = last > first + 2 ? GREEN : last < first - 2 ? RED : AMBER;

      this.drawLabel(grid, metricsCol, metricsRow, "1h trend:  ", LABEL_DIM);
      this.drawLabel(grid, metricsCol + 11, metricsRow, spark, sparkColor);
      metricsRow++;
    }

    // --- Separator ---
    const sepRow = Math.max(startRow + icon.length, metricsRow) + 1;
    const panelWidth = 48;
    for (let c = startCol; c < startCol + panelWidth && c < state.cols; c++) {
      grid.set(c, sepRow, "\u2500", SEPARATOR_COLOR); // ─
    }

    // --- Bottom Section: compact two-column layout ---
    const bottomRow = sepRow + 1;

    // Left block: Oracle TV (4 rows) + [I] Intel + key hints
    this.drawOracleTV(grid, startCol, bottomRow, tick);
    // [I] Intel is drawn by drawOracleTV at row + TV_ICON.length
    // Key hints below that
    const hintRow = bottomRow + TV_ICON.length + 1;
    this.drawLabel(grid, startCol, hintRow, "[W] Weather", LABEL_DIM);
    this.drawLabel(grid, startCol, hintRow + 1, "[A] Auto/Manual", LABEL_DIM);
    this.drawLabel(grid, startCol, hintRow + 2, "[←][→] Tokens", LABEL_DIM);
    this.drawLabel(grid, startCol, hintRow + 3, "[ESC] Close", LABEL_DIM);

    // Right block: Trend history columns — packed right after TV/hints column
    // TV icon is 12 wide + 2 gap = 14, so trend starts at startCol + 14
    const trendStartCol = startCol + 14;
    const colWidth = 10;

    if (state.trendHistory.length > 0) {
      const trend = state.trendHistory.slice(-4); // last 4 snapshots max
      const now = Date.now();

      // Only render columns that have actual data — no empty "---" placeholders
      for (let s = 0; s < trend.length; s++) {
        const col = trendStartCol + s * colWidth;
        if (col + colWidth > state.cols) break; // don't overflow screen
        const snap = trend[s];
        const isCurrent = s === trend.length - 1;
        const color = isCurrent ? TREND_CURRENT : TREND_DIM;

        const ago = isCurrent ? "Now" : timeAgo(now - snap.timestamp);
        this.drawLabel(grid, col, bottomRow, ago.padEnd(colWidth), color);
        this.drawLabel(grid, col, bottomRow + 1, weatherAbbrev(snap.weatherType).padEnd(colWidth), color);
        const ratioStr = `${snap.buyRatio}%`;
        this.drawLabel(grid, col, bottomRow + 2, ratioStr.padEnd(colWidth), sentimentColor(snap.buyRatio));
        this.drawLabel(grid, col, bottomRow + 3, formatVol(snap.volume5m).padEnd(colWidth), color);
      }
    }
  }

  private drawOracleTV(grid: Grid, col: number, row: number, tick: number) {
    // Flash the "?" inside the TV every ~1.5 seconds
    const flashOn = Math.floor(tick / 22) % 3 !== 0;
    const tvColor = flashOn ? ORACLE_FLASH : ORACLE_TV_COLOR;

    for (let r = 0; r < TV_ICON.length; r++) {
      const line = TV_ICON[r];
      for (let i = 0; i < line.length; i++) {
        if (line[i] !== " ") {
          grid.set(col + i, row + r, line[i], ORACLE_TV_COLOR);
        }
      }
    }

    // Flash the center text on the screen
    if (flashOn) {
      this.drawLabel(grid, col + 2, row + 1, " TRENCH ", tvColor);
      this.drawLabel(grid, col + 2, row + 2, "  NEWS  ", tvColor);
    }

    // [I] Intel hint below
    this.drawLabel(grid, col, row + TV_ICON.length, "[I] Intel", LABEL_DIM);
  }

  private drawNoDataPanel(grid: Grid, state: SceneState, col: number, row: number, tick?: number) {
    const icon = getWeatherIcon(state.weather);
    for (let r = 0; r < icon.length; r++) {
      const line = icon[r];
      for (let i = 0; i < line.length; i++) {
        if (line[i] !== " ") {
          grid.set(col + i, row + r, line[i], PANEL_TEXT);
        }
      }
    }

    const iconWidth = Math.max(...icon.map((l) => l.length));
    const metricsCol = col + iconWidth + 2;
    const modeTag = state.weatherMode === "MANUAL" ? " [MANUAL]" : " [AUTO]";
    this.drawLabel(grid, metricsCol, row, "Trenches: " + weatherAbbrev(state.weather) + modeTag, VALUE_BRIGHT);
    this.drawLabel(grid, metricsCol, row + 1, "[W] cycle weather", LABEL_DIM);
    this.drawLabel(grid, metricsCol, row + 2, "[A] toggle auto/manual", LABEL_DIM);
    this.drawLabel(grid, metricsCol, row + 3, "[D] toggle data", LABEL_DIM);
    this.drawLabel(grid, metricsCol, row + 4, "[←][→] Select token  [ESC] Close", LABEL_DIM);

    // Oracle TV below
    this.drawOracleTV(grid, col, row + icon.length + 2, tick ?? 0);
  }

  private drawLabel(grid: Grid, col: number, row: number, text: string, color: string) {
    for (let i = 0; i < text.length; i++) {
      if (col + i < grid.cols) {
        grid.set(col + i, row, text[i], color);
      }
    }
  }
}
