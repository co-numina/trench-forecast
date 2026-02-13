/**
 * Live data fetcher — aggregates data from:
 * 1. GeckoTerminal (trending pools)
 * 2. Pump.fun (via edge proxy — currently-king, top-runners)
 * 3. Jupiter (top traded / top organic)
 * 4. DexScreener (batch enrichment)
 * 5. CoinGecko (BTC/SOL prices)
 *
 * Returns a TrenchState with computed weather, runners, and events.
 */
import type { Runner, TrenchEvent, TrenchState, MarketState, WeatherType, HotToken, MajorPrices } from "./types";
import { fetchDuneQuery, getField } from "./dune";

// Dune query IDs for daily stats
const DUNE_DEPLOYS_PER_DAY = "4010816";
const DUNE_GRADS_PER_DAY = "5131612";

// ─────────────────────────────────────────────────────────────
// Major token blocklist — filter L1s, stablecoins, infra tokens
// ─────────────────────────────────────────────────────────────
const MAJOR_TOKEN_SYMBOLS = new Set([
  "SOL", "WSOL", "USDC", "USDT", "BONK", "JUP", "RAY", "ORCA",
  "MNDE", "MSOL", "JSOL", "BSOL", "INF", "JTO", "WEN", "PYTH",
  "W", "TENSOR", "JLP", "WBTC", "WETH",
]);

const MAJOR_TOKEN_ADDRESSES = new Set([
  "So11111111111111111111111111111111111111112", // SOL
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
]);

function isMajorToken(symbol: string, address: string): boolean {
  return MAJOR_TOKEN_SYMBOLS.has(symbol.toUpperCase()) || MAJOR_TOKEN_ADDRESSES.has(address);
}

// ─────────────────────────────────────────────────────────────
// Cache
// ─────────────────────────────────────────────────────────────
interface CacheEntry {
  data: TrenchState;
  timestamp: number;
}

const CACHE_TTL = 30_000; // 30 seconds
let cache: CacheEntry | null = null;

// ─────────────────────────────────────────────────────────────
// Rate limit state for DexScreener
// ─────────────────────────────────────────────────────────────
let dexDelay = 400; // ms between requests, start conservative
const DEX_MIN_DELAY = 200;
const DEX_MAX_DELAY = 5000;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─────────────────────────────────────────────────────────────
// GeckoTerminal — trending pools on Solana
// ─────────────────────────────────────────────────────────────
interface GeckoPool {
  id: string;
  attributes: {
    name: string;
    address: string;
    base_token_price_usd: string;
    quote_token_price_usd: string;
    fdv_usd: string;
    market_cap_usd: string | null;
    price_change_percentage: {
      m5: string;
      h1: string;
      h24: string;
    };
    transactions: {
      m5: { buys: number; sells: number };
      h1: { buys: number; sells: number };
      h24: { buys: number; sells: number };
    };
    volume_usd: {
      m5: string;
      h1: string;
      h24: string;
    };
    pool_created_at: string;
  };
  relationships?: {
    base_token?: { data?: { id?: string } };
  };
}

