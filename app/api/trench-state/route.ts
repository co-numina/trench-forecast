import { NextResponse } from "next/server";
import { generateMockState } from "@/lib/data/mock";
import { fetchAllDuneData } from "@/lib/data/dune-aggregator";
import { fetchLiveState } from "@/lib/data/live-fetcher";

export async function GET() {
  try {
    // Try live data first
    const liveState = await fetchLiveState();

    // If we got real runners, use live data
    if (liveState.runners.length > 0) {
      // Optionally enrich with Dune data
      try {
        const dune = await fetchAllDuneData();
        if (dune) {
          liveState.dune = dune;
        }
      } catch {
        // Dune data is optional
      }
      return NextResponse.json(liveState, {
        headers: {
          "Cache-Control": "s-maxage=30, stale-while-revalidate=60",
        },
      });
    }
  } catch (err) {
    console.warn("Live data fetch failed, falling back to mock:", err);
  }

  // Fallback to mock data
  const state = generateMockState();
  try {
    const dune = await fetchAllDuneData();
    if (dune) {
      state.dune = dune;
    }
  } catch {
    // Dune data is optional — continue with mock data
  }
  return NextResponse.json(state);
}
