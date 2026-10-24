import React, { useEffect, useState } from 'react';
import { Search, Bookmark, BookmarkCheck, ShieldCheck, Play, ArrowRight } from 'lucide-react';
import { getAllEquipment, searchEquipment, toggleBookmark, getBookmarkedIds } from '../lib/db';
import type { Equipment } from '../types/equipment';
import type { Language } from '../lib/i18n';
import { translations } from '../lib/i18n';

interface LibraryProps {
  lang: Language;
  onNavigate: (tab: string, extra?: unknown) => void;
  onOpenDemo: (equipmentId: string) => void;
  initialCategory?: string;
  filterOnlyBookmarks?: boolean;
}

export const Library: React.FC<LibraryProps> = ({
  lang,
  onNavigate,
  onOpenDemo,
  initialCategory = 'All',
  filterOnlyBookmarks = false,
}) => {
  const t = translations[lang];
  const [items, setItems] = useState<Equipment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [showOnlyBookmarks, setShowOnlyBookmarks] = useState(filterOnlyBookmarks);

  const refreshBookmarks = async () => {
    const ids = await getBookmarkedIds();
    setBookmarkedIds(new Set(ids));
  };

  const loadItems = async () => {
    if (searchQuery.trim() || (selectedCategory && selectedCategory !== 'All')) {
      const results = await searchEquipment(searchQuery, selectedCategory);
      setItems(results);
    } else {
      const all = await getAllEquipment();
      setItems(all);
    }
  };

  useEffect(() => {
    refreshBookmarks();
    loadItems();
  }, [selectedCategory, searchQuery]);

  const handleToggleBookmark = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await toggleBookmark(id);
    await refreshBookmarks();
  };

  const categories = ['All', 'Measurement', 'Electronics', 'Mechanical', 'Robotics', 'Safety Gear'];

  const displayedItems = showOnlyBookmarks
    ? items.filter((item) => bookmarkedIds.has(item.id))
    : items;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6 animate-fade-in">
      {/* Title & Description */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          {t.browseLibrary}
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          Explore specifications, 3D part anchors, and operating procedures for all 15 laboratory instruments.
        </p>
      </div>

      {/* Search Input & Bookmarks Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-900/90 border border-gray-700/80 text-white placeholder-gray-500 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <button
          onClick={() => setShowOnlyBookmarks(!showOnlyBookmarks)}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-colors shrink-0 ${
            showOnlyBookmarks
              ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
              : 'bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Bookmarks ({bookmarkedIds.size})</span>
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ${
              selectedCategory === cat
                ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                : 'bg-gray-900/80 border-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            {cat === 'All' ? t.allCategories : cat}
          </button>
        ))}
      </div>

      {/* Equipment Grid */}
      {displayedItems.length === 0 ? (
        <div className="text-center py-16 bg-gray-950/60 rounded-2xl border border-gray-800 text-gray-400 text-sm">
          No equipment found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {displayedItems.map((item) => {
            const isBookmarked = bookmarkedIds.has(item.id);
            const isHighHazard = item.hazardLevel === 'high';

            return (
              <div
                key={item.id}
                onClick={() => onNavigate('detail', { id: item.id })}
                className="group glass-card rounded-2xl overflow-hidden border border-gray-800 hover:border-emerald-500/50 hover:scale-[1.01] transition-all cursor-pointer flex flex-col justify-between shadow-lg"
              >
                <div>
                  {/* Image header with hazard and marker badges */}
                  <div className="relative h-44 w-full bg-gray-900 overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-black/40" />

                    {/* Bookmark icon toggle */}
                    <button
                      onClick={(e) => handleToggleBookmark(e, item.id)}
                      className="absolute top-2.5 right-2.5 p-2 rounded-lg bg-black/60 backdrop-blur-md text-gray-300 hover:text-emerald-400 border border-gray-700/60 transition-colors"
                      title="Bookmark"
                    >
                      {isBookmarked ? (
                        <BookmarkCheck className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Bookmark className="w-4 h-4" />
                      )}
                    </button>

                    {/* Marker ID Badge */}
                    {item.markerId !== null && (
                      <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-gray-700 text-[10px] font-bold text-sky-400">
                        ArUco #{item.markerId}
                      </div>
                    )}

                    {/* Hazard Level Badge */}
                    <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isHighHazard
                            ? 'bg-red-500/30 text-red-300 border-red-500/50'
                            : item.hazardLevel === 'medium'
                            ? 'bg-amber-500/30 text-amber-300 border-amber-500/50'
                            : 'bg-emerald-500/30 text-emerald-300 border-emerald-500/50'
                        }`}
                      >
                        {item.hazardLevel.toUpperCase()} HAZARD
                      </span>

                      {item.staffReviewed && (
                        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-300 border border-blue-500/50">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Staff-Reviewed</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-2">
                    <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                      {item.category}
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-emerald-300 transition-colors leading-snug">
                      {item.name}
                    </h3>
                    <div className="text-xs text-gray-400 font-medium">
                      {item.nameHi}
                    </div>

                    {/* Key Spec Snippet */}
                    <div className="pt-2 text-xs text-gray-400 space-y-1 border-t border-gray-800/80">
                      {Object.entries(item.specs).slice(0, 2).map(([k, v]) => (
                        <div key={k} className="flex justify-between truncate">
                          <span className="text-gray-500">{k}:</span>
                          <span className="text-gray-300 font-semibold truncate ml-2">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-4 pt-0 flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDemo(item.id);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-gray-700"
                  >
                    <Play className="w-3.5 h-3.5 text-amber-400" />
                    <span>Simulate AR</span>
                  </button>

                  <button
                    onClick={() => onNavigate('detail', { id: item.id })}
                    className="p-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
