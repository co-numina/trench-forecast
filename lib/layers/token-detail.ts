import type { Layer, SceneState } from "../renderer/scene";
import type { Grid } from "../renderer/grid";
import type { Runner } from "../data/types";

const BORDER_COLOR = "#52525b";
const TITLE_COLOR = "#e4e4e7";
const LABEL_DIM = "#71717a";
const VALUE_BRIGHT = "#e4e4e7";
const GREEN = "#4ade80";
const RED = "#f87171";
const BG_COLOR = "#0a0a0a";
const HIGHLIGHT_COLOR = "#fbbf24";

const DETAIL_WIDTH = 27;
const DETAIL_HEIGHT = 10;

function formatVal(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

export class TokenDetailLayer implements Layer {
  draw(grid: Grid, state: SceneState, tick: number) {
    const selectedIdx = state.selectedBuilding;
    if (selectedIdx == null || selectedIdx < 0) return;

    const runners = state.trenchState?.runners;
    if (!runners || runners.length === 0) return;

    // Sort runners by volume (same order as buildings layer)
    const sorted = [...runners]
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, 10);

    if (selectedIdx >= sorted.length) return;

    const runner = sorted[selectedIdx];

    // Find building position for selected building
    // We need to estimate where this building is on screen
    const buildingCol = state.buildingPositions?.[selectedIdx];
    if (!buildingCol) return;

    const { col: bldCol, width: bldWidth } = buildingCol;

    // Position detail panel above the building
    const panelCol = Math.max(1, Math.min(
      bldCol + Math.floor(bldWidth / 2) - Math.floor(DETAIL_WIDTH / 2),
      state.cols - DETAIL_WIDTH - 1
    ));
    const panelRow = Math.max(1, state.streetRow - 30); // Well above buildings

    // Draw highlight bar on the building (column markers)
    const highlightRow = state.streetRow - 1;
    for (let c = bldCol; c < bldCol + bldWidth && c < state.cols; c++) {
      grid.set(c, highlightRow, "\u2580", HIGHLIGHT_COLOR); // ▀
    }

    // Draw detail panel background
    for (let r = panelRow; r < panelRow + DETAIL_HEIGHT && r < state.rows; r++) {
      for (let c = panelCol; c < panelCol + DETAIL_WIDTH && c < state.cols; c++) {
        grid.set(c, r, " ", BG_COLOR, BG_COLOR);
      }
    }

    // Border
    this.drawBorder(grid, panelCol, panelRow, DETAIL_WIDTH, DETAIL_HEIGHT);

    // Title: $SYMBOL
    const title = ` $${runner.symbol} `;
    this.drawText(grid, panelCol + 1, panelRow, title, TITLE_COLOR, BG_COLOR);

    // Details
    let row = panelRow + 1;
    const lCol = panelCol + 2;
    const vCol = panelCol + 12;

    // MC
    this.drawText(grid, lCol, row, "MC:", LABEL_DIM, BG_COLOR);
    this.drawText(grid, vCol, row, formatVal(runner.mcap || runner.fdv || 0), VALUE_BRIGHT, BG_COLOR);
    row++;

    // Vol 1h
    this.drawText(grid, lCol, row, "Vol 1h:", LABEL_DIM, BG_COLOR);
    this.drawText(grid, vCol, row, formatVal(runner.volume1h || 0), VALUE_BRIGHT, BG_COLOR);
    row++;

    // Vol 5m
    this.drawText(grid, lCol, row, "Vol 5m:", LABEL_DIM, BG_COLOR);
    this.drawText(grid, vCol, row, formatVal(runner.volume5m || 0), VALUE_BRIGHT, BG_COLOR);
    row++;

    // Buys / Sells
    this.drawText(grid, lCol, row, "B/S:", LABEL_DIM, BG_COLOR);
    const bsStr = `${runner.buys1h}/${runner.sells1h}`;
    this.drawText(grid, vCol, row, bsStr, VALUE_BRIGHT, BG_COLOR);
    row++;

    // Age
    this.drawText(grid, lCol, row, "Age:", LABEL_DIM, BG_COLOR);
    this.drawText(grid, vCol, row, runner.age || "—", VALUE_BRIGHT, BG_COLOR);
    row++;

    // 1h change
    this.drawText(grid, lCol, row, "1h:", LABEL_DIM, BG_COLOR);
    const pct1h = runner.pctChange1h ?? runner.pctChange5m;
    const pctStr = `${pct1h >= 0 ? "+" : ""}${pct1h.toFixed(1)}%`;
    this.drawText(grid, vCol, row, pctStr, pct1h >= 0 ? GREEN : RED, BG_COLOR);
    row++;

    // Graduated?
    this.drawText(grid, lCol, row, "Grad:", LABEL_DIM, BG_COLOR);
    this.drawText(grid, vCol, row, runner.isGraduated ? "Yes" : "No", runner.isGraduated ? GREEN : LABEL_DIM, BG_COLOR);
    row++;

    // Footer hint
    this.drawText(grid, panelCol + 1, panelRow + DETAIL_HEIGHT - 1, " [\u2190][\u2192] nav [ESC] close ", LABEL_DIM, BG_COLOR);
  }

  private drawBorder(grid: Grid, col: number, row: number, w: number, h: number) {
    grid.set(col, row, "\u2554", BORDER_COLOR, BG_COLOR);
    grid.set(col + w - 1, row, "\u2557", BORDER_COLOR, BG_COLOR);
    grid.set(col, row + h - 1, "\u255A", BORDER_COLOR, BG_COLOR);
    grid.set(col + w - 1, row + h - 1, "\u255D", BORDER_COLOR, BG_COLOR);

    for (let c = col + 1; c < col + w - 1; c++) {
      grid.set(c, row, "\u2550", BORDER_COLOR, BG_COLOR);
      grid.set(c, row + h - 1, "\u2550", BORDER_COLOR, BG_COLOR);
    }
    for (let r = row + 1; r < row + h - 1; r++) {
      grid.set(col, r, "\u2551", BORDER_COLOR, BG_COLOR);
      grid.set(col + w - 1, r, "\u2551", BORDER_COLOR, BG_COLOR);
    }
  }

  private drawText(grid: Grid, col: number, row: number, text: string, fg: string, bg?: string) {
    for (let i = 0; i < text.length; i++) {
      if (col + i >= 0 && col + i < grid.cols) {
        grid.set(col + i, row, text[i], fg, bg);
      }
    }
  }
}
