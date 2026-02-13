const DUNE_BASE = "https://api.dune.com/api/v1";
const CACHE_TTL = 8 * 60 * 60 * 1000; // 8 hours

// In-memory cache
const cache = new Map<string, { data: Record<string, unknown>[]; ts: number }>();

export async function fetchDuneQuery(
  queryId: string,
  limit = 100
): Promise<Record<string, unknown>[] | null> {
  const key = `dune:${queryId}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const apiKey = process.env.DUNE_API_KEY;
  if (!apiKey) return cached?.data ?? null;

  try {
    const res = await fetch(
      `${DUNE_BASE}/query/${queryId}/results?limit=${limit}`,
      { headers: { "X-Dune-API-Key": apiKey } }
    );

    if (!res.ok) {
      console.error(`Dune query ${queryId} failed: ${res.status}`);
      return cached?.data ?? null;
    }

    const json = await res.json();
    const rows = (json?.result?.rows as Record<string, unknown>[]) ?? [];
    cache.set(key, { data: rows, ts: Date.now() });
    return rows;
  } catch (err) {
    console.error(`Dune query ${queryId} error:`, err);
    return cached?.data ?? null;
  }
}

/** Strip HTML <a> tags to get inner text */
export function stripATag(html: string): string {
  if (typeof html !== "string") return String(html);
  const match = html.match(/>(.*?)<\/a>/);
  return match ? match[1] : html;
}

/** Extract href from HTML <a> tag */
export function extractLink(html: string): string {
  if (typeof html !== "string") return String(html);
  const match = html.match(/href="([^"]+)"/);
  return match ? match[1] : html;
}

/** Flexible field accessor — tries multiple field names */
export function getField(
  row: Record<string, unknown>,
  ...names: string[]
): unknown {
  for (const name of names) {
    if (row[name] !== undefined) return row[name];
  }
  return undefined;
}
