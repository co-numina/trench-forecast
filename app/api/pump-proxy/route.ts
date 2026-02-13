/**
 * Edge proxy for Pump.fun API.
 * Pump.fun's DNS doesn't resolve in Node.js runtime, but works in edge runtime.
 * This proxy forwards requests to the Pump.fun API endpoints.
 */
export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";

const PUMP_BASE = "https://frontend-api-v3.pump.fun";

const ALLOWED_PATHS = [
  "/coins/currently-king",
  "/coins/for-you",
  "/coins/top-runners",
];

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path") || "/coins/currently-king";
  const limit = req.nextUrl.searchParams.get("limit") || "50";
  const offset = req.nextUrl.searchParams.get("offset") || "0";
  const timeframe = req.nextUrl.searchParams.get("timeframe") || "5m";

  // Validate path
  if (!ALLOWED_PATHS.some((p) => path.startsWith(p))) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const url = new URL(path, PUMP_BASE);
  url.searchParams.set("limit", limit);
  url.searchParams.set("offset", offset);
  url.searchParams.set("includeNsfw", "false");
  if (path.includes("top-runners")) {
    url.searchParams.set("timeframe", timeframe);
  }

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "Accept": "application/json",
        "Origin": "https://pump.fun",
        "Referer": "https://pump.fun/",
        "User-Agent": "Mozilla/5.0 (compatible; TrenchForecast/1.0)",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Pump.fun returned ${res.status}` },
        { status: res.status }
      );
    }

    // Handle empty responses gracefully
    const text = await res.text();
    if (!text || text.length === 0) {
      return NextResponse.json([], {
        headers: {
          "Cache-Control": "s-maxage=30, stale-while-revalidate=60",
        },
      });
    }

    try {
      const data = JSON.parse(text);
      return NextResponse.json(data, {
        headers: {
          "Cache-Control": "s-maxage=30, stale-while-revalidate=60",
        },
      });
    } catch {
      return NextResponse.json([], {
        headers: {
          "Cache-Control": "s-maxage=30, stale-while-revalidate=60",
        },
      });
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch from Pump.fun", detail: String(err) },
      { status: 502 }
    );
  }
}
