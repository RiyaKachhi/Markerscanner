import React from 'react';
import { HelpCircle, ChevronRight, Search } from 'lucide-react';
import type { CandidateResult } from '../lib/detection';
import type { Language } from '../lib/i18n';
import { translations } from '../lib/i18n';

interface CandidateSheetProps {
  candidates: CandidateResult[];
  lang: Language;
  onSelectCandidate: (equipmentId: string) => void;
  onOpenManualSearch: () => void;
  onDismiss: () => void;
}

export const CandidateSheet: React.FC<CandidateSheetProps> = ({
  candidates,
  lang,
  onSelectCandidate,
  onOpenManualSearch,
  onDismiss,
}) => {
  const t = translations[lang];

  return (
    <div className="w-full glass-card rounded-2xl p-4 sm:p-5 border border-amber-500/40 shadow-2xl animate-fade-in text-gray-100">
      <div className="flex items-center gap-2.5 pb-2 mb-3 border-b border-gray-700/60">
        <HelpCircle className="w-5 h-5 text-amber-400 shrink-0" />
        <div>
          <h3 className="font-bold text-sm sm:text-base text-amber-300">
            {t.candidateSheetTitle}
          </h3>
          <p className="text-[11px] text-gray-400 leading-tight">
            {t.belowThresholdMsg}
          </p>
        </div>
      </div>

      {/* Candidate List (Real Model Confidence Scores) */}
      <div className="space-y-2 mb-3">
        {candidates.map((cand) => (
          <button
            key={cand.equipmentId}
            onClick={() => onSelectCandidate(cand.equipmentId)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-900/80 hover:bg-gray-800 border border-gray-700/80 transition-all text-left"
          >
            <div>
              <div className="font-semibold text-xs sm:text-sm text-gray-200">
                {cand.name}
              </div>
              <div className="text-[10px] text-gray-400">
                Model Confidence: <span className="text-amber-400 font-bold">{(cand.confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        ))}
      </div>

      {/* None of these button */}
      <button
        onClick={onOpenManualSearch}
        className="w-full py-2.5 px-3 rounded-xl bg-gray-800/80 hover:bg-gray-700 border border-gray-600 text-gray-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors mb-2"
      >
        <Search className="w-3.5 h-3.5 text-sky-400" />
        {t.noneOfThese}
      </button>

      <button
        onClick={onDismiss}
        className="w-full py-1.5 text-center text-[11px] text-gray-400 hover:text-gray-200 transition-colors"
      >
        Dismiss
      </button>
    </div>
  );
};
