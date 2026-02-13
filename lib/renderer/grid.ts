export interface Cell {
  char: string;
  fg: string;
  bg?: string;
  bold?: boolean;
}

const DEFAULT_FG = "#888";

function makeCell(char = " ", fg = DEFAULT_FG, bg?: string, bold?: boolean): Cell {
  return { char, fg, bg, bold };
}

export class Grid {
  cells: Cell[][];
  cols: number;
  rows: number;

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.cells = [];
    this.clear();
  }

  clear() {
    this.cells = [];
    for (let r = 0; r < this.rows; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < this.cols; c++) {
        row.push(makeCell());
      }
      this.cells.push(row);
    }
  }

  inBounds(col: number, row: number): boolean {
    return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
  }

  set(col: number, row: number, char: string, fg: string, bg?: string, bold?: boolean) {
    if (!this.inBounds(col, row)) return;
    const cell = this.cells[row][col];
    cell.char = char;
    cell.fg = fg;
    if (bg !== undefined) cell.bg = bg;
    if (bold !== undefined) cell.bold = bold;
  }

  get(col: number, row: number): Cell | null {
    if (!this.inBounds(col, row)) return null;
    return this.cells[row][col];
  }

  drawText(col: number, row: number, text: string, fg: string, bg?: string) {
    for (let i = 0; i < text.length; i++) {
      this.set(col + i, row, text[i], fg, bg);
    }
  }

  drawArt(
    col: number,
    row: number,
    lines: string[],
    fg: string,
    charColorMap?: Map<string, string>
  ) {
    for (let r = 0; r < lines.length; r++) {
      const line = lines[r];
      for (let c = 0; c < line.length; c++) {
        const ch = line[c];
        if (ch === " ") continue;
        const color = charColorMap?.get(ch) ?? fg;
        this.set(col + c, row + r, ch, color);
      }
    }
  }

  resize(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.clear();
  }
}
