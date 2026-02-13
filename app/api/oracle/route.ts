import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

interface OracleRunner {
  symbol: string;
  pctChange1h?: number;
  pctChange5m: number;
  fdv?: number;
  mcap: number;
  volume1h?: number;
  volume24h: number;
}

interface OracleHotToken {
  symbol: string;
  pctChange1h: number;
  volume1h: number;
}

interface OracleMarket {
  weatherType: string;
  buyRatio: number;
  totalVolume5m: number;
  totalVolume1h: number;
  launchedToday: number | null;
  graduatedToday: number | null;
  gradRate: number | null;
}

interface OracleRequest {
  state: {
    market: OracleMarket;
    runners: OracleRunner[];
    hotTokens: OracleHotToken[];
  };
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return n.toFixed(0);
}

function buildOraclePrompt(state: OracleRequest["state"]): string {
  const { market, runners, hotTokens } = state;

  return `Current Solana memecoin market conditions:

Weather: ${market.weatherType}
Sentiment: ${market.buyRatio}% buys (${market.buyRatio > 55 ? "bullish" : market.buyRatio < 45 ? "bearish" : "neutral"})
5min Volume: $${formatNum(market.totalVolume5m)}
1hr Volume: $${formatNum(market.totalVolume1h)}
Launched today: ${market.launchedToday ?? "unknown"}
Graduated today: ${market.graduatedToday ?? "unknown"}
Graduation rate: ${market.gradRate ? market.gradRate + "%" : "unknown"}

Top runners (buildings in the scene):
${runners
  .map(
    (r, i) =>
      `  ${i + 1}. $${r.symbol} — ${(r.pctChange1h ?? r.pctChange5m) > 0 ? "+" : ""}${(r.pctChange1h ?? r.pctChange5m)?.toFixed(1)}% 1h, MC $${formatNum(r.mcap || r.fdv || 0)}, Vol $${formatNum(r.volume1h || r.volume24h)}`
  )
  .join("\n")}

Hot tokens:
${hotTokens
  .map(
    (t) =>
      `  $${t.symbol} ${t.pctChange1h > 0 ? "+" : ""}${t.pctChange1h?.toFixed(0)}% $${formatNum(t.volume1h)} vol`
  )
  .join("\n")}

Give a brief market briefing. What's the vibe? Who's winning? What should a degen watch for?`;
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { reading: "The oracle is sleeping. Set ANTHROPIC_API_KEY to wake it up." },
      { status: 200 }
    );
  }

  try {
    const { state } = (await req.json()) as OracleRequest;
    const prompt = buildOraclePrompt(state);

    const anthropic = new Anthropic({ apiKey });

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: `You are the Trench Oracle — a weathered market analyst who speaks about the Solana memecoin market using weather metaphors. You're cynical, witty, and street-smart. Give brief, punchy market briefings in 4-6 short sentences. Reference specific tokens by name when interesting. Use weather metaphors naturally (storms, clearing skies, etc). Never use emoji. Keep it under 250 words. You sound like a grizzled trader who's seen it all.`,
      messages: [{ role: "user", content: prompt }],
    });

    const reading =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ reading });
  } catch (err) {
    console.error("Oracle API error:", err);
    return NextResponse.json(
      { reading: "The oracle's crystal ball is cloudy. Try again in a moment." },
      { status: 500 }
    );
  }
}
