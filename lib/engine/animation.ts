const TARGET_FPS = 30;
const FRAME_DURATION = 1000 / TARGET_FPS;

export class AnimationEngine {
  private rafId: number | null = null;
  private tick = 0;
  private lastTime = 0;
  private running = false;

  start(callback: (tick: number) => void) {
    this.running = true;
    this.lastTime = performance.now();
    this.tick = 0;

    const loop = (now: number) => {
      if (!this.running) return;

      const elapsed = now - this.lastTime;
      if (elapsed >= FRAME_DURATION) {
        this.lastTime = now - (elapsed % FRAME_DURATION);
        this.tick++;
        callback(this.tick);
      }

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
