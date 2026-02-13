// Cloud ASCII art shapes — various sizes
// Inspired by classic ASCII cloud art: bumpy tops, soft fading bottoms

export const CLOUD_SMALL: string[] = [
  "   __   _",
  " _(  )_( )_",
  "(_   _    _)",
  "  (_) (__)",
];

export const CLOUD_MEDIUM: string[] = [
  "       .-~~~-.",
  ".- ~ ~(       )_ _",
  "|                  ~-.",
  " \\                  .'",
  "  ~- . _________ . ~",
];

export const CLOUD_LARGE: string[] = [
  "          .-~~~-.",
  "  .- ~ ~-(       )_ _",
  " /                     ~ -.",
  "|                           \\",
  " \\                         .'",
  "   ~- . _____________ . -~",
];

export const CLOUD_DARK: string[] = [
  "      .=====.",
  "  .==(       )==.",
  " /################\\",
  "|##################|",
  " \\################/",
  "  '==============' ",
];

// ============================================================
// MASSIVE CLOUDS — 6 rows, 35-45 wide
// ============================================================

export const CLOUD_MASSIVE_1: string[] = [
  "                  .-~~~-.",
  "          .- ~ ~-(       )_ _",
  "     .---(                    ~ -.",
  "    /                               \\",
  "   |                                 |",
  "    \\                               /",
  "     '- . _______________________ .~",
];

export const CLOUD_MASSIVE_2: string[] = [
  "             __    _",
  "        __ _(  )__( )__",
  "   __ _(  )_            )_ _",
  "  (                          ~ -.",
  " |                                \\",
  "  \\                              .'",
  "    ~- . ____________________ . ~",
];

export const CLOUD_MASSIVE_DARK: string[] = [
  "              .======.",
  "       .====(########)====.",
  "   .==(########################)==.",
  "  /################################\\",
  " |##################################|",
  "  \\################################/",
  "   '=============================='  ",
];

export const CLOUD_SHAPES = [CLOUD_SMALL, CLOUD_MEDIUM, CLOUD_LARGE, CLOUD_DARK];
export const CLOUD_MASSIVE = [CLOUD_MASSIVE_1, CLOUD_MASSIVE_2];
export const CLOUD_MASSIVE_STORM = CLOUD_MASSIVE_DARK;

export function getCloudWidth(cloud: string[]): number {
  return Math.max(...cloud.map((l) => l.length));
}
