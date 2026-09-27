"use client";

import { useEffect, useRef, useState } from "react";
import { GAME_CONFIG } from "@/lib/game/gameConstants";
import { getJumpHeight, isPerfectTiming } from "@/lib/game/physics";
import { checkCollision, findNearestObstacleAhead } from "@/lib/game/collision";
import {
  createObstacleManagerState,
  getDifficulty,
  updateObstacles,
} from "@/lib/game/obstacleManager";
import {
  blendTheme,
  getThemeBlend,
  getThemeSegmentIndex,
} from "@/lib/game/environmentManager";
import {
  drawClouds,
  drawEnvironmentLayer,
  drawGroundShadow,
  drawObstacle,
  drawPlayer,
} from "@/lib/game/renderers";
import type { DebugInfo, GameState, PlayerState } from "@/lib/game/types";
import JumpButton from "./JumpButton";
import ScoreBoard from "./ScoreBoard";
import GameOver from "./GameOver";
import ReadyScreen from "./ReadyScreen";

function createInitialPlayer(): PlayerState {
  return {
    x: GAME_CONFIG.PLAYER_SCREEN_X,
    feetY: GAME_CONFIG.GROUND_Y,
    width: GAME_CONFIG.PLAYER_WIDTH,
    height: GAME_CONFIG.PLAYER_HEIGHT,
    jumpElapsed: null,
  };
}

function createIdleDebugInfo(): DebugInfo {
  return {
    hmax: GAME_CONFIG.HMAX,
    h: null,
    v: null,
    vMin: null,
    vMax: null,
    status: "idle",
  };
}

/**
 * Core game loop for Nexora Game 01.
 *
 * High-frequency state (player, obstacles, world scroll, score, timestamps)
 * lives in refs so we never trigger a React re-render 60x/second (spec §27).
 * React state is reserved for what the UI actually needs to redraw for:
 * the game-state label, the live score/level readout, and the ready /
 * game-over screens — matching the READY → RUNNING → JUMPING → GAME_OVER
 * state machine from spec §25.
 */
