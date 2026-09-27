export type GameState = "ready" | "running" | "jumping" | "gameOver";

export interface PlayerState {
  /** Fixed horizontal screen position (the world scrolls, not the player) */
  x: number;
  /** Y position of the player's feet, measured from the top of the canvas */
  feetY: number;
  width: number;
  height: number;
  /** Elapsed time (ms) since the current jump started; null when grounded */
  jumpElapsed: number | null;
}

export interface ObstacleState {
  id: number;
  x: number;
  width: number;
  height: number;
}

export interface DebugInfo {
  hmax: number;
  h: number | null;
  v: number | null;
  vMin: number | null;
  vMax: number | null;
  status: "idle" | "valid" | "too-late" | "too-early";
}
