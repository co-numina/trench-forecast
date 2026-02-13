import type { Layer, SceneState } from "../renderer/scene";
import type { Grid } from "../renderer/grid";

const BORDER_COLOR = "#52525b";
const TITLE_COLOR = "#e4e4e7";
const BODY_COLOR = "#a1a1aa";
const HIGHLIGHT = "#fbbf24";
const LINK_COLOR = "#60a5fa";
const KEY_COLOR = "#4ade80";
const BG_COLOR = "#0a0a0a";
const HINT_COLOR = "#71717a";

const PANEL_WIDTH = 55;
const CONTENT_WIDTH = PANEL_WIDTH - 4;

// Static docs content
const DOCS_LINES: { text: string; color: string }[] = [
  { text: "TRENCH FORECAST", color: HIGHLIGHT },
  { text: "", color: BODY_COLOR },
  { text: "Real-time ASCII visualization of the Solana", color: BODY_COLOR },
  { text: "memecoin trenches. Market data from Pump.fun", color: BODY_COLOR },
  { text: "and DexScreener rendered as a living townscape.", color: BODY_COLOR },
  { text: "", color: BODY_COLOR },
  { text: "HOW IT WORKS", color: HIGHLIGHT },
  { text: "", color: BODY_COLOR },
  { text: "Buildings = top tokens by 1h volume.", color: BODY_COLOR },
  { text: "Height = market cap. Lit windows = buy ratio.", color: BODY_COLOR },
  { text: "Weather = overall market sentiment:", color: BODY_COLOR },
  { text: "  CLEAR >65% buys, RAIN <35%, SNOW = low vol", color: BODY_COLOR },
  { text: "", color: BODY_COLOR },
  { text: "CONTROLS", color: HIGHLIGHT },
  { text: "", color: BODY_COLOR },
  { text: "[W] Cycle weather     [A] Auto/Manual", color: KEY_COLOR },
  { text: "[←][→] Select token   [ESC] Close", color: KEY_COLOR },
  { text: "[I] Oracle Intel       [?] This panel", color: KEY_COLOR },
  { text: "", color: BODY_COLOR },
  { text: "DATA", color: HIGHLIGHT },
  { text: "", color: BODY_COLOR },
  { text: "Tokens filtered: >$10K mcap, >$1K 1h vol.", color: BODY_COLOR },
  { text: "Poll interval: 30s. Trend snapshots: 15min.", color: BODY_COLOR },
  { text: "Sparkline: 1h buy ratio history.", color: BODY_COLOR },
  { text: "", color: BODY_COLOR },
  { text: "Built by @co_numina", color: LINK_COLOR },
  { text: "x.com/co_numina", color: LINK_COLOR },
];

export class DocsOverlayLayer implements Layer {
  draw(grid: Grid, state: SceneState, _tick: number) {
    if (!state.docsVisible) return;

    const panelH = Math.min(DOCS_LINES.length + 5, state.rows - 2);
    const startCol = Math.floor((state.cols - PANEL_WIDTH) / 2);
    const startRow = Math.floor((state.rows - panelH) / 2);

    if (startCol < 0 || startRow < 0) return;

    // Fill background
    for (let r = startRow; r < startRow + panelH && r < state.rows; r++) {
      for (let c = startCol; c < startCol + PANEL_WIDTH && c < state.cols; c++) {
        grid.set(c, r, " ", BG_COLOR, BG_COLOR);
      }
    }

    // Draw border
    this.drawBorder(grid, startCol, startRow, PANEL_WIDTH, panelH);

    // Title
    const title = " TRENCH FORECAST DOCS ";
    const titleCol = startCol + Math.floor((PANEL_WIDTH - title.length) / 2);
    this.drawText(grid, titleCol, startRow, title, TITLE_COLOR, BG_COLOR);

    // Separator after title
    for (let c = startCol + 1; c < startCol + PANEL_WIDTH - 1; c++) {
      grid.set(c, startRow + 1, "\u2500", BORDER_COLOR, BG_COLOR);
    }

    // Content
    const maxLines = panelH - 5;
    for (let i = 0; i < Math.min(DOCS_LINES.length, maxLines); i++) {
      const line = DOCS_LINES[i];
      const row = startRow + 2 + i;
      if (row >= state.rows) break;
      this.drawText(grid, startCol + 2, row, line.text, line.color, BG_COLOR);
    }

    // Footer separator
    const footerSepRow = startRow + panelH - 2;
    for (let c = startCol + 1; c < startCol + PANEL_WIDTH - 1; c++) {
      grid.set(c, footerSepRow, "\u2500", BORDER_COLOR, BG_COLOR);
    }

    // Footer
    const footerRow = startRow + panelH - 1;
    this.drawText(grid, startCol + 2, footerRow, "[?] dismiss", HINT_COLOR, BG_COLOR);
    const version = "v2.0";
    this.drawText(grid, startCol + PANEL_WIDTH - version.length - 2, footerRow, version, HINT_COLOR, BG_COLOR);
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
