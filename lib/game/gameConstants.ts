/**
 * Central configuration for Nexora Game 01.
 * Tune these values during gameplay testing rather than scattering
 * magic numbers through the game code.
 */
export const GAME_CONFIG = {
  // World / running
  RUN_SPEED: 300, // px/sec, constant horizontal world speed (Vrun)

  // Jump physics
  HMAX: 150, // px, constant max jump height for every jump
  JUMP_DURATION: 1000, // ms, total jump duration (Tj)

  // Player
  PLAYER_WIDTH: 40,
  PLAYER_HEIGHT: 60,
  PLAYER_SCREEN_X: 120, // fixed horizontal position of the player on screen

  // Ground
  GROUND_Y: 500, // px from top of canvas; player.feetY == GROUND_Y when grounded

  // Obstacles (used from step 6 onward)
  MIN_OBSTACLE_HEIGHT: 30,
  MAX_OBSTACLE_HEIGHT: 120,
  INITIAL_OBSTACLE_GAP: 500,

  // Canvas
  CANVAS_WIDTH: 900,
  CANVAS_HEIGHT: 560,
} as const;
