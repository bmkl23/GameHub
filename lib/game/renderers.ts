import { shapeNoise, type EnvironmentTheme } from "./environmentManager";
import type { ObstacleState, PlayerState } from "./types";

function wrap(value: number, max: number): number {
  const m = value % max;
  return m < 0 ? m + max : m;
}

// ---------------------------------------------------------------------
// Far layer — one shape language per theme (spec §20: themes should feel
// distinct, not just recolored).
// ---------------------------------------------------------------------

function drawRollingHills(
  ctx: CanvasRenderingContext2D,
  offset: number,
  color: string,
  baselineY: number,
  canvasWidth: number,
  wavelength: number,
  amplitude: number,
  seed: number
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-20, baselineY + 40);
  for (let x = -20; x <= canvasWidth + 20; x += 12) {
    const worldX = x + offset;
    const y =
      baselineY -
      amplitude * 0.5 -
      amplitude * 0.5 * Math.sin((worldX / wavelength) * Math.PI * 2 + seed);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(canvasWidth + 20, baselineY + 40);
  ctx.closePath();
  ctx.fill();
}

function drawJaggedPeaks(
  ctx: CanvasRenderingContext2D,
  offset: number,
  color: string,
  snowColor: string,
  baselineY: number,
  canvasWidth: number
) {
  const spacing = 150;
  const scrollX = offset % spacing;
  let i = Math.floor((offset - scrollX) / spacing);
  for (let x = -scrollX; x < canvasWidth + spacing; x += spacing, i++) {
    const h = 90 + shapeNoise(i, 3) * 70;
    const peakX = x + spacing / 2;
    const peakY = baselineY - h;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, baselineY);
    ctx.lineTo(peakX, peakY);
    ctx.lineTo(x + spacing, baselineY);
    ctx.closePath();
    ctx.fill();

    const capSize = h * 0.22;
    ctx.fillStyle = snowColor;
    ctx.beginPath();
    ctx.moveTo(peakX - capSize * 0.6, peakY + capSize * 0.9);
    ctx.lineTo(peakX, peakY);
    ctx.lineTo(peakX + capSize * 0.6, peakY + capSize * 0.9);
    ctx.closePath();
    ctx.fill();
  }
}

function drawSkyline(
  ctx: CanvasRenderingContext2D,
  offset: number,
  color: string,
  glowColor: string,
  baselineY: number,
  canvasWidth: number
) {
  const spacing = 70;
  const scrollX = offset % spacing;
  let i = Math.floor((offset - scrollX) / spacing);
  for (let x = -scrollX; x < canvasWidth + spacing; x += spacing, i++) {
    const h = 50 + shapeNoise(i, 5) * 110;
    const w = spacing * 0.6;
    ctx.fillStyle = color;
    ctx.fillRect(x, baselineY - h, w, h);

    if (shapeNoise(i, 6) > 0.7) {
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 1;
      ctx.globalAlpha = ctx.globalAlpha * 0.8;
      ctx.beginPath();
      ctx.moveTo(x + w / 2, baselineY - h);
      ctx.lineTo(x + w / 2, baselineY - h - 18);
      ctx.stroke();
      ctx.globalAlpha = ctx.globalAlpha / 0.8;
    }
    if (shapeNoise(i, 7) > 0.4) {
      const baseAlpha = ctx.globalAlpha;
      ctx.fillStyle = glowColor;
      ctx.globalAlpha = baseAlpha * 0.7;
      ctx.fillRect(x + w * 0.3, baselineY - h * 0.6, 3, 3);
      ctx.globalAlpha = baseAlpha;
    }
  }
}

export function drawFarLayer(
  ctx: CanvasRenderingContext2D,
  theme: EnvironmentTheme,
  offset: number,
  baselineY: number,
  canvasWidth: number
) {
  switch (theme.kind) {
    case "forest":
      drawRollingHills(ctx, offset, theme.farColor, baselineY, canvasWidth, 140, 34, 1);
      break;
    case "village":
      drawRollingHills(ctx, offset, theme.farColor, baselineY, canvasWidth, 210, 18, 4);
      break;
    case "mountain":
      drawJaggedPeaks(ctx, offset, theme.farColor, theme.detailColor, baselineY, canvasWidth);
      break;
    case "desert":
      drawRollingHills(ctx, offset, theme.farColor, baselineY, canvasWidth, 260, 46, 2);
      break;
    case "futuristic":
      drawSkyline(ctx, offset, theme.farColor, theme.detailColor, baselineY, canvasWidth);
      break;
  }
}

