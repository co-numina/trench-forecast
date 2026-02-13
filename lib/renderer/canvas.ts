import { Grid } from "./grid";

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private fontFamily: string;
  private fontSize: number;
  charW: number = 0;
  charH: number = 0;

  constructor(canvas: HTMLCanvasElement, fontFamily: string, fontSize: number) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.fontFamily = fontFamily;
    this.fontSize = fontSize;
    this.measure();
  }

  private get font(): string {
    return `${this.fontSize}px '${this.fontFamily}', monospace`;
  }

  setFontSize(size: number) {
    this.fontSize = size;
    this.measure();
  }

  measure() {
    this.ctx.font = this.font;
    const m = this.ctx.measureText("M");
    this.charW = m.width;
    // Line height: use font metrics if available, else estimate
    this.charH = Math.ceil(this.fontSize * 1.35);
  }

  calcGridSize(): { cols: number; rows: number } {
    const cols = Math.floor(this.canvas.width / this.charW);
    const rows = Math.floor(this.canvas.height / this.charH);
    return { cols: Math.max(cols, 60), rows: Math.max(rows, 20) };
  }

  resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + "px";
    this.canvas.style.height = window.innerHeight + "px";
    this.ctx.scale(dpr, dpr);
    this.measure();
  }

  render(grid: Grid) {
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);

    // Black background
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);

    ctx.font = this.font;
    ctx.textBaseline = "top";

    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const cell = grid.cells[row][col];
        if (cell.char === " " && !cell.bg) continue;

        const x = col * this.charW;
        const y = row * this.charH;

        if (cell.bg) {
          ctx.fillStyle = cell.bg;
          ctx.fillRect(x, y, this.charW, this.charH);
        }

        if (cell.char !== " ") {
          if (cell.bold) {
            ctx.font = `bold ${this.font}`;
          }
          ctx.fillStyle = cell.fg;
          ctx.fillText(cell.char, x, y);
          if (cell.bold) {
            ctx.font = this.font;
          }
        }
      }
    }
  }
}
