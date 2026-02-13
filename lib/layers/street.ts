import type { Layer, SceneState } from "../renderer/scene";
import type { Grid } from "../renderer/grid";
import {
  TREES, TREE_WINTER, LAMPS,
  CARS_R, CARS_L,
  PERSON_FRAMES_R, PERSON_FRAMES_L,
  FURNITURE,
  getArtWidth, getArtHeight,
} from "../art/street";
import {
  getBuildingForMcapRank,
  getBuildingForSlot,
  RANKED_STYLES,
} from "../art/buildings";

const SIDEWALK_COLOR = "#555";
const ROAD_COLOR = "#333";
const CENTER_LINE_COLOR = "#664";
const GROUND_COLOR = "#2a2a2a";
const GROUND_ALT = "#222";
const TREE_COLOR = "#3a5";
const TREE_TRUNK = "#864";
const TREE_SNOW = "#AAA";
const LAMP_COLOR = "#998";
const LAMP_GLOW = "#DD8";
const LAMP_GLOW_GROUND = "#78716c";
const CAR_COLOR = "#889";
const CAR_TAIL = "#A33";
const CAR_HEAD = "#DD8";
const PERSON_COLOR = "#888";
const FURNITURE_COLOR = "#666";
const PUDDLE_COLOR = "#3a5a8a";
const SNOW_GROUND = "#AAA";
const ANIMAL_COLOR = "#776";

interface Car {
  x: number;
  variant: number;
  speed: number; // chars per move tick — varies per car
  moveTicks: number; // ticks between moves
  moveCounter: number;
}

interface Walker {
  x: number;
  direction: 1 | -1;
  frame: 0 | 1;
  ticksPerStep: number; // random walk speed
  stepCounter: number;
  pauseTimer: number; // random brief pauses
  stepsUntilPause: number;
}

// Occasional street animals
interface StreetAnimal {
  col: number;
  type: "cat" | "dog";
  spawnTick: number;
}

const CAT_ART = ["/\\_/\\", "( o.o)", " > ^ <"];
const DOG_ART = ["|-|_", "(o o)", " |_|"];

export class StreetLayer implements Layer {
  private carsRight: Car[] = [];
  private carsLeft: Car[] = [];
  private walkers: Walker[] = [];
  private streetElements: { col: number; type: string; artIdx: number }[] = [];
  private lastCols = 0;
  private lastWeather = "";
  private animal: StreetAnimal | null = null;
  private animalCheckTick = 0;

  /** Layout street elements in gaps between buildings */
  private layoutStreetElements(cols: number, state: SceneState) {
    if (cols === this.lastCols && state.weather === this.lastWeather) return;
    this.lastCols = cols;
    this.lastWeather = state.weather;

    this.streetElements = [];

    // Find building positions from demo layout or data
    const buildingPositions = this.getBuildingPositions(cols, state);

    // Find gaps between buildings
    const gaps: { start: number; end: number }[] = [];
    const sorted = [...buildingPositions].sort((a, b) => a.col - b.col);

    // Gap before first building
    if (sorted.length > 0 && sorted[0].col > 5) {
      gaps.push({ start: 2, end: sorted[0].col - 1 });
    }

    // Gaps between buildings
    for (let i = 0; i < sorted.length - 1; i++) {
      const endOfCurrent = sorted[i].col + sorted[i].width;
      const startOfNext = sorted[i + 1].col;
      if (startOfNext - endOfCurrent > 3) {
        gaps.push({ start: endOfCurrent + 1, end: startOfNext - 1 });
      }
    }

    // Gap after last building
    if (sorted.length > 0) {
      const last = sorted[sorted.length - 1];
      if (last.col + last.width < cols - 5) {
        gaps.push({ start: last.col + last.width + 1, end: cols - 3 });
      }
    }

    // If no buildings at all, distribute evenly across the full width
    if (sorted.length === 0) {
      for (let c = 5; c < cols - 5; c += 15) {
        gaps.push({ start: c, end: c + 12 });
      }
    }

    // Fill each gap with 1-3 elements
    let elemIdx = 0;
    for (const gap of gaps) {
      const gapWidth = gap.end - gap.start;
      if (gapWidth < 4) continue;

      // Always place a tree or lamp
      const treeIdx = elemIdx % TREES.length;
      const treeW = getArtWidth(state.weather === "SNOW" ? TREE_WINTER : TREES[treeIdx]);
      const treePlacement = gap.start + Math.floor((gapWidth - treeW) / 2);
      this.streetElements.push({
        col: treePlacement,
        type: state.weather === "SNOW" ? "tree_winter" : "tree",
        artIdx: treeIdx,
      });

      // If gap is wide enough, add a lamp on one side
      if (gapWidth > 10) {
        this.streetElements.push({
          col: gap.start + 1,
          type: "lamp",
          artIdx: elemIdx % LAMPS.length,
        });
      }

      // If gap is very wide, add furniture
      if (gapWidth > 16) {
        const furnIdx = elemIdx % FURNITURE.length;
        this.streetElements.push({
          col: gap.end - getArtWidth(FURNITURE[furnIdx]) - 1,
          type: "furniture",
          artIdx: furnIdx,
        });
      }

      elemIdx++;
    }
  }

