import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import confetti from 'canvas-confetti';
import { Planet, ScenarioId, Ball, Particle, TrailRecord } from '../types';
import { sound } from '../utils/audio';
import { 
  calcVacuumStats, 
  getDragPath, 
  calcIndoorOptimalSafe, 
  calcFielderAngles, 
  calcInclineRange, 
  calcDroneDrop, 
  calcMonkeyHunter 
} from '../utils/physics';

export interface SimCanvasHandle {
  launchBall: (params: Partial<Ball>) => void;
  launchMultiple: (balls: Partial<Ball>[]) => void;
  getDroneState: () => { x: number; alt: number; vx: number };
  clearScenarioBalls: () => void;
}

interface SimCanvasProps {
  planet: Planet;
  scenario: ScenarioId;
  u: number;
  theta: number;
  onAimChange: (u: number, theta: number) => void;
  trails: TrailRecord[];
  onAddTrail: (trail: TrailRecord) => void;
  targetDistance: number;
  onSpawnTarget: () => void;
  onScoreIncrement: () => void;
  ceilingHeight: number;
  isAirDragActive: boolean;
  airDragCoeff: number;
  droneAlt: number;
  droneSpeed: number;
  slopeAngle: number;
  monkeyDist: number;
  monkeyHeight: number;
  onLiveUpdate?: (stats: { R: number; H: number; T: number; vx: number; vy: number; currentSpeed: number }) => void;
  onSetHitMessage: (msg: string | null) => void;
}

