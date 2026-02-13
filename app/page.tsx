"use client";

import { useEffect, useRef, useCallback } from "react";
import { Grid } from "@/lib/renderer/grid";
import { CanvasRenderer } from "@/lib/renderer/canvas";
import { SceneComposer, TICKER_ROWS, GROUND_ROWS } from "@/lib/renderer/scene";
import type { SceneState, OracleState } from "@/lib/renderer/scene";
import type { WeatherType, TrenchState, TrendSnapshot } from "@/lib/data/types";
import { StarsLayer } from "@/lib/layers/stars";
import { MoonLayer } from "@/lib/layers/moon";
import { CloudsLayer } from "@/lib/layers/clouds";
import { BuildingsLayer } from "@/lib/layers/buildings";
import { StreetLayer } from "@/lib/layers/street";
import { WeatherLayer } from "@/lib/layers/weather";
import { ShootingStarsLayer } from "@/lib/layers/shooting-stars";
import { BirdsLayer } from "@/lib/layers/birds";
import { MetricsPanelLayer } from "@/lib/layers/metrics-panel";
import { HotTokensPanelLayer } from "@/lib/layers/hot-tokens-panel";
import { HudLayer } from "@/lib/hud";
import { TickerLayer } from "@/lib/ticker";
import { FireworksLayer } from "@/lib/layers/fireworks";
import { OracleOverlayLayer } from "@/lib/layers/oracle-overlay";
import { TokenDetailLayer } from "@/lib/layers/token-detail";
import { AnimationEngine } from "@/lib/engine/animation";
import { cycleWeather, getWeatherParams } from "@/lib/engine/weather-state";
import { fetchTrenchState, startPolling } from "@/lib/data/api";

const TREND_INTERVAL = 15 * 60 * 1000; // 15 minutes
const MAX_TREND_SNAPSHOTS = 4;
const SPARKLINE_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_SPARKLINE_POINTS = 12; // 1 hour of data
const ORACLE_COOLDOWN = 30_000; // 30 seconds
const ORACLE_CACHE_TTL = 60_000; // 60 seconds

