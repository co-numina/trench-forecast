// Building ASCII art — adapted from Sher^, hjw, and other reference sources.
// Window fill characters use 'o' so the renderer can toggle them lit/dark.

export interface BuildingStyle {
  art: string[];
  width: number;
  height: number;
  /** Window positions found by scanning for 'o' chars */
  windows: [number, number][];
  rooftopRow: number;
}

/** Scan art for 'o' chars and return their positions */
function findWindows(art: string[]): [number, number][] {
  const wins: [number, number][] = [];
  for (let r = 0; r < art.length; r++) {
    for (let c = 0; c < art[r].length; c++) {
      if (art[r][c] === "o") wins.push([c, r]);
    }
  }
  return wins;
}

function makeStyle(art: string[]): BuildingStyle {
  const width = Math.max(...art.map((l) => l.length));
  // Pad all rows to consistent width
  const padded = art.map((l) => l.padEnd(width));
  return {
    art: padded,
    width,
    height: padded.length,
    windows: findWindows(padded),
    rooftopRow: 0,
  };
}

// ============================================================
// STYLE 0 — CAPITOL SPIRE — 26 rows, tall with antenna + dome
// ============================================================
const CAPITOL_SPIRE = makeStyle([
  "          |          ",
  "          |          ",
  "        _/^\\_        ",
  "       //^^^\\\\       ",
  "      //^^^^^\\\\      ",
  "      ||o.o.o||      ",
  "     //.o.o.o.\\\\     ",
  "     ||o.o.o.o||     ",
  "   __||_ o.o _||__   ",
  "   |.oo|o.o.o|oo.|   ",
  "  _|ooo|o.o.o|ooo|_  ",
  '  |"""""""""""""""|  ',
  "  |= o.o.o.o.o.o =|  ",
  "  |= o.o.o.o.o.o =|  ",
  "  |= o.o.o.o.o.o =|  ",
  "  |= o.o.o.o.o.o =|  ",
  "  |= o.o.o.o.o.o =|  ",
  "  |= o.o.o.o.o.o =|  ",
  "  |= o.o.o.o.o.o =|  ",
  " _|_ o.o.o.o.o.o _|_ ",
  " |ooo|o.o.o.o.o|ooo| ",
  "_|___|o.o.o.o.o|___|_",
  "|ooooo|o.o.o.o|ooooo|",
  '|=o=o=|II o II|=o=o=|',
  '|III|---"/   \\"---|III|',
  "=  =  =  =  =  =  = ",
]);

// ============================================================
// STYLE 1 — WIDE APARTMENT BLOCK — 18 rows, ~36 wide, flat roof
// ============================================================
const WIDE_APARTMENT = makeStyle([
  "  _._._._._._._._._._._._._._._._  ",
  "  | ___   ___    ___    ___   ___ |  ",
  "  ||o|o| |o|o|  |o|o|  |o|o| |o|o|| ",
  "  |IIIII_IIIII__IIIII__IIIII_IIIII|  ",
  "  | ___   ___    ___    ___   ___ |  ",
  "  ||o|o| |o|o|  |o|o|  |o|o| |o|o|| ",
  "  |IIIII_IIIII__IIIII__IIIII_IIIII|  ",
  "  | ___   ___    ___    ___   ___ |  ",
  "  ||o|o| |o|o|  |o|o|  |o|o| |o|o|| ",
  "  |IIIII_IIIII__IIIII__IIIII_IIIII|  ",
  "  | ___   ___    ___    ___   ___ |  ",
  "  ||o|o| |o|o|  |o|o|  |o|o| |o|o|| ",
  "  |IIIII_IIIII__IIIII__IIIII_IIIII|  ",
  "  | ___   ___   _____   ___   ___ |  ",
  "  ||o|o| |o|o|  o~|~o  |o|o| |o|o|| ",
  '  |IIIII_IIIII__|o|o|__IIIII_IIIII|  ',
  '  |"""""""""""""/=====\\"""""""""""|  ',
  "  ================================== ",
]);

