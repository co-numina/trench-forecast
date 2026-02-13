import type { Layer, SceneState } from "../renderer/scene";
import type { Grid } from "../renderer/grid";
import type { Runner } from "../data/types";
import {
  getBuildingForMcapRank,
  getBuildingForSlot,
  RANKED_STYLES,
  type BuildingStyle,
} from "../art/buildings";

interface BuildingInstance {
  runner: Runner;
  style: BuildingStyle;
  col: number;
  rank: number;
  /** Window flicker state: true = lit */
  windowStates: boolean[];
  /** Per-window next toggle tick */
  windowTimers: number[];
  /** Sinking offset for rugged tokens */
  sinkOffset: number;
  /** Crane rotation frame (0-2) for isNew */
  craneFrame: number;
}

const WINDOW_LIT = "#DA3"; // warm yellow
const WINDOW_DIM = "#333";
const BUILDING_FG = "#556";
const LABEL_WHITE = "#e4e4e7";
const LABEL_GREEN = "#4ade80";
const LABEL_RED = "#f87171";
const LABEL_DIM = "#a1a1aa";
const SMOKE_CHARS = [".", "~", "'", "`"];

const CRANE_FRAMES = [
  " _/|    ",
  " _/--   ",
  " _/|    ",
];

const MAX_BUILDINGS = 10;

