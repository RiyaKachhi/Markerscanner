import React, { useEffect, useState } from 'react';
import { Lock, ShieldCheck, Plus, Trash2, Save, ArrowLeft, CheckCircle } from 'lucide-react';
import { getAllEquipment, addEquipment, updateEquipment, deleteEquipment, markReviewed } from '../lib/db';
import type { Equipment, Category, HazardLevel } from '../types/equipment';
import type { Language } from '../lib/i18n';
import { translations } from '../lib/i18n';

interface AdminProps {
  lang: Language;
  onBack: () => void;
}

export const Admin: React.FC<AdminProps> = ({ lang, onBack }) => {
  const t = translations[lang];
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [selectedItem, setSelectedItem] = useState<Equipment | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Staff Review input
  const [reviewerName, setReviewerName] = useState('');

  const loadList = async () => {
    const all = await getAllEquipment();
    setEquipmentList(all);
    if (all.length > 0 && !selectedItem) {
      setSelectedItem(all[0]);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadList();
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Default demo admin password: admin123
    if (passwordInput === 'admin123' || passwordInput === 'techelevate') {
      setIsAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const handleSaveItem = async () => {
    if (!selectedItem) return;
    await updateEquipment(selectedItem);
    await loadList();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleSignOff = async () => {
    if (!selectedItem || !reviewerName.trim()) return;
    await markReviewed(selectedItem.id, reviewerName.trim(), 'Verified for student lab safety');
    await loadList();
    const updated = await getAllEquipment();
    const found = updated.find((e) => e.id === selectedItem.id);
    if (found) setSelectedItem(found);
    setReviewerName('');
  };

  const handleDelete = async (id: string) => {
    if (confirm(`Are you sure you want to delete this equipment item (${id})?`)) {
      await deleteEquipment(id);
      await loadList();
      setSelectedItem(null);
    }
  };

  const handleAddNew = () => {
    const newId = `custom_instrument_${Date.now().toString().slice(-4)}`;
    const newEq: Equipment = {
      id: newId,
      name: 'New Custom Instrument',
      nameHi: 'नया कस्टम उपकरण',
      category: 'Electronics',
      aliases: ['Custom', 'Device'],
      markerId: Math.min(49, equipmentList.length + 15),
      specs: { 'Standard Rating': 'Safe benchtop operating limits' },
      hazardLevel: 'low',
      parts: [
        {
          id: 'part_main_switch',
          name: 'Main Power Switch',
          nameHi: 'पावर स्विच',
          bboxAnchor: { x: 0.5, y: 0.5 },
          markerOffset: { x: 0.0, y: 0.0, z: 0.1 },
          detectorClass: null,
        },
      ],
      operatingSteps: [
        {
          stepNumber: 1,
          text: 'Verify connections before energizing the power switch.',
          textHi: 'पावर स्विच चालू करने से पहले कनेक्शन की जांच करें।',
          targetPartId: 'part_main_switch',
          arrow: 'down',
          expectedValue: 'ON',
        },
      ],
      safetyPrecautions: ['Verify grounded cord before connecting to mains supply.'],
      safetyPrecautionsHi: ['उपयोग से पहले अर्थिंग की जांच करें।'],
      requiredPPE: ['Safety Glasses'],
      commonMistakes: ['Operating without reading technical limits.'],
      imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
      manualLink: 'https://example.com/manual',
      staffReviewed: null,
    };

    addEquipment(newEq).then(() => {
      loadList();
      setSelectedItem(newEq);
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-16 animate-fade-in text-gray-100">
        <div className="glass-card rounded-2xl p-6 sm:p-8 border border-gray-800 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
            <Lock className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-bold text-white">
            {t.adminTitle}
          </h2>
          <p className="text-xs text-gray-400">
            Authorized instructors and lab technicians only. Default demo password: <code className="text-emerald-400">admin123</code>
          </p>

          <form onSubmit={handleLogin} className="space-y-3 pt-2">
            <input
              type="password"
              placeholder="Enter Instructor Password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-emerald-500"
            />

            {passwordError && (
              <p className="text-xs text-red-400 font-semibold">
                Incorrect password. Please try again.
              </p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-colors shadow-lg"
            >
              Sign In to Admin
            </button>
          </form>

          <button
            onClick={onBack}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors pt-2 block mx-auto"
          >
            ← Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6 animate-fade-in text-gray-100">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-emerald-400" />
            <span>Instructor Lab Admin Portal</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Manage instruments, calibrate 3D component anchors, and record official staff safety sign-offs.
          </p>
        </div>

        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition-colors shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>{t.addInstrument}</span>
        </button>
      </div>

      {/* Main Two-column Management Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Equipment List */}
        <div className="glass-card rounded-2xl p-4 border border-gray-800 space-y-2 max-h-[600px] overflow-y-auto">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-800">
            Registered Equipment ({equipmentList.length})
          </div>

          <div className="space-y-1.5">
            {equipmentList.map((eq) => (
              <button
                key={eq.id}
                onClick={() => setSelectedItem(eq)}
                className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                  selectedItem?.id === eq.id
                    ? 'bg-emerald-950/60 border-emerald-500 text-white font-bold'
                    : 'bg-gray-900/60 border-gray-800 text-gray-300 hover:bg-gray-800'
                }`}
              >
                <div>
                  <div className="truncate">{eq.name}</div>
                  <div className="text-[10px] text-gray-500">
                    Marker #{eq.markerId ?? 'None'} • {eq.hazardLevel} hazard
                  </div>
                </div>

                {eq.staffReviewed && (
                  <span className="text-[10px] text-blue-400 font-bold bg-blue-950 px-1.5 py-0.5 rounded border border-blue-800">
                    Reviewed
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Editor & Staff Sign-off */}
        {selectedItem && (
          <div className="lg:col-span-2 glass-card rounded-2xl p-5 border border-gray-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 className="font-bold text-lg text-white">
                Editing: {selectedItem.name}
              </h3>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveItem}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-md"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{t.saveChanges}</span>
                </button>

                <button
                  onClick={() => handleDelete(selectedItem.id)}
                  className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-400 border border-red-800 transition-colors"
                  title="Delete Instrument"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {saveSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Changes saved to IndexedDB successfully!</span>
              </div>
            )}

            {/* Field Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-gray-400 font-semibold block mb-1">Equipment Name (EN)</label>
                <input
                  type="text"
                  value={selectedItem.name}
                  onChange={(e) => setSelectedItem({ ...selectedItem, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-gray-400 font-semibold block mb-1">Equipment Name (HI)</label>
                <input
                  type="text"
                  value={selectedItem.nameHi}
                  onChange={(e) => setSelectedItem({ ...selectedItem, nameHi: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-gray-400 font-semibold block mb-1">Category</label>
                <select
                  value={selectedItem.category}
                  onChange={(e) => setSelectedItem({ ...selectedItem, category: e.target.value as Category })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="Measurement">Measurement</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Mechanical">Mechanical</option>
                  <option value="Robotics">Robotics</option>
                  <option value="Safety Gear">Safety Gear</option>
                </select>
              </div>

              <div>
                <label className="text-gray-400 font-semibold block mb-1">Hazard Level</label>
                <select
                  value={selectedItem.hazardLevel}
                  onChange={(e) => setSelectedItem({ ...selectedItem, hazardLevel: e.target.value as HazardLevel })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High (Triggers mandatory PPE checklist)</option>
                </select>
              </div>

              <div>
                <label className="text-gray-400 font-semibold block mb-1">ArUco Marker ID (0-49)</label>
                <input
                  type="number"
                  min="0"
                  max="49"
                  value={selectedItem.markerId ?? ''}
                  onChange={(e) => setSelectedItem({ ...selectedItem, markerId: parseInt(e.target.value) || null })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-gray-400 font-semibold block mb-1">Manual Link URL</label>
                <input
                  type="text"
                  value={selectedItem.manualLink}
                  onChange={(e) => setSelectedItem({ ...selectedItem, manualLink: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Staff Review Section */}
            <div className="pt-3 border-t border-gray-800 bg-gray-900/60 p-3.5 rounded-xl border border-gray-800 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Official Staff Safety Review Sign-off
                </span>
              </div>

              {selectedItem.staffReviewed ? (
                <div className="text-xs text-blue-300">
                  Signed off by: <strong>{selectedItem.staffReviewed.by}</strong> on {selectedItem.staffReviewed.date}
                </div>
              ) : (
                <div className="text-xs text-amber-400">
                  Pending review by qualified academic staff member.
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Reviewer Name (e.g. Prof. Sharma)"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-700 text-white text-xs focus:outline-none"
                />
                <button
                  onClick={handleSignOff}
                  disabled={!reviewerName.trim()}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs transition-colors"
                >
                  {t.markAsReviewed}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
