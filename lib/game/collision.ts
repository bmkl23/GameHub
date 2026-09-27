import { GAME_CONFIG } from "./gameConstants";
import type { ObstacleState, PlayerState } from "./types";

/** The closest obstacle whose back edge hasn't passed the player yet. */
export function findNearestObstacleAhead(
  player: PlayerState,
  obstacles: ObstacleState[]
): ObstacleState | null {
  let nearest: ObstacleState | null = null;
  for (const o of obstacles) {
    if (o.x + o.width < player.x) continue; // already passed
    if (nearest === null || o.x < nearest.x) nearest = o;
  }
  return nearest;
}

// Collision box is slightly smaller than the visible sprite (spec §19) so
// visually-fair near-misses don't feel unjust.
const INSET_X = 6;
const INSET_TOP = 8;

/**
 * Per-frame bounding-box check. This is the authoritative collision system
 * (spec §18) — the V/Vmin/Vmax timing rule is a design guideline for the
 * player and a debug aid, never a substitute for this check.
 */
export function checkCollision(
  player: PlayerState,
  obstacle: ObstacleState
): boolean {
  const playerLeft = player.x + INSET_X;
  const playerRight = player.x + player.width - INSET_X;
  const playerTop = player.feetY - player.height + INSET_TOP;
  const playerBottom = player.feetY;

  const obstacleLeft = obstacle.x;
  const obstacleRight = obstacle.x + obstacle.width;
  const obstacleTop = GAME_CONFIG.GROUND_Y - obstacle.height;
  const obstacleBottom = GAME_CONFIG.GROUND_Y;

  const horizontalOverlap =
    playerRight > obstacleLeft && playerLeft < obstacleRight;
  const verticalOverlap =
    playerBottom > obstacleTop && playerTop < obstacleBottom;

  return horizontalOverlap && verticalOverlap;
}