function formatVolShort(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function formatMcap(v: number): string {
  if (v >= 1_000_000) return `MC $${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `MC $${(v / 1_000).toFixed(0)}K`;
  return `MC $${v.toFixed(0)}`;
}

export class BuildingsLayer implements Layer {
  private buildings: BuildingInstance[] = [];
  private lastRunnerKeys = "";
  private smokeParticles: { x: number; y: number; life: number; char: string }[] = [];

  private buildBuildings(runners: Runner[], cols: number, state: SceneState) {
    const sorted = [...runners]
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, MAX_BUILDINGS);

    const count = sorted.length;

    // Rank runners by mcap (highest mcap = rank 0 = tallest building)
    const mcapSorted = [...sorted].sort((a, b) => {
      const mcapA = a.mcap || a.fdv || 0;
      const mcapB = b.mcap || b.fdv || 0;
      return mcapB - mcapA;
    });
    const mcapRankMap = new Map<string, number>();
    mcapSorted.forEach((r, i) => mcapRankMap.set(r.mint, i));

    // Assign building styles based on mcap rank (taller = higher mcap)
    const gap = 1;
    let totalWidth = 0;
    const styles = sorted.map((r) => {
      const mcapRank = mcapRankMap.get(r.mint) ?? count - 1;
      return getBuildingForMcapRank(mcapRank, count, r.isNew);
    });
    for (const s of styles) totalWidth += s.width;
    totalWidth += gap * Math.max(0, sorted.length - 1);

    let startX = Math.max(1, Math.floor((cols - totalWidth) / 2));
    if (totalWidth > cols - 4) startX = 2;

    let curX = startX;
    this.buildings = sorted.map((runner, i) => {
      const style = styles[i];
      const col = curX;
      curX += style.width + gap;

      const buyRatio = runner.buys1h / Math.max(1, runner.buys1h + runner.sells1h);
      const windowStates = style.windows.map(() => Math.random() < buyRatio);
      const windowTimers = style.windows.map(() => 40 + Math.floor(Math.random() * 80));

      return {
        runner,
        style,
        rank: i,
        col: Math.max(0, Math.min(col, cols - style.width)),
        windowStates,
        windowTimers,
        sinkOffset: 0,
        craneFrame: 0,
      };
    });
  }

  getBuildings(): { col: number; width: number }[] {
    return this.buildings.map((b) => ({ col: b.col, width: b.style.width }));
  }

  draw(grid: Grid, state: SceneState, tick: number) {
    const runners = state.trenchState?.runners ?? [];
    const key = runners.map((r) => r.symbol).join(",");

    if (key !== this.lastRunnerKeys) {
      this.buildBuildings(runners, state.cols, state);
      this.lastRunnerKeys = key;
    }

    if (this.buildings.length === 0 && !state.trenchState) {
      this.drawDemoBuildings(grid, state, tick);
      return;
    }

    const streetRow = state.streetRow;

    for (const bld of this.buildings) {
      const baseY = streetRow - bld.style.height;
      const y = baseY + bld.sinkOffset;

      // Rug animation — building sinks
      if (bld.runner.isRugged) {
        if (tick % 15 === 0) bld.sinkOffset++;
        if (bld.sinkOffset > bld.style.height + 2) continue;
      }

      // Draw building art
      grid.drawArt(bld.col, y, bld.style.art, BUILDING_FG);

      // Draw windows — toggle 'o' positions
      this.drawWindows(grid, bld, y, tick, state.windowBrightness);

      // Construction crane animation for isNew
      if (bld.runner.isNew && !bld.runner.isRugged) {
        if (tick % 20 === 0) bld.craneFrame = (bld.craneFrame + 1) % 3;
        const craneLine = CRANE_FRAMES[bld.craneFrame];
        grid.drawText(bld.col, y, craneLine, "#A85");
      }

      // Chimney smoke for tokens with 1h change > +100%
      if ((bld.runner.pctChange1h ?? 0) > 100 && !bld.runner.isRugged) {
        if (state.weather === "CLEAR" || state.weather === "PARTLY_CLOUDY") {
          this.emitSmoke(bld.col + Math.floor(bld.style.width / 2), y - 1, tick);
        }
      }

      // ─── Labels ABOVE building ───
      if (!bld.runner.isRugged) {
        const symbol = `$${bld.runner.symbol}`;
        const pctVal = bld.runner.pctChange1h ?? bld.runner.pctChange5m;
        const pctStr = pctVal >= 0
          ? `+${pctVal.toFixed(1)}%`
          : `${pctVal.toFixed(1)}%`;
        const mcapStr = formatMcap(bld.runner.mcap || bld.runner.fdv || 0);

        // Line 1: $SYMBOL — 2 rows above rooftop, centered
        const labelRow1 = y - 2;
        const centerCol = bld.col + Math.floor(bld.style.width / 2);

        if (labelRow1 > 0) {
          const symCol = centerCol - Math.floor(symbol.length / 2);
          grid.drawText(symCol, labelRow1, symbol, LABEL_WHITE);
        }

        // Line 2: ±XX%  MC $XXXK — 1 row above rooftop
        const labelRow2 = y - 1;
        if (labelRow2 > 0) {
          const pctColor = pctVal >= 0 ? LABEL_GREEN : LABEL_RED;
          const line2 = `${pctStr}  ${mcapStr}`;
          const line2Col = centerCol - Math.floor(line2.length / 2);
          // Draw pct in color
          grid.drawText(line2Col, labelRow2, pctStr, pctColor);
          // Draw mcap in dim
          grid.drawText(line2Col + pctStr.length + 2, labelRow2, mcapStr, LABEL_DIM);
        }
      }

      // ─── Blinking antenna light on rank 0 building ───
      if (bld.rank === 0 && !bld.runner.isRugged) {
        const antennaCol = bld.col + Math.floor(bld.style.width / 2);
        const antennaRow = y;
        const blinkOn = Math.floor(tick / 60) % 2 === 0;
        if (blinkOn && antennaRow >= 0) {
          grid.set(antennaCol, antennaRow, "*", "#ef4444");
        }
      }
    }

    // Draw and update smoke particles
    this.updateSmoke(grid, tick);
  }

  private drawWindows(grid: Grid, bld: BuildingInstance, artY: number, tick: number, brightness: number) {
    for (let i = 0; i < bld.style.windows.length; i++) {
      // Toggle windows on timer (window flicker effect)
      bld.windowTimers[i]--;
      if (bld.windowTimers[i] <= 0) {
        bld.windowStates[i] = !bld.windowStates[i];
        bld.windowTimers[i] = 90 + Math.floor(Math.random() * 150);
      }

      const [wCol, wRow] = bld.style.windows[i];
      const screenCol = bld.col + wCol;
      const screenRow = artY + wRow;

      if (bld.runner.isRugged) {
        grid.set(screenCol, screenRow, ".", "#111");
        continue;
      }

      const isLit = bld.windowStates[i] && Math.random() < brightness;
      const color = isLit ? WINDOW_LIT : WINDOW_DIM;
      grid.set(screenCol, screenRow, isLit ? "#" : ".", color);
    }
  }

  private emitSmoke(x: number, y: number, tick: number) {
    if (tick % 8 === 0) {
      this.smokeParticles.push({
        x: x + (Math.random() - 0.5) * 2,
        y,
        life: 20 + Math.floor(Math.random() * 15),
        char: SMOKE_CHARS[Math.floor(Math.random() * SMOKE_CHARS.length)],
      });
    }
  }

  private updateSmoke(grid: Grid, tick: number) {
    for (const p of this.smokeParticles) {
      p.y -= 0.15;
      p.x += (Math.random() - 0.5) * 0.3;
      p.life--;

      const col = Math.floor(p.x);
      const row = Math.floor(p.y);
      if (row > 0 && row < grid.rows && col > 0 && col < grid.cols && p.life > 0) {
        const alpha = Math.min(1, p.life / 10);
        const shade = Math.floor(0x33 + alpha * 0x22).toString(16);
        grid.set(col, row, p.char, `#${shade}${shade}${shade}`);
      }
    }
    this.smokeParticles = this.smokeParticles.filter((p) => p.life > 0);
  }

  /** Demo buildings when no data is connected */
  private drawDemoBuildings(grid: Grid, state: SceneState, tick: number) {
    const streetRow = state.streetRow;
    const gap = 1;

    let totalWidth = 0;
    for (const s of RANKED_STYLES) totalWidth += s.width;
    totalWidth += gap * (RANKED_STYLES.length - 1);

    let curX = Math.max(1, Math.floor((state.cols - totalWidth) / 2));

    for (let i = 0; i < RANKED_STYLES.length; i++) {
      const style = RANKED_STYLES[i];
      const y = streetRow - style.height;

      grid.drawArt(curX, y, style.art, BUILDING_FG);

      for (const [wCol, wRow] of style.windows) {
        const screenCol = curX + wCol;
        const screenRow = y + wRow;
        const hash = (screenCol * 31 + screenRow * 17 + tick) % 60;
        const isLit = hash < 35;
        const color = isLit ? WINDOW_LIT : WINDOW_DIM;
        grid.set(screenCol, screenRow, isLit ? "#" : ".", color);
      }

      curX += style.width + gap;
    }
  }
}
