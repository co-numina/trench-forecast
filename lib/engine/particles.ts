import type { Grid } from "../renderer/grid";

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  char: string;
  fg: string;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  particles: Particle[] = [];
  maxParticles: number;

  constructor(maxParticles: number = 300) {
    this.maxParticles = maxParticles;
  }

  spawn(p: Omit<Particle, "life"> & { life?: number }) {
    if (this.particles.length >= this.maxParticles) return;
    this.particles.push({
      ...p,
      life: p.life ?? p.maxLife,
    });
  }

  update(cols: number, rows: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;

      // Cull off-screen or expired
      if (p.life <= 0 || p.x < -5 || p.x > cols + 5 || p.y < -5 || p.y > rows + 5) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(grid: Grid) {
    for (const p of this.particles) {
      const col = Math.floor(p.x);
      const row = Math.floor(p.y);
      grid.set(col, row, p.char, p.fg);
    }
  }

  clear() {
    this.particles = [];
  }
}
