export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  seed: number;
}

export interface ParticleSystemState {
  particles: Particle[];
  spawnAccumulator: number;
}

export function createParticleSystemState(): ParticleSystemState {
  return { particles: [], spawnAccumulator: 0 };
}

interface ParticleProfile {
  spawnRate: number; // particles per second
  life: [number, number];
  size: [number, number];
  vx: [number, number];
  vy: [number, number];
  spawnYRange: [number, number]; // fraction of canvas height
  color: string;
}

// One ambient "weather" per theme — small motion cue that makes each
// environment feel distinct and alive, not just a different color palette.
const PROFILES: Record<string, ParticleProfile> = {
  Forest: {
    spawnRate: 1.3,
    life: [3, 5],
    size: [2, 3.5],
    vx: [-12, 8],
    vy: [12, 24],
    spawnYRange: [0.05, 0.35],
    color: "rgba(120, 180, 110, 0.8)", // falling leaves
  },
  Mountain: {
    spawnRate: 2,
    life: [4, 7],
    size: [1.5, 3],
    vx: [-22, -8],
    vy: [14, 28],
    spawnYRange: [0.02, 0.3],
    color: "rgba(230, 240, 250, 0.85)", // drifting snow
  },
  Village: {
    spawnRate: 0.55,
    life: [2, 3.5],
    size: [1.6, 2.6],
    vx: [-4, 4],
    vy: [-3, 3],
    spawnYRange: [0.35, 0.62],
    color: "rgba(255, 214, 110, 0.9)", // fireflies
  },
  Desert: {
    spawnRate: 1.6,
    life: [2, 3.2],
    size: [1, 2.2],
    vx: [-32, -18],
    vy: [-3, 3],
    spawnYRange: [0.4, 0.65],
    color: "rgba(214, 178, 128, 0.7)", // blown dust
  },
  Futuristic: {
    spawnRate: 1.1,
    life: [2.5, 4],
    size: [1.5, 2.8],
    vx: [-5, 5],
    vy: [-22, -8],
    spawnYRange: [0.3, 0.68],
    color: "rgba(140, 210, 255, 0.9)", // rising light motes
  },
};

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function updateParticles(
  state: ParticleSystemState,
  deltaSeconds: number,
  themeName: string,
  canvasWidth: number,
  canvasHeight: number
): void {
  const profile = PROFILES[themeName] ?? PROFILES.Forest;

  state.spawnAccumulator += deltaSeconds * profile.spawnRate;
  while (state.spawnAccumulator >= 1) {
    state.spawnAccumulator -= 1;
    state.particles.push({
      x: Math.random() * canvasWidth,
      y: canvasHeight * rand(profile.spawnYRange[0], profile.spawnYRange[1]),
      vx: rand(profile.vx[0], profile.vx[1]),
      vy: rand(profile.vy[0], profile.vy[1]),
      life: rand(profile.life[0], profile.life[1]),
      size: rand(profile.size[0], profile.size[1]),
      seed: Math.random() * Math.PI * 2,
    });
  }

  for (const p of state.particles) {
    p.life -= deltaSeconds;
    p.seed += deltaSeconds * 3;
    p.x += (p.vx + Math.sin(p.seed) * 6) * deltaSeconds;
    p.y += p.vy * deltaSeconds;
  }

  state.particles = state.particles.filter(
    (p) => p.life > 0 && p.x > -20 && p.x < canvasWidth + 20
  );
  if (state.particles.length > 110) {
    state.particles.splice(0, state.particles.length - 110);
  }
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  state: ParticleSystemState,
  themeName: string
): void {
  const profile = PROFILES[themeName] ?? PROFILES.Forest;
  ctx.fillStyle = profile.color;
  for (const p of state.particles) {
    const alpha = Math.min(1, p.life / 0.6);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