export default function TrenchForecast() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const gridRef = useRef<Grid | null>(null);
  const composerRef = useRef<SceneComposer | null>(null);
  const engineRef = useRef<AnimationEngine | null>(null);
  const weatherRef = useRef<WeatherType>("CLEAR");
  const trenchStateRef = useRef<TrenchState | null>(null);
  const dataEnabledRef = useRef(true);
  const trendHistoryRef = useRef<TrendSnapshot[]>([]);
  const lastTrendTimestamp = useRef(0);
  const weatherModeRef = useRef<"AUTO" | "MANUAL">("AUTO");

  // Oracle state
  const oracleStateRef = useRef<OracleState>({ visible: false, loading: false, reading: null });
  const lastOracleCallRef = useRef(0);
  const oracleCacheRef = useRef<{ reading: string; timestamp: number } | null>(null);

  // Token detail selection
  const selectedBuildingRef = useRef<number | null>(null);

  // Sparkline data
  const sparklineDataRef = useRef<number[]>([]);
  const lastSparklineTimestamp = useRef(0);

  // Buildings layer ref for getting positions
  const buildingsLayerRef = useRef<BuildingsLayer | null>(null);

  const setupScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new CanvasRenderer(canvas, "IBM Plex Mono", 13);
    renderer.resizeCanvas();
    const { cols, rows } = renderer.calcGridSize();
    const grid = new Grid(cols, rows);

    const composer = new SceneComposer();
    const buildingsLayer = new BuildingsLayer();
    buildingsLayerRef.current = buildingsLayer;

    // Layers added back-to-front
    composer.addLayer(new StarsLayer());
    composer.addLayer(new MoonLayer());
    composer.addLayer(new CloudsLayer());
    composer.addLayer(new ShootingStarsLayer());
    composer.addLayer(new FireworksLayer());
    composer.addLayer(new BirdsLayer());
    composer.addLayer(buildingsLayer);
    composer.addLayer(new StreetLayer());
    composer.addLayer(new WeatherLayer());
    composer.addLayer(new MetricsPanelLayer());
    composer.addLayer(new HotTokensPanelLayer());
    composer.addLayer(new HudLayer());
    composer.addLayer(new TickerLayer());
    composer.addLayer(new TokenDetailLayer());
    composer.addLayer(new OracleOverlayLayer());

    rendererRef.current = renderer;
    gridRef.current = grid;
    composerRef.current = composer;

    return renderer;
  }, []);

  useEffect(() => {
    const renderer = setupScene();
    if (!renderer) return;

    const engine = new AnimationEngine();
    engineRef.current = engine;

    engine.start((tick: number) => {
      const grid = gridRef.current;
      const composer = composerRef.current;
      if (!grid || !composer || !rendererRef.current) return;

      const weather = weatherRef.current;
      const params = getWeatherParams(weather);
      const groundRows = GROUND_ROWS;
      const streetRow = grid.rows - groundRows - TICKER_ROWS;

      // Get building positions from buildings layer
      const buildingPositions = buildingsLayerRef.current?.getBuildings() ?? [];

      const state: SceneState = {
        cols: grid.cols,
        rows: grid.rows,
        weather,
        groundRows,
        streetRow,
        bottomZone: groundRows + TICKER_ROWS,
        carDensity: params.carDensity,
        windowBrightness: params.windowBrightness,
        peopleDensity: params.peopleDensity,
        trenchState: trenchStateRef.current,
        trendHistory: trendHistoryRef.current,
        weatherMode: weatherModeRef.current,
        oracleState: oracleStateRef.current,
        selectedBuilding: selectedBuildingRef.current,
        buildingPositions,
        sparklineData: sparklineDataRef.current.length >= 2 ? sparklineDataRef.current : undefined,
      };

      grid.clear();
      composer.drawAll(grid, state, tick);
      rendererRef.current.render(grid);
    });

    // Resize handler
    const handleResize = () => {
      const r = rendererRef.current;
      if (!r) return;
      r.resizeCanvas();
      const { cols, rows } = r.calcGridSize();
      gridRef.current?.resize(cols, rows);
    };
    window.addEventListener("resize", handleResize);

    // Oracle call function
    const callOracle = async () => {
      const now = Date.now();

      // Check cooldown
      if (now - lastOracleCallRef.current < ORACLE_COOLDOWN) {
        oracleStateRef.current = {
          visible: true,
          loading: false,
          reading: "Oracle needs a moment... Try again shortly.",
        };
        return;
      }

      // Check cache
      const cache = oracleCacheRef.current;
      if (cache && now - cache.timestamp < ORACLE_CACHE_TTL) {
        oracleStateRef.current = { visible: true, loading: false, reading: cache.reading };
        return;
      }

      // Make API call
      oracleStateRef.current = { visible: true, loading: true, reading: null };
      lastOracleCallRef.current = now;

      const data = trenchStateRef.current;
      if (!data) {
        oracleStateRef.current = {
          visible: true,
          loading: false,
          reading: "The oracle needs market data. Press [D] to enable data feed first.",
        };
        return;
      }

      try {
        const resp = await fetch("/api/oracle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: data }),
        });
        const result = await resp.json();
        const reading = result.reading || "The oracle's vision is unclear.";
        oracleCacheRef.current = { reading, timestamp: now };
        oracleStateRef.current = { visible: true, loading: false, reading };
      } catch {
        oracleStateRef.current = {
          visible: true,
          loading: false,
          reading: "The oracle's crystal ball is cloudy. Try again in a moment.",
        };
      }
    };

    // Keyboard handler
    const handleKey = (e: KeyboardEvent) => {
      // Oracle toggle [I]
      if (e.key === "i" || e.key === "I") {
        if (oracleStateRef.current.visible) {
          oracleStateRef.current = { visible: false, loading: false, reading: null };
        } else {
          callOracle();
        }
        return;
      }

      // Escape closes oracle or deselects building
      if (e.key === "Escape") {
        if (oracleStateRef.current.visible) {
          oracleStateRef.current = { visible: false, loading: false, reading: null };
          return;
        }
        if (selectedBuildingRef.current != null) {
          selectedBuildingRef.current = null;
          return;
        }
      }

      // Don't process other keys if oracle overlay is open
      if (oracleStateRef.current.visible) return;

      // Building selection [←] [→]
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const runners = trenchStateRef.current?.runners;
        if (!runners || runners.length === 0) return;

        const maxIdx = Math.min(runners.length, 10) - 1;
        const current = selectedBuildingRef.current;

        if (e.key === "ArrowRight") {
          if (current == null) {
            selectedBuildingRef.current = 0;
          } else if (current >= maxIdx) {
            selectedBuildingRef.current = null; // deselect past edge
          } else {
            selectedBuildingRef.current = current + 1;
          }
        } else {
          if (current == null) {
            selectedBuildingRef.current = maxIdx;
          } else if (current <= 0) {
            selectedBuildingRef.current = null; // deselect past edge
          } else {
            selectedBuildingRef.current = current - 1;
          }
        }
        return;
      }

      if (e.key === "w" || e.key === "W") {
        weatherRef.current = cycleWeather(weatherRef.current);
        weatherModeRef.current = "MANUAL";
      }
      if (e.key === "a" || e.key === "A") {
        if (weatherModeRef.current === "AUTO") {
          weatherModeRef.current = "MANUAL";
        } else {
          weatherModeRef.current = "AUTO";
          const data = trenchStateRef.current;
          if (data) {
            weatherRef.current = data.market.weatherType;
          }
        }
      }
      if (e.key === "d" || e.key === "D") {
        dataEnabledRef.current = !dataEnabledRef.current;
        if (!dataEnabledRef.current) {
          trenchStateRef.current = null;
        } else {
          // Immediately fetch data when toggling on
          fetchTrenchState().then((data) => {
            if (dataEnabledRef.current) {
              trenchStateRef.current = data;
              if (weatherModeRef.current === "AUTO") {
                weatherRef.current = data.market.weatherType;
              }
            }
          }).catch(() => {});
        }
      }
    };
    window.addEventListener("keydown", handleKey);

    // Start data polling
    const stopPolling = startPolling(
      (data) => {
        if (dataEnabledRef.current) {
          trenchStateRef.current = data;
          if (weatherModeRef.current === "AUTO") {
            weatherRef.current = data.market.weatherType;
          }

          // Record trend snapshot every TREND_INTERVAL
          const now = Date.now();
          if (now - lastTrendTimestamp.current >= TREND_INTERVAL || lastTrendTimestamp.current === 0) {
            lastTrendTimestamp.current = now;
            const snapshot: TrendSnapshot = {
              timestamp: now,
              buyRatio: data.market.buyRatio,
              volume5m: data.market.totalVolume5m,
              weatherType: data.market.weatherType,
            };
            trendHistoryRef.current = [
              ...trendHistoryRef.current.slice(-(MAX_TREND_SNAPSHOTS - 1)),
              snapshot,
            ];
          }

          // Record sparkline data point every SPARKLINE_INTERVAL
          if (now - lastSparklineTimestamp.current >= SPARKLINE_INTERVAL || lastSparklineTimestamp.current === 0) {
            lastSparklineTimestamp.current = now;
            sparklineDataRef.current = [
              ...sparklineDataRef.current.slice(-(MAX_SPARKLINE_POINTS - 1)),
              data.market.buyRatio,
            ];
          }
        }
      },
      (err) => console.warn("Poll error:", err)
    );

    return () => {
      engine.stop();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKey);
      stopPolling();
    };
  }, [setupScene]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: "block",
        width: "100vw",
        height: "100vh",
        background: "#000",
        cursor: "none",
      }}
    />
  );
}
