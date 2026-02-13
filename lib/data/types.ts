export type WeatherType =
  | "CLEAR"
  | "PARTLY_CLOUDY"
  | "OVERCAST"
  | "RAIN"
  | "THUNDERSTORM"
  | "SNOW";

export interface MarketState {
  buyRatio: number; // 0-100
  totalVolume5m: number; // USD
  totalVolume1h: number; // USD
  launchedToday: number | null; // total tokens deployed today (Dune)
  graduatedToday: number | null; // total bonding curve completions today (Dune)
  gradRate: number | null; // graduatedToday / launchedToday * 100
  weatherType: WeatherType;
}

export interface HotToken {
  symbol: string;
  pctChange1h: number;
  volume1h: number;
}

/** A snapshot for the trend history panel */
export interface TrendSnapshot {
  timestamp: number;
  buyRatio: number;
  volume5m: number;
  weatherType: WeatherType;
}

export interface Runner {
  symbol: string;
  mint: string;
  volume24h: number;
  pctChange5m: number;
  mcap: number;
  buys1h: number;
  sells1h: number;
  age: string;
  isNew?: boolean;
  isRugged?: boolean;
  // Extended fields from live API
  name?: string;
  priceUsd?: number;
  pctChange1h?: number;
  volume5m?: number;
  volume1h?: number;
  fdv?: number;
  isGraduated?: boolean;
  address?: string;
  rank?: number;
  source?: string;
}

export interface TrenchEvent {
  type: "GRADUATION" | "NEW_LAUNCH" | "RUG" | "ALERT";
  text: string;
  timestamp: number;
}

export interface DuneTrendingToken {
  rank: number;
  name: string;
  mint: string;
  volume: number;
  trades: number;
}

export interface DuneGraduate {
  time: string;
  name: string;
  mint: string;
  mcap: number;
  trades: number;
}

export interface DuneData {
  trendingByPlatform: {
    telegram: DuneTrendingToken[];
    web: DuneTrendingToken[];
    mobile: DuneTrendingToken[];
  };
  recentGraduates: DuneGraduate[];
  historicalBaseline?: {
    avgDailyGraduates: number;
    avgDailyDeployments: number;
  };
}

/** BTC/SOL price info for display */
export interface MajorPrices {
  btcUsd: number;
  btcChange24h: number;
  solUsd: number;
  solChange24h: number;
}

export interface TrenchState {
  market: MarketState;
  runners: Runner[];
  hotTokens: HotToken[];
  events: TrenchEvent[];
  dune?: DuneData;
  prices?: MajorPrices;
}
