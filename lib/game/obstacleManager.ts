import { GAME_CONFIG } from "./gameConstants";
import type { ObstacleState } from "./types";

export interface ObstacleManagerState {
  obstacles: ObstacleState[];
  distanceToNextSpawn: number;
  nextId: number;
}

export function createObstacleManagerState(): ObstacleManagerState {
  return {
    obstacles: [],
    distanceToNextSpawn: GAME_CONFIG.INITIAL_OBSTACLE_GAP,
    nextId: 1,
  };
}

// Distance (px) over which difficulty ramps from 0 (just started) to 1 (max).
// Gradual, per spec §24 — never spikes suddenly.
const DIFFICULTY_RAMP_DISTANCE = 8000;

/** 0 at the start of a run, 1 once fully ramped up. */
export function getDifficulty(distanceTravelled: number): number {
  return Math.min(1, Math.max(0, distanceTravelled / DIFFICULTY_RAMP_DISTANCE));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function randomHeight(difficulty: number): number {
  const { MIN_OBSTACLE_HEIGHT, MAX_OBSTACLE_HEIGHT } = GAME_CONFIG;
  // Early on, only small/medium obstacles appear. As difficulty ramps up,
  // the full height range (still always H < Hmax, spec §7) opens up.
  const rangeTop = lerp(MIN_OBSTACLE_HEIGHT, MAX_OBSTACLE_HEIGHT, difficulty);
  return Math.round(MIN_OBSTACLE_HEIGHT + Math.random() * (rangeTop - MIN_OBSTACLE_HEIGHT));
}

function randomWidth(difficulty: number): number {
  // Wider obstacles become slightly more common at higher difficulty (spec §24).
  const base = 30 + Math.random() * 40; // 30-70px
  return Math.round(base + difficulty * 15);
}

/**
 * Gap (px) before the next spawn. Shrinks as difficulty rises (spec §24),
 * but is anchored to the jump's actual *horizontal* travel distance
 * (RUN_SPEED × JUMP_DURATION), not Hmax. Hmax only bounds how *high* a
 * single jump goes — it says nothing about how far it travels — so basing
 * the gap on it (the old formula) could shrink the spacing below one full
 * jump's travel distance at high difficulty, making back-to-back obstacles
 * mechanically impossible to clear independently. This keeps a landing
 * buffer on top of the travel distance at every difficulty level so two
 * obstacles are never spawned closer than one full jump-and-land cycle
 * allows (spec §23: "every generated obstacle must provide a theoretically
 * achievable jump").
 */
function randomGap(difficulty: number): number {
  const { RUN_SPEED, JUMP_DURATION } = GAME_CONFIG;
  const jumpTravel = RUN_SPEED * (JUMP_DURATION / 1000); // px covered during one full jump

  const minGap = lerp(jumpTravel + 300, jumpTravel + 150, difficulty);
  const maxGap = lerp(jumpTravel + 550, jumpTravel + 320, difficulty);
  return minGap + Math.random() * (maxGap - minGap);
}

/** Mutates `state` in place: advances existing obstacles and spawns new ones. */
export function updateObstacles(
  state: ObstacleManagerState,
  deltaSeconds: number,
  canvasWidth: number,
  difficulty: number
): void {
  const moveBy = GAME_CONFIG.RUN_SPEED * deltaSeconds;

  state.obstacles = state.obstacles
    .map((o) => ({ ...o, x: o.x - moveBy }))
    .filter((o) => o.x + o.width > -50);

  state.distanceToNextSpawn -= moveBy;
  if (state.distanceToNextSpawn <= 0) {
    state.obstacles.push({
      id: state.nextId++,
      x: canvasWidth + 20,
      width: randomWidth(difficulty),
      height: randomHeight(difficulty),
    });
    state.distanceToNextSpawn = randomGap(difficulty);
  }
}
