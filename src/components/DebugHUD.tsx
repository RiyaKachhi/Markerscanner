import React from 'react';
import { Activity, Cpu, Layers } from 'lucide-react';
import type { PerformanceStats } from '../lib/detection';
import type { AnchorMode } from '../lib/anchors';
import type { TrackedObject } from '../lib/tracker';

interface DebugHUDProps {
  stats: PerformanceStats;
  anchorMode: AnchorMode;
  trackedObject: TrackedObject | null;
  distanceMeters?: number;
  videoWidth: number;
  videoHeight: number;
}

export const DebugHUD: React.FC<DebugHUDProps> = ({
  stats,
  anchorMode,
  trackedObject,
  distanceMeters,
  videoWidth,
  videoHeight,
}) => {
  return (
    <div className="absolute top-16 left-3 z-30 bg-black/80 backdrop-blur-md border border-gray-700/80 rounded-xl p-2.5 text-[11px] font-mono text-gray-300 shadow-xl pointer-events-none space-y-1 min-w-[210px]">
      <div className="flex items-center justify-between pb-1 border-b border-gray-800 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
        <span className="flex items-center gap-1.5 text-emerald-400">
          <Activity className="w-3.5 h-3.5" />
          Live Metrics
        </span>
        <span className="text-gray-400">{stats.renderFps} FPS</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-gray-400">Inference:</span>
        <span className="font-bold text-white">{stats.inferenceMs} ms</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-gray-400 flex items-center gap-1">
          <Cpu className="w-3 h-3 text-sky-400" />
          Backend:
        </span>
        <span className="font-bold text-sky-300">{stats.backend}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-gray-400 flex items-center gap-1">
          <Layers className="w-3 h-3 text-purple-400" />
          Anchor Mode:
        </span>
        <span className="font-bold text-emerald-400">{anchorMode}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-gray-400">Resolution:</span>
        <span>{videoWidth}x{videoHeight}</span>
      </div>

      {trackedObject && (
        <div className="pt-1 border-t border-gray-800 text-[10px]">
          <div className="flex justify-between text-gray-400">
            <span>Track ID:</span>
            <span className="text-white font-bold">#{trackedObject.id}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Hits / Age:</span>
            <span>{trackedObject.hits} / {trackedObject.age} frames</span>
          </div>
          {trackedObject.markerId !== undefined && (
            <div className="flex justify-between text-gray-400">
              <span>ArUco ID:</span>
              <span className="text-emerald-300 font-bold">#{trackedObject.markerId}</span>
            </div>
          )}
          {distanceMeters !== undefined && (
            <div className="flex justify-between text-gray-400">
              <span>Est. Distance:</span>
              <span className="text-emerald-300">{(distanceMeters * 100).toFixed(1)} cm</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
