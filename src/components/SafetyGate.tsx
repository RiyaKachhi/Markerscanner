import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, Volume2, CheckCircle2 } from 'lucide-react';
import type { Equipment } from '../types/equipment';
import { ttsService } from '../lib/tts';
import type { Language } from '../lib/i18n';
import { translations } from '../lib/i18n';

interface SafetyGateProps {
  equipment: Equipment;
  lang: Language;
  onAcknowledge: () => void;
  isConfirmedByUser: boolean;
  onConfirmEquipment: () => void;
}

export const SafetyGate: React.FC<SafetyGateProps> = ({
  equipment,
  lang,
  onAcknowledge,
  isConfirmedByUser,
  onConfirmEquipment,
}) => {
  const t = translations[lang];
  const isHigh = equipment.hazardLevel === 'high';
  const isMedium = equipment.hazardLevel === 'medium';

  // PPE Checklist state
  const [checkedPPE, setCheckedPPE] = useState<Record<string, boolean>>({});

  const allPPETicked =
    equipment.requiredPPE.length === 0 ||
    equipment.requiredPPE.every((item) => checkedPPE[item]);

  const canUnlock = !isHigh || (isConfirmedByUser && allPPETicked);

  const togglePPE = (item: string) => {
    setCheckedPPE((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  const speakSafety = () => {
    const textToSpeak =
      lang === 'hi' && equipment.safetyPrecautionsHi?.length
        ? equipment.safetyPrecautionsHi.join('. ')
        : equipment.safetyPrecautions.join('. ');
    ttsService.speak(textToSpeak, lang);
  };

  const getCardTheme = () => {
    if (isHigh) {
      return {
        border: 'border-red-500/50',
        badgeBg: 'bg-red-500/20 text-red-400 border-red-500/40',
        titleColor: 'text-red-400',
        btnBg: 'bg-red-600 hover:bg-red-500 text-white',
      };
    }
    if (isMedium) {
      return {
        border: 'border-amber-500/50',
        badgeBg: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
        titleColor: 'text-amber-400',
        btnBg: 'bg-amber-600 hover:bg-amber-500 text-white',
      };
    }
    return {
      border: 'border-emerald-500/40',
      badgeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      titleColor: 'text-emerald-400',
      btnBg: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    };
  };

  const theme = getCardTheme();
  const precautions =
    lang === 'hi' && equipment.safetyPrecautionsHi?.length
      ? equipment.safetyPrecautionsHi
      : equipment.safetyPrecautions;

  return (
    <div className={`w-full glass-card rounded-2xl p-4 sm:p-5 border-2 ${theme.border} shadow-2xl animate-fade-in`}>
      {/* Header with Hazard Badge & TTS */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-700/60 mb-3">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className={`w-6 h-6 ${theme.titleColor}`} />
          <div>
            <h3 className={`font-bold text-base sm:text-lg leading-tight ${theme.titleColor}`}>
              {t.safetyFirst}: {lang === 'hi' ? equipment.nameHi : equipment.name}
            </h3>
            <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full border mt-0.5 ${theme.badgeBg}`}>
              {equipment.hazardLevel.toUpperCase()} HAZARD
            </span>
          </div>
        </div>

        <button
          onClick={speakSafety}
          title="Listen in audio"
          className="p-2.5 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-200 border border-gray-600 transition-all flex items-center gap-1.5 text-xs font-semibold"
        >
          <Volume2 className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">Audio</span>
        </button>
      </div>

      {/* High-hazard confirmation gate */}
      {isHigh && !isConfirmedByUser && (
        <div className="bg-red-950/60 border border-red-500/60 rounded-xl p-3.5 mb-4">
          <p className="text-xs sm:text-sm text-red-200 mb-2.5 font-medium">
            ⚠️ {t.confirmEquipmentPrompt} <strong className="text-white">{equipment.name}</strong>?
          </p>
          <button
            onClick={onConfirmEquipment}
            className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs sm:text-sm transition-colors shadow-md"
          >
            {t.confirmYes}
          </button>
        </div>
      )}

      {/* Safety Precautions Bullet List */}
      <div className="space-y-2 mb-4">
        {precautions.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-200">
            <span className="text-red-400 font-bold shrink-0 mt-0.5">•</span>
            <p className="leading-snug">{item}</p>
          </div>
        ))}
      </div>

      {/* Mandatory PPE Checklist (for high & medium hazards) */}
      {equipment.requiredPPE.length > 0 && (
        <div className="bg-gray-900/70 border border-gray-700/80 rounded-xl p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wide">
              {t.ppeChecklistTitle}
            </h4>
          </div>
          <p className="text-[11px] text-gray-400 mb-2.5">
            {t.ppeChecklistPrompt}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {equipment.requiredPPE.map((ppe) => {
              const isChecked = !!checkedPPE[ppe];
              return (
                <button
                  key={ppe}
                  type="button"
                  onClick={() => togglePPE(ppe)}
                  className={`flex items-center gap-2.5 p-2 rounded-lg border text-left text-xs transition-colors ${
                    isChecked
                      ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-300 font-medium'
                      : 'bg-gray-800/40 border-gray-700 text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      isChecked
                        ? 'bg-emerald-500 border-emerald-400 text-black'
                        : 'border-gray-500'
                    }`}
                  >
                    {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                  <span>{ppe}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Acknowledge Button */}
      <button
        type="button"
        disabled={!canUnlock}
        onClick={onAcknowledge}
        className={`w-full py-3 px-4 rounded-xl font-bold text-sm tracking-wide transition-all shadow-lg flex items-center justify-center gap-2 ${
          canUnlock
            ? `${theme.btnBg} cursor-pointer`
            : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
        }`}
      >
        <ShieldCheck className="w-4 h-4" />
        {t.iUnderstand}
      </button>
    </div>
  );
};