  /** Estimate building positions for gap detection */
  private getBuildingPositions(cols: number, state: SceneState): { col: number; width: number }[] {
    const runners = state.trenchState?.runners ?? [];
    if (runners.length > 0) {
      const sorted = [...runners].sort((a, b) => b.volume24h - a.volume24h).slice(0, 10);
      const count = sorted.length;

      // Rank by mcap for style selection (same as buildings layer)
      const mcapSorted = [...sorted].sort((a, b) => {
        const mcapA = a.mcap || a.fdv || 0;
        const mcapB = b.mcap || b.fdv || 0;
        return mcapB - mcapA;
      });
      const mcapRankMap = new Map<string, number>();
      mcapSorted.forEach((r, i) => mcapRankMap.set(r.mint, i));

      const styles = sorted.map((r) => {
        const mcapRank = mcapRankMap.get(r.mint) ?? count - 1;
        return getBuildingForMcapRank(mcapRank, count, r.isNew);
      });

      const gap = 1;
      let totalWidth = 0;
      for (const s of styles) totalWidth += s.width;
      totalWidth += gap * Math.max(0, sorted.length - 1);
      let curX = Math.max(1, Math.floor((cols - totalWidth) / 2));
      if (totalWidth > cols - 4) curX = 2;

      return styles.map((s) => {
        const pos = { col: curX, width: s.width };
        curX += s.width + gap;
        return pos;
      });
    }

    // Demo mode — use RANKED_STYLES in order
    const gap = 1;
    let totalWidth = 0;
    for (const s of RANKED_STYLES) totalWidth += s.width;
    totalWidth += gap * (RANKED_STYLES.length - 1);
    let curX = Math.max(1, Math.floor((cols - totalWidth) / 2));

    return RANKED_STYLES.map((s) => {
      const pos = { col: curX, width: s.width };
      curX += s.width + gap;
      return pos;
    });
  }

  /** Check if a new car at position x would collide with an existing car */
  private hasCollision(x: number, lane: Car[], carWidth: number): boolean {
    for (const car of lane) {
      if (Math.abs(car.x - x) < carWidth + 5) return true;
    }
    return false;
  }

  private spawnCar(cols: number, lane: "right" | "left"): Car {
    const carWidth = 6;
    const baseSpeed = 1;
    const speedVariation = baseSpeed * (0.8 + Math.random() * 0.4);
    // Random spawn delay via position scatter
    const scatter = Math.floor(Math.random() * 40);
    return {
      x: lane === "right" ? -carWidth - scatter : cols + scatter,
      variant: Math.floor(Math.random() * 2),
      speed: speedVariation,
      moveTicks: 2 + Math.floor(Math.random() * 2), // 2-3 ticks between moves
      moveCounter: 0,
    };
  }

