import type { TrenchState, Runner, TrenchEvent, HotToken } from "./types";

const MOCK_RUNNERS: Runner[] = [
  { symbol: "MOONDOG", mint: "moon1", volume24h: 8_200_000, pctChange5m: 12.4, pctChange1h: 34.2, volume1h: 1_200_000, mcap: 4_500_000, buys1h: 340, sells1h: 120, age: "6h" },
  { symbol: "GROK", mint: "grok1", volume24h: 3_100_000, pctChange5m: -3.2, pctChange1h: -8.1, volume1h: 890_000, mcap: 12_000_000, buys1h: 210, sells1h: 180, age: "2d" },
  { symbol: "CATGPT", mint: "cat1", volume24h: 1_800_000, pctChange5m: 45.1, pctChange1h: 128.0, volume1h: 445_000, mcap: 800_000, buys1h: 520, sells1h: 90, age: "45m", isNew: true },
  { symbol: "SOLDOG", mint: "sol1", volume24h: 950_000, pctChange5m: -8.7, pctChange1h: -12.3, volume1h: 320_000, mcap: 2_100_000, buys1h: 80, sells1h: 190, age: "1d" },
  { symbol: "PEPE2", mint: "pepe1", volume24h: 620_000, pctChange5m: 2.3, pctChange1h: 15.4, volume1h: 180_000, mcap: 950_000, buys1h: 150, sells1h: 140, age: "4h" },
  { symbol: "BONK3", mint: "bonk1", volume24h: 410_000, pctChange5m: -1.1, pctChange1h: 8.2, volume1h: 95_000, mcap: 500_000, buys1h: 100, sells1h: 105, age: "8h" },
  { symbol: "RUGME", mint: "rug1", volume24h: 180_000, pctChange5m: -42.0, pctChange1h: -67.0, volume1h: 60_000, mcap: 50_000, buys1h: 10, sells1h: 300, age: "20m", isRugged: true },
  { symbol: "FREN", mint: "fren1", volume24h: 90_000, pctChange5m: 5.5, pctChange1h: 23.0, volume1h: 40_000, mcap: 120_000, buys1h: 60, sells1h: 30, age: "3h" },
  { symbol: "WIZDOG", mint: "wiz1", volume24h: 75_000, pctChange5m: 8.3, pctChange1h: 42.0, volume1h: 28_000, mcap: 85_000, buys1h: 45, sells1h: 20, age: "2h" },
  { symbol: "PUMPCAT", mint: "pump1", volume24h: 55_000, pctChange5m: -2.0, pctChange1h: 11.5, volume1h: 15_000, mcap: 65_000, buys1h: 35, sells1h: 28, age: "5h" },
];

const MOCK_HOT_TOKENS: HotToken[] = [
  { symbol: "MOONDOG", pctChange1h: 34.2, volume1h: 1_200_000 },
  { symbol: "GROK", pctChange1h: -8.1, volume1h: 890_000 },
  { symbol: "CATGPT", pctChange1h: 128.0, volume1h: 445_000 },
  { symbol: "SOLDOG", pctChange1h: -12.3, volume1h: 320_000 },
  { symbol: "PEPE2", pctChange1h: 15.4, volume1h: 180_000 },
  { symbol: "BONK3", pctChange1h: 8.2, volume1h: 95_000 },
  { symbol: "RUGME", pctChange1h: -67.0, volume1h: 60_000 },
  { symbol: "FREN", pctChange1h: 23.0, volume1h: 40_000 },
];

const MOCK_EVENTS: TrenchEvent[] = [
  { type: "GRADUATION", text: "$MOONDOG graduated to PumpSwap", timestamp: Date.now() - 60000 },
  { type: "ALERT", text: "Volume spike: $MOONDOG +340% in 5m", timestamp: Date.now() - 120000 },
  { type: "NEW_LAUNCH", text: "$CATGPT launched on Pump.fun", timestamp: Date.now() - 300000 },
  { type: "RUG", text: "$RUGME dev dumped 100% - RIP", timestamp: Date.now() - 600000 },
  { type: "GRADUATION", text: "$GROK graduated to Raydium", timestamp: Date.now() - 900000 },
  { type: "ALERT", text: "14,847 launched — 2.1% grad rate", timestamp: Date.now() - 1200000 },
];

export function generateMockState(): TrenchState {
  return {
    market: {
      buyRatio: 72,
      totalVolume5m: 8_400_000,
      totalVolume1h: 42_000_000,
      launchedToday: 14_847,
      graduatedToday: 312,
      gradRate: 2.1,
      weatherType: "CLEAR",
    },
    runners: MOCK_RUNNERS,
    hotTokens: MOCK_HOT_TOKENS,
    events: MOCK_EVENTS,
  };
}
