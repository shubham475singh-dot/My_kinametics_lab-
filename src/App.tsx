/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback } from 'react';
import { Planet, ScenarioId, Language, TrailRecord } from './types';
import { PLANETS, TRANSLATIONS } from './utils/constants';
import { sound } from './utils/audio';
import { Navbar } from './components/Navbar';
import { HudOverlay } from './components/HudOverlay';
import { SimCanvas, SimCanvasHandle } from './components/SimCanvas';
import { ControlDeck } from './components/ControlDeck';

export default function App() {
  // Global simulation state
  const [planet, setPlanet] = useState<Planet>(PLANETS[2]); // Earth
  const [scenario, setScenario] = useState<ScenarioId>('sandbox');
  const [u, setU] = useState<number>(30.0);
  const [theta, setTheta] = useState<number>(45.0);
  const [trails, setTrails] = useState<TrailRecord[]>([]);
  const [targetDistance, setTargetDistance] = useState<number>(65.0);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);

  // Scenario specific state
  const [ceilingHeight, setCeilingHeight] = useState<number>(20.0);
  const [isAirDragActive, setIsAirDragActive] = useState<boolean>(false);
  const [airDragCoeff, setAirDragCoeff] = useState<number>(0.015);
  const [droneAlt, setDroneAlt] = useState<number>(35.0);
  const [droneSpeed, setDroneSpeed] = useState<number>(14.0);
  const [slopeAngle, setSlopeAngle] = useState<number>(20.0);
  const [monkeyDist, setMonkeyDist] = useState<number>(55.0);
  const [monkeyHeight, setMonkeyHeight] = useState<number>(35.0);

  // UI & Audio
  const [lang, setLang] = useState<Language>('en');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [hitMessage, setHitMessage] = useState<string | null>(null);
  const [liveStats, setLiveStats] = useState<{
    R: number;
    H: number;
    T: number;
    vx: number;
    vy: number;
    currentSpeed: number;
  }>({
    R: 0,
    H: 0,
    T: 0,
    vx: 0,
    vy: 0,
    currentSpeed: 0,
  });

  const simCanvasRef = useRef<SimCanvasHandle>(null);

  // Spawn new random target on ground
  const handleSpawnTarget = useCallback(() => {
    const maxR = (u * u) / planet.g;
    const newDist = Math.max(20, Math.min(180, (Math.random() * 0.5 + 0.3) * maxR));
    setTargetDistance(parseFloat(newDist.toFixed(1)));
    setHitMessage(null);
  }, [u, planet.g]);

  // Planet selector handler
  const handleSelectPlanet = (p: Planet) => {
    setPlanet(p);
    simCanvasRef.current?.clearScenarioBalls();
    // Adjust target distance according to planet gravity
    const maxR = (40 * 40) / p.g;
    const newDist = Math.max(20, Math.min(220, (Math.random() * 0.4 + 0.3) * maxR));
    setTargetDistance(parseFloat(newDist.toFixed(1)));
    setTrails([]);
    setHitMessage(null);
  };

  // Scenario switch handler
  const handleSelectScenario = (sc: ScenarioId) => {
    setScenario(sc);
    simCanvasRef.current?.clearScenarioBalls();
    setTrails([]);
    setHitMessage(null);

    if (sc === 'indoor') {
      setCeilingHeight(20.0);
      setU(32.0);
      setTheta(38.0);
    } else if (sc === 'fielder') {
      setTargetDistance(60.0);
      setU(30.0);
    } else if (sc === 'aerodynamics') {
      setIsAirDragActive(true);
      setAirDragCoeff(0.015);
      setU(35.0);
      setTheta(45.0);
    } else if (sc === 'drone') {
      setTargetDistance(70.0);
      setDroneAlt(35.0);
      setDroneSpeed(14.0);
    } else if (sc === 'inclined') {
      setSlopeAngle(20.0);
      setTargetDistance(45.0);
      setU(30.0);
      setTheta(55.0);
    } else if (sc === 'monkey') {
      setMonkeyDist(55.0);
      setMonkeyHeight(35.0);
      setU(28.0);
      const rad = Math.atan2(35.0, 55.0);
      setTheta(parseFloat(((rad * 180) / Math.PI).toFixed(1)));
    } else {
      setIsAirDragActive(false);
      setU(30.0);
      setTheta(45.0);
    }
  };

  // Audio mute toggle
  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
  };

  // Language toggle
  const handleToggleLang = () => {
    setLang((prev) => (prev === 'en' ? 'hi' : 'en'));
  };

  // Launch single standard shot
  const handleLaunchSingle = () => {
    sound.playBatHit();
    simCanvasRef.current?.launchBall({
      initialU: u,
      initialTheta: theta,
      color: planet.color,
      dragCoeff: isAirDragActive ? airDragCoeff : 0,
    });
  };

  // Launch both fielder trajectories (Flat vs Lofted)
  const handleLaunchBothFielder = (flatAngle: number, loftedAngle: number) => {
    sound.playBatHit();
    simCanvasRef.current?.launchMultiple([
      {
        initialU: u,
        initialTheta: flatAngle,
        color: '#38bdf8',
        type: 'standard',
        label: `Flat (${flatAngle.toFixed(1)}°)`,
      },
      {
        initialU: u,
        initialTheta: loftedAngle,
        color: '#c084fc',
        type: 'standard',
        label: `Lofted (${loftedAngle.toFixed(1)}°)`,
      },
    ]);
  };

  // Launch vacuum vs drag comparison
  const handleLaunchDragComparison = (vel: number, ang: number) => {
    sound.playBatHit();
    simCanvasRef.current?.launchMultiple([
      {
        initialU: vel,
        initialTheta: ang,
        color: '#38bdf8',
        type: 'vacuum',
        label: `Vacuum (${ang.toFixed(1)}°)`,
      },
      {
        initialU: vel,
        initialTheta: ang,
        color: '#fb923c',
        type: 'air',
        dragCoeff: airDragCoeff,
        label: `Air (${ang.toFixed(1)}°)`,
      },
    ]);
  };

  // Launch drone relief crate
  const handleLaunchDroneDrop = () => {
    const droneState = simCanvasRef.current?.getDroneState();
    if (!droneState) return;

    sound.playDroneDrop();
    simCanvasRef.current?.launchBall({
      type: 'drone_box',
      x: droneState.x,
      y: droneState.alt,
      vx: droneState.vx,
      vy: 0,
      initialU: Math.abs(droneState.vx),
      initialTheta: 0,
      color: '#f97316',
      label: 'Relief Crate',
    });
  };

  // Launch hill climb shot
  const handleLaunchHillShot = (launchAngle: number) => {
    sound.playBatHit();
    simCanvasRef.current?.launchBall({
      initialU: u,
      initialTheta: launchAngle,
      color: launchAngle === 45 ? '#f43f5e' : '#10b981',
      label: `${launchAngle.toFixed(1)}° Hill Shot`,
    });
  };

  // Launch monkey & hunter illusion
  const handleLaunchMonkey = () => {
    const aimRad = Math.atan2(monkeyHeight, monkeyDist);
    const aimDeg = (aimRad * 180) / Math.PI;
    setTheta(parseFloat(aimDeg.toFixed(1)));

    sound.playBatHit();
    simCanvasRef.current?.launchMultiple([
      {
        type: 'monkey_ball',
        initialU: u,
        initialTheta: aimDeg,
        color: '#ef4444',
        label: 'Launcher Projectile',
      },
      {
        type: 'monkey_target',
        x: monkeyDist,
        y: monkeyHeight,
        vx: 0,
        vy: 0,
        initialU: 0,
        initialTheta: 0,
        color: '#facc15',
        label: 'Falling Monkey Target',
      },
    ]);
  };

  // Reset / Clear Trails
  const handleClearTrails = () => {
    simCanvasRef.current?.clearScenarioBalls();
    setTrails([]);
    setHitMessage(null);
  };

  // Add trail record
  const handleAddTrail = (trail: TrailRecord) => {
    setTrails((prev) => [trail, ...prev.slice(0, 14)]);
  };

  // Score count on target hits
  const handleScoreIncrement = () => {
    setScore((prev) => prev + 10);
    setStreak((prev) => prev + 1);
  };

  return (
    <div className="flex flex-col h-[100dvh] w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Top Navbar */}
      <Navbar
        currentScenario={scenario}
        onSelectScenario={handleSelectScenario}
        lang={lang}
        onToggleLang={handleToggleLang}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onReset={handleClearTrails}
      />

      {/* Main Interactive Stage */}
      <main className="relative flex-1 overflow-hidden">
        {/* HUD Telemetry Overlay */}
        <HudOverlay
          planet={planet}
          u={u}
          theta={theta}
          lang={lang}
          score={score}
          streak={streak}
          scenario={scenario}
          activeBallCount={0}
          liveStats={liveStats}
          hitMessage={hitMessage}
        />

        {/* High-Performance Canvas Stage */}
        <SimCanvas
          ref={simCanvasRef}
          planet={planet}
          scenario={scenario}
          u={u}
          theta={theta}
          onAimChange={(newU, newTheta) => {
            setU(newU);
            setTheta(newTheta);
          }}
          trails={trails}
          onAddTrail={handleAddTrail}
          targetDistance={targetDistance}
          onSpawnTarget={handleSpawnTarget}
          onScoreIncrement={handleScoreIncrement}
          ceilingHeight={ceilingHeight}
          isAirDragActive={isAirDragActive}
          airDragCoeff={airDragCoeff}
          droneAlt={droneAlt}
          droneSpeed={droneSpeed}
          slopeAngle={slopeAngle}
          monkeyDist={monkeyDist}
          monkeyHeight={monkeyHeight}
          onLiveUpdate={setLiveStats}
          onSetHitMessage={setHitMessage}
        />
      </main>

      {/* Bottom Control & Concept Deck */}
      <ControlDeck
        currentPlanet={planet}
        onSelectPlanet={handleSelectPlanet}
        scenario={scenario}
        u={u}
        onUChange={setU}
        theta={theta}
        onThetaChange={setTheta}
        onLaunchSingle={handleLaunchSingle}
        onLaunchBothFielder={handleLaunchBothFielder}
        onLaunchDragComparison={handleLaunchDragComparison}
        onLaunchDroneDrop={handleLaunchDroneDrop}
        onLaunchHillShot={handleLaunchHillShot}
        onLaunchMonkey={handleLaunchMonkey}
        onClearTrails={handleClearTrails}
        ceilingHeight={ceilingHeight}
        onCeilingChange={setCeilingHeight}
        targetDistance={targetDistance}
        onTargetDistanceChange={setTargetDistance}
        isAirDragActive={isAirDragActive}
        onToggleAirDrag={setIsAirDragActive}
        airDragCoeff={airDragCoeff}
        onAirDragCoeffChange={setAirDragCoeff}
        droneAlt={droneAlt}
        onDroneAltChange={setDroneAlt}
        droneSpeed={droneSpeed}
        onDroneSpeedChange={setDroneSpeed}
        slopeAngle={slopeAngle}
        onSlopeAngleChange={setSlopeAngle}
        monkeyDist={monkeyDist}
        onMonkeyDistChange={setMonkeyDist}
        monkeyHeight={monkeyHeight}
        onMonkeyHeightChange={setMonkeyHeight}
        lang={lang}
        onNewTarget={handleSpawnTarget}
      />
    </div>
  );
}
