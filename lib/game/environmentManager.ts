export type ThemeKind = "forest" | "mountain" | "village" | "desert" | "futuristic";

export interface EnvironmentTheme {
  name: string;
  kind: ThemeKind;
  skyTop: string;
  skyBottom: string;
  farColor: string; // distant silhouette layer (hills/peaks/dunes/skyline)
  midColor: string; // closer silhouette layer (trees/buildings/structures)
  detailColor: string; // accent — snow caps / roofs / cactus green / neon glow
  groundAccent: string; // tint for the scrolling ground detail
}

// Five themes per spec §20 — each with its own shape language (drawn in
// lib/game/renderers.ts), not just a different color over the same shapes.
export const ENVIRONMENT_THEMES: EnvironmentTheme[] = [
  {
    name: "Forest",
    kind: "forest",
    skyTop: "#0f2a3d",
    skyBottom: "#1c4a5c",
    farColor: "#20402f",
    midColor: "#2c5a3f",
    detailColor: "#4a3220",
    groundAccent: "#2f5c3f",
  },
  {
    name: "Mountain",
    kind: "mountain",
    skyTop: "#0c2340",
    skyBottom: "#1d3f66",
    farColor: "#2c4260",
    midColor: "#324a5c",
    detailColor: "#eaf2f7",
    groundAccent: "#3a5068",
  },
  {
    name: "Village",
    kind: "village",
    skyTop: "#241c34",
    skyBottom: "#443457",
    farColor: "#362c48",
    midColor: "#4a3d5e",
    detailColor: "#c96a4a",
    groundAccent: "#584a6a",
  },
  {
    name: "Desert",
    kind: "desert",
    skyTop: "#3a2410",
    skyBottom: "#7a4d28",
    farColor: "#6b4726",
    midColor: "#8a5c32",
    detailColor: "#4a7a3a",
    groundAccent: "#8a6238",
  },
  {
    name: "Futuristic",
    kind: "futuristic",
    skyTop: "#08081a",
    skyBottom: "#160c34",
    farColor: "#241a42",
    midColor: "#33245c",
    detailColor: "#00e5ff",
    groundAccent: "#7a3dff",
  },
];

// Distance (px) each theme "owns" before crossfading into the next one, and
// how much of that stretch is spent blending. Spec §20: "gradually rather
// than suddenly".
export const THEME_DISTANCE = 4500;
const TRANSITION_DISTANCE = 900;

/** Which theme segment a given distance falls in — used to detect the
 * moment a run crosses into a new environment (spec §34 "environment
 * milestone" bonus). */
export function getThemeSegmentIndex(distance: number): number {
  return Math.floor(distance / THEME_DISTANCE);
}

export interface ThemeBlend {
  current: EnvironmentTheme;
  next: EnvironmentTheme;
  t: number; // 0 = fully `current`, 1 = fully `next`
}

export function getThemeBlend(distance: number): ThemeBlend {
  const segment = Math.floor(distance / THEME_DISTANCE);
  const posInSegment = distance % THEME_DISTANCE;
  const current = ENVIRONMENT_THEMES[segment % ENVIRONMENT_THEMES.length];
  const next = ENVIRONMENT_THEMES[(segment + 1) % ENVIRONMENT_THEMES.length];

  const transitionStart = THEME_DISTANCE - TRANSITION_DISTANCE;
  const t =
    posInSegment > transitionStart
      ? (posInSegment - transitionStart) / TRANSITION_DISTANCE
      : 0;

  return { current, next, t };
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bch = Math.round(ab + (bb - ab) * t);
  return `rgb(${r}, ${g}, ${bch})`;
}

/** Interpolated *colors* only (sky gradient, ground tint) — used for things
 * that are still a single shape and can genuinely blend. Shape geometry
 * (far/mid layers) crossfades a different way — see drawEnvironmentLayer in
 * renderers.ts — because you can't "lerp" a pine tree into a cactus. */
export function blendTheme(blend: ThemeBlend): EnvironmentTheme {
  const { current, next, t } = blend;
  if (t <= 0) return current;
  return {
    name: t < 0.5 ? current.name : next.name,
    kind: t < 0.5 ? current.kind : next.kind,
    skyTop: lerpColor(current.skyTop, next.skyTop, t),
    skyBottom: lerpColor(current.skyBottom, next.skyBottom, t),
    farColor: lerpColor(current.farColor, next.farColor, t),
    midColor: lerpColor(current.midColor, next.midColor, t),
    detailColor: lerpColor(current.detailColor, next.detailColor, t),
    groundAccent: lerpColor(current.groundAccent, next.groundAccent, t),
  };
}

/** Deterministic pseudo-random value in [0, 1) for a given shape index, so
 * parallax silhouettes and particles look varied but don't jitter frame to
 * frame. */
export function shapeNoise(index: number, seed: number): number {
  const x = Math.sin(index * 12.9898 * seed + 78.233) * 43758.5453;
  return x - Math.floor(x);
}
