import React, { useEffect, useState } from 'react';
import { Printer, Download, Sliders, ArrowLeft, Check, Info } from 'lucide-react';
import { getAllEquipment } from '../lib/db';
import type { Equipment } from '../types/equipment';
import { generateMarkerSVG } from '../lib/markers';
import type { Language } from '../lib/i18n';
import { translations } from '../lib/i18n';

interface PrintMarkersProps {
  lang: Language;
  onBack: () => void;
}

export const PrintMarkers: React.FC<PrintMarkersProps> = ({ lang, onBack }) => {
  const t = translations[lang];
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [markerSizeCm, setMarkerSizeCm] = useState<number>(5.0);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    getAllEquipment().then((all) => {
      // Filter items with valid markerId (0..49)
      const withMarkers = all.filter((e) => e.markerId !== null);
      withMarkers.sort((a, b) => (a.markerId ?? 0) - (b.markerId ?? 0));
      setEquipmentList(withMarkers);
    });
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadSVG = (id: number, name: string) => {
    const svgStr = generateMarkerSVG(id, 300, name);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aruco_marker_${id}_${name.replace(/\s+/g, '_')}.svg`;
    a.click();
    URL.revokeObjectURL(url);

    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6 animate-fade-in text-gray-100">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {t.markerGuideTitle}
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-xl">
            {t.markerGuideDesc}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-950/40"
          >
            <Printer className="w-4 h-4" />
            <span>{t.printSheet}</span>
          </button>
        </div>
      </div>

      {/* Calibration Banner (print hidden) */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 border border-sky-500/40 space-y-3 print:hidden">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-sky-400 shrink-0" />
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">
                Physical Marker Scale Calibration
              </h3>
              <p className="text-xs text-gray-400">
                Enter your printed marker edge size. Default is 5.0 cm (0.05 meters).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-300 font-semibold">
              Marker Size:
            </label>
            <input
              type="number"
              step="0.5"
              min="2"
              max="20"
              value={markerSizeCm}
              onChange={(e) => setMarkerSizeCm(parseFloat(e.target.value) || 5.0)}
              className="w-20 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-white text-xs font-bold focus:outline-none focus:border-sky-500"
            />
            <span className="text-xs text-gray-400">cm</span>
          </div>
        </div>

        {/* Tips alert */}
        <div className="flex items-start gap-2 bg-gray-900/60 rounded-xl p-3 text-xs text-gray-300 border border-gray-800">
          <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <p>
            <strong>Placement guidelines:</strong> Affix markers completely flat on a non-glare surface near the front panel of each instrument. Avoid curved surfaces or areas covered by operator fingers.
          </p>
        </div>
      </div>

      {/* Printable Sheet Grid */}
      <div className="space-y-4">
        <div className="text-xs text-gray-400 font-bold uppercase tracking-wider print:text-black">
          Standard ArUco 4x4 Dictionary (OpenCV DICT_4X4_50) — {equipmentList.length} Markers
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 print:grid-cols-2 print:gap-8">
          {equipmentList.map((eq) => {
            const svgMarkup = generateMarkerSVG(eq.markerId!, 200, eq.name);
            return (
              <div
                key={eq.id}
                className="bg-white text-black rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col items-center justify-between space-y-3 border border-gray-300 print:shadow-none print:border-black print:break-inside-avoid"
              >
                {/* SVG Rendered Marker */}
                <div
                  className="w-48 h-56 flex items-center justify-center"
                  dangerouslySetInnerHTML={{ __html: svgMarkup }}
                />

                <div className="text-center w-full pt-1 border-t border-gray-200">
                  <div className="text-xs font-bold text-gray-900 truncate">
                    {eq.name}
                  </div>
                  <div className="text-[11px] text-gray-600 truncate">
                    {eq.nameHi}
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                    Target Size: {markerSizeCm} cm × {markerSizeCm} cm
                  </div>
                </div>

                {/* Download button (hidden on print) */}
                <button
                  onClick={() => handleDownloadSVG(eq.markerId!, eq.name)}
                  className="w-full py-1.5 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors print:hidden"
                >
                  {copiedId === eq.markerId ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Downloaded SVG</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Download SVG</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
