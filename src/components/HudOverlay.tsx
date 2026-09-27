import React from 'react';
import { Planet, Language, ScenarioId } from '../types';
import { TRANSLATIONS } from '../utils/constants';

interface HudOverlayProps {
  planet: Planet;
  u: number;
  theta: number;
  lang: Language;
  score: number;
  streak: number;
  scenario: ScenarioId;
  activeBallCount: number;
  liveStats?: {
    R: number;
    H: number;
    T: number;
    vx: number;
    vy: number;
    currentSpeed: number;
  };
  hitMessage: string | null;
}

export const HudOverlay: React.FC<HudOverlayProps> = ({
  planet,
  u,
  theta,
  lang,
  score,
  streak,
  scenario,
  liveStats,
  hitMessage,
}) => {
  const t = TRANSLATIONS[lang];

  // Fallback analytical calculations
  const rad = (theta * Math.PI) / 180;
  const R = liveStats?.R ?? (u * u * Math.sin(2 * rad)) / planet.g;
  const H = liveStats?.H ?? (u * u * Math.sin(rad) * Math.sin(rad)) / (2 * planet.g);
  const T = liveStats?.T ?? (2 * u * Math.sin(rad)) / planet.g;
  const vx = liveStats?.vx ?? u * Math.cos(rad);
  const vy = liveStats?.vy ?? u * Math.sin(rad);

  return (
    <div className="pointer-events-none absolute inset-0 p-4 flex flex-col justify-between select-none z-10">
      {/* Top Left: Score & Scenario Indicator */}
      <div className="flex items-start gap-3">
        {scenario === 'sandbox' && (
          <div className="bg-slate-900/80 backdrop-blur-md border border-amber-500/30 rounded-lg px-3.5 py-1.5 shadow-lg flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-amber-400 font-bold text-sm">🏆 {t.score}:</span>
              <span className="font-mono text-base font-extrabold text-amber-300">{score}</span>
            </div>
            {streak > 1 && (
              <div className="flex items-center gap-1 text-xs font-bold text-orange-400 border-l border-slate-700 pl-2">
                <span>🔥 {streak}x {t.streak}</span>
              </div>
            )}
          </div>
        )}

        {/* Hit Alert Banner */}
        {hitMessage && (
          <div className="animate-bounce bg-emerald-500/90 text-slate-950 font-black text-sm md:text-base px-4 py-1.5 rounded-lg shadow-xl border border-emerald-300 backdrop-blur-sm">
            {hitMessage}
          </div>
        )}
      </div>

      {/* Top Right: Real-Time Kinematics HUD */}
      <div className="self-end bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-xl p-3.5 shadow-2xl text-xs md:text-sm min-w-[210px] space-y-2 border-t-2" style={{ borderTopColor: planet.color }}>
        <div className="flex items-center justify-between gap-3">
          <span className="font-bold flex items-center gap-1.5 text-base" style={{ color: planet.color }}>
            <span>{planet.emoji}</span>
            <span>{lang === 'hi' ? planet.nameHi : planet.name}</span>
          </span>
          <span className="font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded text-xs">
            g = {planet.g.toFixed(2)} m/s²
          </span>
        </div>

        <div className="h-px bg-slate-800 my-1" />

        <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono">
          <div className="text-slate-400 text-xs">{lang === 'hi' ? 'परास (R):' : 'Range (R):'}</div>
          <div className="text-right font-bold text-cyan-300">{R.toFixed(1)} m</div>

          <div className="text-slate-400 text-xs">{lang === 'hi' ? 'ऊंचाई (H):' : 'Max Height:'}</div>
          <div className="text-right font-medium text-slate-200">{H.toFixed(1)} m</div>

          <div className="text-slate-400 text-xs">{lang === 'hi' ? 'समय (T):' : 'Time (T):'}</div>
          <div className="text-right font-medium text-slate-200">{T.toFixed(2)} s</div>

          <div className="text-slate-400 text-xs">v_x:</div>
          <div className="text-right text-emerald-400">{vx.toFixed(1)} m/s</div>

          <div className="text-slate-400 text-xs">v_y:</div>
          <div className="text-right text-purple-400">{vy.toFixed(1)} m/s</div>
        </div>
      </div>

      {/* Bottom Center: Drag Hint */}
      {scenario === 'sandbox' && (
        <div className="self-center bg-slate-900/70 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-800 text-xs text-slate-300 shadow-md">
          👆 {t.dragToAim}
        </div>
      )}
    </div>
  );
};