// ============================================================
// STYLE 2 — DOMED TOWER — 20 rows, ~24 wide, dome roof
// ============================================================
const DOMED_TOWER = makeStyle([
  "          |~~          ",
  "       ___|___         ",
  "      ((((()))))       ",
  "     (((((())))))      ",
  "   |-------------|    ",
  "   I_I_I_I_I_I_I_I    ",
  "   |---------------|  ",
  "   ||o| |o| |o| |o||  ",
  " __|-----|---------|__ ",
  " I_I_I_I|I_I_I_I_I_I| ",
  " |------|-----------|  ",
  " ||o| o||o| |o| |o| o|",
  " |------|-----------|  ",
  " | |o|  |oooo ---  oo|",
  " | |o|  | o  |o|o| o |",
  " |------| o  |o|o|---|",
  " |      |____|_|_|   |",
  " |______|___________|  ",
  " @@@@@@@/=========\\@@@ ",
  "        /         \\    ",
]);

// ============================================================
// STYLE 3 — STEPPED PYRAMID — 18 rows, art-deco
// ============================================================
const STEPPED_PYRAMID = makeStyle([
  "       ____            ",
  "       | =|            ",
  "     +-\"  \"-+          ",
  "     | ==  =|          ",
  "   +-\"  == =\"-+        ",
  "   |=    == = |        ",
  " +-\" ==   =   \"-+     ",
  " | =  ______ ===|     ",
  " | == |oooo| ==  |    ",
  ' +-"  |====|---. ="-+ ',
  " |=== |    | o | == | ",
  " | = = \"----\"---\"=  | ",
  " |==  ==== ==   ==  =|",
  " |= == == _________ =|",
  " |= = .---|oooo|oooo| |",
  " |== =| o |    |    | |",
  ' |  =="---"----+----" |',
  " |_____________________|",
]);

// ============================================================
// STYLE 4 — NARROW ANTENNA TOWER — 20 rows, ~12 wide
// ============================================================
const NARROW_TOWER = makeStyle([
  "     T     ",
  "    _|_    ",
  "   |o.o|   ",
  "   |.o.|   ",
  "   |o.o|   ",
  "   |___|   ",
  "   |o.o|   ",
  "   |.o.|   ",
  "   |o.o|   ",
  "  _|___|_  ",
  "  |o . o|  ",
  "  |. o .|  ",
  "  |o . o|  ",
  "  |. o .|  ",
  "  |o . o|  ",
  "  |. o .|  ",
  "  |o . o|  ",
  "  |_____|  ",
  "  |[==]||  ",
  "  |_____|  ",
]);

// ============================================================
// STYLE 5 — FIRE ESCAPE BUILDING — 14 rows, ~18 wide
// ============================================================
const FIRE_ESCAPE = makeStyle([
  "  ________________  ",
  "  |  ___    ___  |  ",
  " =|=|o.o|  |o.o|=|= ",
  "  |  ---    ---  |  ",
  " =|=|o.o|  |o.o|=|= ",
  "  |  ---    ---  |  ",
  " =|=|o.o|  |o.o|=|= ",
  "  |  ---    ---  |  ",
  " =|=|o.o|  |o.o|=|= ",
  "  |  ---    ---  |  ",
  " =|=|o.o|  |o.o|=|= ",
  "  |  ___    ___  |  ",
  '  |_|ooo|__|ooo|_|  ',
  "  ==================  ",
]);

// ============================================================
// STYLE 6 — CORNER SHOP — 9 rows, ~14 wide
// ============================================================
const CORNER_SHOP = makeStyle([
  "  ____________  ",
  " |  __    __  | ",
  " | |oo|  |oo| | ",
  " | |__|  |__| | ",
  " |  __    __  | ",
  " | |oo|  |oo| | ",
  " | |__|  |__| | ",
  " | [========] | ",
  " |____|____|__| ",
]);

// ============================================================
// STYLE 7 — GOTHIC SPIRE — 22 rows, narrow pointed top
// ============================================================
const GOTHIC_SPIRE = makeStyle([
  "       /\\       ",
  "      /||\\      ",
  "     / || \\     ",
  "    /  ||  \\    ",
  "   /  _||_  \\   ",
  "  /__|o||o|__\\  ",
  "  | o  ||  o |  ",
  "  |  o || o  |  ",
  "  | o  ||  o |  ",
  "  |----||-----|  ",
  "  | o  ||  o |  ",
  "  |  o || o  |  ",
  "  | o  ||  o |  ",
  "  |----||-----|  ",
  "  | o  ||  o |  ",
  "  |  o || o  |  ",
  "  | o  ||  o |  ",
  "  |----||-----|  ",
  "  | o  ||  o |  ",
  "  |  o || o  |  ",
  '  |____||----|  ',
  "  =====//=====  ",
]);