  private updateCars(cols: number, density: number, tick: number) {
    // Weather-aware max: CLEAR=4, OVERCAST=3, RAIN=2, THUNDER=1, SNOW=0
    const maxPerLane = Math.max(0, Math.min(4, Math.ceil(density * 4)));
    const carWidth = 6;

    // --- Spawn with random timing ---
    // Only try to spawn if below max and random chance
    if (this.carsRight.length < maxPerLane && Math.random() < 0.03) {
      const car = this.spawnCar(cols, "right");
      if (!this.hasCollision(car.x, this.carsRight, carWidth)) {
        this.carsRight.push(car);
      }
    }
    if (this.carsLeft.length < maxPerLane && Math.random() < 0.03) {
      const car = this.spawnCar(cols, "left");
      if (!this.hasCollision(car.x, this.carsLeft, carWidth)) {
        this.carsLeft.push(car);
      }
    }

    // Remove excess if density dropped
    while (this.carsRight.length > maxPerLane) this.carsRight.shift();
    while (this.carsLeft.length > maxPerLane) this.carsLeft.shift();

    // Move each car at its own speed
    for (const car of this.carsRight) {
      car.moveCounter++;
      if (car.moveCounter >= car.moveTicks) {
        car.moveCounter = 0;
        car.x += car.speed;
      }
      if (car.x > cols + carWidth + 10) car.x = -carWidth - Math.floor(Math.random() * 30);
    }
    for (const car of this.carsLeft) {
      car.moveCounter++;
      if (car.moveCounter >= car.moveTicks) {
        car.moveCounter = 0;
        car.x -= car.speed;
      }
      if (car.x < -carWidth - 10) car.x = cols + Math.floor(Math.random() * 30);
    }
  }

  private spawnWalker(cols: number): Walker {
    const dir = (Math.random() > 0.5 ? 1 : -1) as 1 | -1;
    return {
      x: dir === 1 ? -4 - Math.floor(Math.random() * 20) : cols + 4 + Math.floor(Math.random() * 20),
      direction: dir,
      frame: 0,
      ticksPerStep: 20 + Math.floor(Math.random() * 25), // 20-45 ticks per step
      stepCounter: 0,
      pauseTimer: 0,
      stepsUntilPause: 10 + Math.floor(Math.random() * 15),
    };
  }

  private updateWalkers(cols: number, peopleDensity: number, tick: number) {
    // Weather-aware target count
    const maxPeople = Math.max(0, Math.ceil(peopleDensity * 6));

    // Spawn with some randomness
    if (this.walkers.length < maxPeople && Math.random() < 0.02) {
      this.walkers.push(this.spawnWalker(cols));
    }

    // Remove excess if density dropped
    while (this.walkers.length > maxPeople) this.walkers.shift();

    for (const w of this.walkers) {
      // Handle pause
      if (w.pauseTimer > 0) {
        w.pauseTimer--;
        continue;
      }

      w.stepCounter++;
      if (w.stepCounter >= w.ticksPerStep) {
        w.stepCounter = 0;
        w.x += w.direction;
        w.frame = (w.frame === 0 ? 1 : 0) as 0 | 1;

        // Check for random pause
        w.stepsUntilPause--;
        if (w.stepsUntilPause <= 0) {
          w.pauseTimer = 60 + Math.floor(Math.random() * 60); // 2-4 second pause
          w.stepsUntilPause = 10 + Math.floor(Math.random() * 15);
        }
      }

      // Wrap around
      if (w.direction === 1 && w.x > cols + 6) w.x = -6;
      if (w.direction === -1 && w.x < -6) w.x = cols + 6;
    }
  }

  /** Draw a single-row car on a specific row with colored headlights/taillights */
  private drawCarOnRow(grid: Grid, car: Car, row: number, art: string[][], cols: number) {
    const carArt = art[car.variant];
    const line = carArt[0]; // single-row car
    const x = Math.floor(car.x);

    for (let i = 0; i < line.length; i++) {
      const cx = x + i;
      if (cx >= 0 && cx < cols && line[i] !== " ") {
        let color = CAR_COLOR;
        const ch = line[i];
        if (ch === "o") {
          // 'o' chars are headlights/taillights
          color = i < line.length / 2 ? CAR_TAIL : CAR_HEAD;
        } else if (ch === ">" || ch === "<") {
          color = CAR_HEAD;
        }
        grid.set(cx, row, ch, color);
      }
    }
  }

