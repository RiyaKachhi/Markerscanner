import React, { useEffect, useState } from 'react';
import { Camera, BookOpen, Printer, FileText, Lock, Play, Compass, History, ShieldAlert, Sparkles, ChevronRight } from 'lucide-react';
import type { Language } from '../lib/i18n';
import { translations } from '../lib/i18n';
import { getRecentScans } from '../lib/db';
import type { ScanHistoryItem } from '../types/equipment';

interface HomeProps {
  lang: Language;
  onNavigate: (tab: string, extra?: unknown) => void;
  onOpenDemo: (equipmentId?: string) => void;
  onOpenOnboarding: () => void;
}

export const Home: React.FC<HomeProps> = ({
  lang,
  onNavigate,
  onOpenDemo,
  onOpenOnboarding,
}) => {
  const t = translations[lang];
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);

  useEffect(() => {
    getRecentScans(5).then(setHistory);
  }, []);

  const categories = [
    { id: 'Measurement', icon: Compass, color: 'text-sky-400', bg: 'bg-sky-950/40 border-sky-800/40' },
    { id: 'Electronics', icon: Sparkles, color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-800/40' },
    { id: 'Mechanical', icon: Play, color: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-800/40' },
    { id: 'Robotics', icon: History, color: 'text-purple-400', bg: 'bg-purple-950/40 border-purple-800/40' },
    { id: 'Safety Gear', icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-950/40 border-red-800/40' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6 sm:space-y-8 animate-fade-in">
      {/* Hero Section */}
      <div className="text-center space-y-3 pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold shadow-inner">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Tech Elevate 2026 • Team Humpty Dumpty</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
          Lab<span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200 bg-clip-text text-transparent">Lens</span>
        </h1>
        <p className="text-sm sm:text-base text-gray-400 max-w-lg mx-auto font-medium">
          {t.appSubtitle}
        </p>

        <button
          onClick={onOpenOnboarding}
          className="text-xs text-emerald-400 hover:text-emerald-300 underline font-semibold transition-colors"
        >
          How it works (3-step guide)
        </button>
      </div>

      {/* Primary Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Big Scan Button */}
        <button
          onClick={() => onNavigate('scan')}
          className="group relative overflow-hidden rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-800 text-white shadow-xl shadow-emerald-950/50 hover:shadow-emerald-900/40 hover:scale-[1.01] active:scale-[0.99] transition-all text-left flex flex-col justify-between min-h-[140px]"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-black/20 backdrop-blur-md flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/20 uppercase tracking-wider">
              Live Camera AR
            </span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              {t.scanEquipment}
            </h2>
            <p className="text-xs text-emerald-100/80 mt-1">
              Live ArUco marker & ML detection with anchored 3D instructions
            </p>
          </div>
        </button>

        {/* Browse Library Button */}
        <button
          onClick={() => onNavigate('library')}
          className="group rounded-2xl p-5 sm:p-6 glass-card hover:bg-gray-800/80 border border-gray-700/80 text-white shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all text-left flex flex-col justify-between min-h-[140px]"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-emerald-400" />
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-emerald-400 transition-colors" />
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              {t.browseLibrary}
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Explore 15 pre-loaded lab instruments with technical specs & parts
            </p>
          </div>
        </button>
      </div>

      {/* Demo Mode & Marker Tool Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => onOpenDemo()}
          className="p-3.5 rounded-xl bg-gray-900/70 hover:bg-gray-800/90 border border-amber-500/30 flex items-center gap-3 text-left transition-colors group"
        >
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
            <Play className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-200 group-hover:text-amber-300">
              {t.demoMode}
            </div>
            <div className="text-[10px] text-gray-400">
              Simulate AR guide with sample images
            </div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('markers')}
          className="p-3.5 rounded-xl bg-gray-900/70 hover:bg-gray-800/90 border border-gray-700/80 flex items-center gap-3 text-left transition-colors group"
        >
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-200 group-hover:text-sky-300">
              {t.printMarkers}
            </div>
            <div className="text-[10px] text-gray-400">
              Printable A4 ArUco markers sheet
            </div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('report')}
          className="p-3.5 rounded-xl bg-gray-900/70 hover:bg-gray-800/90 border border-gray-700/80 flex items-center gap-3 text-left transition-colors group"
        >
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-200 group-hover:text-purple-300">
              {t.modelReport}
            </div>
            <div className="text-[10px] text-gray-400">
              Evaluation metrics & mAP
            </div>
          </div>
        </button>
      </div>

      {/* Category Quick Chips */}
      <div>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">
          Instrument Categories
        </h3>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => onNavigate('library', { category: cat.id })}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold whitespace-nowrap transition-transform active:scale-95 hover:bg-gray-800 ${cat.bg}`}
              >
                <Icon className={`w-3.5 h-3.5 ${cat.color}`} />
                <span className="text-gray-200">{cat.id}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Scan History */}
      {history.length > 0 && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
              <History className="w-4 h-4 text-emerald-400" />
              <span>Recent Scans</span>
            </div>
            <span className="text-[10px] text-gray-500">Last 5</span>
          </div>

          <div className="divide-y divide-gray-800">
            {history.map((item, idx) => (
              <div
                key={idx}
                onClick={() => onNavigate('detail', { id: item.equipmentId })}
                className="py-2.5 flex items-center justify-between cursor-pointer hover:text-emerald-300 transition-colors"
              >
                <div>
                  <span className="text-xs font-medium text-gray-200">
                    {item.equipmentName}
                  </span>
                  <div className="text-[10px] text-gray-500">
                    {new Date(item.timestamp).toLocaleTimeString()} • {item.method}
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-400">
                  {(item.confidence * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin and Footer */}
      <div className="pt-4 flex items-center justify-between border-t border-gray-800/80 text-xs text-gray-500">
        <button
          onClick={() => onNavigate('admin')}
          className="flex items-center gap-1.5 hover:text-gray-300 transition-colors"
        >
          <Lock className="w-3.5 h-3.5 text-gray-400" />
          <span>{t.adminPanel}</span>
        </button>

        <p className="font-semibold text-gray-400 tracking-wide">
          {t.tagline}
        </p>
      </div>
    </div>
  );
};