// ============================================================
// STYLE 8 — WAREHOUSE LOFT — 12 rows, wide & low with arches
// ============================================================
const WAREHOUSE_LOFT = makeStyle([
  " _____________________________ ",
  " |  _____  _____  _____  ___ | ",
  " | | o o || o o || o o || o || ",
  " | |_____||_____||_____||___|| ",
  " |  _____  _____  _____  ___ | ",
  " | | o o || o o || o o || o || ",
  " | |_____||_____||_____||___|| ",
  " |  _____  _____  _____  ___ | ",
  " | | o o || o o || o o || o || ",
  " | |_____||_____||_____||___|| ",
  " | /===\\  [====]  /===\\ [==] | ",
  " |___________________________| ",
]);

// ============================================================
// STYLE 9 — CLOCK TOWER — 16 rows, medium, with clock face
// ============================================================
const CLOCK_TOWER = makeStyle([
  "     ___     ",
  "    /   \\    ",
  "    |o.o|    ",
  "   /|   |\\   ",
  "  / |___| \\  ",
  " |  _____  | ",
  " | |o . o| | ",
  " | |. o .| | ",
  " | |o . o| | ",
  " | |. o .| | ",
  " | |o . o| | ",
  " |_|. o .|_| ",
  " | |o . o| | ",
  " | |_____|  |",
  " | |[==]||  |",
  " |_|_____|__|",
]);

// ============================================================
// CONSTRUCTION — scaffolding + crane (for isNew tokens)
// ============================================================
const CONSTRUCTION = makeStyle([
  "  _/|         ",
  "   |----.     ",
  "   |    |     ",
  "  .|.   |     ",
  "  #|# __|__   ",
  "  #|# |o  o|  ",
  "  #|# |    |  ",
  "  #|# |o  o|  ",
  "  #|# |____|  ",
  "  #|# |o  o|  ",
  "  #|#_|    |  ",
  "  ====|____|  ",
]);

// ============================================================
// ALL STYLES — sorted tallest to shortest for mcap-based sizing
// ============================================================
const RANKED_STYLES: BuildingStyle[] = [
  CAPITOL_SPIRE,    // 0 — 26 rows, tallest
  GOTHIC_SPIRE,     // 1 — 22 rows
  DOMED_TOWER,      // 2 — 20 rows
  NARROW_TOWER,     // 3 — 20 rows
  WIDE_APARTMENT,   // 4 — 18 rows
  STEPPED_PYRAMID,  // 5 — 18 rows
  CLOCK_TOWER,      // 6 — 16 rows
  FIRE_ESCAPE,      // 7 — 14 rows
  WAREHOUSE_LOFT,   // 8 — 12 rows
  CORNER_SHOP,      // 9 — 9 rows, shortest
];

const STYLES = [...RANKED_STYLES, CONSTRUCTION];

/**
 * Get building style based on mcap rank (0 = highest mcap = tallest building).
 * Uses variety offsets so adjacent same-tier buildings look different.
 */
export function getBuildingForMcapRank(mcapRank: number, totalCount: number, isNew?: boolean): BuildingStyle {
  if (isNew) return CONSTRUCTION;
  // Clamp to available styles
  const idx = Math.min(mcapRank, RANKED_STYLES.length - 1);
  return RANKED_STYLES[idx];
}

/** Get building for a slot index — shuffled assignment (legacy, used by street for demo) */
export function getBuildingForSlot(slot: number, totalCount: number, isNew?: boolean): BuildingStyle {
  if (isNew) return CONSTRUCTION;
  // Simple variety: offset by slot to avoid adjacent identical buildings
  const idx = slot % RANKED_STYLES.length;
  return RANKED_STYLES[idx];
}

/** Legacy rank-based selection */
export function getBuildingForRank(rank: number, isNew?: boolean): BuildingStyle {
  if (isNew) return CONSTRUCTION;
  if (rank >= 0 && rank < RANKED_STYLES.length) return RANKED_STYLES[rank];
  return CORNER_SHOP;
}

export {
  CAPITOL_SPIRE, WIDE_APARTMENT, DOMED_TOWER,
  STEPPED_PYRAMID, NARROW_TOWER, FIRE_ESCAPE,
  CORNER_SHOP, GOTHIC_SPIRE, WAREHOUSE_LOFT,
  CLOCK_TOWER, CONSTRUCTION,
  RANKED_STYLES, STYLES,
};
