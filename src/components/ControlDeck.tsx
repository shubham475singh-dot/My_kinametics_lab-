import React from 'react';
import { Planet, ScenarioId, Language, PlanetId } from '../types';
import { PLANETS, TRANSLATIONS } from '../utils/constants';
import { 
  calcIndoorOptimalSafe, 
  calcFielderAngles, 
  findOptimalDragAngle, 
  calcInclineRange, 
  calcDroneDrop, 
  calcMonkeyHunter, 
  calcVacuumStats 
} from '../utils/physics';

interface ControlDeckProps {
  currentPlanet: Planet;
  onSelectPlanet: (planet: Planet) => void;
  scenario: ScenarioId;
  u: number;
  onUChange: (val: number) => void;
  theta: number;
  onThetaChange: (val: number) => void;
  onLaunchSingle: () => void;
  onLaunchBothFielder: (flatAngle: number, loftedAngle: number) => void;
  onLaunchDragComparison: (u: number, theta: number) => void;
  onLaunchDroneDrop: () => void;
  onLaunchHillShot: (angle: number) => void;
  onLaunchMonkey: () => void;
  onClearTrails: () => void;
  ceilingHeight: number;
  onCeilingChange: (val: number) => void;
  targetDistance: number;
  onTargetDistanceChange: (val: number) => void;
  isAirDragActive: boolean;
  onToggleAirDrag: (active: boolean) => void;
  airDragCoeff: number;
  onAirDragCoeffChange: (val: number) => void;
  droneAlt: number;
  onDroneAltChange: (val: number) => void;
  droneSpeed: number;
  onDroneSpeedChange: (val: number) => void;
  slopeAngle: number;
  onSlopeAngleChange: (val: number) => void;
  monkeyDist: number;
  onMonkeyDistChange: (val: number) => void;
  monkeyHeight: number;
  onMonkeyHeightChange: (val: number) => void;
  lang: Language;
  onNewTarget: () => void;
}

