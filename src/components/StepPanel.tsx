import React from 'react';
import { ChevronLeft, ChevronRight, Volume2, Target, Lightbulb, CheckCircle } from 'lucide-react';
import type { OperatingStep, PartAnchor } from '../types/equipment';
import { ttsService } from '../lib/tts';
import type { Language } from '../lib/i18n';
import { translations } from '../lib/i18n';
import type { AnchorMode } from '../lib/anchors';

interface StepPanelProps {
  steps: OperatingStep[];
  currentStepIndex: number;
  parts: PartAnchor[];
  anchorMode: AnchorMode;
  lang: Language;
  isPartOffScreen?: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSelectStep: (idx: number) => void;
}

export const StepPanel: React.FC<StepPanelProps> = ({
  steps,
  currentStepIndex,
  parts,
  anchorMode,
  lang,
  isPartOffScreen = false,
  onNext,
  onPrev,
  onSelectStep,
}) => {
  const t = translations[lang];
  const step = steps[currentStepIndex];
  if (!step) return null;

  const targetPart = parts.find((p) => p.id === step.targetPartId);
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === steps.length - 1;

  const speakStep = () => {
    const textToSpeak = lang === 'hi' && step.textHi ? step.textHi : step.text;
    ttsService.speak(textToSpeak, lang);
  };

  const getAnchorBadgeClass = () => {
    switch (anchorMode) {
      case 'Marker-anchored':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'Part-detected':
        return 'bg-sky-500/20 text-sky-400 border-sky-500/40';
      default:
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    }
  };

  return (
    <div className="w-full glass-card rounded-2xl p-4 sm:p-5 border border-emerald-500/30 shadow-2xl animate-fade-in text-gray-100">
      {/* Top Bar: Step Index + Anchor Badge + Audio Button */}
      <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-gray-700/60">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-600/30 text-emerald-300 border border-emerald-500/40">
            {t.stepLabel} {currentStepIndex + 1} {t.of} {steps.length}
          </span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getAnchorBadgeClass()}`}>
            {anchorMode}
          </span>
        </div>

        <button
          onClick={speakStep}
          title="Listen in audio"
          className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-600 transition-colors flex items-center gap-1.5 text-xs font-semibold"
        >
          <Volume2 className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">Audio</span>
        </button>
      </div>

      {/* Target Part Highlight Card */}
      {targetPart && (
        <div className="flex items-center justify-between bg-gray-900/80 border border-gray-700/80 rounded-xl px-3 py-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Target className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
            <span className="text-xs text-gray-400 shrink-0">{t.targetPart}:</span>
            <span className="text-xs font-bold text-white truncate">
              {lang === 'hi' && targetPart.nameHi ? targetPart.nameHi : targetPart.name}
            </span>
          </div>

          {isPartOffScreen && (
            <span className="text-[10px] font-bold text-amber-400 bg-amber-950/70 border border-amber-500/50 px-2 py-0.5 rounded shrink-0">
              {t.partOffScreen}
            </span>
          )}
        </div>
      )}

      {/* Step Instruction Text */}
      <div className="mb-3">
        <p className="text-sm sm:text-base font-semibold leading-relaxed text-gray-100">
          {lang === 'hi' && step.textHi ? step.textHi : step.text}
        </p>

        {/* Expected value callout if specified */}
        {step.expectedValue && (
          <div className="mt-2.5 flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/40 rounded-lg px-3 py-1.5 text-xs text-emerald-300">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              <strong>{t.expectedReading}:</strong> {step.expectedValue}
            </span>
          </div>
        )}

        {/* Pro Tip if present */}
        {step.tip && (
          <div className="mt-2 flex items-start gap-2 bg-gray-900/60 border border-gray-700/60 rounded-lg px-3 py-2 text-xs text-gray-300">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-snug">
              <strong className="text-amber-400">Tip:</strong> {lang === 'hi' && step.tipHi ? step.tipHi : step.tip}
            </p>
          </div>
        )}
      </div>

      {/* Navigation Buttons + Step Dots */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onPrev}
          disabled={isFirst}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            isFirst
              ? 'opacity-40 cursor-not-allowed text-gray-500'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-600'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          {t.prevStep}
        </button>

        {/* Step progress dots */}
        <div className="flex items-center gap-1.5 max-w-[120px] overflow-x-auto py-1">
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => onSelectStep(idx)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                idx === currentStepIndex
                  ? 'bg-emerald-400 scale-125'
                  : idx < currentStepIndex
                  ? 'bg-emerald-700'
                  : 'bg-gray-600'
              }`}
            />
          ))}
        </div>

        <button
          onClick={onNext}
          disabled={isLast}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            isLast
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40 opacity-70'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
          }`}
        >
          {isLast ? t.stepFinished : t.nextStep}
          {!isLast && <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
