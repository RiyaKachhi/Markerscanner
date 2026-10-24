import React, { useEffect, useState } from 'react';
import { Eye, Wifi, WifiOff, Globe, Bookmark, ArrowLeft } from 'lucide-react';
import type { Language } from '../lib/i18n';
import { translations } from '../lib/i18n';

interface HeaderProps {
  currentTab: string;
  lang: Language;
  onSelectTab: (tab: string) => void;
  onToggleLang: () => void;
  showBack?: boolean;
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  lang,
  onSelectTab,
  onToggleLang,
  showBack,
  onBack,
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const t = translations[lang];

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-gray-800 px-3 sm:px-6 py-2.5 flex items-center justify-between">
      {/* Brand & Logo or Back Button */}
      <div className="flex items-center gap-3">
        {showBack ? (
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={() => onSelectTab('home')}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-950/50 group-hover:scale-105 transition-transform">
              <Eye className="w-4 h-4 text-black font-black" />
            </div>
            <div>
              <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
                LabLens
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold text-emerald-500 uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40">
                Tech Elevate 2026
              </span>
            </div>
          </button>
        )}
      </div>

      {/* Action Controls: Online/Offline, Language, Bookmarks */}
      <div className="flex items-center gap-2">
        {/* Online / Offline badge */}
        <div
          title={isOnline ? t.online : t.offline}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold border ${
            isOnline
              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
              : 'bg-amber-950/40 text-amber-400 border-amber-800/40'
          }`}
        >
          {isOnline ? (
            <>
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span className="hidden md:inline">{t.online}</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-amber-400" />
              <span className="hidden md:inline">{t.offline}</span>
            </>
          )}
        </div>

        {/* Language switch */}
        <button
          onClick={onToggleLang}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-800/90 hover:bg-gray-700 text-gray-200 border border-gray-700 text-xs font-semibold transition-colors"
          title="Switch English / Hindi"
        >
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          <span>{lang === 'en' ? 'हिन्दी' : 'English'}</span>
        </button>

        {/* Quick bookmarks */}
        <button
          onClick={() => onSelectTab('library-bookmarks')}
          className={`p-2 rounded-lg border text-xs transition-colors ${
            currentTab === 'library-bookmarks'
              ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
              : 'bg-gray-800/90 hover:bg-gray-700 border-gray-700 text-gray-300'
          }`}
          title="Bookmarks"
        >
          <Bookmark className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
