import React from 'react';
import { Volume2, VolumeX, Globe, RotateCcw } from 'lucide-react';
import { ScenarioId, Language } from '../types';
import { TRANSLATIONS } from '../utils/constants';
import { sound } from '../utils/audio';

interface NavbarProps {
  currentScenario: ScenarioId;
  onSelectScenario: (id: ScenarioId) => void;
  lang: Language;
  onToggleLang: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onReset: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentScenario,
  onSelectScenario,
  lang,
  onToggleLang,
  isMuted,
  onToggleMute,
  onReset,
}) => {
  const t = TRANSLATIONS[lang];

  const scenarios: { id: ScenarioId; label: string }[] = [
    { id: 'sandbox', label: t.sandboxTab },
    { id: 'indoor', label: t.indoorTab },
    { id: 'fielder', label: t.fielderTab },
    { id: 'aerodynamics', label: t.dragTab },
    { id: 'drone', label: t.droneTab },
    { id: 'inclined', label: t.hillTab },
    { id: 'monkey', label: t.monkeyTab },
  ];

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-4 flex items-center justify-between shrink-0 select-none z-30">
      {/* Zone 1: Wordmark */}
      <div className="flex items-center gap-2">
        <span className="text-xl">🪐</span>
        <span className="text-base font-bold tracking-tight text-white hidden sm:inline">
          {lang === 'hi' ? 'इंटरप्लेनेटरी फिजिक्स लैब' : 'Interplanetary Physics Lab'}
        </span>
        <span className="text-xs font-mono text-cyan-400 font-semibold px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/50">
          KINEMATICS
        </span>
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="flex items-center gap-1 overflow-x-auto py-1 max-w-[55vw] no-scrollbar">
        {scenarios.map((item) => {
          const isActive = currentScenario === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectScenario(item.id)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md whitespace-nowrap transition-all duration-150 ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onReset}
          title={t.clearTrails}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-md transition-colors border border-slate-800"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={onToggleMute}
          title={isMuted ? t.soundOff : t.soundOn}
          className={`p-1.5 rounded-md transition-colors border ${
            isMuted
              ? 'text-slate-500 border-slate-800 bg-slate-900'
              : 'text-cyan-400 border-cyan-800/50 bg-cyan-950/40'
          }`}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <button
          onClick={onToggleLang}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
        >
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span>{lang === 'en' ? 'हिंदी' : 'English'}</span>
        </button>
      </div>
    </header>
  );
};
