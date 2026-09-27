/**
 * Vertical offset above the floor at a given point in the jump.
 * Produces a parabola: 0 -> Hmax -> 0 over [0, jumpDuration].
 * See spec section 30/6.
 */
export function getJumpHeight(
  elapsedTime: number,
  jumpDuration: number,
  hMax: number
): number {
  const t = elapsedTime / jumpDuration;
  if (t >= 1) return 0;
  return hMax * 4 * t * (1 - t);
}

/**
 * "Perfect timing" bonus check (spec §34): true when V lands in the middle
 * band of the valid [Vmin, Vmax] window, not just anywhere inside it.
 */
export function isPerfectTiming(
  v: number | null,
  vMin: number | null,
  vMax: number | null
): boolean {
  if (v === null || vMin === null || vMax === null) return false;
  const range = vMax - vMin;
  const lower = vMin + range * 0.3;
  const upper = vMax - range * 0.3;
  return v >= lower && v <= upper;
}
