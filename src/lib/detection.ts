import { defaultArUcoDetector, type DetectedMarker } from './markers';
import { getEquipmentByMarkerId, getEquipmentById } from './db';
import { activeModelConfig, type ModelConfig } from '../config/model.config';
import type { DetectionInput } from './tracker';

export interface PerformanceStats {
  inferenceMs: number;
  renderFps: number;
  backend: 'WebGL' | 'WASM' | 'CPU';
  lastDetectionTimestamp: number;
}

export interface CandidateResult {
  equipmentId: string;
  name: string;
  confidence: number;
}

export interface RecognitionResult {
  detections: DetectionInput[];
  markers: DetectedMarker[];
  primaryDetection: DetectionInput | null;
  topCandidates: CandidateResult[];
  belowThreshold: boolean;
  conflictDetected?: { markerClass: string; mlClass: string };
  stats: PerformanceStats;
}

export class RecognitionPipeline {
  private config: ModelConfig;
  private lastInferenceTime = 0;
  private frameCount = 0;
  private lastFpsTimestamp = performance.now();
  private currentFps = 60;
  private isProcessing = false;
  private backendType: 'WebGL' | 'WASM' | 'CPU' = 'WebGL';

  constructor(config = activeModelConfig) {
    this.config = config;
    this.detectBackend();
  }

  private detectBackend() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      this.backendType = gl ? 'WebGL' : 'WASM';
    } catch {
      this.backendType = 'CPU';
    }
  }

  /**
   * Main recognition frame processor.
   * Runs ArUco marker recognition first, followed by ML detector if enabled.
   */
  public async processFrame(
    source: HTMLVideoElement | HTMLCanvasElement | ImageData,
    viewportWidth?: number,
    viewportHeight?: number
  ): Promise<RecognitionResult> {
    const tStart = performance.now();
    this.updateFps();

    const result: RecognitionResult = {
      detections: [],
      markers: [],
      primaryDetection: null,
      topCandidates: [],
      belowThreshold: false,
      stats: {
        inferenceMs: 0,
        renderFps: this.currentFps,
        backend: this.backendType,
        lastDetectionTimestamp: Date.now(),
      },
    };

    if (this.isProcessing) {
      return result;
    }

    this.isProcessing = true;

    try {
      // 1. Stage 1: ArUco Marker Detection (Primary, ultra-reliable)
      const detectedMarkers = defaultArUcoDetector.detect(source, viewportWidth, viewportHeight);
      result.markers = detectedMarkers;

      for (const m of detectedMarkers) {
        const eq = await getEquipmentByMarkerId(m.id);
        if (eq) {
          // Bounding box from 4 marker corners
          const xs = m.corners.map((c) => c.x);
          const ys = m.corners.map((c) => c.y);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);

          // Pad slightly around the marker
          const pad = (maxX - minX) * 0.15;
          const bbox = {
            x: Math.max(0, minX - pad),
            y: Math.max(0, minY - pad),
            width: maxX - minX + pad * 2,
            height: maxY - minY + pad * 2,
          };

          const det: DetectionInput = {
            bbox,
            classLabel: `marker_${m.id}`,
            equipmentId: eq.id,
            confidence: 0.99,
            isMarker: true,
            markerId: m.id,
            markerCorners: m.corners,
          };

          result.detections.push(det);
        }
      }

      // 2. Stage 2: Custom ML Detector (if enabled and no marker found)
      if (this.config.type === 'custom-tfjs-detector' && result.detections.length === 0) {
        // Look up model files in /models/lablens/model.json
        // If not found, gracefully fall back to marker detection
        try {
          const mlDets = await this.runCustomMLInference(source);
          result.detections.push(...mlDets);
        } catch (mlErr) {
          console.debug('Custom TFJS detector not available or not yet loaded:', mlErr);
        }
      }

      // 3. Stage 3: Conflict detection if both fired
      if (result.markers.length > 0 && result.detections.some((d) => !d.isMarker)) {
        const markerDet = result.detections.find((d) => d.isMarker);
        const mlDet = result.detections.find((d) => !d.isMarker);
        if (markerDet && mlDet && markerDet.equipmentId !== mlDet.equipmentId) {
          result.conflictDetected = {
            markerClass: markerDet.equipmentId,
            mlClass: mlDet.equipmentId,
          };
          // Marker always overrides ML detector
          result.detections = result.detections.filter((d) => d.isMarker);
        }
      }

      // 4. Primary detection selection & threshold evaluation
      if (result.detections.length > 0) {
        // Highest confidence detection
        result.detections.sort((a, b) => b.confidence - a.confidence);
        const primary = result.detections[0];
        result.primaryDetection = primary;

        const threshold =
          this.config.perClassConfidenceThresholds[primary.equipmentId] ??
          this.config.defaultConfidenceThreshold;

        if (primary.confidence < threshold) {
          result.belowThreshold = true;
          // Build real candidate sheet
          result.topCandidates = await this.buildTopCandidates(result.detections);
        }
      }
    } catch (err) {
      console.error('Recognition error in pipeline:', err);
    } finally {
      this.isProcessing = false;
      this.lastInferenceTime = performance.now() - tStart;
      result.stats.inferenceMs = Math.round(this.lastInferenceTime);
    }

    return result;
  }

  private updateFps() {
    this.frameCount++;
    const now = performance.now();
    const elapsed = now - this.lastFpsTimestamp;
    if (elapsed >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastFpsTimestamp = now;
    }
  }

  private async buildTopCandidates(detections: DetectionInput[]): Promise<CandidateResult[]> {
    const list: CandidateResult[] = [];
    for (const d of detections.slice(0, 3)) {
      const eq = await getEquipmentById(d.equipmentId);
      list.push({
        equipmentId: d.equipmentId,
        name: eq ? eq.name : d.classLabel,
        confidence: Number(d.confidence.toFixed(2)),
      });
    }
    return list;
  }

  private async runCustomMLInference(_source: unknown): Promise<DetectionInput[]> {
    // Stub for custom TF.js / ONNX loader once model files exist in /models/lablens/
    return [];
  }
}

export const defaultRecognitionPipeline = new RecognitionPipeline();
