import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  Zap, ZapOff, RefreshCw, Snowflake, ShieldAlert,
  Sliders, Info, ListOrdered, AlertTriangle, ExternalLink, Search
} from 'lucide-react';
import { cameraService, type CameraCapabilities } from '../lib/camera';
import { defaultRecognitionPipeline, type RecognitionResult } from '../lib/detection';
import { defaultTracker, type TrackedObject } from '../lib/tracker';
import { estimateMarkerPose, getCameraIntrinsics, type MarkerPose } from '../lib/pose';
import { resolvePartAnchor, type ResolvedPartAnchor, type AnchorMode } from '../lib/anchors';
import { getEquipmentById, addScanHistory } from '../lib/db';
import type { Equipment } from '../types/equipment';
import { ARCanvas } from '../components/ARCanvas';
import { ThreeOverlay } from '../components/ThreeOverlay';
import { SafetyGate } from '../components/SafetyGate';
import { StepPanel } from '../components/StepPanel';
import { CandidateSheet } from '../components/CandidateSheet';
import { DebugHUD } from '../components/DebugHUD';
import { activeModelConfig } from '../config/model.config';
import type { Language } from '../lib/i18n';
import { translations } from '../lib/i18n';

interface ScanProps {
  lang: Language;
  onNavigate: (tab: string, extra?: unknown) => void;
  demoEquipmentId?: string | null;
  onExitDemo?: () => void;
}