export const ControlDeck: React.FC<ControlDeckProps> = ({
  currentPlanet,
  onSelectPlanet,
  scenario,
  u,
  onUChange,
  theta,
  onThetaChange,
  onLaunchSingle,
  onLaunchBothFielder,
  onLaunchDragComparison,
  onLaunchDroneDrop,
  onLaunchHillShot,
  onLaunchMonkey,
  onClearTrails,
  ceilingHeight,
  onCeilingChange,
  targetDistance,
  onTargetDistanceChange,
  isAirDragActive,
  onToggleAirDrag,
  airDragCoeff,
  onAirDragCoeffChange,
  droneAlt,
  onDroneAltChange,
  droneSpeed,
  onDroneSpeedChange,
  slopeAngle,
  onSlopeAngleChange,
  monkeyDist,
  onMonkeyDistChange,
  monkeyHeight,
  onMonkeyHeightChange,
  lang,
  onNewTarget,
}) => {
  const t = TRANSLATIONS[lang];

  // Computations for Scenario 1: Indoor Ceiling
  const indoorMath = calcIndoorOptimalSafe(u, currentPlanet.g, ceilingHeight);

  // Computations for Scenario 2: Fielder
  const fielderMath = calcFielderAngles(u, currentPlanet.g, targetDistance);

  // Computations for Scenario 3: Aerodynamics
  const dragMath = findOptimalDragAngle(u, currentPlanet.g, airDragCoeff);

  // Computations for Scenario 5: Inclined Hill
  const optimalHillAngle = 45 + slopeAngle / 2;
  const standardHillRange = calcInclineRange(u, 45, slopeAngle, currentPlanet.g);
  const optimalHillRange = calcInclineRange(u, optimalHillAngle, slopeAngle, currentPlanet.g);

  // Computations for Scenario 6: Monkey
  const monkeyMath = calcMonkeyHunter(monkeyDist, monkeyHeight, u, currentPlanet.g);

  return (
    <div className="bg-slate-900 border-t border-slate-800 text-white flex flex-col h-[38vh] min-h-[290px] max-h-[460px] overflow-hidden select-none shadow-2xl">
      {/* 1. Universal Planet Selector Bar */}
      <div className="px-4 py-2 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        <span className="text-xs font-bold text-slate-400 shrink-0">
          {lang === 'hi' ? 'ग्रह चुनें:' : 'Planet:'}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {PLANETS.map((p) => {
            const isSelected = currentPlanet.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelectPlanet(p)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 ${
                  isSelected
                    ? 'bg-slate-800 text-white border shadow-sm scale-105'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
                style={isSelected ? { borderColor: p.color, color: p.color } : {}}
              >
                <span>{p.emoji}</span>
                <span>{lang === 'hi' ? p.nameHi : p.name}</span>
                <span className="font-mono text-[10px] opacity-75">({p.g}m/s²)</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Main Controls Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ===================== SCENARIO: SANDBOX ===================== */}
        {scenario === 'sandbox' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>{t.power}</span>
                  <span className="font-mono font-bold text-cyan-400">{u.toFixed(1)} m/s</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="60"
                  step="0.5"
                  value={u}
                  onChange={(e) => onUChange(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>{t.angle}</span>
                  <span className="font-mono font-bold text-cyan-400">{theta.toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="85"
                  step="0.5"
                  value={theta}
                  onChange={(e) => onThetaChange(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={onLaunchSingle}
                  className="flex-1 py-2 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-sm shadow-lg shadow-cyan-950/50 active:scale-95 transition-all"
                >
                  🏏 {t.hitShot}
                </button>
                <button
                  onClick={onNewTarget}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 active:scale-95"
                  title={t.spawnNewTarget}
                >
                  🎯 {t.spawnNewTarget}
                </button>
                <button
                  onClick={onClearTrails}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 active:scale-95"
                  title={t.clearTrails}
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* Formula & Context Card */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 space-y-2 text-xs">
              <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                <span>📐</span>
                <span>{lang === 'hi' ? 'प्रक्षेप्य गति समीकरण:' : 'Ideal Projectile Kinematics:'}</span>
              </div>
              <div className="font-mono space-y-1 text-slate-300 bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
                <p>
                  Range: <span className="text-yellow-400">R = (u² · sin 2θ) / g</span> ={' '}
                  <span className="text-emerald-400 font-bold">
                    {((u * u * Math.sin((2 * theta * Math.PI) / 180)) / currentPlanet.g).toFixed(1)}m
                  </span>
                </p>
                <p>
                  Max Height: <span className="text-yellow-400">H = (u² · sin²θ) / 2g</span> ={' '}
                  <span className="text-emerald-400">
                    {((u * u * Math.pow(Math.sin((theta * Math.PI) / 180), 2)) / (2 * currentPlanet.g)).toFixed(1)}m
                  </span>
                </p>
                <p>
                  Flight Time: <span className="text-yellow-400">T = (2u · sinθ) / g</span> ={' '}
                  <span className="text-emerald-400">
                    {((2 * u * Math.sin((theta * Math.PI) / 180)) / currentPlanet.g).toFixed(2)}s
                  </span>
                </p>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {lang === 'hi'
                  ? 'पृथ्वी पर मानक गुरुत्वाकर्षण 9.81 m/s² है। चंद्रमा पर यह 6 गुना कम है, जिससे शॉट 6 गुना दूर और ऊंचा जाता है!'
                  : 'On the Moon, 1/6th gravity causes shots to travel 6x further and float gracefully through space!'}
              </p>
            </div>
          </div>
        )}

        {/* ===================== SCENARIO 1: INDOOR STADIUM ===================== */}
        {scenario === 'indoor' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>{t.ceilingHeight}</span>
                  <span className="font-mono font-bold text-yellow-400">{ceilingHeight.toFixed(1)} m</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="45"
                  step="1"
                  value={ceilingHeight}
                  onChange={(e) => onCeilingChange(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>{t.power}</span>
                  <span className="font-mono font-bold text-cyan-400">{u.toFixed(1)} m/s</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="55"
                  step="0.5"
                  value={u}
                  onChange={(e) => onUChange(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    onThetaChange(parseFloat(indoorMath.safeAngle.toFixed(1)));
                    setTimeout(() => onLaunchSingle(), 50);
                  }}
                  className="flex-1 py-2 px-4 rounded-lg bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-950/50 active:scale-95 transition-all"
                >
                  ⚡ {t.simPerfectHit}
                </button>
                <button
                  onClick={onClearTrails}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 active:scale-95"
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* Ceiling Analytical Breakdown */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 space-y-2 text-xs">
              <div className="font-bold text-yellow-400 flex items-center gap-1.5">
                <span>🏟️</span>
                <span>{t.indoorTitle}</span>
              </div>
              <div className="font-mono space-y-1 text-slate-300 bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
                <p className="text-slate-400">{t.indoorFormula}</p>
                <p>
                  Safe Angle Limit: <span className="text-yellow-300">θ ≤ sin⁻¹(√(2gH)/u)</span>
                </p>
                <div className="h-px bg-slate-800 my-1" />
                <p className="text-emerald-400 font-bold">
                  {indoorMath.isUnconstrained
                    ? 'Ceiling is very high! Full 45° optimal launch safe.'
                    : `Optimal Safe Angle: θ = ${indoorMath.safeAngle.toFixed(1)}° | Max Range: ${indoorMath.maxRange.toFixed(1)}m`}
                </p>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {lang === 'hi'
                  ? 'यदि आप 45° पर मारेंगे तो गेंद छत से टकराकर गिर जाएगी। गणितीय रूप से छत के ठीक नीचे से निकलने वाला कोण ही सबसे लंबी बाउंड्री देगा!'
                  : 'Striking at standard 45° hits the stadium roof and loses forward energy. The constrained calculus optimum skim just under the ceiling for maximum boundary range!'}
              </p>
            </div>
          </div>
        )}

        {/* ===================== SCENARIO 2: FIELDER (2 TRAJECTORIES) ===================== */}
        {scenario === 'fielder' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>{t.stumpsDistance}</span>
                  <span className="font-mono font-bold text-pink-400">{targetDistance.toFixed(1)} m</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="1"
                  value={targetDistance}
                  onChange={(e) => onTargetDistanceChange(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>{t.power}</span>
                  <span className="font-mono font-bold text-cyan-400">{u.toFixed(1)} m/s</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="55"
                  step="0.5"
                  value={u}
                  onChange={(e) => onUChange(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  disabled={!fielderMath.isReachable}
                  onClick={() => onLaunchBothFielder(fielderMath.flatAngle, fielderMath.loftedAngle)}
                  className={`flex-1 py-2 px-4 rounded-lg font-extrabold text-sm shadow-lg active:scale-95 transition-all ${
                    fielderMath.isReachable
                      ? 'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white shadow-pink-950/50'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  🚀 {t.simBothThrows}
                </button>
                <button
                  onClick={onClearTrails}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 active:scale-95"
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* Complementary Angles Breakdown */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 space-y-2 text-xs">
              <div className="font-bold text-pink-400 flex items-center gap-1.5">
                <span>🏃</span>
                <span>{t.fielderTitle}</span>
              </div>
              <div className="font-mono space-y-1.5 text-slate-300 bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
                <p className="text-slate-400">sin(2θ) = (R · g) / u²</p>
                {fielderMath.isReachable ? (
                  <>
                    <p className="text-cyan-400 font-bold">
                      ■ {t.flatThrow}: θ₁ = {fielderMath.flatAngle.toFixed(1)}° | Flight Time ={' '}
                      <span className="text-white">{fielderMath.tFlat.toFixed(2)}s</span>
                    </p>
                    <p className="text-purple-400 font-bold">
                      ■ {t.loftedThrow}: θ₂ = {fielderMath.loftedAngle.toFixed(1)}° | Flight Time ={' '}
                      <span className="text-white">{fielderMath.tLoft.toFixed(2)}s</span>
                    </p>
                  </>
                ) : (
                  <p className="text-rose-400 font-bold">
                    Target unreachable! Increase velocity &gt; {fielderMath.minSpeedNeeded.toFixed(1)} m/s
                  </p>
                )}
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {t.fielderInsight}
              </p>
            </div>
          </div>
        )}

        {/* ===================== SCENARIO 3: REAL-WORLD AERODYNAMICS & 45° ILLUSION ===================== */}
        {scenario === 'aerodynamics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleAirDrag(false)}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all border ${
                    !isAirDragActive
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                      : 'bg-slate-800/80 text-slate-400 border-transparent hover:text-white'
                  }`}
                >
                  🌌 {t.vacuumMode}
                </button>
                <button
                  onClick={() => onToggleAirDrag(true)}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all border ${
                    isAirDragActive
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-slate-800/80 text-slate-400 border-transparent hover:text-white'
                  }`}
                >
                  🌪️ {t.airMode}
                </button>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>{t.dragIntensity}</span>
                  <span className="font-mono font-bold text-amber-400">{airDragCoeff.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min="0.005"
                  max="0.04"
                  step="0.002"
                  value={airDragCoeff}
                  onChange={(e) => onAirDragCoeffChange(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>{t.power}</span>
                    <span className="font-mono text-cyan-400 font-bold">{u.toFixed(0)}m/s</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="60"
                    step="1"
                    value={u}
                    onChange={(e) => onUChange(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>{t.angle}</span>
                    <span className="font-mono text-cyan-400 font-bold">{theta.toFixed(0)}°</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="75"
                    step="1"
                    value={theta}
                    onChange={(e) => onThetaChange(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  onClick={() => onLaunchDragComparison(u, theta)}
                  className="flex-1 py-2 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-extrabold text-xs shadow-lg shadow-orange-950/50 active:scale-95 transition-all"
                >
                  🌪️ {t.simCompareDrag}
                </button>
                <button
                  onClick={() => {
                    onThetaChange(dragMath.bestAngle);
                    onToggleAirDrag(true);
                    onLaunchDragComparison(u, dragMath.bestAngle);
                  }}
                  className="py-2 px-3 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 text-xs font-bold border border-cyan-700/60 active:scale-95 transition-all"
                  title={`Launch at computed maximum range angle: ${dragMath.bestAngle}°`}
                >
                  🎯 {dragMath.bestAngle}° Optimum
                </button>
                <button
                  onClick={onClearTrails}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 active:scale-95"
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* Drag Discovery Card */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 space-y-2 text-xs">
              <div className="font-bold text-amber-400 flex items-center gap-1.5">
                <span>🌪️</span>
                <span>{t.dragTitle}</span>
              </div>
              <div className="font-mono space-y-1.5 text-slate-300 bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
                <p className="text-slate-400">Quadratic Drag: F_d = ½ · ρ · C_d · A · v²</p>
                <p className="text-cyan-300">■ Vacuum Maximum Range: θ = 45.0° (Symmetric Parabola)</p>
                <p className="text-amber-400 font-bold">
                  ■ Real Atmosphere Optimum: θ = {dragMath.bestAngle}° | Max Range = {dragMath.maxRange.toFixed(1)}m
                </p>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {t.dragInsight}
              </p>
            </div>
          </div>
        )}

        {/* ===================== SCENARIO 4: MOVING DRONE RESCUE ===================== */}
        {scenario === 'drone' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>{t.droneAlt}</span>
                  <span className="font-mono font-bold text-sky-400">{droneAlt.toFixed(1)} m</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="60"
                  step="1"
                  value={droneAlt}
                  onChange={(e) => onDroneAltChange(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>{t.droneSpeed}</span>
                  <span className="font-mono font-bold text-emerald-400">{droneSpeed.toFixed(1)} m/s</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="25"
                  step="0.5"
                  value={droneSpeed}
                  onChange={(e) => onDroneSpeedChange(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={onLaunchDroneDrop}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-slate-950 font-black text-sm shadow-lg shadow-sky-950/50 active:scale-95 transition-all"
                >
                  📦 {t.dropCargo}
                </button>
                <button
                  onClick={onClearTrails}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 active:scale-95"
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* Drone Inertia Math Card */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 space-y-2 text-xs">
              <div className="font-bold text-sky-400 flex items-center gap-1.5">
                <span>🚁</span>
                <span>{t.droneTitle}</span>
              </div>
              <div className="font-mono space-y-1.5 text-slate-300 bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
                <p className="text-slate-400">Horizontal Inertia: v_0x = v_drone</p>
                {(() => {
                  const dropMath = calcDroneDrop(droneAlt, droneSpeed, currentPlanet.g);
                  return (
                    <>
                      <p className="text-yellow-300">Fall Time: T = √(2h/g) = {dropMath.tFall.toFixed(2)} s</p>
                      <p className="text-emerald-400 font-bold">
                        Forward Drift: D = vx · T = {dropMath.forwardDist.toFixed(1)} m
                      </p>
                    </>
                  );
                })()}
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {lang === 'hi'
                  ? 'ड्रोन से छूटते ही पैकेट में पहले से ड्रोन का आगे का वेग होता है। अतः ठीक नाव के ऊपर नहीं, बल्कि गणितीय दूरी D पहले ही बटन दबाना होगा!'
                  : 'Due to Galilean inertia, the dropped cargo already carries the drone forward velocity! You must release the crate D meters BEFORE reaching the victims!'}
              </p>
            </div>
          </div>
        )}

        {/* ===================== SCENARIO 5: THE HILL CLIMB SHOT ===================== */}
        {scenario === 'inclined' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>{t.slopeAngle}</span>
                  <span className="font-mono font-bold text-yellow-400">{slopeAngle.toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="35"
                  step="1"
                  value={slopeAngle}
                  onChange={(e) => onSlopeAngleChange(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>{t.power}</span>
                  <span className="font-mono font-bold text-cyan-400">{u.toFixed(1)} m/s</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="55"
                  step="0.5"
                  value={u}
                  onChange={(e) => onUChange(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => onLaunchHillShot(optimalHillAngle)}
                  className="flex-1 py-2 px-3 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs shadow-lg shadow-teal-950/50 active:scale-95 transition-all"
                >
                  ⛰️ {t.simOptimalHill}
                </button>
                <button
                  onClick={() => onLaunchHillShot(45)}
                  className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 active:scale-95"
                >
                  {t.simStandardHill}
                </button>
                <button
                  onClick={onClearTrails}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 active:scale-95"
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* Inclined Plane Math Card */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 space-y-2 text-xs">
              <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                <span>⛰️</span>
                <span>{t.hillTitle}</span>
              </div>
              <div className="font-mono space-y-1.5 text-slate-300 bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
                <p className="text-slate-400">{t.hillFormula}</p>
                <p className="text-yellow-400">
                  Optimal Launch Angle: θ = 45° + ({slopeAngle}° / 2) ={' '}
                  <span className="text-white font-bold">{optimalHillAngle.toFixed(1)}°</span>
                </p>
                <div className="h-px bg-slate-800 my-1" />
                <p className="text-emerald-400">
                  Optimal Hill Range: {optimalHillRange.toFixed(1)}m (vs 45° standard: {standardHillRange.toFixed(1)}m)
                </p>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {lang === 'hi'
                  ? 'पहाड़ी पर प्रक्षेप्य का गुरुत्वाकर्षण घटक बदल जाता है। अतः 45° पर मारा गया शॉट पहाड़ी पर जल्दी गिर जाता है, जबकि (45° + α/2) सबसे अधिक दूरी देता है!'
                  : 'On an inclined plane, the effective gravity vector tilts. Standard 45° hits the slope too soon; the true calculus maximum occurs at θ = π/4 + α/2!'}
              </p>
            </div>
          </div>
        )}

        {/* ===================== SCENARIO 6: MONKEY & HUNTER ILLUSION ===================== */}
        {scenario === 'monkey' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>{t.monkeyDist}</span>
                    <span className="font-mono font-bold text-yellow-400">{monkeyDist.toFixed(0)}m</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="90"
                    step="1"
                    value={monkeyDist}
                    onChange={(e) => onMonkeyDistChange(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>{t.monkeyHeight}</span>
                    <span className="font-mono font-bold text-yellow-400">{monkeyHeight.toFixed(0)}m</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="50"
                    step="1"
                    value={monkeyHeight}
                    onChange={(e) => onMonkeyHeightChange(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>{t.bulletSpeed}</span>
                  <span className="font-mono font-bold text-cyan-400">{u.toFixed(1)} m/s</span>
                </div>
                <input
                  type="range"
                  min="16"
                  max="60"
                  step="0.5"
                  value={u}
                  onChange={(e) => onUChange(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={onLaunchMonkey}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white font-black text-sm shadow-lg shadow-rose-950/50 active:scale-95 transition-all"
                >
                  🎯 {t.fireAtTarget}
                </button>
                <button
                  onClick={onClearTrails}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 active:scale-95"
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* Monkey Hunter Proof Card */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 space-y-2 text-xs">
              <div className="font-bold text-rose-400 flex items-center gap-1.5">
                <span>🎯</span>
                <span>{t.monkeyTitle}</span>
              </div>
              <div className="font-mono space-y-1.5 text-slate-300 bg-slate-900/80 p-2.5 rounded border border-slate-800/80">
                <p className="text-slate-400">Aim Line-of-Sight: θ = tan⁻¹(H / D) = {monkeyMath.thetaDeg.toFixed(1)}°</p>
                <p className="text-yellow-300">Impact Time: t = D / (u · cosθ) = {monkeyMath.tHit.toFixed(2)}s</p>
                <p className="text-emerald-400 font-bold">
                  {monkeyMath.willHitBeforeGround
                    ? `Collision Height: H_hit = ${monkeyMath.hitHeight.toFixed(1)}m (Both fell by ${(monkeyMath.dropDistance).toFixed(1)}m)`
                    : 'Target hits ground before bullet arrives! Increase launch speed!'}
                </p>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {t.monkeyFormula}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