  draw(grid: Grid, state: SceneState, tick: number) {
    const streetRow = state.streetRow;
    this.layoutStreetElements(state.cols, state);
    this.updateCars(state.cols, state.carDensity, tick);
    this.updateWalkers(state.cols, state.peopleDensity, tick);

    // 4 ground rows:
    // Row 0 (streetRow):   Building bases / sidewalk level
    // Row 1 (streetRow+1): Lane 1 — cars moving RIGHT →
    // Row 2 (streetRow+2): Lane 2 — cars moving LEFT ←
    // Row 3 (streetRow+3): Ground texture (dense)

    const baseRow = streetRow;
    const lane1Row = streetRow + 1; // RIGHT lane
    const lane2Row = streetRow + 2; // LEFT lane
    const groundRow = streetRow + 3;

    // Draw sidewalk — full width
    for (let c = 0; c < state.cols; c++) {
      grid.set(c, baseRow, "\u2550", SIDEWALK_COLOR); // ═
    }

    // Draw lane 1 (RIGHT) — road surface
    for (let c = 0; c < state.cols; c++) {
      grid.set(c, lane1Row, " ", ROAD_COLOR);
    }

    // Draw lane 2 (LEFT) — road surface with dashed center line
    for (let c = 0; c < state.cols; c++) {
      const isDash = (c % 4 < 2);
      grid.set(c, lane2Row, isDash ? "-" : " ", isDash ? CENTER_LINE_COLOR : ROAD_COLOR);
    }

    // Dense ground texture
    for (let c = 0; c < state.cols; c++) {
      const pattern = (c * 7 + 3) % 6;
      let ch: string;
      let color: string;
      switch (pattern) {
        case 0: ch = "^"; color = GROUND_COLOR; break;
        case 1: ch = "^"; color = GROUND_ALT; break;
        case 2: ch = "."; color = GROUND_COLOR; break;
        case 3: ch = "*"; color = GROUND_ALT; break;
        case 4: ch = "^"; color = GROUND_COLOR; break;
        default: ch = "."; color = GROUND_ALT; break;
      }
      grid.set(c, groundRow, ch, color);
    }

    // Draw street elements (trees, lamps, furniture)
    for (const elem of this.streetElements) {
      this.drawStreetElement(grid, elem, baseRow, state, tick);
    }

    // ─── Draw occasional animal ───
    this.updateAnimal(state, tick);
    if (this.animal) {
      const art = this.animal.type === "cat" ? CAT_ART : DOG_ART;
      for (let r = 0; r < art.length; r++) {
        for (let i = 0; i < art[r].length; i++) {
          const cx = this.animal.col + i;
          if (cx >= 0 && cx < state.cols && art[r][i] !== " ") {
            grid.set(cx, baseRow - art.length + r, art[r][i], ANIMAL_COLOR);
          }
        }
      }
    }

    // Draw walkers on sidewalk
    for (const w of this.walkers) {
      const frames = w.direction === 1 ? PERSON_FRAMES_R : PERSON_FRAMES_L;
      const art = frames[w.frame];
      const x = Math.floor(w.x);
      const y = baseRow - getArtHeight(art);

      for (let r = 0; r < art.length; r++) {
        for (let i = 0; i < art[r].length; i++) {
          const cx = x + i;
          if (cx >= 0 && cx < state.cols && art[r][i] !== " ") {
            grid.set(cx, y + r, art[r][i], PERSON_COLOR);
          }
        }
      }
    }

    // Draw cars on separate lanes
    for (const car of this.carsRight) {
      this.drawCarOnRow(grid, car, lane1Row, CARS_R, state.cols);
    }
    for (const car of this.carsLeft) {
      this.drawCarOnRow(grid, car, lane2Row, CARS_L, state.cols);
    }

    // Puddle effect during rain
    if (state.weather === "RAIN" || state.weather === "THUNDERSTORM") {
      for (let c = 0; c < state.cols; c++) {
        if ((c + tick) % 5 === 0) {
          grid.set(c, lane1Row, "~", PUDDLE_COLOR);
        }
        if ((c + tick * 2) % 7 === 0) {
          grid.set(c, lane2Row, "\u2248", PUDDLE_COLOR); // ≈
        }
      }
    }

    // Snow on ground
    if (state.weather === "SNOW") {
      for (let c = 0; c < state.cols; c++) {
        if ((c * 7 + 3) % 3 === 0) {
          grid.set(c, baseRow, ".", SNOW_GROUND);
        }
        if ((c * 13 + 5) % 4 === 0) {
          grid.set(c, groundRow, "*", SNOW_GROUND);
        }
      }
    }
  }

