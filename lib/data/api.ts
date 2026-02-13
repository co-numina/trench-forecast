import type { TrenchState } from "./types";

const POLL_INTERVAL = 30_000; // 30 seconds — matches API cache TTL

export async function fetchTrenchState(): Promise<TrenchState> {
  const res = await fetch("/api/trench-state");
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function startPolling(
  onData: (state: TrenchState) => void,
  onError?: (err: Error) => void
): () => void {
  let timer: ReturnType<typeof setInterval> | null = null;
  let stopped = false;

  const poll = async () => {
    if (stopped) return;
    try {
      const state = await fetchTrenchState();
      if (!stopped) onData(state);
    } catch (err) {
      onError?.(err as Error);
    }
  };

  // Initial fetch
  poll();
  timer = setInterval(poll, POLL_INTERVAL);

  // Return cleanup function
  return () => {
    stopped = true;
    if (timer) clearInterval(timer);
  };
}
