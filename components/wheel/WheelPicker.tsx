'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Font stacks (no external network fetch required at build time).
// If you'd like the exact Baloo 2 / Space Grotesk look, add them via
// next/font/google once deployed to an environment with internet access
// during build, or self-host the .woff2 files with next/font/local.
const FONT_VARS_CLASS = 'wheelPickerFontVars';

type Segment = {
  d: string;
  fill: string;
  textFill: string;
  fontSize: number;
  transform: string;
  label: string;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rot: number;
  vr: number;
  life: number;
};

const CX = 200;
const CY = 200;
const R = 163;
const SEG_COUNT = 8;
const PRIZE_INDEX = 3;
const BASE_PALETTE = ['#5AC8FA', '#F6C945', '#7BE8B8', '#B98CF2'];
const SEG_ANGLE = 360 / SEG_COUNT;

function toXY(deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) };
}

function segmentAtPointer(finalRotationDeg: number) {
  const normalized = ((finalRotationDeg % 360) + 360) % 360;
  const originAngle = (360 - normalized) % 360;
  return Math.floor(originAngle / SEG_ANGLE) % SEG_COUNT;
}

export default function WheelPicker() {
  const [spinning, setSpinning] = useState(false);
  const [statusText, setStatusText] = useState('Click the wheel to spin');
  const [statusLive, setStatusLive] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const wheelGroupRef = useRef<SVGGElement>(null);
  const wheelWrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const currentRotationRef = useRef(0);
  const spinningRef = useRef(false);
  const confettiParticlesRef = useRef<Particle[]>([]);
  const confettiRAFRef = useRef<number | null>(null);

  const segments = useMemo<Segment[]>(() => {
    const list: Segment[] = [];
    for (let i = 0; i < SEG_COUNT; i++) {
      const start = i * SEG_ANGLE;
      const end = start + SEG_ANGLE;
      const p1 = toXY(start);
      const p2 = toXY(end);
      const largeArc = SEG_ANGLE > 180 ? 1 : 0;
      const d = `M ${CX} ${CY} L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${R} ${R} 0 ${largeArc} 1 ${p2.x.toFixed(
        2
      )} ${p2.y.toFixed(2)} Z`;
      const isPrize = i === PRIZE_INDEX;
      const mid = start + SEG_ANGLE / 2;
      list.push({
        d,
        fill: isPrize ? 'url(#prizeGrad)' : BASE_PALETTE[i % BASE_PALETTE.length],
        textFill: isPrize ? '#ffffff' : '#1c1730',
        fontSize: isPrize ? 15 : 12,
        transform: `rotate(${mid} ${CX} ${CY})`,
        label: isPrize ? 'PRIZE' : 'Try Again',
      });
    }
    return list;
  }, []);

  // --- tick sound (Web Audio, no external files) ---
  const tick = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      const audioCtx = audioCtxRef.current;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.value = 1400;
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.05);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.05);
    } catch (e) {
      // ignore — audio is a nice-to-have
    }
  }, []);

  // --- confetti canvas sizing ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (confettiRAFRef.current) cancelAnimationFrame(confettiRAFRef.current);
    };
  }, []);

  const confettiLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of confettiParticlesRef.current) {
      if (!p) continue;
      p.vy += 0.22;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life++;
      if (p.y < canvas.height + 20 && p.life < 260) {
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
    }
    if (alive) {
      confettiRAFRef.current = requestAnimationFrame(confettiLoop);
    } else {
      confettiParticlesRef.current = [];
      confettiRAFRef.current = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const burstConfetti = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const colors = [...BASE_PALETTE, '#ff3b30'];
    for (let i = 0; i < 140; i++) {
      confettiParticlesRef.current.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 120,
        y: canvas.height * 0.35,
        vx: (Math.random() - 0.5) * 9,
        vy: -6 - Math.random() * 6,
        size: 5 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * 360,
        vr: (Math.random() - 0.5) * 12,
        life: 0,
      });
    }
    if (!confettiRAFRef.current) confettiRAFRef.current = requestAnimationFrame(confettiLoop);
  }, [confettiLoop]);

  const finishSpin = useCallback(() => {
    const idx = segmentAtPointer(currentRotationRef.current);
    spinningRef.current = false;
    setSpinning(false);

    if (idx === PRIZE_INDEX) {
      setStatusText('Click the wheel to spin');
      setStatusLive(true);
      setModalOpen(true);
      burstConfetti();
    } else {
      setStatusText('So close — spin again');
      setStatusLive(false);
      setTimeout(() => {
        setStatusText('Click the wheel to spin');
        setStatusLive(true);
      }, 1600);
    }
  }, [burstConfetti]);

  const spin = useCallback(() => {
    if (spinningRef.current) return;
    spinningRef.current = true;
    setSpinning(true);
    setStatusText('Spinning…');
    setStatusLive(true);

    const accelDuration = 900 + Math.random() * 250;
    const decelDuration = 5300 + Math.random() * 1000;
    const topSpeed = 560 + Math.random() * 160;
    const decelPower = 3.4;
    const totalDuration = accelDuration + decelDuration;

    let startTime: number | null = null;
    let angle = currentRotationRef.current;
    let lastTickBoundary = Math.floor(angle / SEG_ANGLE);
    let lastTime: number | null = null;
    let lastSpeed: number | undefined;

    function frame(now: number) {
      if (startTime === null) startTime = now;
      let elapsed = now - startTime;
      if (elapsed > totalDuration) elapsed = totalDuration;

      let speed: number;
      if (elapsed < accelDuration) {
        const a = elapsed / accelDuration;
        speed = topSpeed * (a * a);
      } else {
        const d = (elapsed - accelDuration) / decelDuration;
        speed = topSpeed * Math.pow(1 - d, decelPower);
      }

      const dt = lastTime ? (now - lastTime) / 1000 : 0;
      const avgSpeed = lastSpeed !== undefined ? (lastSpeed + speed) / 2 : speed;
      angle += avgSpeed * dt;
      lastTime = now;
      lastSpeed = speed;

      const boundary = Math.floor(angle / SEG_ANGLE);
      if (boundary !== lastTickBoundary) {
        tick();
        lastTickBoundary = boundary;
      }

      if (wheelGroupRef.current) {
        wheelGroupRef.current.style.transform = `rotate(${angle}deg)`;
      }

      if (elapsed < totalDuration) {
        requestAnimationFrame(frame);
      } else {
        currentRotationRef.current = angle;
        finishSpin();
      }
    }
    requestAnimationFrame(frame);
  }, [finishSpin, tick]);

  const handleWheelWrapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.id !== 'hubBtn') spin();
  };

  const handleSpinAgain = () => {
    setModalOpen(false);
    setTimeout(spin, 250);
  };

  return (
    <div className={`${FONT_VARS_CLASS} wheelPickerRoot`}>
      <div className="app">
        <h1>Wheel Picker</h1>

        <div className="wheel-col">
          <div className="wheel-wrap" id="wheelWrap" ref={wheelWrapRef} onClick={handleWheelWrapClick}>
            <svg viewBox="0 0 400 400">
              <defs>
                <linearGradient id="bezelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="30%" stopColor="#eef0f5" />
                  <stop offset="55%" stopColor="#aeb2c2" />
                  <stop offset="75%" stopColor="#eef0f5" />
                  <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>
                <linearGradient id="pointerGradLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#eef0f5" />
                </linearGradient>
                <linearGradient id="pointerGradRight" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#e4e7ef" />
                  <stop offset="100%" stopColor="#c3c8d6" />
                </linearGradient>
                <radialGradient id="prizeGrad" cx="40%" cy="35%" r="75%">
                  <stop offset="0%" stopColor="#ff8a80" />
                  <stop offset="45%" stopColor="#ff3b30" />
                  <stop offset="100%" stopColor="#b3140a" />
                </radialGradient>
                <radialGradient id="glossHighlight" cx="35%" cy="28%" r="65%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity=".6" />
                  <stop offset="45%" stopColor="#ffffff" stopOpacity=".14" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="edgeShade" cx="50%" cy="50%" r="50%">
                  <stop offset="68%" stopColor="#000000" stopOpacity="0" />
                  <stop offset="92%" stopColor="#000000" stopOpacity=".14" />
                  <stop offset="100%" stopColor="#000000" stopOpacity=".32" />
                </radialGradient>
              </defs>

              <circle cx="200" cy="200" r="180" fill="url(#bezelGrad)" />
              <g id="wheelGroup" ref={wheelGroupRef}>
                {segments.map((seg, i) => (
                  <g key={i}>
                    <path d={seg.d} fill={seg.fill} />
                    <text
                      x={CX}
                      y={CY - R * 0.64}
                      textAnchor="middle"
                      transform={seg.transform}
                      fill={seg.textFill}
                      fontFamily="var(--font-baloo), system-ui, sans-serif"
                      fontWeight={700}
                      fontSize={seg.fontSize}
                    >
                      {seg.label}
                    </text>
                  </g>
                ))}
              </g>
              <circle cx="200" cy="200" r="165" fill="url(#edgeShade)" />
              <circle cx="200" cy="200" r="165" fill="url(#glossHighlight)" />
              <circle cx="200" cy="200" r="165" fill="none" stroke="#ffffff" strokeWidth="2" strokeOpacity=".5" />
              <polygon className="pointer" points="182,12 200,54 200,26" fill="url(#pointerGradLeft)" />
              <polygon className="pointer" points="218,12 200,54 200,26" fill="url(#pointerGradRight)" />
            </svg>
            <button id="hubBtn" onClick={spin} disabled={spinning}>
              SPIN
            </button>
          </div>
          <div className={`status${statusLive ? ' live' : ''}`}>{statusText}</div>
        </div>
      </div>

      <div className={`modal-overlay${modalOpen ? ' open' : ''}`}>
        <div className="modal">
          <div className="label">Congratulations</div>
          <div className="winner-name">🎉 You won the prize!</div>
          <div className="modal-actions">
            <button className="primary" onClick={handleSpinAgain}>
              Spin again
            </button>
            <button className="ghost" onClick={() => setModalOpen(false)}>
              Close
            </button>
          </div>
        </div>
      </div>

      <canvas id="confettiCanvas" ref={canvasRef} />

      <style jsx>{`
        .${FONT_VARS_CLASS} {
          --font-baloo: 'Baloo 2', 'Poppins', system-ui, sans-serif;
          --font-space: 'Space Grotesk', 'Inter', system-ui, sans-serif;
        }
        .wheelPickerRoot {
          --bg: #0d0a1c;
          --bg-2: #171130;
          --panel: #221a3d;
          --ring: #362a5c;
          --ink: #f3eefc;
          --ink-dim: #a89bcb;
          --cyan: #22d3ee;
          --magenta: #f43f9e;
          --prize-glow: rgba(255, 255, 255, 0.5);
          min-height: 100vh;
          margin: 0;
          padding: 40px 20px;
          overflow-x: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(ellipse 700px 500px at 50% 8%, rgba(255, 255, 255, 0.05), transparent 60%),
            radial-gradient(circle at 50% 15%, var(--bg-2), var(--bg) 72%);
          color: var(--ink);
          font-family: var(--font-space), system-ui, sans-serif;
        }
        .app {
          max-width: 520px;
          width: 100%;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 26px;
        }
        h1 {
          font-family: var(--font-baloo), system-ui, sans-serif;
          font-weight: 800;
          text-align: center;
          font-size: clamp(1.5rem, 5vw, 2.1rem);
          margin: 0;
          letter-spacing: 0.2px;
          color: #c9a8f5;
        }
        .wheel-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }
        .wheel-wrap {
          position: relative;
          width: min(92vw, 460px);
          cursor: pointer;
          filter: drop-shadow(0 22px 34px rgba(0, 0, 0, 0.55)) drop-shadow(0 4px 10px rgba(0, 0, 0, 0.4));
        }
        .wheel-wrap::after {
          content: '';
          position: absolute;
          left: 8%;
          right: 8%;
          bottom: -16px;
          height: 22px;
          background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.55), transparent 72%);
          filter: blur(4px);
          z-index: -1;
        }
        svg {
          width: 100%;
          height: auto;
          display: block;
          overflow: visible;
        }
        :global(#wheelGroup) {
          transform-origin: 200px 200px;
          transform: rotate(0deg);
        }
        .pointer {
          filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.5));
        }
        :global(#hubBtn) {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 20%;
          aspect-ratio: 1;
          border-radius: 50%;
          border: 3px solid #0d0a1c;
          background: radial-gradient(circle at 32% 26%, #ffffff, #e7e9f2 55%, #b7bac9 100%);
          color: #3a3d4d;
          font-family: var(--font-baloo), system-ui, sans-serif;
          font-weight: 800;
          font-size: clamp(0.7rem, 2.6vw, 0.9rem);
          cursor: pointer;
          letter-spacing: 0.5px;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.55), inset 0 2px 3px rgba(255, 255, 255, 0.9),
            inset 0 -6px 10px rgba(0, 0, 0, 0.15);
          transition: transform 0.12s ease;
        }
        :global(#hubBtn:active) {
          transform: translate(-50%, -50%) scale(0.94);
        }
        :global(#hubBtn:focus-visible) {
          outline: 3px solid var(--cyan);
          outline-offset: 3px;
        }
        :global(#hubBtn:disabled) {
          cursor: default;
          filter: saturate(0.6) brightness(0.9);
        }
        .status {
          font-family: var(--font-baloo), system-ui, sans-serif;
          font-weight: 700;
          font-size: 1.05rem;
          min-height: 1.4em;
          text-align: center;
        }
        .status.live {
          color: var(--ink-dim);
          font-weight: 500;
          font-size: 0.85rem;
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(8, 5, 18, 0.78);
          display: none;
          align-items: center;
          justify-content: center;
          padding: 24px;
          z-index: 50;
        }
        .modal-overlay.open {
          display: flex;
        }
        .modal {
          background: linear-gradient(160deg, var(--panel), var(--bg-2));
          border: 1px solid var(--ring);
          border-radius: 20px;
          padding: 34px 28px;
          max-width: 340px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }
        .modal .label {
          font-size: 0.8rem;
          color: var(--ink-dim);
          letter-spacing: 0.4px;
          text-transform: uppercase;
        }
        .modal .winner-name {
          font-family: var(--font-baloo), system-ui, sans-serif;
          font-weight: 800;
          font-size: clamp(1.5rem, 6vw, 2rem);
          color: #ffffff;
          margin: 10px 0 24px;
          text-shadow: 0 0 20px var(--prize-glow);
        }
        .modal .modal-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .modal :global(button.primary) {
          font-family: var(--font-baloo), system-ui, sans-serif;
          font-weight: 700;
          font-size: 1rem;
          color: var(--bg);
          background: linear-gradient(90deg, var(--cyan), #7ef0e0);
          border: none;
          padding: 12px 20px;
          border-radius: 999px;
          cursor: pointer;
        }
        .modal :global(button.ghost) {
          font-family: var(--font-baloo), system-ui, sans-serif;
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--ink-dim);
          background: transparent;
          border: 1px solid var(--ring);
          padding: 10px 20px;
          border-radius: 999px;
          cursor: pointer;
        }
        :global(#confettiCanvas) {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 60;
        }
      `}</style>
    </div>
  );
}
