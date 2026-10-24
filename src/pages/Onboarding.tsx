import React, { useState } from 'react';
import { Camera, ShieldCheck, Compass, ArrowRight, Check } from 'lucide-react';

interface OnboardingProps {
  onClose: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onClose }) => {
  const [slide, setSlide] = useState(0);

  const slides = [
    {
      icon: Camera,
      badge: 'Step 1 of 3: Honest Detection',
      title: 'Point & Lock in Real Time',
      desc: 'Point your camera at lab equipment carrying an ArUco marker or use our custom detector. Our IoU + Kalman tracker locks onto the instrument in under one second, even through brief occlusions.',
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/60 border-emerald-500/40',
    },
    {
      icon: ShieldCheck,
      badge: 'Step 2 of 3: Safety First',
      title: 'Failsafe Precautions & PPE Gate',
      desc: 'Operating instructions stay locked until you review safety precautions. High-hazard instruments like soldering irons and Bunsen burners require mandatory PPE verification and explicit confirmation before use.',
      color: 'text-red-400',
      bg: 'bg-red-950/60 border-red-500/40',
    },
    {
      icon: Compass,
      badge: 'Step 3 of 3: Real AR Anchoring',
      title: '3D Anchors Glued to Real Parts',
      desc: 'No floating popups! LabLens uses Three.js and camera intrinsics to anchor 3D arrows and pulsing rings directly to real knobs, ports, and scales that stay attached as your phone rotates.',
      color: 'text-sky-400',
      bg: 'bg-sky-950/60 border-sky-500/40',
    },
  ];

  const current = slides[slide];
  const Icon = current.icon;
  const isLast = slide === slides.length - 1;

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem('lablens_onboarding_seen', 'true');
      onClose();
    } else {
      setSlide(slide + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="glass-card max-w-md w-full rounded-2xl p-6 sm:p-7 border border-gray-700 shadow-2xl space-y-6 text-center text-gray-100">
        {/* Step Badge */}
        <span className={`inline-block text-[11px] font-bold px-3 py-1 rounded-full border ${current.bg} ${current.color}`}>
          {current.badge}
        </span>

        {/* Big Illustration Emblem */}
        <div className="w-20 h-20 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center mx-auto shadow-inner">
          <Icon className={`w-10 h-10 ${current.color}`} />
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
            {current.title}
          </h2>
          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-medium">
            {current.desc}
          </p>
        </div>

        {/* Progress Dots */}
        <div className="flex items-center justify-center gap-2 pt-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setSlide(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === slide ? 'w-8 bg-emerald-400' : 'w-2 bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => {
              localStorage.setItem('lablens_onboarding_seen', 'true');
              onClose();
            }}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition-colors"
          >
            Skip Intro
          </button>

          <button
            onClick={handleNext}
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-950/40"
          >
            <span>{isLast ? 'Get Started' : 'Next'}</span>
            {isLast ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
