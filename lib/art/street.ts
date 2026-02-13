// Street-level ASCII art elements — dense, characterful

// ============================================================
// TREES — 3-5 rows tall
// ============================================================

// Leafy tree: 4 rows
export const TREE_LEAFY = [
  "  %%%  ",
  " %%%%% ",
  "  %%%  ",
  "   |   ",
];

// Round tree: 4 rows
export const TREE_ROUND = [
  " .@@. ",
  "(@@@@@)",
  " '@@' ",
  "  ||  ",
];

// Pine tree: 5 rows
export const TREE_PINE = [
  "   *   ",
  "  /|\\  ",
  " //|\\\\ ",
  "///|\\\\\\",
  "  |||  ",
];

// Bare winter tree: 4 rows (for SNOW)
export const TREE_BARE = [
  " _/\\_  ",
  "/  | \\ ",
  " \\ | / ",
  "  \\|/  ",
];

export const TREES = [TREE_LEAFY, TREE_ROUND, TREE_PINE];
export const TREE_WINTER = TREE_BARE;

// ============================================================
// LAMP POSTS — 4-5 rows
// ============================================================

// Classic lamp: 5 rows
export const LAMP_CLASSIC = [
  " _O_ ",
  "(_|_)",
  "  |  ",
  "  |  ",
  " _|_ ",
];

// Modern lamp: 4 rows
export const LAMP_MODERN = [
  " o---.",
  " |    ",
  " |    ",
  "_|_   ",
];

export const LAMPS = [LAMP_CLASSIC, LAMP_MODERN];

// ============================================================
// STICK FIGURES — 3 rows, proper walk cycle
// ============================================================

// Walking RIGHT — 2 frames
export const WALK_R_1 = [
  " O ",
  "/|>",
  "/ \\",
];

export const WALK_R_2 = [
  " O ",
  "/|\\",
  "/| ",
];

// Walking LEFT — 2 frames
export const WALK_L_1 = [
  " O ",
  "<|\\",
  "/ \\",
];

export const WALK_L_2 = [
  " O ",
  "/|\\",
  " |\\",
];

export const PERSON_FRAMES_R = [WALK_R_1, WALK_R_2];
export const PERSON_FRAMES_L = [WALK_L_1, WALK_L_2];

// ============================================================
// CARS — 1 row, 6 chars wide (single-lane fit)
// ============================================================

export const CAR_R_1 = ["=>==o>"];
export const CAR_R_2 = ["o>==>o"];

export const CAR_L_1 = ["<o==<="];
export const CAR_L_2 = ["o<==<o"];

export const CARS_R = [CAR_R_1, CAR_R_2];
export const CARS_L = [CAR_L_1, CAR_L_2];

// ============================================================
// STREET FURNITURE — 1-3 rows
// ============================================================

// Bench: 2 rows
export const BENCH = [
  " ___ ",
  "|___|",
];

// Fire hydrant: 2 rows
export const HYDRANT = [
  "[T]",
  " | ",
];

// Trash can: 2 rows
export const TRASH_CAN = [
  ".-.",
  "|_|",
];

// Street sign: 3 rows
export const SIGN_POST = [
  ".--.",
  "|==|",
  " || ",
];

// Fence segment: 2 rows
export const FENCE = [
  "+-+-+-+",
  "| | | |",
];

// Mailbox: 2 rows
export const MAILBOX = [
  " __ ",
  "|==|",
];

export const FURNITURE = [BENCH, HYDRANT, TRASH_CAN, SIGN_POST, MAILBOX];

// ============================================================
// Helpers
// ============================================================

export function getArtWidth(art: string[]): number {
  return Math.max(...art.map((l) => l.length));
}

export function getArtHeight(art: string[]): number {
  return art.length;
}
