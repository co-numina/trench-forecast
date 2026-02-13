import type { Layer, SceneState } from "../renderer/scene";
import type { Grid } from "../renderer/grid";

const TITLE_COLOR = "#71717a";
const SYMBOL_COLOR = "#e4e4e7";
const GREEN = "#4ade80";
const RED = "#f87171";
const VOL_COLOR = "#a1a1aa";
const LABEL_DIM = "#71717a";
const VALUE_BRIGHT = "#e4e4e7";

const PANEL_WIDTH = 32;

function formatVol(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function formatPrice(v: number): string {
  if (v >= 10_000) return `$${Math.round(v).toLocaleString()}`;
  if (v >= 1) return `$${v.toFixed(2)}`;
  return `$${v.toFixed(4)}`;
}

export class HotTokensPanelLayer implements Layer {
  draw(grid: Grid, state: SceneState, _tick: number) {
    // Hide on narrow screens
    if (state.cols < 140) return;

    const tokens = state.trenchState?.hotTokens;
    if (!tokens || tokens.length === 0) return;

    const startCol = state.cols - PANEL_WIDTH - 2;
    const startRow = 2;

    // Title
    const title = "\u2500\u2500 HOT TOKENS \u2500\u2500";
    this.drawText(grid, startCol + Math.floor((PANEL_WIDTH - title.length) / 2), startRow, title, TITLE_COLOR);

    // Token rows
    const maxTokens = Math.min(tokens.length, 10);
    for (let i = 0; i < maxTokens; i++) {
      const t = tokens[i];
      const row = startRow + 1 + i;
      const isPositive = t.pctChange1h >= 0;
      const pctColor = isPositive ? GREEN : RED;

      // $SYMBOL — left aligned, max 10 chars
      const sym = `$${t.symbol}`.slice(0, 10);
      this.drawText(grid, startCol, row, sym, SYMBOL_COLOR);

      // ±XX% — right of symbol
      const pctStr = `${isPositive ? "+" : ""}${t.pctChange1h.toFixed(0)}%`;
      this.drawText(grid, startCol + 11, row, pctStr.padStart(6), pctColor);

      // $XXK vol — volume
      const volStr = `${formatVol(t.volume1h)} vol`;
      this.drawText(grid, startCol + 18, row, volStr, VOL_COLOR);

      // ▲ or ▼
      const arrow = isPositive ? "\u25B2" : "\u25BC";
      this.drawText(grid, startCol + PANEL_WIDTH - 2, row, arrow, pctColor);
    }

    // --- BTC / SOL / Bond grad below hot tokens with spacing ---
    const prices = state.trenchState?.prices;
    let priceRow = startRow + 1 + maxTokens + 1; // 1 blank row after tokens

    if (prices && (prices.btcUsd > 0 || prices.solUsd > 0)) {
      // BTC
      const btcStr = `BTC ${formatPrice(prices.btcUsd)}`;
      const btcPct = prices.btcChange24h >= 0
        ? `+${prices.btcChange24h.toFixed(1)}%`
        : `${prices.btcChange24h.toFixed(1)}%`;
      const btcColor = prices.btcChange24h >= 0 ? GREEN : RED;
      this.drawText(grid, startCol, priceRow, btcStr, VALUE_BRIGHT);
      this.drawText(grid, startCol + btcStr.length + 1, priceRow, btcPct, btcColor);
      priceRow++;

      // SOL
      const solStr = `SOL ${formatPrice(prices.solUsd)}`;
      const solPct = prices.solChange24h >= 0
        ? `+${prices.solChange24h.toFixed(1)}%`
        : `${prices.solChange24h.toFixed(1)}%`;
      const solColor = prices.solChange24h >= 0 ? GREEN : RED;
      this.drawText(grid, startCol, priceRow, solStr, VALUE_BRIGHT);
      this.drawText(grid, startCol + solStr.length + 1, priceRow, solPct, solColor);
      priceRow++;

      // Bond grad
      this.drawText(grid, startCol, priceRow, "Bond grad: ~$33.8K", LABEL_DIM);
      priceRow++;
    }
  }

  private drawText(grid: Grid, col: number, row: number, text: string, color: string) {
    for (let i = 0; i < text.length; i++) {
      if (col + i >= 0 && col + i < grid.cols) {
        grid.set(col + i, row, text[i], color);
      }
    }
  }
}