async function fetchGeckoTrending(): Promise<GeckoPool[]> {
  const pools: GeckoPool[] = [];
  try {
    // Fetch pages 1-3 (trending pools on Solana)
    for (let page = 1; page <= 3; page++) {
      const url = `https://api.geckoterminal.com/api/v2/networks/solana/trending_pools?page=${page}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        console.warn(`GeckoTerminal page ${page} returned ${res.status}`);
        continue;
      }
      const json = await res.json();
      const data = json.data;
      if (Array.isArray(data)) {
        pools.push(...data);
      }
      // Respect rate limit: 30 req/min
      if (page < 3) await sleep(2100);
    }
  } catch (err) {
    console.warn("GeckoTerminal fetch error:", err);
  }
  return pools;
}

// ─────────────────────────────────────────────────────────────
// Pump.fun via edge proxy
// ─────────────────────────────────────────────────────────────
interface PumpCoin {
  mint: string;
  name: string;
  symbol: string;
  market_cap?: number;
  usd_market_cap?: number;
  total_supply?: number;
  virtual_sol_reserves?: number;
  virtual_token_reserves?: number;
  complete?: boolean;
  raydium_pool?: string | null;
  created_timestamp?: number;
}

async function fetchPumpProxy(path: string, params: Record<string, string> = {}): Promise<PumpCoin[]> {
  try {
    const url = new URL("/api/pump-proxy", getBaseUrl());
    url.searchParams.set("path", path);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn(`Pump.fun proxy error (${path}):`, err);
    return [];
  }
}

function getBaseUrl(): string {
  // Server-side: use localhost
  if (typeof window === "undefined") {
    const port = process.env.PORT || "3000";
    return `http://localhost:${port}`;
  }
  return window.location.origin;
}

// ─────────────────────────────────────────────────────────────
// Jupiter — top traded tokens
// ─────────────────────────────────────────────────────────────
interface JupiterToken {
  address: string;
  symbol: string;
  name: string;
  volume24h?: number;
  mc?: number;
}

async function fetchJupiterTopTraded(): Promise<JupiterToken[]> {
  try {
    const res = await fetch("https://lite-api.jup.ag/ultra/v1/top-tokens?top_n=20", {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn("Jupiter fetch error:", err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// DexScreener — batch token enrichment
// ─────────────────────────────────────────────────────────────
interface DexPair {
  baseToken: {
    address: string;
    symbol: string;
    name: string;
  };
  priceUsd: string;
  priceChange: {
    m5: number;
    h1: number;
    h24: number;
  };
  volume: {
    m5: number;
    h1: number;
    h24: number;
  };
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  fdv: number;
  marketCap: number;
  pairCreatedAt: number;
}

async function fetchDexScreenerBatch(addresses: string[]): Promise<Map<string, DexPair>> {
  const result = new Map<string, DexPair>();
  if (addresses.length === 0) return result;

  // Batch up to 30 addresses per request
  const batches: string[][] = [];
  for (let i = 0; i < addresses.length; i += 30) {
    batches.push(addresses.slice(i, i + 30));
  }

  for (const batch of batches) {
    try {
      const url = `https://api.dexscreener.com/tokens/v1/solana/${batch.join(",")}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });

      if (res.status === 429) {
        // Rate limited — back off
        dexDelay = Math.min(dexDelay * 2, DEX_MAX_DELAY);
        console.warn(`DexScreener 429, increasing delay to ${dexDelay}ms`);
        await sleep(dexDelay);
        continue;
      }

      if (!res.ok) continue;

      // Ease delay back down on success
      dexDelay = Math.max(dexDelay * 0.9, DEX_MIN_DELAY);

      const pairs: DexPair[] = await res.json();
      if (Array.isArray(pairs)) {
        for (const pair of pairs) {
          if (pair.baseToken?.address) {
            // Keep the highest-volume pair per token
            const existing = result.get(pair.baseToken.address);
            if (!existing || (pair.volume?.h24 || 0) > (existing.volume?.h24 || 0)) {
              result.set(pair.baseToken.address, pair);
            }
          }
        }
      }
    } catch (err) {
      console.warn("DexScreener batch error:", err);
    }

    if (batches.indexOf(batch) < batches.length - 1) {
      await sleep(dexDelay);
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────
// CoinGecko — BTC + SOL prices (free, no auth)
// ─────────────────────────────────────────────────────────────
async function fetchMajorPrices(): Promise<MajorPrices | undefined> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,solana&vs_currencies=usd&include_24hr_change=true",
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return undefined;
    const data = await res.json();
    return {
      btcUsd: data.bitcoin?.usd ?? 0,
      btcChange24h: data.bitcoin?.usd_24h_change ?? 0,
      solUsd: data.solana?.usd ?? 0,
      solChange24h: data.solana?.usd_24h_change ?? 0,
    };
  } catch {
    return undefined;
  }
}

// ─────────────────────────────────────────────────────────────
// Age formatter
// ─────────────────────────────────────────────────────────────
function formatAge(createdMs: number): string {
  const deltaMs = Date.now() - createdMs;
  const mins = Math.floor(deltaMs / 60_000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

// ─────────────────────────────────────────────────────────────
// Weather classification
// ─────────────────────────────────────────────────────────────
function classifyWeather(buyRatio: number, volume5m: number): WeatherType {
  // SNOW = dead market (really dead)
  if (volume5m < 200_000) return "SNOW";
  // THUNDERSTORM = heavy sell + decent volume
  if (buyRatio < 38) return "THUNDERSTORM";
  // RAIN = sell pressure
  if (buyRatio < 46) return "RAIN";
  // OVERCAST = slight sell / neutral (narrower band: 46-52)
  if (buyRatio < 52) return "OVERCAST";
  // PARTLY_CLOUDY = slight buy
  if (buyRatio < 60) return "PARTLY_CLOUDY";
  // CLEAR = strong buy
  return "CLEAR";
}

// ─────────────────────────────────────────────────────────────
// Main aggregator
// ─────────────────────────────────────────────────────────────
export async function fetchLiveState(): Promise<TrenchState> {
  // Check cache
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  // Fetch all sources in parallel (including BTC/SOL prices)
  const [geckoPools, pumpKing, pumpRunners, jupTokens, pricesResult] = await Promise.allSettled([
    fetchGeckoTrending(),
    fetchPumpProxy("/coins/currently-king", { limit: "20" }),
    fetchPumpProxy("/coins/top-runners", { limit: "30", timeframe: "5m" }),
    fetchJupiterTopTraded(),
    fetchMajorPrices(),
  ]);

  const gecko = geckoPools.status === "fulfilled" ? geckoPools.value : [];
  const king = pumpKing.status === "fulfilled" ? pumpKing.value : [];
  const runners = pumpRunners.status === "fulfilled" ? pumpRunners.value : [];
  const jup = jupTokens.status === "fulfilled" ? jupTokens.value : [];
  const prices = pricesResult.status === "fulfilled" ? pricesResult.value : undefined;

  // Collect unique token addresses for DexScreener enrichment
  const addressSet = new Set<string>();

  // From GeckoTerminal — extract base token addresses
  const geckoAddresses: string[] = [];
  for (const pool of gecko) {
    const tokenId = pool.relationships?.base_token?.data?.id;
    if (tokenId) {
      // Format: "solana_<address>"
      const addr = tokenId.replace("solana_", "");
      addressSet.add(addr);
      geckoAddresses.push(addr);
    }
  }

  // From Pump.fun
  for (const coin of [...king, ...runners]) {
    if (coin.mint) addressSet.add(coin.mint);
  }

  // From Jupiter
  for (const token of jup) {
    if (token.address) addressSet.add(token.address);
  }

  // Batch enrich with DexScreener
  const dexData = await fetchDexScreenerBatch(Array.from(addressSet).slice(0, 60));

  // ─── Build runners ───
  const runnerMap = new Map<string, Runner>();

  // Process GeckoTerminal pools
  for (let i = 0; i < gecko.length; i++) {
    const pool = gecko[i];
    const addr = geckoAddresses[i] || pool.attributes.address;
    if (!addr || runnerMap.has(addr)) continue;

    const symbol = pool.attributes.name?.split("/")[0]?.trim() || "???";
    // Skip major tokens
    if (isMajorToken(symbol, addr)) continue;

    const txn = pool.attributes.transactions;
    const vol = pool.attributes.volume_usd;
    const created = pool.attributes.pool_created_at
      ? new Date(pool.attributes.pool_created_at).getTime()
      : Date.now() - 86400000;

    const buys1h = txn?.h1?.buys ?? 0;
    const sells1h = txn?.h1?.sells ?? 0;

    runnerMap.set(addr, {
      symbol,
      mint: addr,
      volume24h: parseFloat(vol?.h24 || "0"),
      volume5m: parseFloat(vol?.m5 || "0"),
      volume1h: parseFloat(vol?.h1 || "0"),
      pctChange5m: parseFloat(pool.attributes.price_change_percentage?.m5 || "0"),
      pctChange1h: parseFloat(pool.attributes.price_change_percentage?.h1 || "0"),
      mcap: parseFloat(pool.attributes.market_cap_usd || pool.attributes.fdv_usd || "0"),
      fdv: parseFloat(pool.attributes.fdv_usd || "0"),
      buys1h,
      sells1h,
      age: formatAge(created),
      priceUsd: parseFloat(pool.attributes.base_token_price_usd || "0"),
      isGraduated: true,
      rank: i + 1,
      source: "gecko",
    });
  }

  // Process Pump.fun tokens
  for (const coin of [...king, ...runners]) {
    if (!coin.mint || runnerMap.has(coin.mint)) continue;

    const sym = coin.symbol || coin.name?.slice(0, 8) || "???";
    if (isMajorToken(sym, coin.mint)) continue;

    const mcap = coin.usd_market_cap || coin.market_cap || 0;
    const created = coin.created_timestamp
      ? coin.created_timestamp * 1000
      : Date.now() - 3600000;
    const isGrad = coin.complete || !!coin.raydium_pool;

    // Try DexScreener enrichment
    const dex = dexData.get(coin.mint);

    runnerMap.set(coin.mint, {
      symbol: sym,
      name: coin.name,
      mint: coin.mint,
      volume24h: dex?.volume?.h24 ?? 0,
      volume5m: dex?.volume?.m5 ?? 0,
      volume1h: dex?.volume?.h1 ?? 0,
      pctChange5m: dex?.priceChange?.m5 ?? 0,
      pctChange1h: dex?.priceChange?.h1 ?? 0,
      mcap: dex?.marketCap ?? mcap,
      fdv: dex?.fdv ?? mcap,
      buys1h: dex?.txns?.h1?.buys ?? 0,
      sells1h: dex?.txns?.h1?.sells ?? 0,
      age: formatAge(created),
      priceUsd: dex ? parseFloat(dex.priceUsd) : 0,
      isNew: !isGrad,
      isGraduated: isGrad,
      source: "pump",
    });
  }

  // Process Jupiter tokens — only add if not already seen
  for (const token of jup) {
    if (!token.address || runnerMap.has(token.address)) continue;

    const dex = dexData.get(token.address);
    if (!dex) continue; // need DexScreener data for Jupiter tokens

    const sym = dex.baseToken.symbol || token.symbol || "???";
    if (isMajorToken(sym, token.address)) continue;

    runnerMap.set(token.address, {
      symbol: sym,
      name: dex.baseToken.name || token.name,
      mint: token.address,
      volume24h: dex.volume?.h24 ?? 0,
      volume5m: dex.volume?.m5 ?? 0,
      volume1h: dex.volume?.h1 ?? 0,
      pctChange5m: dex.priceChange?.m5 ?? 0,
      pctChange1h: dex.priceChange?.h1 ?? 0,
      mcap: dex.marketCap ?? 0,
      fdv: dex.fdv ?? 0,
      buys1h: dex.txns?.h1?.buys ?? 0,
      sells1h: dex.txns?.h1?.sells ?? 0,
      age: "?",
      priceUsd: parseFloat(dex.priceUsd),
      isGraduated: true,
      source: "jupiter",
    });
  }

  // Filter out dead/rugged tokens: must have meaningful volume AND mcap
  // Tokens with <$10K mcap or <$1K 1h volume are likely dead or rugged
  const MIN_MCAP = 10_000;
  const MIN_VOL_1H = 1_000;

  const qualifiedRunners = Array.from(runnerMap.values())
    .filter((r) => {
      const mcap = r.mcap || r.fdv || 0;
      const vol1h = r.volume1h || 0;
      // Keep if it has both minimum mcap AND minimum 1h volume
      return mcap >= MIN_MCAP && vol1h >= MIN_VOL_1H;
    });

  // Sort by 1h volume (more responsive than 24h for trench tokens)
  const sortedRunners = qualifiedRunners
    .sort((a, b) => (b.volume1h || 0) - (a.volume1h || 0));

  // ─── Compute aggregates from ALL qualified runners ───
  let totalBuys = 0;
  let totalSells = 0;
  let totalVol5m = 0;
  let totalVol1h = 0;

  for (const r of sortedRunners) {
    totalBuys += r.buys1h;
    totalSells += r.sells1h;
    totalVol5m += r.volume5m || 0;
    totalVol1h += r.volume1h || 0;
  }

  // Take top 10 for building display
  const allRunners = sortedRunners.slice(0, 10);

  const buyRatio = totalBuys + totalSells > 0
    ? Math.round((totalBuys / (totalBuys + totalSells)) * 100)
    : 50;

  // ─── Hot Tokens — top 10 by 1h volume (from qualified runners) ───
  const hotTokens: HotToken[] = sortedRunners
    .filter((r) => (r.volume1h || 0) > 10_000)
    .slice(0, 10)
    .map((r) => ({
      symbol: r.symbol,
      pctChange1h: r.pctChange1h || 0,
      volume1h: r.volume1h || 0,
    }));

  // ─── Daily stats from Dune (with Pump.fun fallback) ───
  // Both queries return rows per-platform per-day — we need to sum across
  // all platforms for the most recent date.
  let launchedToday: number | null = null;
  let graduatedToday: number | null = null;
  let gradRate: number | null = null;

  try {
    // Fetch enough rows to cover all platforms for the latest day (~10 platforms)
    const [deployRows, gradRows] = await Promise.all([
      fetchDuneQuery(DUNE_DEPLOYS_PER_DAY, 20),
      fetchDuneQuery(DUNE_GRADS_PER_DAY, 20),
    ]);

    if (deployRows && deployRows.length > 0) {
      // Find the most recent date, sum all platforms for that date
      const latestDate = String(getField(deployRows[0], "date_time", "block_date") ?? "");
      let total = 0;
      for (const row of deployRows) {
        const rowDate = String(getField(row, "date_time", "block_date") ?? "");
        if (rowDate === latestDate) {
          total += Number(getField(row, "daily_token_count", "count", "token_count") ?? 0);
        }
      }
      if (total > 0) launchedToday = total;
    }
    if (gradRows && gradRows.length > 0) {
      const latestDate = String(getField(gradRows[0], "block_date", "date_time") ?? "");
      let total = 0;
      for (const row of gradRows) {
        const rowDate = String(getField(row, "block_date", "date_time") ?? "");
        if (rowDate === latestDate) {
          total += Number(getField(row, "daily_graduates", "graduated_count", "daily_token_count", "count") ?? 0);
        }
      }
      if (total > 0) graduatedToday = total;
    }
  } catch {
    // Dune data is optional
  }

  // Fallback: estimate from Pump.fun data if Dune isn't available
  if (launchedToday == null) {
    const pumpTotal = king.length + runners.length;
    const launchesPerHour = Math.max(pumpTotal, 20);
    launchedToday = launchesPerHour * 24;
  }
  if (graduatedToday == null) {
    const graduated = runners.filter((r) => r.complete).length;
    const gradPerHour = Math.max(graduated, 1);
    graduatedToday = gradPerHour * 24;
  }
  if (launchedToday > 0 && graduatedToday > 0) {
    gradRate = parseFloat(((graduatedToday / launchedToday) * 100).toFixed(1));
  }

  const weatherType = classifyWeather(buyRatio, totalVol5m);

  const market: MarketState = {
    buyRatio,
    totalVolume5m: totalVol5m,
    totalVolume1h: totalVol1h,
    launchedToday,
    graduatedToday,
    gradRate,
    weatherType,
  };

  // ─── Build events ───
  const events: TrenchEvent[] = [];
  const now = Date.now();

  // Highlight top movers
  const topMover = allRunners.find((r) => r.pctChange5m > 20);
  if (topMover) {
    events.push({
      type: "ALERT",
      text: `Volume spike: $${topMover.symbol} +${topMover.pctChange5m.toFixed(0)}% in 5m`,
      timestamp: now,
    });
  }

  // New launches
  const newLaunches = allRunners.filter((r) => r.isNew);
  for (const nl of newLaunches.slice(0, 2)) {
    events.push({
      type: "NEW_LAUNCH",
      text: `$${nl.symbol} launched on Pump.fun`,
      timestamp: now - 60_000,
    });
  }

  // Graduates
  const grads = allRunners.filter((r) => r.isGraduated && r.source === "pump");
  for (const g of grads.slice(0, 2)) {
    events.push({
      type: "GRADUATION",
      text: `$${g.symbol} graduated to DEX`,
      timestamp: now - 120_000,
    });
  }

  // Big drops (possible rugs)
  const droppers = allRunners.filter((r) => r.pctChange5m < -30);
  for (const d of droppers.slice(0, 1)) {
    events.push({
      type: "RUG",
      text: `$${d.symbol} dropped ${d.pctChange5m.toFixed(0)}% — possible rug`,
      timestamp: now - 180_000,
    });
  }

  // Market summary
  const gradStr = gradRate != null ? ` — ${gradRate}% grad rate` : "";
  events.push({
    type: "ALERT",
    text: `${weatherType.replace("_", " ").toLowerCase()} market${gradStr}`,
    timestamp: now - 300_000,
  });

  // Volume summary
  const vol5mStr = totalVol5m >= 1_000_000
    ? `$${(totalVol5m / 1_000_000).toFixed(1)}M`
    : `$${(totalVol5m / 1_000).toFixed(0)}K`;
  events.push({
    type: "ALERT",
    text: `Top runners: ${vol5mStr} volume/5m — ${buyRatio}% buys`,
    timestamp: now - 600_000,
  });

  // Mark rug-like tokens
  for (const r of allRunners) {
    if (r.pctChange5m < -40 && r.sells1h > r.buys1h * 3) {
      r.isRugged = true;
    }
  }

  const state: TrenchState = {
    market,
    runners: allRunners,
    hotTokens,
    events,
    prices,
  };

  // Cache the result
  cache = { data: state, timestamp: Date.now() };

  return state;
}