export const Scan: React.FC<ScanProps> = ({
  lang,
  onNavigate,
  demoEquipmentId,
  onExitDemo,
}) => {
  const t = translations[lang];

  // Video and container refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ width: 640, height: 480 });

  // Camera & recognition states
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<CameraCapabilities>({
    hasTorch: false,
    canSwitchCamera: false,
    facingMode: 'environment',
    devicesCount: 1,
  });
  const [torchOn, setTorchOn] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [frozenImageData, setFrozenImageData] = useState<ImageData | null>(null);

  // Overlay & Debug toggles
  const [is3DMode, setIs3DMode] = useState(true);
  const [showDebugHUD, setShowDebugHUD] = useState(false);

  // Recognition state
  const [recognitionResult, setRecognitionResult] = useState<RecognitionResult | null>(null);
  const [trackedObject, setTrackedObject] = useState<TrackedObject | null>(null);
  const [activeEquipment, setActiveEquipment] = useState<Equipment | null>(null);
  const [markerPose, setMarkerPose] = useState<MarkerPose | null>(null);


  // AR Guide tab & step state
  const [activeTab, setActiveTab] = useState<'safety' | 'steps' | 'specs' | 'more'>('safety');
  const [safetyUnlocked, setSafetyUnlocked] = useState(false);
  const [isConfirmedByUser, setIsConfirmedByUser] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Candidate sheet state for low confidence
  const [showCandidateSheet, setShowCandidateSheet] = useState(false);

  // Resize listener
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setViewportSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Demo Mode loader
  useEffect(() => {
    if (demoEquipmentId) {
      getEquipmentById(demoEquipmentId).then((eq) => {
        if (eq) {
          setActiveEquipment(eq);
          setSafetyUnlocked(false);
          setIsConfirmedByUser(false);
          setCurrentStepIndex(0);

          // Simulated track
          const simBbox = {
            x: viewportSize.width * 0.15,
            y: viewportSize.height * 0.15,
            width: viewportSize.width * 0.7,
            height: viewportSize.height * 0.6,
          };
          setTrackedObject({
            id: 999,
            classLabel: eq.name,
            equipmentId: eq.id,
            bbox: simBbox,
            velocity: { vx: 0, vy: 0, vw: 0, vh: 0 },
            confidence: 0.95,
            hits: 25,
            age: 25,
            timeSinceUpdate: 0,
            firstSeenTimestamp: Date.now() - 2000,
            lastSeenTimestamp: Date.now(),
            isLocked: true,
            isMarker: false,
          });
        }
      });
    }
  }, [demoEquipmentId, viewportSize]);

  // Start Camera
  useEffect(() => {
    if (demoEquipmentId) return; // Do not start camera in simulated demo mode
    let mounted = true;

    async function initCamera() {
      if (!videoRef.current) return;
      try {
        setCameraError(null);
        const caps = await cameraService.startCamera(videoRef.current, 'environment');
        if (mounted) {
          setCapabilities(caps);
        }
      } catch (err) {
        if (mounted) {
          setCameraError(err instanceof Error ? err.message : 'Camera failed to start');
        }
      }
    }

    initCamera();

    return () => {
      mounted = false;
      cameraService.stopCamera();
    };
  }, [demoEquipmentId]);

  // Main Detection & Tracking Loop
  useEffect(() => {
    if (demoEquipmentId) return; // In demo mode, static simulation runs

    let animId: number;
    let lastProcessTime = 0;
    const targetFps = 10; // 10Hz recognition rate throttled
    const intervalMs = 1000 / targetFps;

    const runLoop = async (now: number) => {
      animId = requestAnimationFrame(runLoop);

      // Frame rate gating
      if (now - lastProcessTime < intervalMs) return;
      lastProcessTime = now;

      const video = videoRef.current;
      const source = isFrozen && frozenImageData ? frozenImageData : video;

      if (!source || (source instanceof HTMLVideoElement && (source.readyState < 2 || source.videoWidth === 0 || source.videoHeight === 0))) {
        return;
      }

      // Run recognition pipeline with viewport dimension mapping
      const result = await defaultRecognitionPipeline.processFrame(
        source,
        viewportSize.width,
        viewportSize.height
      );
      setRecognitionResult(result);

      // Update IoU tracker
      const tracks = defaultTracker.update(result.detections);
      const primaryTrack = defaultTracker.getPrimaryTrack();
      setTrackedObject(primaryTrack);

      // Check if locked
      if (primaryTrack && primaryTrack.isLocked) {
        if (!activeEquipment || activeEquipment.id !== primaryTrack.equipmentId) {
          const eq = await getEquipmentById(primaryTrack.equipmentId);
          if (eq) {
            setActiveEquipment(eq);
            // Record history
            addScanHistory({
              equipmentId: eq.id,
              equipmentName: eq.name,
              timestamp: Date.now(),
              confidence: primaryTrack.confidence,
              method: primaryTrack.isMarker ? 'marker' : 'custom-ml',
            });
            // Show safety card first
            setActiveTab('safety');
            setSafetyUnlocked(false);
            setIsConfirmedByUser(false);
            setCurrentStepIndex(0);
          }
        }
      } else if (!primaryTrack) {
        // Track lost
        if (tracks.length === 0) {
          // If lost for too long, reset active guide
        }
      }

      // Calculate 3D pose if ArUco marker present
      if (result.markers.length > 0) {
        const marker = result.markers[0];
        const intrinsics = getCameraIntrinsics(viewportSize.width, viewportSize.height);
        const pose = estimateMarkerPose(marker.corners, 0.05, intrinsics);
        setMarkerPose(pose);
      } else {
        setMarkerPose(null);
      }

      // Candidate sheet for low confidence
      if (result.belowThreshold && result.topCandidates.length > 0 && !activeEquipment) {
        setShowCandidateSheet(true);
      } else {
        setShowCandidateSheet(false);
      }
    };

    animId = requestAnimationFrame(runLoop);

    return () => cancelAnimationFrame(animId);
  }, [demoEquipmentId, isFrozen, frozenImageData, viewportSize, activeEquipment]);

  // Derive Resolved Part Anchor and Anchor Mode synchronously without cascading renders
  const resolvedPart: ResolvedPartAnchor | null = useMemo(() => {
    if (!activeEquipment) return null;

    const currentStep = activeEquipment.operatingSteps[currentStepIndex];
    if (!currentStep) return null;

    const part = activeEquipment.parts.find((p) => p.id === currentStep.targetPartId);
    if (!part) return null;

    const bbox = trackedObject ? trackedObject.bbox : {
      x: viewportSize.width * 0.15,
      y: viewportSize.height * 0.15,
      width: viewportSize.width * 0.7,
      height: viewportSize.height * 0.6,
    };

    const intrinsics = getCameraIntrinsics(viewportSize.width, viewportSize.height);
    return resolvePartAnchor(
      part,
      bbox,
      markerPose,
      intrinsics,
      viewportSize.width,
      viewportSize.height,
      0.05
    );
  }, [activeEquipment, currentStepIndex, trackedObject, markerPose, viewportSize]);

  const anchorMode: AnchorMode = resolvedPart?.anchorMode || 'Approximate';

  // Controls Handlers
  const handleToggleFreeze = () => {
    if (isFrozen) {
      setIsFrozen(false);
      setFrozenImageData(null);
    } else if (videoRef.current) {
      const img = cameraService.captureFrozenFrame(videoRef.current);
      if (img) {
        setFrozenImageData(img);
        setIsFrozen(true);
      }
    }
  };

  const handleToggleTorch = async () => {
    const active = await cameraService.toggleTorch();
    setTorchOn(active);
  };

  const handleSwitchCamera = async () => {
    if (!videoRef.current) return;
    try {
      const caps = await cameraService.switchCamera(videoRef.current);
      setCapabilities(caps);
    } catch (err) {
      console.error('Camera switch failed:', err);
    }
  };

  const handleAcknowledgeSafety = () => {
    setSafetyUnlocked(true);
    setActiveTab('steps');
  };

  const handleSelectCandidate = async (equipmentId: string) => {
    const eq = await getEquipmentById(equipmentId);
    if (eq) {
      setActiveEquipment(eq);
      setShowCandidateSheet(false);
      setActiveTab('safety');
      setSafetyUnlocked(false);
      setIsConfirmedByUser(true); // User explicitly picked it
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100vh-60px)] bg-black overflow-hidden select-none flex flex-col justify-between"
    >
      {/* 1. Live Camera Video Stream */}
      {!demoEquipmentId ? (
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`absolute inset-0 w-full h-full object-cover z-0 ${isFrozen ? 'opacity-0' : 'opacity-100'}`}
        />
      ) : (
        /* Demo Mode Sample Image View */
        <div className="absolute inset-0 w-full h-full z-0 flex items-center justify-center bg-gray-950">
          <img
            src={activeEquipment?.imageUrl || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80'}
            alt="Demo Equipment"
            className="w-full h-full object-cover opacity-80"
          />
        </div>
      )}

      {/* Demo Mode Watermark Badge */}
      {demoEquipmentId && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-amber-500/90 text-black px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-xl flex items-center gap-2">
          <span>⚠️ SIMULATED DEMO MODE</span>
          {onExitDemo && (
            <button
              onClick={onExitDemo}
              className="ml-2 underline text-[10px] cursor-pointer"
            >
              Exit
            </button>
          )}
        </div>
      )}

      {/* COCO-SSD Dev Placeholder Notice Banner (if enabled) */}
      {activeModelConfig.type === 'coco-ssd' && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-red-600/90 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-xl max-w-md text-center">
          {activeModelConfig.devNotice}
        </div>
      )}

      {/* 2. Three.js 3D AR Layer */}
      {is3DMode && (
        <ThreeOverlay
          width={viewportSize.width}
          height={viewportSize.height}
          markerPose={markerPose}
          intrinsics={getCameraIntrinsics(viewportSize.width, viewportSize.height)}
          activePart={activeEquipment?.parts.find((p) => p.id === activeEquipment?.operatingSteps[currentStepIndex]?.targetPartId)}
          showDebugAxes={showDebugHUD}
        />
      )}

      {/* 3. 2D Canvas Layer (Bounding Boxes & Edge Indicators) */}
      <ARCanvas
        width={viewportSize.width}
        height={viewportSize.height}
        trackedObject={trackedObject}
        resolvedPart={resolvedPart}
        markers={recognitionResult?.markers || []}
        showDebug={showDebugHUD}
        isLocked={!!trackedObject?.isLocked}
      />

      {/* 4. Debug Performance HUD */}
      {showDebugHUD && recognitionResult && (
        <DebugHUD
          stats={recognitionResult.stats}
          anchorMode={anchorMode}
          trackedObject={trackedObject}
          distanceMeters={markerPose?.distanceMeters}
          videoWidth={viewportSize.width}
          videoHeight={viewportSize.height}
        />
      )}

      {/* 5. Top Camera Controls Bar */}
      <div className="relative z-30 p-3 sm:p-4 flex items-center justify-between pointer-events-auto">
        {/* Alignment / Lock Status Pill */}
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-gray-700/60 text-xs">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              trackedObject?.isLocked
                ? 'bg-emerald-400 animate-pulse'
                : trackedObject
                ? 'bg-amber-400'
                : 'bg-gray-500'
            }`}
          />
          <span className="font-semibold text-gray-200">
            {trackedObject?.isLocked
              ? activeEquipment?.name || t.locked
              : trackedObject
              ? t.locking
              : t.pointCamera}
          </span>
        </div>

        {/* Action Toggle Buttons */}
        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md p-1 rounded-xl border border-gray-700/60">
          {/* Torch toggle */}
          {capabilities.hasTorch && (
            <button
              onClick={handleToggleTorch}
              className={`p-2 rounded-lg transition-colors ${torchOn ? 'bg-amber-500 text-black' : 'text-gray-300 hover:bg-gray-800'}`}
              title="Toggle Flashlight"
            >
              {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
            </button>
          )}

          {/* Switch camera */}
          {capabilities.canSwitchCamera && (
            <button
              onClick={handleSwitchCamera}
              className="p-2 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
              title="Flip Camera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {/* Freeze frame */}
          <button
            onClick={handleToggleFreeze}
            className={`p-2 rounded-lg transition-colors ${isFrozen ? 'bg-sky-500 text-black' : 'text-gray-300 hover:bg-gray-800'}`}
            title="Freeze Frame"
          >
            <Snowflake className="w-4 h-4" />
          </button>

          {/* 3D Mode Toggle */}
          <button
            onClick={() => setIs3DMode(!is3DMode)}
            className={`p-2 rounded-lg text-xs font-bold transition-colors ${is3DMode ? 'bg-emerald-500 text-black' : 'text-gray-400 hover:bg-gray-800'}`}
            title="Toggle 3D AR Overlay"
          >
            3D
          </button>

          {/* Debug HUD Toggle */}
          <button
            onClick={() => setShowDebugHUD(!showDebugHUD)}
            className={`p-2 rounded-lg transition-colors ${showDebugHUD ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
            title="Toggle Performance HUD"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Manual search fallback */}
          <button
            onClick={() => onNavigate('library')}
            className="p-2 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
            title="Manual Search"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 6. Camera Error Fallback Message */}
      {cameraError && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/90 backdrop-blur-md">
          <div className="max-w-md w-full bg-gray-900 border border-red-500/50 rounded-2xl p-6 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">Camera Access Required</h3>
            <p className="text-xs sm:text-sm text-gray-300">{cameraError}</p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => onNavigate('library')}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors"
              >
                Browse Equipment Library Offline
              </button>
              <button
                onClick={() => onNavigate('demo')}
                className="w-full py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold rounded-xl text-xs transition-colors"
              >
                Try Simulated Demo Mode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Low Confidence Candidate Sheet */}
      {showCandidateSheet && recognitionResult && (
        <div className="relative z-30 p-4 max-w-md mx-auto w-full">
          <CandidateSheet
            candidates={recognitionResult.topCandidates}
            lang={lang}
            onSelectCandidate={handleSelectCandidate}
            onOpenManualSearch={() => onNavigate('library')}
            onDismiss={() => setShowCandidateSheet(false)}
          />
        </div>
      )}

      {/* 8. Bottom AR Guide HUD & Tabs */}
      {activeEquipment && (
        <div className="relative z-30 p-3 sm:p-4 w-full max-w-xl mx-auto space-y-2 pointer-events-auto">
          {/* Navigation Tabs for Active Guide */}
          <div className="flex items-center justify-around bg-black/80 backdrop-blur-md p-1 rounded-xl border border-gray-800 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('safety')}
              className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === 'safety' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{t.tabSafety}</span>
            </button>

            <button
              onClick={() => {
                if (safetyUnlocked) setActiveTab('steps');
              }}
              disabled={!safetyUnlocked}
              className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === 'steps'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : safetyUnlocked
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-600 cursor-not-allowed'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>{t.tabSteps}</span>
              {!safetyUnlocked && <span className="text-[10px]">🔒</span>}
            </button>

            <button
              onClick={() => setActiveTab('specs')}
              className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === 'specs' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>{t.tabSpecs}</span>
            </button>

            <button
              onClick={() => setActiveTab('more')}
              className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                activeTab === 'more' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{t.tabMore}</span>
            </button>
          </div>

          {/* Active Tab Body */}
          {activeTab === 'safety' && (
            <SafetyGate
              equipment={activeEquipment}
              lang={lang}
              onAcknowledge={handleAcknowledgeSafety}
              isConfirmedByUser={isConfirmedByUser}
              onConfirmEquipment={() => setIsConfirmedByUser(true)}
            />
          )}

          {activeTab === 'steps' && safetyUnlocked && (
            <StepPanel
              steps={activeEquipment.operatingSteps}
              currentStepIndex={currentStepIndex}
              parts={activeEquipment.parts}
              anchorMode={anchorMode}
              lang={lang}
              isPartOffScreen={resolvedPart?.isOffScreen}
              onNext={() => setCurrentStepIndex((prev) => Math.min(prev + 1, activeEquipment.operatingSteps.length - 1))}
              onPrev={() => setCurrentStepIndex((prev) => Math.max(prev - 1, 0))}
              onSelectStep={(idx) => setCurrentStepIndex(idx)}
            />
          )}

          {activeTab === 'specs' && (
            <div className="glass-card rounded-2xl p-4 border border-sky-500/30 text-xs space-y-2.5 animate-fade-in max-h-56 overflow-y-auto">
              <h4 className="font-bold text-sky-300 text-sm pb-1 border-b border-gray-700/60">
                {activeEquipment.name} — Technical Specifications
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-300">
                {Object.entries(activeEquipment.specs).map(([k, v]) => (
                  <div key={k} className="p-2 bg-gray-900/60 rounded-lg border border-gray-800">
                    <div className="text-[10px] text-gray-500 font-bold uppercase">{k}</div>
                    <div className="font-semibold text-white mt-0.5">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'more' && (
            <div className="glass-card rounded-2xl p-4 border border-purple-500/30 text-xs space-y-3 animate-fade-in max-h-56 overflow-y-auto">
              <h4 className="font-bold text-purple-300 text-sm pb-1 border-b border-gray-700/60">
                Common Operator Mistakes & Manual
              </h4>
              <div className="space-y-1.5">
                {activeEquipment.commonMistakes.map((m, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-gray-300">
                    <span className="text-amber-400 font-bold">•</span>
                    <p>{m}</p>
                  </div>
                ))}
              </div>

              {activeEquipment.manualLink && (
                <div className="pt-2">
                  <a
                    href={activeEquipment.manualLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sky-400 hover:text-sky-300 underline font-semibold"
                  >
                    <span>{t.officialManual}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
