import type { Layer, SceneState } from "../renderer/scene";
import type { Grid } from "../renderer/grid";

// ============================================================
// Plane ASCII art (6 rows tall)
// ============================================================

const PLANE: string[] = [
  "       __        ",
  "    \\  \\     _ _ ",
  "     \\**\\ ___\\/ \\",
  "   X*#####*+^^\\_ \\",
  "     o/\\  \\      ",
  "        \\__\\     ",
];

const PLANE_WIDTH = Math.max(...PLANE.map((l) => l.length));
const BANNER_ROW = 3; // row within PLANE where banner attaches

// ============================================================
// Banner content
// ============================================================

const FORECAST_CA = "XXXX...pump"; // replace with real CA when available
const BANNER_TEXT = `---[ TRENCH FORECAST  $FORECAST  CA: ${FORECAST_CA} ]---`;

// Pre-compute color regions for banner text
interface ColorRegion {
  start: number;
  end: number;
  color: string;
}

function computeBannerColors(): ColorRegion[] {
  const regions: ColorRegion[] = [];
  const titleIdx = BANNER_TEXT.indexOf("TRENCH FORECAST");
  if (titleIdx >= 0) {
    regions.push({ start: titleIdx, end: titleIdx + 15, color: "#e4e4e7" });
  }
  const tickerIdx = BANNER_TEXT.indexOf("$FORECAST");
  if (tickerIdx >= 0) {
    regions.push({ start: tickerIdx, end: tickerIdx + 9, color: "#4ade80" });
  }
  const caIdx = BANNER_TEXT.indexOf("CA:");
  if (caIdx >= 0) {
    regions.push({ start: caIdx, end: caIdx + 3, color: "#71717a" });
    regions.push({ start: caIdx + 3, end: BANNER_TEXT.length, color: "#52525b" });
  }
  return regions;
}

const BANNER_COLORS = computeBannerColors();

function getBannerCharColor(i: number): string {
  for (const region of BANNER_COLORS) {
    if (i >= region.start && i < region.end) return region.color;
  }
  return "#52525b"; // default: dim for brackets, rope, etc.
}

// ============================================================
// Plane colors
// ============================================================

const PLANE_BODY = "#71717a";
const PLANE_ACCENT = "#52525b";

function getPlaneCharColor(ch: string): string {
  if (ch === "X" || ch === "*" || ch === "#" || ch === "+" || ch === "^") return PLANE_BODY;
  if (ch === "\\" || ch === "/" || ch === "_" || ch === "o") return PLANE_ACCENT;
  return PLANE_BODY;
}

// ============================================================
// Layer
// ============================================================

export class BannerPlaneLayer implements Layer {
  // x tracks the LEFT edge of the whole unit (banner leads, plane trails)
  // Layout: [BANNER_TEXT]---[PLANE]  moving left-to-right
  // So the banner is at x, and the plane is at x + BANNER_TEXT.length
  private x = -BANNER_TEXT.length - PLANE_WIDTH - 10;
  private y = 5; // upper sky area
  private speed = 0.07; // chars per tick (~2 chars/sec at 30fps)
  private pauseTimer = 0;
  private initialized = false;

  draw(grid: Grid, state: SceneState, tick: number) {
    // Ground plane in heavy weather
    const grounded =
      state.weather === "THUNDERSTORM" ||
      state.weather === "SNOW" ||
      state.weather === "RAIN";

    if (grounded) return;

    // Hide in overcast too
    if (state.weather === "OVERCAST") return;

    if (!this.initialized) {
      this.x = -BANNER_TEXT.length - PLANE_WIDTH - 10;
      this.initialized = true;
    }

    // Pause off-screen before re-entering
    if (this.pauseTimer > 0) {
      this.pauseTimer--;
      return;
    }

    // Advance position
    this.x += this.speed;

    // Determine sky clipping — don't render below building tops
    const maxRow = state.streetRow - 2;

    // Weather dimming for partly cloudy
    const dim = state.weather === "PARTLY_CLOUDY";

    const baseX = Math.floor(this.x);

    // Plane is at the RIGHT (leading). It's at baseX + BANNER_TEXT.length
    const planeX = baseX + BANNER_TEXT.length;
    for (let row = 0; row < PLANE.length; row++) {
      const drawY = this.y + row;
      if (drawY < 0 || drawY >= maxRow) continue;

      const line = PLANE[row];
      for (let col = 0; col < line.length; col++) {
        const ch = line[col];
        if (ch === " ") continue;
        const drawX = planeX + col;
        if (drawX < 0 || drawX >= state.cols) continue;

        let color = getPlaneCharColor(ch);
        if (dim) color = dimColor(color, 0.7);
        grid.set(drawX, drawY, ch, color);
      }
    }

    // Banner trails BEHIND the plane (to the left), flat — no billow
    const bannerY = this.y + BANNER_ROW;
    for (let i = 0; i < BANNER_TEXT.length; i++) {
      const ch = BANNER_TEXT[i];
      if (ch === " ") continue;

      const drawX = baseX + i;
      if (drawX < 0 || drawX >= state.cols) continue;
      if (bannerY < 0 || bannerY >= maxRow) continue;

      let color = getBannerCharColor(i);
      if (dim) color = dimColor(color, 0.7);
      grid.set(drawX, bannerY, ch, color);
    }

    // Wrap when the plane (rightmost element) is fully off-screen
    const totalWidth = BANNER_TEXT.length + PLANE_WIDTH;
    if (baseX > state.cols + 10) {
      this.x = -totalWidth - 20;
      this.pauseTimer = 150 + Math.floor(Math.random() * 150); // 5-10 sec at 30fps
    }
  }
}

/** Dim a hex color by a multiplier (0-1) */
function dimColor(hex: string, mult: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const dr = Math.floor(r * mult);
  const dg = Math.floor(g * mult);
  const db = Math.floor(b * mult);
  return `#${dr.toString(16).padStart(2, "0")}${dg.toString(16).padStart(2, "0")}${db.toString(16).padStart(2, "0")}`;
}