  /** Spawn/despawn a rare street animal */
  private updateAnimal(state: SceneState, tick: number) {
    // Check every ~10 seconds (300 ticks)
    if (tick - this.animalCheckTick < 300) return;
    this.animalCheckTick = tick;

    if (this.animal) {
      // Disappear after ~10 seconds
      if (tick - this.animal.spawnTick > 300) {
        this.animal = null;
      }
    } else {
      // 10% chance to spawn
      if (Math.random() < 0.1 && state.weather !== "THUNDERSTORM" && state.weather !== "RAIN") {
        this.animal = {
          col: 10 + Math.floor(Math.random() * Math.max(1, state.cols - 20)),
          type: Math.random() > 0.5 ? "cat" : "dog",
          spawnTick: tick,
        };
      }
    }
  }

  private drawStreetElement(
    grid: Grid,
    elem: { col: number; type: string; artIdx: number },
    baseRow: number,
    state: SceneState,
    tick: number,
  ) {
    switch (elem.type) {
      case "tree":
      case "tree_winter": {
        const art = elem.type === "tree_winter" ? TREE_WINTER : TREES[elem.artIdx];
        const h = getArtHeight(art);
        const topRow = baseRow - h;

        for (let r = 0; r < art.length; r++) {
          const line = art[r];
          const isTrunk = r >= art.length - 1;
          for (let i = 0; i < line.length; i++) {
            if (line[i] !== " ") {
              const color = isTrunk ? TREE_TRUNK :
                (elem.type === "tree_winter" ? TREE_SNOW : TREE_COLOR);
              grid.set(elem.col + i, topRow + r, line[i], color);
            }
          }
        }
        break;
      }

      case "lamp": {
        const art = LAMPS[elem.artIdx];
        const h = getArtHeight(art);
        const topRow = baseRow - h;

        for (let r = 0; r < art.length; r++) {
          const line = art[r];
          for (let i = 0; i < line.length; i++) {
            if (line[i] !== " ") {
              // Lamp head glows, rest is dim
              const isHead = r === 0;
              const color = isHead ? LAMP_GLOW : LAMP_COLOR;
              grid.set(elem.col + i, topRow + r, line[i], color);
            }
          }
        }

        // Expanded light pool on ground under lamp — streetlight glow effect
        const lampW = getArtWidth(art);
        const center = elem.col + Math.floor(lampW / 2);
        for (let c = center - 3; c <= center + 3; c++) {
          if (c >= 0 && c < state.cols) {
            const dist = Math.abs(c - center);
            const glowColor = dist <= 1 ? LAMP_GLOW_GROUND : "#5a5349";
            const existing = grid.get(c, baseRow);
            if (existing && (existing.char === "\u2550" || existing.char === " " || existing.char === ".")) {
              grid.set(c, baseRow, ".", glowColor);
            }
          }
        }
        break;
      }

      case "furniture": {
        const art = FURNITURE[elem.artIdx];
        const h = getArtHeight(art);
        const topRow = baseRow - h;

        for (let r = 0; r < art.length; r++) {
          const line = art[r];
          for (let i = 0; i < line.length; i++) {
            if (line[i] !== " ") {
              grid.set(elem.col + i, topRow + r, line[i], FURNITURE_COLOR);
            }
          }
        }
        break;
      }
    }
  }
}
