import React, { useEffect, useState } from 'react';
import { 
  Play, Volume2, ShieldCheck, AlertTriangle, ExternalLink, Bookmark, 
  BookmarkCheck, Target, ArrowLeft
} from 'lucide-react';
import { getEquipmentById, toggleBookmark, isBookmarked } from '../lib/db';
import type { Equipment } from '../types/equipment';
import { ttsService } from '../lib/tts';
import type { Language } from '../lib/i18n';
import { translations } from '../lib/i18n';

interface DetailProps {
  equipmentId: string;
  lang: Language;
  onBack: () => void;
  onOpenDemo: (id: string) => void;
}

export const Detail: React.FC<DetailProps> = ({
  equipmentId,
  lang,
  onBack,
  onOpenDemo,
}) => {
  const t = translations[lang];
  const [item, setItem] = useState<Equipment | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [activeStepIdx, setActiveStepIdx] = useState(0);

  useEffect(() => {
    getEquipmentById(equipmentId).then((data) => {
      if (data) setItem(data);
    });
    isBookmarked(equipmentId).then(setBookmarked);
  }, [equipmentId]);

  const handleToggleBookmark = async () => {
    if (!item) return;
    const newState = await toggleBookmark(item.id);
    setBookmarked(newState);
  };

  const speakText = (text: string) => {
    ttsService.speak(text, lang);
  };

  if (!item) {
    return (
      <div className="p-8 text-center text-gray-400">
        Loading instrument details...
      </div>
    );
  }

  const isHigh = item.hazardLevel === 'high';

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6 animate-fade-in">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Library</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleBookmark}
            className="p-2 rounded-xl bg-gray-900 border border-gray-700 text-gray-300 hover:text-emerald-400 transition-colors"
            title="Bookmark"
          >
            {bookmarked ? (
              <BookmarkCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <Bookmark className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={() => onOpenDemo(item.id)}
            className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-lg shadow-emerald-950/40"
          >
            <Play className="w-3.5 h-3.5 text-black fill-current" />
            <span>Simulate AR</span>
          </button>
        </div>
      </div>

      {/* Header Profile Card */}
      <div className="glass-card rounded-2xl overflow-hidden border border-gray-800">
        <div className="relative h-60 sm:h-72 w-full bg-gray-950">
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />

          {/* Badges on image */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            {item.markerId !== null && (
              <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-gray-700 text-xs font-bold text-sky-400">
                ArUco Marker #{item.markerId}
              </span>
            )}
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                isHigh
                  ? 'bg-red-500/30 text-red-300 border-red-500/50'
                  : item.hazardLevel === 'medium'
                  ? 'bg-amber-500/30 text-amber-300 border-amber-500/50'
                  : 'bg-emerald-500/30 text-emerald-300 border-emerald-500/50'
              }`}
            >
              {item.hazardLevel.toUpperCase()} HAZARD
            </span>
          </div>

          <div className="absolute bottom-4 left-4 right-4">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
              {item.category}
            </span>
            <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">
              {item.name}
            </h1>
            <div className="text-sm sm:text-base text-gray-300 font-semibold">
              {item.nameHi}
            </div>
          </div>
        </div>

        {/* Aliases & Staff Sign-off */}
        <div className="p-4 bg-gray-900/60 border-t border-gray-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-gray-500 font-medium">Aliases:</span>
            {item.aliases.map((a) => (
              <span key={a} className="px-2 py-0.5 rounded bg-gray-800 text-gray-300">
                {a}
              </span>
            ))}
          </div>

          {item.staffReviewed && (
            <div className="flex items-center gap-1.5 text-blue-300 bg-blue-950/50 border border-blue-800/50 px-2.5 py-1 rounded-lg">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>
                Staff-Reviewed: <strong>{item.staffReviewed.by}</strong> ({item.staffReviewed.date})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Safety Precautions First */}
      <div className={`glass-card rounded-2xl p-5 border-2 ${isHigh ? 'border-red-500/50' : 'border-amber-500/40'} space-y-3`}>
        <div className="flex items-center justify-between pb-2 border-b border-gray-700/60">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${isHigh ? 'text-red-400' : 'text-amber-400'}`} />
            <h2 className="font-bold text-base sm:text-lg text-white">
              {t.tabSafety} & PPE
            </h2>
          </div>
          <button
            onClick={() => speakText(item.safetyPrecautions.join('. '))}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-200 border border-gray-600"
          >
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Listen</span>
          </button>
        </div>

        <div className="space-y-2 text-xs sm:text-sm text-gray-200">
          {(lang === 'hi' && item.safetyPrecautionsHi?.length ? item.safetyPrecautionsHi : item.safetyPrecautions).map((p, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-red-400 font-bold shrink-0">•</span>
              <p>{p}</p>
            </div>
          ))}
        </div>

        {item.requiredPPE.length > 0 && (
          <div className="pt-2 border-t border-gray-800 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400 font-bold uppercase">Required PPE:</span>
            {item.requiredPPE.map((ppe) => (
              <span key={ppe} className="px-2.5 py-1 rounded-lg bg-gray-800 border border-gray-700 text-xs text-emerald-300 font-medium">
                ✓ {ppe}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Step-by-Step Operating Guide */}
      <div className="glass-card rounded-2xl p-5 border border-emerald-500/30 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-700/60">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-base sm:text-lg text-white">
              {t.tabSteps} ({item.operatingSteps.length} Steps)
            </h2>
          </div>
        </div>

        <div className="space-y-3">
          {item.operatingSteps.map((step, idx) => {
            const targetPart = item.parts.find((p) => p.id === step.targetPartId);
            return (
              <div
                key={step.stepNumber}
                onClick={() => setActiveStepIdx(idx)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  activeStepIdx === idx
                    ? 'bg-emerald-950/40 border-emerald-500/60 shadow-lg'
                    : 'bg-gray-900/60 border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-emerald-400">
                    Step {step.stepNumber}
                  </span>
                  {targetPart && (
                    <span className="text-[11px] font-semibold text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
                      Anchored to: <strong className="text-gray-200">{targetPart.name}</strong>
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-gray-200 font-medium leading-relaxed">
                  {lang === 'hi' && step.textHi ? step.textHi : step.text}
                </p>

                {step.expectedValue && (
                  <div className="mt-2 text-xs text-sky-400 font-semibold">
                    Expected: {step.expectedValue}
                  </div>
                )}
                {step.tip && (
                  <div className="mt-1.5 text-xs text-gray-400 italic">
                    Tip: {step.tip}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3D Part Anchors Table */}
      <div className="glass-card rounded-2xl p-5 border border-sky-500/30 space-y-3">
        <h2 className="font-bold text-base sm:text-lg text-sky-300">
          AR Physical Component Anchors ({item.parts.length} registered parts)
        </h2>
        <p className="text-xs text-gray-400">
          These coordinate anchors pin virtual 3D arrows and highlight rings to real components during camera recognition.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-gray-900/80 text-gray-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-2.5">Component</th>
                <th className="p-2.5">Hindi Name</th>
                <th className="p-2.5">3D Marker Offset (x,y,z)</th>
                <th className="p-2.5">2D Bbox Fallback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {item.parts.map((part) => (
                <tr key={part.id} className="hover:bg-gray-800/40">
                  <td className="p-2.5 font-bold text-white">{part.name}</td>
                  <td className="p-2.5 text-gray-400">{part.nameHi}</td>
                  <td className="p-2.5 font-mono text-emerald-400">
                    ({part.markerOffset.x}, {part.markerOffset.y}, {part.markerOffset.z})
                  </td>
                  <td className="p-2.5 font-mono text-sky-400">
                    ({(part.bboxAnchor.x * 100).toFixed(0)}%, {(part.bboxAnchor.y * 100).toFixed(0)}%)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Specifications Grid */}
      <div className="glass-card rounded-2xl p-5 border border-gray-800 space-y-3">
        <h2 className="font-bold text-base sm:text-lg text-white">
          {t.specsHeader}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {Object.entries(item.specs).map(([k, v]) => (
            <div key={k} className="p-3 bg-gray-900/70 rounded-xl border border-gray-800">
              <span className="text-gray-500 font-semibold uppercase text-[10px]">{k}</span>
              <div className="font-bold text-white text-sm mt-0.5">{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Common Mistakes & Manual Link */}
      <div className="glass-card rounded-2xl p-5 border border-gray-800 space-y-3">
        <h2 className="font-bold text-base sm:text-lg text-white">
          {t.commonMistakesHeader}
        </h2>
        <div className="space-y-2 text-xs sm:text-sm text-gray-300">
          {item.commonMistakes.map((m, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-amber-400 font-bold shrink-0">•</span>
              <p>{m}</p>
            </div>
          ))}
        </div>

        {item.manualLink && (
          <div className="pt-3 border-t border-gray-800">
            <a
              href={item.manualLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 font-semibold text-xs sm:text-sm underline"
            >
              <span>{t.officialManual}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