// ---------------------------------------------------------------------
// Mid layer — trees / buildings / structures, with a gentle wind sway on
// anything plant-like (spec §21 layer 3).
// ---------------------------------------------------------------------

function sway(index: number, animTime: number, seed: number): number {
  return Math.sin(animTime * 0.9 + shapeNoise(index, seed) * 10) * 2.2;
}

function drawForestTrees(
  ctx: CanvasRenderingContext2D,
  offset: number,
  theme: EnvironmentTheme,
  baselineY: number,
  canvasWidth: number,
  animTime: number
) {
  const spacing = 85;
  const scrollX = offset % spacing;
  let i = Math.floor((offset - scrollX) / spacing);
  for (let x = -scrollX; x < canvasWidth + spacing; x += spacing, i++) {
    const trunkH = 14 + shapeNoise(i, 2) * 8;
    const canopyR = 15 + shapeNoise(i, 4) * 12;
    const baseX = x + spacing * 0.5;
    const swayPx = sway(i, animTime, 8);

    ctx.fillStyle = theme.detailColor;
    ctx.fillRect(baseX - 3, baselineY - trunkH, 6, trunkH);

    ctx.fillStyle = theme.midColor;
    const canopyY = baselineY - trunkH - canopyR * 0.5;
    ctx.beginPath();
    ctx.arc(baseX + swayPx, canopyY, canopyR, 0, Math.PI * 2);
    ctx.arc(baseX + swayPx - canopyR * 0.55, canopyY + canopyR * 0.25, canopyR * 0.7, 0, Math.PI * 2);
    ctx.arc(baseX + swayPx + canopyR * 0.55, canopyY + canopyR * 0.25, canopyR * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMountainPines(
  ctx: CanvasRenderingContext2D,
  offset: number,
  theme: EnvironmentTheme,
  baselineY: number,
  canvasWidth: number,
  animTime: number
) {
  const spacing = 72;
  const scrollX = offset % spacing;
  let i = Math.floor((offset - scrollX) / spacing);
  for (let x = -scrollX; x < canvasWidth + spacing; x += spacing, i++) {
    const baseX = x + spacing * 0.5;
    if (shapeNoise(i, 9) < 0.3) {
      // Rock boulder
      const r = 10 + shapeNoise(i, 10) * 10;
      ctx.fillStyle = theme.midColor;
      ctx.beginPath();
      ctx.ellipse(baseX, baselineY - r * 0.6, r, r * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    const trunkH = 10;
    const swayPx = sway(i, animTime, 14);
    ctx.fillStyle = "#3a2c1e";
    ctx.fillRect(baseX - 2, baselineY - trunkH, 4, trunkH);

    ctx.fillStyle = theme.midColor;
    const tiers = 3;
    const totalH = 30 + shapeNoise(i, 11) * 22;
    const tierH = totalH / tiers;
    for (let t = 0; t < tiers; t++) {
      const tierW = (18 - t * 4) + shapeNoise(i, 12 + t) * 6;
      const tierBaseY = baselineY - trunkH - t * tierH * 0.7;
      const tipX = baseX + swayPx * (1 - t / tiers);
      ctx.beginPath();
      ctx.moveTo(baseX + swayPx * 0.3 - tierW / 2, tierBaseY);
      ctx.lineTo(tipX, tierBaseY - tierH);
      ctx.lineTo(baseX + swayPx * 0.3 + tierW / 2, tierBaseY);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawVillageHouses(
  ctx: CanvasRenderingContext2D,
  offset: number,
  theme: EnvironmentTheme,
  baselineY: number,
  canvasWidth: number
) {
  const spacing = 100;
  const scrollX = offset % spacing;
  let i = Math.floor((offset - scrollX) / spacing);
  for (let x = -scrollX; x < canvasWidth + spacing; x += spacing, i++) {
    const houseW = 38 + shapeNoise(i, 21) * 12;
    const houseH = 28 + shapeNoise(i, 22) * 16;
    const baseX = x + 6;

    ctx.fillStyle = theme.midColor;
    ctx.fillRect(baseX, baselineY - houseH, houseW, houseH);

    ctx.fillStyle = theme.detailColor;
    ctx.beginPath();
    ctx.moveTo(baseX - 4, baselineY - houseH);
    ctx.lineTo(baseX + houseW / 2, baselineY - houseH - 18);
    ctx.lineTo(baseX + houseW + 4, baselineY - houseH);
    ctx.closePath();
    ctx.fill();

    const baseAlpha = ctx.globalAlpha;
    ctx.fillStyle = "rgba(255, 214, 150, 0.55)";
    ctx.globalAlpha = baseAlpha * 0.9;
    ctx.fillRect(baseX + houseW * 0.28, baselineY - houseH * 0.62, 7, 7);
    ctx.globalAlpha = baseAlpha;

    ctx.strokeStyle = theme.detailColor;
    ctx.lineWidth = 1;
    for (let postX = baseX + houseW + 8; postX < x + spacing - 6; postX += 9) {
      ctx.beginPath();
      ctx.moveTo(postX, baselineY);
      ctx.lineTo(postX, baselineY - 9);
      ctx.stroke();
    }
  }
}

function drawDesertLife(
  ctx: CanvasRenderingContext2D,
  offset: number,
  theme: EnvironmentTheme,
  baselineY: number,
  canvasWidth: number
) {
  const spacing = 95;
  const scrollX = offset % spacing;
  let i = Math.floor((offset - scrollX) / spacing);
  for (let x = -scrollX; x < canvasWidth + spacing; x += spacing, i++) {
    const baseX = x + spacing * 0.5;
    if (shapeNoise(i, 31) > 0.45) {
      // Cactus
      const stemH = 28 + shapeNoise(i, 32) * 26;
      const stemW = 8;
      ctx.fillStyle = theme.detailColor;
      ctx.fillRect(baseX - stemW / 2, baselineY - stemH, stemW, stemH);
      if (shapeNoise(i, 33) > 0.5) {
        const armY = baselineY - stemH * 0.62;
        ctx.fillRect(baseX - stemW / 2 - 9, armY - 16, 6, 16);
        ctx.fillRect(baseX - stemW / 2 - 9, armY - 16, 9, 6);
      }
      if (shapeNoise(i, 34) > 0.6) {
        const armY = baselineY - stemH * 0.8;
        ctx.fillRect(baseX + stemW / 2 + 3, armY - 12, 6, 12);
        ctx.fillRect(baseX + stemW / 2, armY - 12, 9, 6);
      }
    } else {
      // Rock formation
      const r = 9 + shapeNoise(i, 35) * 9;
      ctx.fillStyle = theme.midColor;
      ctx.beginPath();
      ctx.ellipse(baseX, baselineY - r * 0.6, r, r * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawFuturisticPylons(
  ctx: CanvasRenderingContext2D,
  offset: number,
  theme: EnvironmentTheme,
  baselineY: number,
  canvasWidth: number,
  animTime: number
) {
  const spacing = 60;
  const scrollX = offset % spacing;
  let i = Math.floor((offset - scrollX) / spacing);
  for (let x = -scrollX; x < canvasWidth + spacing; x += spacing, i++) {
    const h = 40 + shapeNoise(i, 41) * 70;
    const w = 9 + shapeNoise(i, 42) * 7;
    const baseX = x + spacing * 0.3;

    ctx.fillStyle = theme.midColor;
    ctx.fillRect(baseX, baselineY - h, w, h);

    const pulse = 0.5 + 0.5 * Math.sin(animTime * 2 + shapeNoise(i, 43) * 10);
    const baseAlpha = ctx.globalAlpha;
    ctx.save();
    ctx.shadowColor = theme.detailColor;
    ctx.shadowBlur = 6 + 6 * pulse;
    ctx.fillStyle = theme.detailColor;
    ctx.globalAlpha = baseAlpha * (0.5 + 0.4 * pulse);
    ctx.beginPath();
    ctx.arc(baseX + w / 2, baselineY - h - 4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function drawMidLayer(
  ctx: CanvasRenderingContext2D,
  theme: EnvironmentTheme,
  offset: number,
  baselineY: number,
  canvasWidth: number,
  animTime: number
) {
  switch (theme.kind) {
    case "forest":
      drawForestTrees(ctx, offset, theme, baselineY, canvasWidth, animTime);
      break;
    case "mountain":
      drawMountainPines(ctx, offset, theme, baselineY, canvasWidth, animTime);
      break;
    case "village":
      drawVillageHouses(ctx, offset, theme, baselineY, canvasWidth);
      break;
    case "desert":
      drawDesertLife(ctx, offset, theme, baselineY, canvasWidth);
      break;
    case "futuristic":
      drawFuturisticPylons(ctx, offset, theme, baselineY, canvasWidth, animTime);
      break;
  }
}

// ---------------------------------------------------------------------
// Ambient particles — small looping motion per theme, purely decorative.
// ---------------------------------------------------------------------

export function drawAmbientParticles(
  ctx: CanvasRenderingContext2D,
  theme: EnvironmentTheme,
  animTime: number,
  canvasWidth: number,
  groundY: number
) {
  const baseAlpha = ctx.globalAlpha;

  if (theme.kind === "forest") {
    for (let i = 0; i < 9; i++) {
      const n1 = shapeNoise(i, 101);
      const n2 = shapeNoise(i, 102);
      const n3 = shapeNoise(i, 103);
      const fallSpeed = 16 + n3 * 10;
      const band = groundY * 0.6;
      const x = wrap(n1 * canvasWidth + Math.sin(animTime * 1.3 + n2 * 10) * 16, canvasWidth);
      const y = wrap(n2 * band + animTime * fallSpeed, band);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(animTime * 1.4 + n1 * 6);
      ctx.globalAlpha = baseAlpha * 0.5;
      ctx.fillStyle = "#7fb06a";
      ctx.beginPath();
      ctx.ellipse(0, 0, 4, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (theme.kind === "mountain") {
    for (let i = 0; i < 4; i++) {
      const n1 = shapeNoise(i, 111);
      const n2 = shapeNoise(i, 112);
      const speed = 6 + n2 * 4;
      const x = wrap(n1 * canvasWidth + animTime * speed, canvasWidth + 140) - 70;
      const y = groundY - 150 + n2 * 50;
      ctx.globalAlpha = baseAlpha * 0.1;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(x, y, 55, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (theme.kind === "village") {
    for (let i = 0; i < 3; i++) {
      const n1 = shapeNoise(i, 121);
      const n2 = shapeNoise(i, 122);
      const n3 = shapeNoise(i, 123);
      const cycle = groundY * 0.3;
      const riseSpeed = 12 + n3 * 6;
      const progress = wrap(animTime * riseSpeed + n2 * cycle, cycle);
      const x = n1 * canvasWidth + Math.sin(animTime * 1.1 + n1 * 8) * 6;
      const y = groundY - 46 - progress;
      ctx.globalAlpha = baseAlpha * 0.22 * (1 - progress / cycle);
      ctx.fillStyle = "#c9c4d0";
      ctx.beginPath();
      ctx.ellipse(x, y, 6 + progress * 0.02, 5 + progress * 0.02, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (theme.kind === "desert") {
    for (let i = 0; i < 12; i++) {
      const n1 = shapeNoise(i, 131);
      const n2 = shapeNoise(i, 132);
      const x = wrap(n1 * canvasWidth - animTime * 45, canvasWidth + 40) - 20;
      const y = groundY - 4 - n2 * 16;
      ctx.globalAlpha = baseAlpha * 0.35;
      ctx.fillStyle = "#d9b877";
      ctx.beginPath();
      ctx.ellipse(x, y, 2.2, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (theme.kind === "futuristic") {
    for (let i = 0; i < 18; i++) {
      const n1 = shapeNoise(i, 141);
      const n2 = shapeNoise(i, 142);
      const n3 = shapeNoise(i, 143);
      const x = n1 * canvasWidth;
      const y = n2 * groundY * 0.45;
      const twinkle = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(animTime * 2.4 + n3 * 12));
      ctx.globalAlpha = baseAlpha * twinkle * 0.8;
      ctx.fillStyle = "#bfe9ff";
      ctx.beginPath();
      ctx.ellipse(x, y, 1.4, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = baseAlpha;
}

/** Draws one theme's full decorative layer (far + mid + particles) at the
 * given alpha — used to crossfade between two themes' *shapes*, since you
 * can't interpolate geometry (a pine tree into a cactus) the way you can a
 * color (spec §20 "gradually rather than suddenly"). */
export function drawEnvironmentLayer(
  ctx: CanvasRenderingContext2D,
  theme: EnvironmentTheme,
  alpha: number,
  farOffset: number,
  midOffset: number,
  canvasWidth: number,
  groundY: number,
  animTime: number
) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  drawFarLayer(ctx, theme, farOffset, groundY - 10, canvasWidth);
  drawMidLayer(ctx, theme, midOffset, groundY, canvasWidth, animTime);
  drawAmbientParticles(ctx, theme, animTime, canvasWidth, groundY);
  ctx.restore();
}

function drawCloudPuff(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number
) {
  ctx.beginPath();
  ctx.ellipse(x, y, 26 * scale, 14 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 18 * scale, y - 6 * scale, 18 * scale, 12 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 16 * scale, y - 4 * scale, 16 * scale, 10 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Slow-scrolling cloud puffs — pure decoration (spec §22), never an obstacle. */
export function drawClouds(
  ctx: CanvasRenderingContext2D,
  parallaxOffset: number,
  canvasWidth: number,
  topY: number,
  color: string,
  seed: number
) {
  const spacing = 220;
  const scrollX = parallaxOffset % spacing;
  ctx.fillStyle = color;
  let i = Math.floor((parallaxOffset - scrollX) / spacing);
  for (let x = -scrollX; x < canvasWidth + spacing; x += spacing, i++) {
    const y = topY + shapeNoise(i, seed) * 40;
    const scale = 0.7 + shapeNoise(i, seed + 3) * 0.6;
    drawCloudPuff(ctx, x, y, scale);
  }
}

/** Soft contact shadow under the player — shrinks/fades with jump height so
 * altitude reads clearly even before the sprite itself moves much. */
export function drawGroundShadow(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  groundY: number,
  halfWidth: number,
  heightAboveGround: number,
  hmax: number
) {
  const k = Math.max(0.25, 1 - heightAboveGround / hmax);
  ctx.fillStyle = `rgba(0, 0, 0, ${0.28 * k})`;
  ctx.beginPath();
  ctx.ellipse(centerX, groundY + 3, halfWidth * k, 5 * k, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ---------------------------------------------------------------------
// Player — articulated runner (torso, head, two-segment arms/legs) instead
// of a plain box, colored the same in every theme so it always reads
// clearly against the background.
// ---------------------------------------------------------------------

export interface PlayerRenderState {
  runPhase: number; // radians; drives the leg/arm swing while grounded
  airborne: boolean;
  jumpT: number; // 0-1 progress through the current jump
}

function drawLimb(
  ctx: CanvasRenderingContext2D,
  hipX: number,
  hipY: number,
  kneeX: number,
  kneeY: number,
  footX: number,
  footY: number,
  width: number,
  color: string
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.lineTo(kneeX, kneeY);
  ctx.lineTo(footX, footY);
  ctx.stroke();
}

export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
  state: PlayerRenderState
) {
  const { x, feetY, width, height } = player;
  const cx = x + width / 2;

  const stretch = state.airborne ? 1 + 0.1 * Math.sin(Math.PI * state.jumpT) : 1;
  const bob = state.airborne ? 0 : Math.abs(Math.sin(state.runPhase)) * 1.5;

  const thighLen = height * 0.17;
  const shinLen = height * 0.15;
  const hipY = feetY - bob - shinLen * 0.15;
  const bodyHeight = height * 0.5 * stretch;
  const bodyWidth = (width * 0.62) / stretch;
  const shoulderY = hipY - bodyHeight;
  const limbColor = "#1f6f96";

  // --- Legs (two segments: thigh + shin, alternating stride) ---
  for (let legIndex = 0; legIndex < 2; legIndex++) {
    const phase = state.runPhase + (legIndex === 0 ? 0 : Math.PI);
    let thighAngle: number;
    let shinBend: number;
    if (state.airborne) {
      thighAngle = 0.35 + (legIndex === 0 ? -0.12 : 0.12);
      shinBend = 1.15;
    } else {
      thighAngle = Math.sin(phase) * 0.85;
      shinBend = Math.max(0, -Math.cos(phase)) * 1.2;
    }
    const kneeX = cx + Math.sin(thighAngle) * thighLen;
    const kneeY = hipY + Math.cos(thighAngle) * thighLen;
    const shinAngle = thighAngle + shinBend;
    const footX = kneeX + Math.sin(shinAngle) * shinLen;
    const footY = kneeY + Math.cos(shinAngle) * shinLen;
    drawLimb(ctx, cx, hipY, kneeX, kneeY, footX, footY, 4.5, limbColor);

    // Shoe
    ctx.fillStyle = "#0e2733";
    ctx.beginPath();
    ctx.ellipse(footX, footY, 4.5, 2.8, shinAngle, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Torso (tapered — shoulders wider than waist) ---
  const waistWidth = bodyWidth * 0.78;
  ctx.fillStyle = "#57c7ff";
  ctx.beginPath();
  ctx.moveTo(cx - bodyWidth / 2, shoulderY);
  ctx.lineTo(cx + bodyWidth / 2, shoulderY);
  ctx.lineTo(cx + waistWidth / 2, hipY);
  ctx.lineTo(cx - waistWidth / 2, hipY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = limbColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Simple chest shading for a touch of volume.
  const shade = ctx.createLinearGradient(cx - bodyWidth / 2, 0, cx + bodyWidth / 2, 0);
  shade.addColorStop(0, "rgba(255,255,255,0.16)");
  shade.addColorStop(0.5, "rgba(255,255,255,0)");
  shade.addColorStop(1, "rgba(0,0,0,0.12)");
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.moveTo(cx - bodyWidth / 2, shoulderY);
  ctx.lineTo(cx + bodyWidth / 2, shoulderY);
  ctx.lineTo(cx + waistWidth / 2, hipY);
  ctx.lineTo(cx - waistWidth / 2, hipY);
  ctx.closePath();
  ctx.fill();

  // --- Arms (two segments, opposite phase to the same-index leg) ---
  const upperArmLen = height * 0.12;
  const foreArmLen = height * 0.1;
  for (let armIndex = 0; armIndex < 2; armIndex++) {
    const phase = state.runPhase + (armIndex === 0 ? Math.PI : 0);
    const armAngle = state.airborne
      ? (armIndex === 0 ? -1.4 : -1.0)
      : Math.sin(phase) * 0.9;
    const shoulderX = cx + (armIndex === 0 ? -bodyWidth * 0.32 : bodyWidth * 0.32);
    const elbowX = shoulderX + Math.sin(armAngle) * upperArmLen;
    const elbowY = shoulderY + Math.cos(armAngle) * upperArmLen * 0.7 + upperArmLen * 0.3;
    const foreAngle = armAngle * 0.6 + (state.airborne ? -0.6 : 0.3);
    const handX = elbowX + Math.sin(foreAngle) * foreArmLen;
    const handY = elbowY + Math.cos(foreAngle) * foreArmLen * 0.6 + foreArmLen * 0.4;
    drawLimb(ctx, shoulderX, shoulderY + bodyHeight * 0.12, elbowX, elbowY, handX, handY, 3.2, limbColor);
  }

  // --- Head + simple hair tuft ---
  const headRadius = width * 0.24;
  const headY = shoulderY - headRadius * 0.9;
  ctx.fillStyle = "#bfe9ff";
  ctx.beginPath();
  ctx.arc(cx, headY, headRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = limbColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#1f6f96";
  ctx.beginPath();
  ctx.arc(cx - headRadius * 0.2, headY - headRadius * 0.7, headRadius * 0.7, Math.PI * 1.1, Math.PI * 1.9);
  ctx.fill();
}

// ---------------------------------------------------------------------
// Obstacles — shaped to match the current environment (rocks, a coiled
// viper, cacti, crates, energy barriers…) instead of one generic box, per
// spec §22 ("the player should learn visually which objects are
// dangerous"). A soft warm glow behind every obstacle keeps that danger
// cue consistent even as the shape itself changes with the theme.
// ---------------------------------------------------------------------

function drawDangerGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  width: number,
  height: number
) {
  const cx = x + width / 2;
  const cy = top + height / 2;
  const r = Math.max(width, height) * 0.85;
  const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
  grad.addColorStop(0, "rgba(255, 90, 60, 0.22)");
  grad.addColorStop(1, "rgba(255, 90, 60, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, width * 0.95, height * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawLogPile(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  width: number,
  height: number
) {
  const logCount = Math.max(1, Math.round(height / 24));
  const logH = height / logCount;
  for (let i = 0; i < logCount; i++) {
    const ly = top + i * logH;
    ctx.fillStyle = "#6b4a2f";
    ctx.beginPath();
    ctx.roundRect(x, ly + 1, width, logH - 2, Math.min(6, logH * 0.4));
    ctx.fill();
    ctx.fillStyle = "#9a7248";
    ctx.beginPath();
    ctx.ellipse(x + 5, ly + logH / 2, 4.5, logH * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + width - 5, ly + logH / 2, 4.5, logH * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSnake(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  width: number,
  height: number,
  animTime: number,
  seed: number
) {
  const segments = Math.max(3, Math.round(height / 16));
  const segH = height / segments;
  const cx = x + width / 2;

  for (let s = 0; s < segments; s++) {
    const sy = top + height - s * segH - segH / 2;
    const wobble = Math.sin(animTime * 2.6 + s * 0.8 + seed) * width * 0.12;
    ctx.fillStyle = "#9a5a30";
    ctx.beginPath();
    ctx.ellipse(cx + wobble, sy, width * 0.42, segH * 0.58, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5a3418";
    ctx.beginPath();
    ctx.ellipse(cx + wobble, sy, width * 0.14, segH * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const headWobble = Math.sin(animTime * 2.6 + seed) * width * 0.12;
  const headY = top + segH * 0.35;
  ctx.fillStyle = "#7a4522";
  ctx.beginPath();
  ctx.ellipse(cx + headWobble, headY, width * 0.3, height * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd94a";
  ctx.beginPath();
  ctx.arc(cx + headWobble - width * 0.1, headY - 2, 1.4, 0, Math.PI * 2);
  ctx.fill();

  if (Math.sin(animTime * 7 + seed * 3) > 0.55) {
    ctx.strokeStyle = "#ff4d4d";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + headWobble + width * 0.3, headY - 2);
    ctx.lineTo(cx + headWobble + width * 0.42, headY - 2);
    ctx.moveTo(cx + headWobble + width * 0.42, headY - 2);
    ctx.lineTo(cx + headWobble + width * 0.48, headY - 4);
    ctx.moveTo(cx + headWobble + width * 0.42, headY - 2);
    ctx.lineTo(cx + headWobble + width * 0.48, headY);
    ctx.stroke();
  }
}

function drawMossyBoulder(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  width: number,
  height: number,
  seed: number
) {
  const cx = x + width / 2;
  ctx.fillStyle = "#6e6e6e";
  ctx.beginPath();
  ctx.ellipse(cx, top + height * 0.58, width / 2, height * 0.52, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  ctx.beginPath();
  ctx.ellipse(x + width * 0.66, top + height * 0.62, width * 0.28, height * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4a7a3a";
  for (let i = 0; i < 3; i++) {
    const mx = x + width * (0.18 + i * 0.3) + shapeNoise(i, seed) * 6;
    ctx.beginPath();
    ctx.ellipse(mx, top + height * 0.32, width * 0.15, height * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRockSpire(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  width: number,
  height: number
) {
  ctx.fillStyle = "#5c6472";
  ctx.beginPath();
  ctx.moveTo(x + width * 0.1, top + height);
  ctx.lineTo(x + width * 0.35, top + height * 0.25);
  ctx.lineTo(x + width * 0.6, top);
  ctx.lineTo(x + width * 0.85, top + height * 0.4);
  ctx.lineTo(x + width, top + height);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#eaf2f7";
  ctx.beginPath();
  ctx.moveTo(x + width * 0.45, top + height * 0.32);
  ctx.lineTo(x + width * 0.6, top);
  ctx.lineTo(x + width * 0.72, top + height * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + width * 0.5, top + height * 0.5);
  ctx.lineTo(x + width * 0.4, top + height);
  ctx.stroke();
}

function drawCrate(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  width: number,
  height: number
) {
  ctx.fillStyle = "#8a6238";
  ctx.fillRect(x, top, width, height);
  ctx.strokeStyle = "#5c4020";
  ctx.lineWidth = 1.5;
  const planks = Math.max(1, Math.floor(height / 14));
  for (let i = 1; i < planks; i++) {
    const y = top + (height / planks) * i;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x + width, top + height);
  ctx.moveTo(x + width, top);
  ctx.lineTo(x, top + height);
  ctx.stroke();
  ctx.strokeRect(x, top, width, height);
}

function drawFenceGate(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  width: number,
  height: number
) {
  ctx.strokeStyle = "#7a5a3a";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + 3, top);
  ctx.lineTo(x + 3, top + height);
  ctx.moveTo(x + width - 3, top);
  ctx.lineTo(x + width - 3, top + height);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, top + height * 0.3);
  ctx.lineTo(x + width, top + height * 0.22);
  ctx.moveTo(x, top + height * 0.7);
  ctx.lineTo(x + width, top + height * 0.62);
  ctx.stroke();
}

function drawBarrel(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  width: number,
  height: number
) {
  ctx.fillStyle = "#8a6238";
  ctx.beginPath();
  ctx.roundRect(x, top, width, height, width * 0.2);
  ctx.fill();
  ctx.strokeStyle = "#3a2c1e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, top + height * 0.22);
  ctx.lineTo(x + width, top + height * 0.22);
  ctx.moveTo(x, top + height * 0.78);
  ctx.lineTo(x + width, top + height * 0.78);
  ctx.stroke();
}

function drawCactus(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  width: number,
  height: number
) {
  const cx = x + width / 2;
  const stemW = width * 0.4;
  ctx.fillStyle = "#3f7a3a";
  ctx.beginPath();
  ctx.roundRect(cx - stemW / 2, top, stemW, height, stemW * 0.4);
  ctx.fill();

  const armY = top + height * 0.32;
  ctx.beginPath();
  ctx.roundRect(cx - width * 0.46, armY - height * 0.22, stemW * 0.7, height * 0.38, stemW * 0.3);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(cx + width * 0.06, armY, stemW * 0.7, height * 0.3, stemW * 0.3);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1;
  for (let y = top + 6; y < top + height - 4; y += 9) {
    ctx.beginPath();
    ctx.moveTo(cx - stemW / 2, y);
    ctx.lineTo(cx - stemW / 2 - 3, y + 3);
    ctx.moveTo(cx + stemW / 2, y);
    ctx.lineTo(cx + stemW / 2 + 3, y + 3);
    ctx.stroke();
  }
}

function drawWeatheredRock(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  width: number,
  height: number
) {
  ctx.fillStyle = "#c4a878";
  ctx.beginPath();
  ctx.ellipse(x + width / 2, top + height * 0.56, width / 2, height * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(90,60,30,0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + width * 0.3, top + height * 0.3);
  ctx.lineTo(x + width * 0.45, top + height * 0.7);
  ctx.stroke();
}

function drawEnergyBarrier(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  width: number,
  height: number,
  animTime: number,
  seed: number
) {
  ctx.fillStyle = "rgba(122, 61, 255, 0.25)";
  ctx.fillRect(x, top, width, height);
  const beamCount = Math.max(2, Math.floor(width / 8));
  for (let i = 0; i < beamCount; i++) {
    const bx = x + (i + 0.5) * (width / beamCount);
    const pulse = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(animTime * 4 + i * 0.7 + seed));
    ctx.strokeStyle = `rgba(0, 229, 255, ${pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx, top);
    ctx.lineTo(bx, top + height);
    ctx.stroke();
  }
  ctx.strokeStyle = "#00e5ff";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, top, width, height);
}

function drawDroneBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  width: number,
  height: number,
  animTime: number,
  seed: number
) {
  ctx.fillStyle = "#3a2a6a";
  ctx.fillRect(x, top, width, height);
  ctx.strokeStyle = "#241a42";
  ctx.lineWidth = 1;
  for (let gy = top + 8; gy < top + height; gy += 10) {
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.lineTo(x + width, gy);
    ctx.stroke();
  }
  const blink = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(animTime * 5 + seed));
  ctx.fillStyle = `rgba(0, 229, 255, ${blink})`;
  ctx.beginPath();
  ctx.arc(x + width / 2, top + 8, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#00e5ff";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, top, width, height);
}

const OBSTACLE_VARIANT_COUNTS: Record<string, number> = {
  forest: 3,
  mountain: 2,
  village: 3,
  desert: 2,
  futuristic: 2,
};

/**
 * Obstacle appearance matches the current environment (spec §22 — the
 * player should learn visually which objects are dangerous, while the
 * scenery still varies with the theme). Variant is deterministic per
 * obstacle (its id), so the shape never flickers between frames; the danger
 * glow behind it stays consistent across every theme as the shared "this is
 * hazardous" cue.
 */
export function drawObstacle(
  ctx: CanvasRenderingContext2D,
  obstacle: ObstacleState,
  groundY: number,
  themeKind: EnvironmentTheme["kind"],
  animTime: number
) {
  const top = groundY - obstacle.height;
  const { x, width, height, id } = obstacle;

  drawDangerGlow(ctx, x, top, width, height);

  const variantCount = OBSTACLE_VARIANT_COUNTS[themeKind] ?? 1;
  const variant = id % variantCount;

  switch (themeKind) {
    case "forest":
      if (variant === 0) drawLogPile(ctx, x, top, width, height);
      else if (variant === 1) drawSnake(ctx, x, top, width, height, animTime, id);
      else drawMossyBoulder(ctx, x, top, width, height, id);
      break;
    case "mountain":
      if (variant === 0) drawMossyBoulder(ctx, x, top, width, height, id);
      else drawRockSpire(ctx, x, top, width, height);
      break;
    case "village":
      if (variant === 0) drawCrate(ctx, x, top, width, height);
      else if (variant === 1) drawFenceGate(ctx, x, top, width, height);
      else drawBarrel(ctx, x, top, width, height);
      break;
    case "desert":
      if (variant === 0) drawCactus(ctx, x, top, width, height);
      else drawWeatheredRock(ctx, x, top, width, height);
      break;
    case "futuristic":
      if (variant === 0) drawEnergyBarrier(ctx, x, top, width, height, animTime, id);
      else drawDroneBlock(ctx, x, top, width, height, animTime, id);
      break;
  }
}
