import type { Layer, SceneState } from "../renderer/scene";
import type { Grid } from "../renderer/grid";

const BORDER_COLOR = "#52525b";
const TITLE_COLOR = "#e4e4e7";
const BODY_COLOR = "#a1a1aa";
const TOKEN_COLOR = "#e4e4e7";
const GREEN = "#4ade80";
const RED = "#f87171";
const BG_COLOR = "#0a0a0a";
const HINT_COLOR = "#71717a";
const LOADING_COLOR = "#fbbf24";

const PANEL_WIDTH = 55;
const CONTENT_WIDTH = PANEL_WIDTH - 4; // 2 chars padding each side

/** Word-wrap text to a given width */
function wordWrap(text: string, width: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split("\n");

  for (const para of paragraphs) {
    if (para.trim() === "") {
      lines.push("");
      continue;
    }
    const words = para.split(/\s+/);
    let currentLine = "";
    for (const word of words) {
      if (currentLine.length + word.length + 1 > width) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = currentLine ? currentLine + " " + word : word;
      }
    }
    if (currentLine) lines.push(currentLine);
  }
  return lines;
}

export class OracleOverlayLayer implements Layer {
  draw(grid: Grid, state: SceneState, tick: number) {
    if (!state.oracleState || !state.oracleState.visible) return;

    const { loading, reading } = state.oracleState;

    // Panel dimensions
    const panelH = loading ? 7 : Math.min(22, this.calcPanelHeight(reading || ""));
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
    const title = " TRENCH ORACLE ";
    const titleCol = startCol + Math.floor((PANEL_WIDTH - title.length) / 2);
    this.drawText(grid, titleCol, startRow, title, TITLE_COLOR, BG_COLOR);

    // Separator after title
    for (let c = startCol + 1; c < startCol + PANEL_WIDTH - 1; c++) {
      grid.set(c, startRow + 1, "\u2500", BORDER_COLOR, BG_COLOR);
    }

    if (loading) {
      // Loading animation
      const dots = ".".repeat((Math.floor(tick / 15) % 3) + 1);
      const loadText = `Oracle is reading the trenches${dots}`;
      const loadCol = startCol + Math.floor((PANEL_WIDTH - loadText.length) / 2);
      this.drawText(grid, loadCol, startRow + 3, loadText, LOADING_COLOR, BG_COLOR);
    } else if (reading) {
      // Draw reading text with word wrap
      const wrapped = wordWrap(reading, CONTENT_WIDTH);
      const maxLines = panelH - 5; // title + sep + padding + footer + sep

      for (let i = 0; i < Math.min(wrapped.length, maxLines); i++) {
        const line = wrapped[i];
        const row = startRow + 2 + i;
        if (row >= state.rows) break;

        // Color token symbols differently
        this.drawColoredLine(grid, startCol + 2, row, line);
      }

      // Footer separator
      const footerSepRow = startRow + panelH - 2;
      for (let c = startCol + 1; c < startCol + PANEL_WIDTH - 1; c++) {
        grid.set(c, footerSepRow, "\u2500", BORDER_COLOR, BG_COLOR);
      }

      // Footer hints
      const footerRow = startRow + panelH - 1;
      this.drawText(grid, startCol + 2, footerRow, "[I] dismiss", HINT_COLOR, BG_COLOR);

      // Right-align market summary
      const market = state.trenchState?.market;
      if (market) {
        const summary = `${market.buyRatio}% buys ${this.weatherShort(state.weather)}`;
        this.drawText(grid, startCol + PANEL_WIDTH - summary.length - 2, footerRow, summary, HINT_COLOR, BG_COLOR);
      }
    }
  }

  private calcPanelHeight(reading: string): number {
    const wrapped = wordWrap(reading, CONTENT_WIDTH);
    // title(1) + sep(1) + content + padding(1) + sep(1) + footer(1)
    return Math.max(7, wrapped.length + 5);
  }

  private drawBorder(grid: Grid, col: number, row: number, w: number, h: number) {
    // Corners
    grid.set(col, row, "\u2554", BORDER_COLOR, BG_COLOR);              // ╔
    grid.set(col + w - 1, row, "\u2557", BORDER_COLOR, BG_COLOR);      // ╗
    grid.set(col, row + h - 1, "\u255A", BORDER_COLOR, BG_COLOR);      // ╚
    grid.set(col + w - 1, row + h - 1, "\u255D", BORDER_COLOR, BG_COLOR); // ╝

    // Top and bottom borders
    for (let c = col + 1; c < col + w - 1; c++) {
      grid.set(c, row, "\u2550", BORDER_COLOR, BG_COLOR);              // ═
      grid.set(c, row + h - 1, "\u2550", BORDER_COLOR, BG_COLOR);
    }

    // Side borders
    for (let r = row + 1; r < row + h - 1; r++) {
      grid.set(col, r, "\u2551", BORDER_COLOR, BG_COLOR);              // ║
      grid.set(col + w - 1, r, "\u2551", BORDER_COLOR, BG_COLOR);
    }
  }

  /** Draw a line with $TOKEN highlighted in bright white, +XX% in green, -XX% in red */
  private drawColoredLine(grid: Grid, startCol: number, row: number, text: string) {
    let col = startCol;
    let i = 0;

    while (i < text.length) {
      // Detect $TOKEN patterns
      if (text[i] === "$" && i + 1 < text.length && /[A-Za-z]/.test(text[i + 1])) {
        let end = i + 1;
        while (end < text.length && /[A-Za-z0-9_]/.test(text[end])) end++;
        const token = text.slice(i, end);
        this.drawText(grid, col, row, token, TOKEN_COLOR, BG_COLOR);
        col += token.length;
        i = end;
        continue;
      }

      // Detect +XX% or -XX% patterns
      if ((text[i] === "+" || text[i] === "-") && i + 1 < text.length && /[0-9]/.test(text[i + 1])) {
        let end = i + 1;
        while (end < text.length && /[0-9.]/.test(text[end])) end++;
        if (end < text.length && text[end] === "%") end++;
        const numStr = text.slice(i, end);
        const color = text[i] === "+" ? GREEN : RED;
        this.drawText(grid, col, row, numStr, color, BG_COLOR);
        col += numStr.length;
        i = end;
        continue;
      }

      grid.set(col, row, text[i], BODY_COLOR, BG_COLOR);
      col++;
      i++;
    }
  }

  private drawText(grid: Grid, col: number, row: number, text: string, fg: string, bg?: string) {
    for (let i = 0; i < text.length; i++) {
      if (col + i >= 0 && col + i < grid.cols) {
        grid.set(col + i, row, text[i], fg, bg);
      }
    }
  }

  private weatherShort(w: string): string {
    switch (w) {
      case "CLEAR": return "CLR";
      case "PARTLY_CLOUDY": return "PT.CLD";
      case "OVERCAST": return "OVCST";
      case "RAIN": return "RAIN";
      case "THUNDERSTORM": return "T-STM";
      case "SNOW": return "SNOW";
      default: return w;
    }
  }
}
