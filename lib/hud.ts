import type { Layer, SceneState } from "./renderer/scene";
import type { Grid } from "./renderer/grid";

/**
 * HUD layer — removed.
 * All metrics are displayed via the MetricsPanelLayer and HotTokensPanelLayer.
 * This is kept as a no-op so imports don't break.
 */
export class HudLayer implements Layer {
  draw(_grid: Grid, _state: SceneState, _tick: number) {
    // No-op — metrics panel handles all display
  }
}