export const SimCanvas = forwardRef<SimCanvasHandle, SimCanvasProps>(({
  planet,
  scenario,
  u,
  theta,
  onAimChange,
  trails,
  onAddTrail,
  targetDistance,
  onSpawnTarget,
  onScoreIncrement,
  ceilingHeight,
  isAirDragActive,
  airDragCoeff,
  droneAlt,
  droneSpeed,
  slopeAngle,
  monkeyDist,
  monkeyHeight,
  onLiveUpdate,
  onSetHitMessage,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Animation and physics state
  const activeBallsRef = useRef<Ball[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const droneXRef = useRef<number>(12);
  const droneDirectionRef = useRef<number>(1);
  const droneRotorAngleRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  // Viewport / origin / scale
  const originRef = useRef<{ x: number; y: number }>({ x: 50, y: 300 });
  const pixelsPerMeterRef = useRef<number>(10);

  // Trigger celebration effect
  const triggerConfetti = useCallback(() => {
    confetti({
      particleCount: 45,
      spread: 65,
      origin: { y: 0.6 },
      colors: ['#00D2D3', '#FDE047', '#FF6B6B', '#4ADE80'],
    });
  }, []);

  // Update canvas scale to ensure all relevant objects fit comfortably
  const updateScale = useCallback((width: number, height: number) => {
    let maxR = 60;
    let maxH = 25;

    // Based on vacuum stats
    const { R: vacR, H: vacH } = calcVacuumStats(u, theta, planet.g);
    maxR = Math.max(maxR, vacR);
    maxH = Math.max(maxH, vacH);

    // Factor in trails belonging to current scenario
    trails
      .filter((t) => t.scenarioId === scenario)
      .forEach((t) => {
        maxR = Math.max(maxR, t.range);
        maxH = Math.max(maxH, t.maxHeight);
      });

    if (scenario === 'sandbox') {
      maxR = Math.max(maxR, targetDistance * 1.3);
    } else if (scenario === 'indoor') {
      maxH = Math.max(maxH, ceilingHeight * 1.4);
    } else if (scenario === 'fielder') {
      maxR = Math.max(maxR, targetDistance * 1.35);
    } else if (scenario === 'drone') {
      maxH = Math.max(maxH, droneAlt * 1.4);
      maxR = Math.max(maxR, 130);
    } else if (scenario === 'inclined') {
      const hillLen = 85;
      maxR = Math.max(maxR, hillLen * Math.cos((slopeAngle * Math.PI) / 180) * 1.25);
      maxH = Math.max(maxH, hillLen * Math.sin((slopeAngle * Math.PI) / 180) * 1.45);
    } else if (scenario === 'monkey') {
      maxR = Math.max(maxR, monkeyDist * 1.35);
      maxH = Math.max(maxH, monkeyHeight * 1.35);
    }

    maxR = Math.max(maxR * 1.25, 45);
    maxH = Math.max(maxH * 1.35, 20);

    const availableW = width - originRef.current.x - 40;
    const availableH = originRef.current.y - 40;

    pixelsPerMeterRef.current = Math.min(availableW / maxR, availableH / maxH);
  }, [u, theta, planet.g, trails, scenario, targetDistance, ceilingHeight, droneAlt, slopeAngle, monkeyDist, monkeyHeight]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      originRef.current = {
        x: Math.max(45, rect.width * 0.08),
        y: rect.height * 0.82,
      };

      updateScale(rect.width, rect.height);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateScale]);

  // Imperative handle for launching custom simulation projectiles
  useImperativeHandle(ref, () => ({
    launchBall: (params: Partial<Ball>) => {
      onSetHitMessage(null);
      const initialU = params.initialU ?? u;
      const initialTheta = params.initialTheta ?? theta;
      const rad = (initialTheta * Math.PI) / 180;

      const newBall: Ball = {
        id: Math.random().toString(),
        type: params.type ?? 'standard',
        x: params.x ?? 0,
        y: params.y ?? 0,
        vx: params.vx ?? initialU * Math.cos(rad),
        vy: params.vy ?? initialU * Math.sin(rad),
        initialU,
        initialTheta,
        color: params.color ?? planet.color,
        label: params.label ?? `${initialU}m/s @ ${initialTheta}°`,
        path: [{ x: params.x ?? 0, y: params.y ?? 0 }],
        isLanded: false,
        t: 0,
        dragCoeff: params.dragCoeff ?? (isAirDragActive ? airDragCoeff : 0),
      };

      activeBallsRef.current = [newBall];
    },

    launchMultiple: (ballsList: Partial<Ball>[]) => {
      onSetHitMessage(null);
      const created: Ball[] = ballsList.map((params) => {
        const initialU = params.initialU ?? u;
        const initialTheta = params.initialTheta ?? theta;
        const rad = (initialTheta * Math.PI) / 180;

        return {
          id: Math.random().toString(),
          type: params.type ?? 'standard',
          x: params.x ?? 0,
          y: params.y ?? 0,
          vx: params.vx ?? initialU * Math.cos(rad),
          vy: params.vy ?? initialU * Math.sin(rad),
          initialU,
          initialTheta,
          color: params.color ?? planet.color,
          label: params.label ?? '',
          path: [{ x: params.x ?? 0, y: params.y ?? 0 }],
          isLanded: false,
          t: 0,
          dragCoeff: params.dragCoeff ?? 0,
        };
      });

      activeBallsRef.current = created;
    },

    getDroneState: () => ({
      x: droneXRef.current,
      alt: droneAlt,
      vx: droneSpeed * droneDirectionRef.current,
    }),
    clearScenarioBalls: () => {
      activeBallsRef.current = [];
      particlesRef.current = [];
    },
  }));

  // Add impact particles
  const addParticles = (x: number, y: number, color: string, count = 16, spread = 6) => {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = Math.random() * spread + 2;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd + 2,
        color,
        life: 0,
        maxLife: Math.random() * 0.4 + 0.3,
        size: Math.random() * 3 + 2,
      });
    }
  };

  // Main Render & Physics Tick Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const render = (now: number) => {
      if (!isRunning) return;
      const dtRaw = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      const dt = Math.min(dtRaw, 0.05) * 1.5;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const origin = originRef.current;
      const ppm = pixelsPerMeterRef.current;

      // 1. Draw Atmospheric / Space Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, origin.y);
      skyGrad.addColorStop(0, planet.skyGradient[0]);
      skyGrad.addColorStop(1, planet.skyGradient[1]);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Starfield / space dust
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      for (let i = 1; i <= 35; i++) {
        const sx = ((i * 127) % width);
        const sy = ((i * 73) % (origin.y - 30));
        ctx.fillRect(sx, sy, (i % 2 === 0 ? 1.5 : 1), (i % 2 === 0 ? 1.5 : 1));
      }

      // Planet-specific celestial backdrops
      if (planet.id === 'Moon') {
        ctx.save();
        ctx.beginPath();
        ctx.arc(width - 90, 75, 28, 0, Math.PI * 2);
        ctx.fillStyle = '#0284c7';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(width - 85, 70, 14, 0, Math.PI * 2);
        ctx.fillStyle = '#22c55e';
        ctx.fill();
        ctx.restore();
      } else if (planet.id === 'Saturn') {
        ctx.save();
        ctx.strokeStyle = 'rgba(253, 224, 71, 0.25)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.ellipse(width - 120, 90, 65, 18, -0.3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 2. Draw Ground / Surface
      if (scenario === 'drone') {
        const waterGrad = ctx.createLinearGradient(0, origin.y, 0, height);
        waterGrad.addColorStop(0, '#0284c7');
        waterGrad.addColorStop(1, '#082f49');
        ctx.fillStyle = waterGrad;
        ctx.fillRect(0, origin.y, width, height - origin.y);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let wx = 0; wx < width; wx += 20) {
          const waveY = origin.y + Math.sin(wx * 0.05 + now * 0.003) * 2;
          ctx.lineTo(wx, waveY);
        }
        ctx.stroke();
      } else if (scenario === 'inclined') {
        const alphaRad = (slopeAngle * Math.PI) / 180;
        const hillEndX = width;
        const hillEndY = origin.y - (width - origin.x) * Math.tan(alphaRad);

        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(hillEndX, hillEndY);
        ctx.lineTo(width, height);
        ctx.lineTo(origin.x, height);
        ctx.closePath();
        ctx.fillStyle = planet.groundColor;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(hillEndX, hillEndY);
        ctx.strokeStyle = planet.color;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(origin.x + 80, origin.y);
        ctx.stroke();

        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(origin.x, origin.y, 40, 0, -alphaRad, true);
        ctx.stroke();
        ctx.fillStyle = '#fde047';
        ctx.font = '11px JetBrains Mono';
        ctx.fillText(`α = ${slopeAngle}°`, origin.x + 48, origin.y - 10);
        ctx.restore();
      } else {
        ctx.fillStyle = planet.groundColor;
        ctx.fillRect(0, origin.y, width, height - origin.y);

        ctx.fillStyle = planet.groundDetailColor;
        ctx.fillRect(0, origin.y + 4, width, 5);

        if (scenario === 'sandbox' || scenario === 'fielder') {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(origin.x, origin.y - 8);
          ctx.lineTo(origin.x, origin.y);
          ctx.stroke();
        }
      }

      // Distance grid marks on ground
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.font = '10px JetBrains Mono';
      for (let m = 10; m <= 250; m += 20) {
        const gx = origin.x + m * ppm;
        if (gx > width) break;
        ctx.fillRect(gx, origin.y - 3, 1, 6);
        ctx.fillText(`${m}m`, gx - 10, origin.y + 16);
      }

      // 3. Scenario-Specific Foreground Features
      if (scenario === 'indoor') {
        const ceilingY = origin.y - ceilingHeight * ppm;
        ctx.save();
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, ceilingY);
        ctx.lineTo(width, ceilingY);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(234, 179, 8, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let tx = 0; tx < width; tx += 25) {
          ctx.moveTo(tx, ceilingY - 10);
          ctx.lineTo(tx + 12.5, ceilingY);
          ctx.lineTo(tx + 25, ceilingY - 10);
        }
        ctx.stroke();

        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 11px JetBrains Mono';
        ctx.fillText(`⚡ ROOF LIMIT: ${ceilingHeight}m`, 20, ceilingY - 8);
        ctx.restore();
      }

      if (scenario === 'sandbox') {
        const targetPx = origin.x + targetDistance * ppm;
        const stumpsH = 22;
        ctx.save();
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(targetPx - 4, origin.y - stumpsH, 2, stumpsH);
        ctx.fillRect(targetPx, origin.y - stumpsH, 2, stumpsH);
        ctx.fillRect(targetPx + 4, origin.y - stumpsH, 2, stumpsH);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(targetPx - 6, origin.y - stumpsH - 2, 14, 2);

        ctx.fillStyle = '#38bdf8';
        ctx.font = '10px JetBrains Mono';
        ctx.fillText(`🎯 ${targetDistance.toFixed(1)}m`, targetPx - 16, origin.y - stumpsH - 8);
        ctx.restore();
      }

      if (scenario === 'fielder') {
        const targetPx = origin.x + targetDistance * ppm;
        const stumpsH = 24;
        ctx.save();
        ctx.fillStyle = '#facc15';
        ctx.fillRect(targetPx - 3, origin.y - stumpsH, 2, stumpsH);
        ctx.fillRect(targetPx + 1, origin.y - stumpsH, 2, stumpsH);
        ctx.fillRect(targetPx + 5, origin.y - stumpsH, 2, stumpsH);
        ctx.fillRect(targetPx - 5, origin.y - stumpsH - 2, 14, 2);
        ctx.fillStyle = '#f43f5e';
        ctx.font = '10px JetBrains Mono';
        ctx.fillText(`🏏 WICKETS: ${targetDistance.toFixed(1)}m`, targetPx - 24, origin.y - stumpsH - 8);
        ctx.restore();
      }

      if (scenario === 'drone') {
        const targetX = targetDistance;
        const raftPx = origin.x + targetX * ppm;

        // Stranded Rescue Raft
        ctx.save();
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.ellipse(raftPx, origin.y + 4, 18, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(raftPx - 4, origin.y - 12, 3, 10);
        ctx.fillRect(raftPx + 2, origin.y - 12, 3, 10);
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 10px Plus Jakarta Sans';
        ctx.fillText('🆘 VICTIMS RAFT', raftPx - 32, origin.y + 22);
        ctx.restore();

        // Update Drone Position
        droneXRef.current += droneSpeed * dt * droneDirectionRef.current;
        if (droneXRef.current > width / ppm - 15) {
          droneDirectionRef.current = -1;
        } else if (droneXRef.current < 5) {
          droneDirectionRef.current = 1;
        }
        droneRotorAngleRef.current += 15 * dt;

        const dronePx = origin.x + droneXRef.current * ppm;
        const dronePy = origin.y - droneAlt * ppm;

        // Draw Drone Body
        ctx.save();
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(dronePx - 16, dronePy - 6, 32, 12);
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(dronePx - 26, dronePy - 3, 52, 4);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1.5;
        [-24, 24].forEach((rx) => {
          ctx.beginPath();
          ctx.ellipse(dronePx + rx, dronePy - 6, 12, 3, droneRotorAngleRef.current, 0, Math.PI * 2);
          ctx.stroke();
        });

        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(dronePx, dronePy - 8, 3, 0, Math.PI * 2);
        ctx.fill();

        // Mathematical Drop Zone Lead Line
        const { forwardDist } = calcDroneDrop(droneAlt, droneSpeed * droneDirectionRef.current, planet.g);
        const projectedLandingPx = dronePx + forwardDist * ppm;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(dronePx, dronePy);
        ctx.lineTo(projectedLandingPx, origin.y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#38bdf8';
        ctx.font = '10px JetBrains Mono';
        ctx.fillText(`v_x = ${(droneSpeed * droneDirectionRef.current).toFixed(1)} m/s`, dronePx - 25, dronePy - 14);
        ctx.restore();
      }

      if (scenario === 'inclined') {
        const alphaRad = (slopeAngle * Math.PI) / 180;
        const targetSlopeDist = targetDistance;
        const flagX = origin.x + targetSlopeDist * Math.cos(alphaRad) * ppm;
        const flagY = origin.y - targetSlopeDist * Math.sin(alphaRad) * ppm;

        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(flagX, flagY);
        ctx.lineTo(flagX, flagY - 24);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(flagX, flagY - 24);
        ctx.lineTo(flagX + 14, flagY - 18);
        ctx.lineTo(flagX, flagY - 12);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#fef08a';
        ctx.font = '10px JetBrains Mono';
        ctx.fillText(`🚩 ${targetSlopeDist.toFixed(1)}m`, flagX + 6, flagY - 24);
        ctx.restore();
      }

      if (scenario === 'monkey') {
        const monkeyPx = origin.x + monkeyDist * ppm;
        const monkeyPy = origin.y - monkeyHeight * ppm;

        ctx.save();
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(monkeyPx, origin.y);
        ctx.lineTo(monkeyPx, monkeyPy - 15);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(monkeyPx, monkeyPy - 10);
        ctx.lineTo(monkeyPx - 15, monkeyPy - 10);
        ctx.stroke();

        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(monkeyPx - 6, monkeyPy - 22, 16, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(monkeyPx, monkeyPy);
        ctx.stroke();
        ctx.setLineDash([]);

        const hasFallingTarget = activeBallsRef.current.some((b) => b.type === 'monkey_target');
        if (!hasFallingTarget) {
          ctx.fillStyle = '#eab308';
          ctx.beginPath();
          ctx.arc(monkeyPx, monkeyPy, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = '14px sans-serif';
          ctx.fillText('🐒', monkeyPx - 8, monkeyPy + 5);
        }
        ctx.restore();
      }

      // 4. Draw Trajectory History Trails (strictly isolated to current scenario)
      trails
        .filter((trail) => trail.scenarioId === scenario)
        .forEach((trail) => {
          if (trail.path.length < 2) return;
          ctx.save();
          ctx.strokeStyle = trail.color;
          ctx.globalAlpha = 0.4;
          ctx.lineWidth = 2;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          trail.path.forEach((pt, idx) => {
            const px = origin.x + pt.x * ppm;
            const py = origin.y - pt.y * ppm;
            if (idx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();

          // Small tag at landing point
          if (trail.tag && trail.path.length > 5) {
            const lastPt = trail.path[trail.path.length - 1];
            ctx.fillStyle = trail.color;
            ctx.globalAlpha = 0.75;
            ctx.font = '9px JetBrains Mono';
            ctx.fillText(trail.tag, origin.x + lastPt.x * ppm + 4, origin.y - lastPt.y * ppm - 4);
          }
          ctx.restore();
        });

      // 5. Draw Aim Prediction & Vector Arrow (When Idle)
      if (activeBallsRef.current.length === 0 && scenario !== 'drone') {
        ctx.save();
        const rad = (theta * Math.PI) / 180;
        const arrowLen = Math.min(u * 2.2, 90);
        const endX = origin.x + arrowLen * Math.cos(rad);
        const endY = origin.y - arrowLen * Math.sin(rad);

        ctx.strokeStyle = planet.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        const headLen = 10;
        const headAng = 0.35;
        ctx.fillStyle = planet.color;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - headLen * Math.cos(rad - headAng),
          endY + headLen * Math.sin(rad - headAng)
        );
        ctx.lineTo(
          endX - headLen * Math.cos(rad + headAng),
          endY + headLen * Math.sin(rad + headAng)
        );
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = planet.color;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();

        const { path: ghostPts } = isAirDragActive
          ? getDragPath(u, theta, planet.g, airDragCoeff)
          : { path: [] };

        if (isAirDragActive && ghostPts.length > 0) {
          ghostPts.forEach((pt, idx) => {
            const gx = origin.x + pt.x * ppm;
            const gy = origin.y - pt.y * ppm;
            if (idx === 0) ctx.moveTo(gx, gy);
            else ctx.lineTo(gx, gy);
          });
        } else {
          const { vx0, vy0, T } = calcVacuumStats(u, theta, planet.g);
          const steps = 40;
          for (let s = 0; s <= steps; s++) {
            const st = (s / steps) * T;
            const gx = origin.x + vx0 * st * ppm;
            const gy = origin.y - (vy0 * st - 0.5 * planet.g * st * st) * ppm;
            if (s === 0) ctx.moveTo(gx, gy);
            else ctx.lineTo(gx, gy);
          }
        }
        ctx.stroke();
        ctx.restore();
      }

      // 6. Physics Step for Active Balls (with sub-stepping for precision and matching getDragPath)
      const balls = activeBallsRef.current;
      for (let i = balls.length - 1; i >= 0; i--) {
        const ball = balls[i];
        if (ball.isLanded) continue;

        // Sub-step physics integration for numerical accuracy with drag
        const subSteps = 4;
        const subDt = dt / subSteps;

        for (let step = 0; step < subSteps; step++) {
          if (ball.isLanded) break;
          ball.t += subDt;

          if (ball.type === 'air' || (isAirDragActive && ball.type !== 'vacuum')) {
            const k = ball.dragCoeff ?? airDragCoeff;
            const v = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
            const ax = -k * v * ball.vx;
            const ay = -planet.g - k * v * ball.vy;

            // Midpoint velocity predictor
            const vxMid = ball.vx + 0.5 * ax * subDt;
            const vyMid = ball.vy + 0.5 * ay * subDt;
            const vMid = Math.sqrt(vxMid * vxMid + vyMid * vyMid);

            const axMid = -k * vMid * vxMid;
            const ayMid = -planet.g - k * vMid * vyMid;

            ball.x += vxMid * subDt;
            ball.y += vyMid * subDt;
            ball.vx += axMid * subDt;
            ball.vy += ayMid * subDt;
          } else if (ball.type === 'drone_box') {
            ball.vy -= planet.g * subDt;
            ball.vx *= Math.pow(0.992, subDt / 0.02);
            ball.x += ball.vx * subDt;
            ball.y += ball.vy * subDt;
          } else if (ball.type === 'monkey_target') {
            ball.vy -= planet.g * subDt;
            ball.y += ball.vy * subDt;
          } else {
            // Vacuum standard projectile
            ball.x += ball.vx * subDt;
            ball.y += (ball.vy - 0.5 * planet.g * subDt) * subDt;
            ball.vy -= planet.g * subDt;
          }

          if (ball.y > (ball.maxH ?? 0)) ball.maxH = ball.y;

          // Check Indoor Ceiling Collision
          if (scenario === 'indoor' && ball.y >= ceilingHeight && !ball.hitCeiling) {
            ball.hitCeiling = true;
            ball.vy = -Math.abs(ball.vy) * 0.6;
            ball.vx *= 0.8;
            addParticles(origin.x + ball.x * ppm, origin.y - ceilingHeight * ppm, '#eab308', 20, 8);
            sound.playBatHit();
            onSetHitMessage('⚡ ROOF HIT! Inelastic collision redirected velocity downwards!');
          }

          // Check Monkey Collision
          if (scenario === 'monkey' && ball.type === 'monkey_ball') {
            const targetBall = balls.find((b) => b.type === 'monkey_target');
            if (targetBall && !ball.hitTarget) {
              const dist = Math.hypot(ball.x - targetBall.x, ball.y - targetBall.y);
              if (dist < 1.8) {
                ball.hitTarget = true;
                targetBall.hitTarget = true;
                ball.isLanded = true;
                targetBall.isLanded = true;
                sound.playMonkeyCatch();
                triggerConfetti();
                addParticles(origin.x + ball.x * ppm, origin.y - ball.y * ppm, '#facc15', 30, 9);
                onSetHitMessage('🎯 DIRECT MID-AIR COLLISION! Both fell by exact ½gt²!');
              }
            }
          }

          // Ground / Surface Collision Detection
          let groundY = 0;
          if (scenario === 'inclined') {
            const alphaRad = (slopeAngle * Math.PI) / 180;
            groundY = ball.x * Math.tan(alphaRad);
          }

          if (ball.y <= groundY && ball.t > 0.04) {
            ball.isLanded = true;
            ball.y = groundY;
            ball.landedX = ball.x;
            ball.landedTime = ball.t;

            const impactPx = origin.x + ball.x * ppm;
            const impactPy = origin.y - groundY * ppm;

            addParticles(impactPx, impactPy, ball.color, 16, 5);

            // Scenario-specific landing outcomes
            if (scenario === 'sandbox') {
              const diff = Math.abs(ball.x - targetDistance);
              if (diff < 2.2) {
                sound.playWicketHit();
                triggerConfetti();
                onScoreIncrement();
                onSetHitMessage('💥 BULLSEYE! Wickets shattered!');
                addParticles(impactPx, impactPy, '#facc15', 35, 10);
              } else if (ball.x > targetDistance + 25) {
                sound.playBatHit();
                onSetHitMessage('🚀 SIXER! Out of the ground!');
              }
            } else if (scenario === 'drone' && ball.type === 'drone_box') {
              sound.playSplash();
              const diff = Math.abs(ball.x - targetDistance);
              if (diff <= 3.5) {
                triggerConfetti();
                sound.playBullseye();
                onSetHitMessage('🎯 DIRECT RELIEF HIT! Landed on raft!');
                addParticles(impactPx, impactPy, '#38bdf8', 30, 8);
              } else if (ball.x > targetDistance) {
                onSetHitMessage('💦 OVERSHOOT! Forward inertia carried it past the raft!');
              } else {
                onSetHitMessage('⚠️ UNDERSHOOT! Dropped too early in the water!');
              }
            } else if (scenario === 'inclined') {
              const slopeTargetDist = targetDistance;
              const actualSlopeDist = ball.x / Math.cos((slopeAngle * Math.PI) / 180);
              const diff = Math.abs(actualSlopeDist - slopeTargetDist);
              if (diff < 2.5) {
                triggerConfetti();
                sound.playBullseye();
                onSetHitMessage('🎯 HIT FLAG ON HILL!');
              }
            }

            // Record trail tagged with current scenario
            onAddTrail({
              id: ball.id,
              scenarioId: scenario,
              planetName: planet.name,
              color: ball.color,
              path: [...ball.path],
              range: ball.x,
              maxHeight: ball.maxH ?? 0,
              timeOfFlight: ball.t,
              u: ball.initialU,
              theta: ball.initialTheta,
              tag: ball.label,
            });
          }
        }

        // Add to ball path history for drawing
        ball.path.push({ x: ball.x, y: Math.max(0, ball.y) });

        // Live stats update for first ball
        if (i === 0 && onLiveUpdate) {
          const currentSpd = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
          onLiveUpdate({
            R: ball.landedX ?? ball.x,
            H: ball.maxH ?? ball.y,
            T: ball.t,
            vx: ball.vx,
            vy: ball.vy,
            currentSpeed: currentSpd,
          });
        }
      }

      activeBallsRef.current = balls.filter((b) => !b.isLanded || b.t < (b.landedTime ?? 0) + 0.4);

      // 7. Render Active Balls & Trajectories
      balls.forEach((ball) => {
        if (ball.path.length > 1) {
          ctx.save();
          ctx.strokeStyle = ball.color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ball.path.forEach((pt, idx) => {
            const px = origin.x + pt.x * ppm;
            const py = origin.y - pt.y * ppm;
            if (idx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();
          ctx.restore();
        }

        const bPx = origin.x + ball.x * ppm;
        const bPy = origin.y - ball.y * ppm;

        if (ball.type === 'drone_box') {
          ctx.save();
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.arc(bPx, bPy - 16, 14, Math.PI, 0);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(bPx - 14, bPy - 16);
          ctx.lineTo(bPx - 5, bPy - 5);
          ctx.moveTo(bPx + 14, bPy - 16);
          ctx.lineTo(bPx + 5, bPy - 5);
          ctx.stroke();

          ctx.fillStyle = '#b45309';
          ctx.fillRect(bPx - 6, bPy - 6, 12, 12);
          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText('✚', bPx - 4, bPy + 3);
          ctx.restore();
        } else if (ball.type === 'monkey_target') {
          ctx.save();
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(bPx, bPy, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = '14px sans-serif';
          ctx.fillText('🐒', bPx - 8, bPy + 5);
          ctx.restore();
        } else {
          ctx.save();
          ctx.fillStyle = ball.color;
          ctx.shadowColor = ball.color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(bPx, bPy, 6, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(bPx, bPy, 5, 0, Math.PI * 0.7);
          ctx.stroke();

          if (scenario === 'aerodynamics') {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(bPx, bPy);
            ctx.lineTo(bPx + ball.vx * 0.8, bPy - ball.vy * 0.8);
            ctx.stroke();
          }
          ctx.restore();
        }
      });

      // 8. Update & Render Particles
      for (let pIdx = particlesRef.current.length - 1; pIdx >= 0; pIdx--) {
        const p = particlesRef.current[pIdx];
        p.life += dt;
        if (p.life >= p.maxLife) {
          particlesRef.current.splice(pIdx, 1);
          continue;
        }

        p.x += p.vx * dt * 8;
        p.y += p.vy * dt * 8;
        p.vy -= planet.g * dt * 3;

        const alpha = 1 - p.life / p.maxLife;
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [
    planet,
    scenario,
    u,
    theta,
    targetDistance,
    ceilingHeight,
    isAirDragActive,
    airDragCoeff,
    droneAlt,
    droneSpeed,
    slopeAngle,
    monkeyDist,
    monkeyHeight,
    trails,
    onAddTrail,
    onScoreIncrement,
    onSetHitMessage,
    onLiveUpdate,
    triggerConfetti,
  ]);

  // Touch and Mouse Drag-to-Aim handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (scenario === 'drone') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    isDraggingRef.current = true;
    updateAimFromPointer(px, py);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    updateAimFromPointer(px, py);
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const updateAimFromPointer = (px: number, py: number) => {
    const origin = originRef.current;
    const dx = px - origin.x;
    const dy = origin.y - py;

    if (dx <= 0 && dy <= 0) return;

    let rad = Math.atan2(dy, dx);
    let deg = (rad * 180) / Math.PI;
    deg = Math.max(5, Math.min(85, deg));

    const dist = Math.hypot(dx, dy);
    let newU = dist / 2.8;
    newU = Math.max(8, Math.min(60, newU));

    onAimChange(parseFloat(newU.toFixed(1)), parseFloat(deg.toFixed(1)));
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-slate-950">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="w-full h-full block cursor-crosshair touch-none"
      />
    </div>
  );
});

SimCanvas.displayName = 'SimCanvas';
