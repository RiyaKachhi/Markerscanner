import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Home } from './pages/Home';
import { Scan } from './pages/Scan';
import { Library } from './pages/Library';
import { Detail } from './pages/Detail';
import { PrintMarkers } from './pages/PrintMarkers';
import { ModelReport } from './pages/ModelReport';
import { Admin } from './pages/Admin';
import { Onboarding } from './pages/Onboarding';
import { initDatabase } from './lib/db';
import type { Language } from './lib/i18n';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [navExtra, setNavExtra] = useState<Record<string, unknown> | null>(null);
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('lablens_lang') as Language) || 'en';
  });
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('lablens_onboarding_seen');
  });
  const [demoEquipmentId, setDemoEquipmentId] = useState<string | null>(null);

  // Initialize Dexie IndexedDB
  useEffect(() => {
    initDatabase();
  }, []);

  const handleToggleLang = () => {
    const nextLang: Language = lang === 'en' ? 'hi' : 'en';
    setLang(nextLang);
    localStorage.setItem('lablens_lang', nextLang);
  };

  const handleNavigate = (tab: string, extra?: unknown) => {
    setNavExtra((extra as Record<string, unknown>) || null);
    if (tab === 'demo') {
      setDemoEquipmentId((extra as { id?: string })?.id || 'multimeter_digital');
      setCurrentTab('scan');
      return;
    }
    if (tab !== 'scan') {
      setDemoEquipmentId(null);
    }
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenDemo = (equipmentId?: string) => {
    setDemoEquipmentId(equipmentId || 'multimeter_digital');
    setCurrentTab('scan');
  };

  const handleExitDemo = () => {
    setDemoEquipmentId(null);
    setCurrentTab('home');
  };

  const isSubPage = currentTab !== 'home';

  return (
    <div className="min-h-screen bg-[#090d16] text-gray-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Global Header */}
      <Header
        currentTab={currentTab}
        lang={lang}
        onSelectTab={handleNavigate}
        onToggleLang={handleToggleLang}
        showBack={isSubPage && currentTab !== 'scan'}
        onBack={() => handleNavigate('home')}
      />

      {/* Main Page Content */}
      <main className="flex-1 flex flex-col">
        {currentTab === 'home' && (
          <Home
            lang={lang}
            onNavigate={handleNavigate}
            onOpenDemo={handleOpenDemo}
            onOpenOnboarding={() => setShowOnboarding(true)}
          />
        )}

        {currentTab === 'scan' && (
          <Scan
            lang={lang}
            onNavigate={handleNavigate}
            demoEquipmentId={demoEquipmentId}
            onExitDemo={handleExitDemo}
          />
        )}

        {currentTab === 'library' && (
          <Library
            lang={lang}
            onNavigate={handleNavigate}
            onOpenDemo={handleOpenDemo}
            initialCategory={(navExtra?.category as string) || 'All'}
          />
        )}

        {currentTab === 'library-bookmarks' && (
          <Library
            lang={lang}
            onNavigate={handleNavigate}
            onOpenDemo={handleOpenDemo}
            filterOnlyBookmarks={true}
          />
        )}

        {currentTab === 'detail' && Boolean(navExtra?.id) && (
          <Detail
            equipmentId={String(navExtra?.id)}
            lang={lang}
            onBack={() => handleNavigate('library')}
            onOpenDemo={handleOpenDemo}
          />
        )}

        {currentTab === 'markers' && (
          <PrintMarkers
            lang={lang}
            onBack={() => handleNavigate('home')}
          />
        )}

        {currentTab === 'report' && (
          <ModelReport
            lang={lang}
            onBack={() => handleNavigate('home')}
          />
        )}

        {currentTab === 'admin' && (
          <Admin
            lang={lang}
            onBack={() => handleNavigate('home')}
          />
        )}
      </main>

      {/* 3-Slide Interactive Onboarding */}
      {showOnboarding && (
        <Onboarding onClose={() => setShowOnboarding(false)} />
      )}
    </div>
  );
}

export default App;
