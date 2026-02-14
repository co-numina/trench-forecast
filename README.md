```
  ╔══════════════════════════════════════════════════════════════════╗
  ║                                                                  ║
  ║   ████████╗██████╗ ███████╗███╗   ██╗ ██████╗██╗  ██╗           ║
  ║   ╚══██╔══╝██╔══██╗██╔════╝████╗  ██║██╔════╝██║  ██║           ║
  ║      ██║   ██████╔╝█████╗  ██╔██╗ ██║██║     ███████║           ║
  ║      ██║   ██╔══██╗██╔══╝  ██║╚██╗██║██║     ██╔══██║           ║
  ║      ██║   ██║  ██║███████╗██║ ╚████║╚██████╗██║  ██║           ║
  ║      ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═══╝ ╚═════╝╚═╝  ╚═╝           ║
  ║                                                                  ║
  ║   ███████╗ ██████╗ ██████╗ ███████╗ ██████╗ █████╗ ███████╗████████╗ ║
  ║   ██╔════╝██╔═══██╗██╔══██╗██╔════╝██╔════╝██╔══██╗██╔════╝╚══██╔══╝ ║
  ║   █████╗  ██║   ██║██████╔╝█████╗  ██║     ███████║███████╗   ██║    ║
  ║   ██╔══╝  ██║   ██║██╔══██╗██╔══╝  ██║     ██╔══██║╚════██║   ██║    ║
  ║   ██║     ╚██████╔╝██║  ██║███████╗╚██████╗██║  ██║███████║   ██║    ║
  ║   ╚═╝      ╚═════╝ ╚═╝  ╚═╝╚══════╝ ╚═════╝╚═╝  ╚═╝╚══════╝   ╚═╝    ║
  ║                                                                  ║
  ╚══════════════════════════════════════════════════════════════════╝
```

**$FORECAST ─ Real-time ASCII townscape visualization of the Solana memecoin trenches.**

## What is this?

**Trench Forecast** (`$FORECAST`) renders live Solana memecoin market data as a living ASCII cityscape on an HTML canvas. Token volume becomes buildings. Buy/sell sentiment becomes weather. The whole thing runs at 30fps in your browser.

```
  Buildings  =  Top tokens sorted by 1h volume
  Height     =  Market cap
  Windows    =  Buy ratio (lit windows = more buys)
  Weather    =  Overall market sentiment
  Street     =  Cars, trees, lamps, power lines
```

### Weather System

Market sentiment maps to weather conditions that change the entire scene:

```
  CLEAR          >65% buys    ─  the sun is out, degens are winning
  PARTLY CLOUDY  55-65%       ─  some clouds rolling in
  OVERCAST       45-55%       ─  neutral, sideways action
  RAIN           35-45%       ─  sellers taking over
  THUNDERSTORM   <35%         ─  bloodbath in the trenches
  SNOW           low volume   ─  the trenches are quiet
```

---

## Controls

```
  ┌──────────────────────────────────────┐
  │  [W]    Cycle weather manually       │
  │  [A]    Toggle auto/manual weather   │
  │  [I]    Oracle Intel (AI briefing)   │
  │  [←][→] Select token / building      │
  │  [?]    Documentation overlay        │
  │  [D]    Toggle data feed             │
  │  [ESC]  Close panels                 │
  └──────────────────────────────────────┘
```

### Oracle Intel

Press `[I]` to consult the **Trench Oracle** ─ a Claude-powered AI that reads the current market state and delivers a witty briefing using weather/trench metaphors. Requires an `ANTHROPIC_API_KEY`.

```
  .----------.
  |  TRENCH  |    "Partly cloudy with scattered rugs.
  |   NEWS   |     $POPCAT holding the line at $1.2B
  '----------'     while the rest of the trenches
  [I] Intel        are getting soaked..."
```

---

## Data Sources

| Source | Data | Refresh |
|--------|------|---------|
| **Pump.fun** | Top runners, kings, trending tokens | 30s poll |
| **DexScreener** | Volume, mcap, price enrichment | 30s poll |
| **Dune Analytics** | 17 on-chain queries | 8h cache |

Tokens are filtered to **>$10K mcap** and **>$1K 1h volume** to keep dead/rugged coins off the skyline.

---

## Architecture

```
  ┌─────────────────────────────────────────────────┐
  │                    Browser                       │
  │                                                  │
  │   Canvas  <──  CanvasRenderer  <──  Grid[r][c]   │
  │                      ↑                           │
  │               SceneComposer                      │
  │                      ↑                           │
  │   ┌──────────────────┼──────────────────┐        │
  │   │    14 Layers (back to front)        │        │
  │   │                                     │        │
  │   │    Stars ─> Moon ─> Clouds ─>       │        │
  │   │    ShootingStars ─> Fireworks ─>    │        │
  │   │    Birds ─> Buildings ─> Street ─>  │        │
  │   │    Weather ─> MetricsPanel ─>       │        │
  │   │    HotTokens ─> Ticker ─>           │        │
  │   │    TokenDetail ─> Oracle ─> Docs    │        │
  │   └─────────────────────────────────────┘        │
  │                      ↑                           │
  │            AnimationEngine (30fps)               │
  │                      ↑                           │
  │           startPolling() ─> /api/trench-state    │
  └─────────────────────────────────────────────────┘
                         │
  ┌──────────────────────┼──────────────────────────┐
  │              Next.js API Routes                  │
  │                                                  │
  │  GET  /api/trench-state   market aggregation     │
  │  GET  /api/pump-proxy     pump.fun edge proxy    │
  │  POST /api/oracle         Claude AI briefing     │
  └─────────────────────────────────────────────────┘
```

Each frame: `Grid` clears → 14 layers draw characters back-to-front → `CanvasRenderer` paints every cell via `fillText`. DPR-aware scaling handles Retina displays. Responsive font sizing (13px desktop → 7px mobile).

---

## Tech Stack

```
  Next.js 16 ─────── App Router + Turbopack
  TypeScript ─────── strict mode
  HTML Canvas ────── monospace char grid, zero DOM elements
  IBM Plex Mono ──── @fontsource
  Claude Haiku 4.5 ─ Oracle AI via @anthropic-ai/sdk
  Vercel ──────────── deployment + edge functions
```

---

## Setup

```bash
git clone https://github.com/co-numina/trench-forecast.git
cd trench-forecast
npm install
npm run dev
```

### Environment Variables

```env
# Optional ─ enables Oracle AI
ANTHROPIC_API_KEY=sk-ant-...

# Optional ─ enables live Dune Analytics queries
DUNE_API_KEY=...
```

Without keys the app runs on mock data. Oracle shows a "sleeping" message.

### Deploy

```bash
npm run build
# or
vercel --prod
```

---

```
  .----------.
  |  TRENCH  |       $FORECAST
  |   NEWS   |       @co_numina
  '----------'       x.com/co_numina
```
