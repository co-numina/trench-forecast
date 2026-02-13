import type { WeatherType, MarketState } from "../data/types";

export interface WeatherParams {
  weather: WeatherType;
  groundRows: number;
  cloudCount: number;
  particleIntensity: number; // 0-1
  starBrightness: number; // 0-1
  carDensity: number; // 0-1
  windowBrightness: number; // 0-1
  treeSway: boolean;
  puddleEffect: boolean;
  snowAccumulation: boolean;
  /** People density multiplier 0-1 */
  peopleDensity: number;
}

export function classifyWeather(market: MarketState): WeatherType {
  const { buyRatio, totalVolume5m } = market;
  // SNOW = dead / low-volume market
  if (totalVolume5m < 500_000) return "SNOW";
  // Wider bands centered around 50% so weather actually shifts
  if (buyRatio < 43) return "THUNDERSTORM";
  if (buyRatio < 48) return "RAIN";
  if (buyRatio < 52) return "OVERCAST";
  if (buyRatio < 56) return "PARTLY_CLOUDY";
  return "CLEAR";
}

/** Micro-variation: slightly randomize cloud count each call */
function varyCount(base: number, variance: number): number {
  return Math.max(0, base + Math.floor(Math.random() * (variance * 2 + 1)) - variance);
}

export function getWeatherParams(weather: WeatherType): WeatherParams {
  switch (weather) {
    case "CLEAR":
      return { weather, groundRows: 4, cloudCount: varyCount(1, 1), particleIntensity: 0, starBrightness: 1, carDensity: 0.8, windowBrightness: 1.0, treeSway: false, puddleEffect: false, snowAccumulation: false, peopleDensity: 1.0 };
    case "PARTLY_CLOUDY":
      return { weather, groundRows: 4, cloudCount: varyCount(3, 1), particleIntensity: 0, starBrightness: 0.7, carDensity: 0.6, windowBrightness: 0.85, treeSway: false, puddleEffect: false, snowAccumulation: false, peopleDensity: 0.7 };
    case "OVERCAST":
      return { weather, groundRows: 4, cloudCount: varyCount(5, 1), particleIntensity: 0, starBrightness: 0.2, carDensity: 0.4, windowBrightness: 0.6, treeSway: false, puddleEffect: false, snowAccumulation: false, peopleDensity: 0.5 };
    case "RAIN":
      return { weather, groundRows: 4, cloudCount: varyCount(4, 1), particleIntensity: 0.3 + Math.random() * 0.4, starBrightness: 0.1, carDensity: 0.2, windowBrightness: 0.5, treeSway: true, puddleEffect: true, snowAccumulation: false, peopleDensity: 0.15 };
    case "THUNDERSTORM":
      return { weather, groundRows: 4, cloudCount: varyCount(6, 1), particleIntensity: 0.7 + Math.random() * 0.3, starBrightness: 0, carDensity: 0.05, windowBrightness: 0.3, treeSway: true, puddleEffect: true, snowAccumulation: false, peopleDensity: 0 };
    case "SNOW":
      return { weather, groundRows: 4, cloudCount: varyCount(2, 1), particleIntensity: 0.2 + Math.random() * 0.2, starBrightness: 0.5, carDensity: 0, windowBrightness: 0.6, treeSway: false, puddleEffect: false, snowAccumulation: true, peopleDensity: 0.05 };
  }
}

const WEATHER_ORDER: WeatherType[] = [
  "CLEAR",
  "PARTLY_CLOUDY",
  "OVERCAST",
  "RAIN",
  "THUNDERSTORM",
  "SNOW",
];

export function cycleWeather(current: WeatherType): WeatherType {
  const idx = WEATHER_ORDER.indexOf(current);
  return WEATHER_ORDER[(idx + 1) % WEATHER_ORDER.length];
}