export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  const worldOffsetRef = useRef(0);
  const playerRef = useRef<PlayerState>(createInitialPlayer());
  const obstacleManagerRef = useRef(createObstacleManagerState());
  const scoreRef = useRef(0);
  const jumpRequestedRef = useRef(false);
  const debugInfoRef = useRef<DebugInfo>(createIdleDebugInfo());
  const streakRef = useRef(0);
  const lastEnvSegmentRef = useRef(0);
  const bonusPopupRef = useRef<{ text: string; ttl: number } | null>(null);
  const dustParticlesRef = useRef<
    { x: number; y: number; vx: number; vy: number; ttl: number; size: number }[]
  >([]);

  const [gameState, setGameState] = useState<GameState>("ready");
  const [displayScore, setDisplayScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [environmentName, setEnvironmentName] = useState(
    "Forest"
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ctx: CanvasRenderingContext2D = context;

    function endGame() {
      setFinalScore(Math.floor(scoreRef.current));
      setGameState("gameOver");
    }

    function update(deltaSeconds: number) {
      if (gameState !== "running" && gameState !== "jumping") return;

      const player = playerRef.current;

      worldOffsetRef.current += GAME_CONFIG.RUN_SPEED * deltaSeconds;
      scoreRef.current += GAME_CONFIG.RUN_SPEED * deltaSeconds * 0.1;

      // Start a jump only if grounded (spec §4: no repeated jumps mid-air).
      if (jumpRequestedRef.current) {
        jumpRequestedRef.current = false;
        if (player.jumpElapsed === null) {
          player.jumpElapsed = 0;
          setGameState("jumping");

          // Snapshot the timing rule at the moment the jump starts (spec §31/§38).
          const nearest = findNearestObstacleAhead(
            player,
            obstacleManagerRef.current.obstacles
          );
          if (nearest) {
            const v = nearest.x - (player.x + player.width);
            const vMin = nearest.height;
            const vMax = 2 * GAME_CONFIG.HMAX - nearest.height;
            debugInfoRef.current = {
              hmax: GAME_CONFIG.HMAX,
              h: nearest.height,
              v,
              vMin,
              vMax,
              status: v < vMin ? "too-late" : v > vMax ? "too-early" : "valid",
            };
          } else {
            debugInfoRef.current = createIdleDebugInfo();
          }
        }
      }

      // Advance the jump along the parabola.
      let justLanded = false;
      let landedWithTarget = false;
      let landedPerfect = false;
      if (player.jumpElapsed !== null) {
        player.jumpElapsed += deltaSeconds * 1000;

        if (player.jumpElapsed >= GAME_CONFIG.JUMP_DURATION) {
          player.jumpElapsed = null;
          player.feetY = GAME_CONFIG.GROUND_Y;
          setGameState("running");
          justLanded = true;
          landedWithTarget = debugInfoRef.current.h !== null;
          landedPerfect = isPerfectTiming(
            debugInfoRef.current.v,
            debugInfoRef.current.vMin,
            debugInfoRef.current.vMax
          );
        } else {
          const offset = getJumpHeight(
            player.jumpElapsed,
            GAME_CONFIG.JUMP_DURATION,
            GAME_CONFIG.HMAX
          );
          player.feetY = GAME_CONFIG.GROUND_Y - offset;
        }
      }

      // Obstacles: move + spawn, with gradually ramping difficulty (spec §24).
      const difficulty = getDifficulty(worldOffsetRef.current);
      updateObstacles(
        obstacleManagerRef.current,
        deltaSeconds,
        GAME_CONFIG.CANVAS_WIDTH,
        difficulty
      );

      // Authoritative collision check every frame (spec §18/§32).
      let collided = false;
      for (const obstacle of obstacleManagerRef.current.obstacles) {
        if (checkCollision(player, obstacle)) {
          collided = true;
          break;
        }
      }

      if (collided) {
        streakRef.current = 0;
        endGame();
        return;
      }

      // Landing dust burst — grounds the jump with a bit of environment
      // reaction, every landing (not just ones that cleared an obstacle).
      if (justLanded) {
        const footX = player.x + player.width / 2;
        for (let i = 0; i < 6; i++) {
          const angle = Math.PI + (Math.random() - 0.5) * Math.PI * 0.9;
          const speed = 40 + Math.random() * 70;
          dustParticlesRef.current.push({
            x: footX,
            y: GAME_CONFIG.GROUND_Y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 20,
            ttl: 0.35 + Math.random() * 0.2,
            size: 2 + Math.random() * 2.5,
          });
        }
      }
      dustParticlesRef.current = dustParticlesRef.current.filter((p) => {
        p.ttl -= deltaSeconds;
        if (p.ttl <= 0) return false;
        p.x += p.vx * deltaSeconds;
        p.y += p.vy * deltaSeconds;
        p.vy += 220 * deltaSeconds; // gravity
        return true;
      });

      // Score bonuses (spec §34) — only once we know this frame was clean.
      if (justLanded && landedWithTarget) {
        scoreRef.current += 10; // successful jump
        streakRef.current += 1;
        let popup = "+10";

        if (landedPerfect) {
          scoreRef.current += 25; // perfect timing
          popup = "+25 PERFECT!";
        }
        if (streakRef.current > 0 && streakRef.current % 5 === 0) {
          scoreRef.current += 50; // obstacle streak
          popup = `${popup} · +50 STREAK x${streakRef.current}`;
        }
        bonusPopupRef.current = { text: popup, ttl: 1.1 };
      }

      // Environment milestone (spec §34) — first frame a new theme segment
      // is entered.
      const segment = getThemeSegmentIndex(worldOffsetRef.current);
      if (segment > lastEnvSegmentRef.current) {
        lastEnvSegmentRef.current = segment;
        scoreRef.current += 100;
        bonusPopupRef.current = { text: "+100 NEW ENVIRONMENT!", ttl: 1.4 };
      }

      if (bonusPopupRef.current) {
        bonusPopupRef.current.ttl -= deltaSeconds;
        if (bonusPopupRef.current.ttl <= 0) bonusPopupRef.current = null;
      }
    }

    function render() {
      const { CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y } = GAME_CONFIG;

      const blend = getThemeBlend(worldOffsetRef.current);
      const skyColors = blendTheme(blend); // color-only blend, fine for a gradient
      const animTime = worldOffsetRef.current / GAME_CONFIG.RUN_SPEED; // pauses naturally when not running

      // Sky (spec §21 layer 1 — effectively static, no parallax scroll).
      const skyGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      skyGradient.addColorStop(0, skyColors.skyTop);
      skyGradient.addColorStop(1, skyColors.skyBottom);
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Clouds — pure decoration (spec §22). Futuristic uses its own
      // twinkling-star particles instead (drawn as part of the layer below).
      if (blend.current.kind !== "futuristic") {
        drawClouds(ctx, worldOffsetRef.current * 0.05, CANVAS_WIDTH, 70, "rgba(255, 255, 255, 0.10)", 9);
      }
      if (blend.t > 0 && blend.next.kind !== "futuristic" && blend.next.kind !== blend.current.kind) {
        ctx.save();
        ctx.globalAlpha = blend.t;
        drawClouds(ctx, worldOffsetRef.current * 0.05, CANVAS_WIDTH, 70, "rgba(255, 255, 255, 0.10)", 9);
        ctx.restore();
      }

      // Far + mid + particle layers — shapes crossfade via alpha (not color
      // blending) since geometry can't be interpolated, only faded (spec §20).
      const farOffset = worldOffsetRef.current * 0.15;
      const midOffset = worldOffsetRef.current * 0.4;
      drawEnvironmentLayer(
        ctx,
        blend.current,
        1 - blend.t,
        farOffset,
        midOffset,
        CANVAS_WIDTH,
        GROUND_Y,
        animTime
      );
      if (blend.t > 0) {
        drawEnvironmentLayer(
          ctx,
          blend.next,
          blend.t,
          farOffset,
          midOffset,
          CANVAS_WIDTH,
          GROUND_Y,
          animTime
        );
      }

      // Ground line
      ctx.strokeStyle = "#3a4a5c";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
      ctx.stroke();

      // Ground detail — layer 4, scrolls at full world speed (spec §21).
      const dashSpacing = 40;
      const scrollX = worldOffsetRef.current % dashSpacing;
      ctx.fillStyle = skyColors.groundAccent;
      for (let x = -scrollX; x < CANVAS_WIDTH; x += dashSpacing) {
        ctx.beginPath();
        ctx.ellipse(x + 10, GROUND_Y + 9, 9, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Obstacles — layer 5, full world speed (spec §21). Shape matches the
      // current environment (rock/snake/cactus/etc., spec §22).
      for (const o of obstacleManagerRef.current.obstacles) {
        drawObstacle(ctx, o, GROUND_Y, blend.current.kind, animTime);
      }

      // Player — layer 6, stays put on screen (spec §21).
      const p = playerRef.current;
      const heightAboveGround = GROUND_Y - p.feetY;
      drawGroundShadow(
        ctx,
        p.x + p.width / 2,
        GROUND_Y,
        p.width / 2,
        heightAboveGround,
        GAME_CONFIG.HMAX
      );
      drawPlayer(ctx, p, {
        runPhase: worldOffsetRef.current / 12,
        airborne: p.jumpElapsed !== null,
        jumpT: p.jumpElapsed !== null ? p.jumpElapsed / GAME_CONFIG.JUMP_DURATION : 0,
      });

      // Landing dust particles.
      for (const dp of dustParticlesRef.current) {
        const alpha = Math.max(0, Math.min(1, dp.ttl / 0.3));
        ctx.fillStyle = `rgba(210, 200, 185, ${alpha * 0.6})`;
        ctx.beginPath();
        ctx.ellipse(dp.x, dp.y, dp.size, dp.size * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Bonus feedback popup (spec §34/§40: "satisfying jump feedback").
      const popup = bonusPopupRef.current;
      if (popup) {
        const alpha = Math.max(0, Math.min(1, popup.ttl / 0.35));
        ctx.font = "bold 14px monospace";
        ctx.fillStyle = `rgba(255, 224, 102, ${alpha})`;
        ctx.textAlign = "left";
        ctx.fillText(popup.text, p.x - 10, p.feetY - p.height - 14);
        ctx.textAlign = "start";
      }

      if (debugEnabled) {
        ctx.strokeStyle = "#ffe066";
        ctx.lineWidth = 1;
        ctx.strokeRect(
          p.x + 6,
          p.feetY - p.height + 8,
          p.width - 12,
          p.height - 8
        );
        for (const o of obstacleManagerRef.current.obstacles) {
          ctx.strokeRect(o.x, GROUND_Y - o.height, o.width, o.height);
        }

        const d = debugInfoRef.current;
        ctx.font = "12px monospace";
        ctx.fillStyle = "#ffe066";
        const lines = [
          `Hmax: ${d.hmax}`,
          `H: ${d.h ?? "-"}`,
          `V: ${d.v !== null ? Math.round(d.v) : "-"}`,
          `Vmin: ${d.vMin ?? "-"}`,
          `Vmax: ${d.vMax ?? "-"}`,
          `Status: ${d.status.toUpperCase()}`,
        ];
        lines.forEach((line, i) => {
          ctx.fillText(line, 10, 20 + i * 15);
        });
      }
    }

    function loop(timestamp: number) {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }
      const deltaSeconds = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      update(deltaSeconds);
      render();

      rafIdRef.current = requestAnimationFrame(loop);
    }

    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      lastTimestampRef.current = null;
    };
  }, [gameState, debugEnabled]);

  // Sync the live score/level/environment display a few times a second —
  // not every frame (spec §27) — while a run is in progress.
  useEffect(() => {
    if (gameState === "gameOver" || gameState === "ready") return;
    const id = setInterval(() => {
      setDisplayScore(Math.floor(scoreRef.current));
      setLevel(1 + Math.floor(getDifficulty(worldOffsetRef.current) * 4));
      const blend = getThemeBlend(worldOffsetRef.current);
      setEnvironmentName(blend.t < 0.5 ? blend.current.name : blend.next.name);
    }, 150);
    return () => clearInterval(id);
  }, [gameState]);

  function handleJump() {
    jumpRequestedRef.current = true;
  }

  function handleStart() {
    setGameState("running");
  }

  function handleRestart() {
    playerRef.current = createInitialPlayer();
    obstacleManagerRef.current = createObstacleManagerState();
    worldOffsetRef.current = 0;
    scoreRef.current = 0;
    jumpRequestedRef.current = false;
    debugInfoRef.current = createIdleDebugInfo();
    streakRef.current = 0;
    lastEnvSegmentRef.current = 0;
    bonusPopupRef.current = null;
    dustParticlesRef.current = [];
    setDisplayScore(0);
    setLevel(1);
    setEnvironmentName("Forest");
    setGameState("running");
  }

  return (
    <div className="game-shell">
      <div className="game-canvas-wrap">
        <canvas
          ref={canvasRef}
          width={GAME_CONFIG.CANVAS_WIDTH}
          height={GAME_CONFIG.CANVAS_HEIGHT}
          className="game-canvas"
        />
        {gameState !== "ready" && (
          <ScoreBoard score={displayScore} level={level} />
        )}
        {gameState === "ready" && <ReadyScreen onStart={handleStart} />}
        {gameState === "gameOver" && (
          <GameOver score={finalScore} onRestart={handleRestart} />
        )}
      </div>
      <div className="game-hud">
        <span>
          state: {gameState} · env: {environmentName}
        </span>
        <button type="button" onClick={() => setDebugEnabled((v) => !v)}>
          Debug: {debugEnabled ? "ON" : "OFF"}
        </button>
      </div>
      <JumpButton
        onJump={handleJump}
        disabled={gameState === "gameOver" || gameState === "ready"}
      />
    </div>
  );
}
