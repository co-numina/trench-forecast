// Cloud ASCII art shapes — various sizes
// Soft, wispy shapes — no heavy bottom borders

export const CLOUD_SMALL: string[] = [
  "   ._  _.",
  " -(      )-",
  "'          `",
];

export const CLOUD_MEDIUM: string[] = [
  "      ._.",
  "  _.-'   '-._",
  "-'            '-",
  "'    '    '     `",
];

export const CLOUD_LARGE: string[] = [
  "         ._ _.",
  "     _.-'     '-.",
  "  .-'             '-.",
  "-'    '    '    '    '-",
  "'                      `",
];

export const CLOUD_DARK: string[] = [
  "       .###.",
  "   _.-'#####'-._",
  ".-'##############'-.",
  "'################## `",
  " '  ##  ##  ##  '",
];

// ============================================================
// MASSIVE CLOUDS — 5-6 rows, 35-45 wide
// ============================================================

export const CLOUD_MASSIVE_1: string[] = [
  "              ._  _.",
  "        _.- ~'      '~ -._",
  "    _.-'                    '-._",
  " .-'    '       '       '       '-.",
  "-'                                  '-",
  "'    '     '     '     '     '     ' `",
];

export const CLOUD_MASSIVE_2: string[] = [
  "                   ._ _.",
  "           _.  _.-'     '-._ .",
  "      _.-''                   ''-._",
  "   .-'        '        '           '-.",
  " -'     '          '          '       '-",
  "'                                        `",
];

export const CLOUD_MASSIVE_DARK: string[] = [
  "              .#####.",
  "       _.==(#########)==._",
  "   _.='########################'=._",
  " ='##############################'=",
  "-'##  ##  ##  ##  ##  ##  ##  ##  '-",
  "'    '     '     '     '     '      `",
];

export const CLOUD_SHAPES = [CLOUD_SMALL, CLOUD_MEDIUM, CLOUD_LARGE, CLOUD_DARK];
export const CLOUD_MASSIVE = [CLOUD_MASSIVE_1, CLOUD_MASSIVE_2];
export const CLOUD_MASSIVE_STORM = CLOUD_MASSIVE_DARK;

export function getCloudWidth(cloud: string[]): number {
  return Math.max(...cloud.map((l) => l.length));
}
