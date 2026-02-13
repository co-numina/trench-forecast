import { fetchDuneQuery, stripATag, getField } from "./dune";
import type { DuneTrendingToken, DuneGraduate, DuneData } from "./types";

// Query IDs
const TRENDING_TELEGRAM = "4830187";
const TRENDING_WEB = "4830192";
const TRENDING_MOBILE = "4930328";
const GRADS_BY_MCAP = "4124453";
const GRADS_BY_VOL = "4832613";
const GRADS_RECENT = "4832245";
const RAYDIUM_5H = "4840714";
const RAYDIUM_12H = "4840651";
const RAYDIUM_24H = "4840709";
const PUMPSWAP_5H = "4929624";
const PUMPSWAP_12H = "4929617";
const PUMPSWAP_24H = "4929607";
const GRADS_PER_DAY = "5131612";
const DEPLOYS_PER_DAY = "4010816";

function parseTrendingRow(row: Record<string, unknown>): DuneTrendingToken {
  return {
    rank: Number(getField(row, "rank", "volume_rank") ?? 0),
    name: stripATag(String(getField(row, "token_link", "asset_with_chart") ?? "")),
    mint: stripATag(String(getField(row, "token_mint_address", "token_address", "token_address_with_chart") ?? "")),
    volume: Number(getField(row, "total_volume_usd", "total_volume") ?? 0),
    trades: Number(getField(row, "total_trades", "trade_count") ?? 0),
  };
}

function parseGraduateRow(row: Record<string, unknown>): DuneGraduate {
  return {
    time: String(getField(row, "graduation_time", "date_time", "date") ?? ""),
    name: stripATag(String(getField(row, "asset_with_chart") ?? "")),
    mint: stripATag(String(getField(row, "token_address", "token_address_with_chart") ?? "")),
    mcap: Number(getField(row, "market_cap") ?? 0),
    trades: Number(getField(row, "trade_count") ?? 0),
  };
}

async function fetchTrendingPlatform(queryId: string): Promise<DuneTrendingToken[]> {
  const rows = await fetchDuneQuery(queryId, 50);
  if (!rows) return [];
  return rows.map(parseTrendingRow);
}

export async function fetchTrendingTokens(): Promise<DuneData["trendingByPlatform"] | null> {
  const [telegram, web, mobile] = await Promise.all([
    fetchTrendingPlatform(TRENDING_TELEGRAM),
    fetchTrendingPlatform(TRENDING_WEB),
    fetchTrendingPlatform(TRENDING_MOBILE),
  ]);
  if (!telegram.length && !web.length && !mobile.length) return null;
  return { telegram, web, mobile };
}

export async function fetchRecentGraduates(): Promise<DuneGraduate[] | null> {
  // Try recent graduates first, fall back to by-mcap
  const rows = await fetchDuneQuery(GRADS_RECENT, 50);
  if (!rows || !rows.length) {
    const mcapRows = await fetchDuneQuery(GRADS_BY_MCAP, 50);
    if (!mcapRows) return null;
    return mcapRows.map(parseGraduateRow);
  }
  return rows.map(parseGraduateRow);
}

export async function fetchDexTrending(): Promise<{ totalVolume: number } | null> {
  // Aggregate volume from Raydium + PumpSwap for weather signal
  const queries = [RAYDIUM_5H, PUMPSWAP_5H];
  const results = await Promise.all(queries.map((q) => fetchDuneQuery(q, 100)));

  let totalVol = 0;
  for (const rows of results) {
    if (!rows) continue;
    for (const row of rows) {
      totalVol += Number(getField(row, "total_volume_usd", "total_volume") ?? 0);
    }
  }
  return totalVol > 0 ? { totalVolume: totalVol } : null;
}

export async function fetchHistoricalBaseline(): Promise<{
  avgDailyGraduates: number;
  avgDailyDeployments: number;
} | null> {
  const [gradRows, deployRows] = await Promise.all([
    fetchDuneQuery(GRADS_PER_DAY, 30),
    fetchDuneQuery(DEPLOYS_PER_DAY, 30),
  ]);

  let avgGrads = 0;
  if (gradRows && gradRows.length) {
    const total = gradRows.reduce(
      (sum, r) => sum + Number(getField(r, "graduated_count", "daily_token_count", "count") ?? 0),
      0
    );
    avgGrads = Math.round(total / gradRows.length);
  }

  let avgDeploys = 0;
  if (deployRows && deployRows.length) {
    const total = deployRows.reduce(
      (sum, r) => sum + Number(getField(r, "daily_token_count", "count") ?? 0),
      0
    );
    avgDeploys = Math.round(total / deployRows.length);
  }

  if (!avgGrads && !avgDeploys) return null;
  return { avgDailyGraduates: avgGrads, avgDailyDeployments: avgDeploys };
}

export async function fetchAllDuneData(): Promise<DuneData | undefined> {
  const [trending, graduates, baseline] = await Promise.allSettled([
    fetchTrendingTokens(),
    fetchRecentGraduates(),
    fetchHistoricalBaseline(),
  ]);

  const trendingData = trending.status === "fulfilled" ? trending.value : null;
  const gradData = graduates.status === "fulfilled" ? graduates.value : null;
  const baselineData = baseline.status === "fulfilled" ? baseline.value : null;

  if (!trendingData && !gradData && !baselineData) return undefined;

  return {
    trendingByPlatform: trendingData ?? { telegram: [], web: [], mobile: [] },
    recentGraduates: gradData ?? [],
    historicalBaseline: baselineData ?? undefined,
  };
}
