import type { Point2D } from './markers';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectionInput {
  bbox: BoundingBox;
  classLabel: string;
  equipmentId: string;
  confidence: number;
  isMarker: boolean;
  markerId?: number;
  markerCorners?: [Point2D, Point2D, Point2D, Point2D];
}

export interface TrackedObject {
  id: number;
  classLabel: string;
  equipmentId: string;
  bbox: BoundingBox;
  velocity: { vx: number; vy: number; vw: number; vh: number };
  confidence: number;
  hits: number;
  age: number;
  timeSinceUpdate: number;
  firstSeenTimestamp: number;
  lastSeenTimestamp: number;
  isLocked: boolean;
  isMarker: boolean;
  markerId?: number;
  markerCorners?: [Point2D, Point2D, Point2D, Point2D];
}

export interface TrackerOptions {
  iouThreshold?: number;
  maxLostFrames?: number; // survives short occlusion (default 12 frames)
  lockDurationMs?: number; // duration of stable tracking before lock (default 800ms)
  smoothingFactor?: number; // alpha for Kalman/box smoothing
}

/**
 * Calculates Intersection over Union (IoU) of two bounding boxes
 */
export function calculateIoU(boxA: BoundingBox, boxB: BoundingBox): number {
  const xA = Math.max(boxA.x, boxB.x);
  const yA = Math.max(boxA.y, boxB.y);
  const xB = Math.min(boxA.x + boxA.width, boxB.x + boxB.width);
  const yB = Math.min(boxA.y + boxA.height, boxB.y + boxB.height);

  const interWidth = Math.max(0, xB - xA);
  const interHeight = Math.max(0, yB - yA);
  const interArea = interWidth * interHeight;

  const areaA = boxA.width * boxA.height;
  const areaB = boxB.width * boxB.height;
  const unionArea = areaA + areaB - interArea;

  if (unionArea <= 0) return 0;
  return interArea / unionArea;
}

/**
 * ByteTrack-style IoU + Kalman Filter Object Tracker
 */
export class LabLensTracker {
  private nextTrackId = 1;
  private tracks: TrackedObject[] = [];
  private options: Required<TrackerOptions>;

  constructor(options?: TrackerOptions) {
    this.options = {
      iouThreshold: options?.iouThreshold ?? 0.3,
      maxLostFrames: options?.maxLostFrames ?? 15,
      lockDurationMs: options?.lockDurationMs ?? 800,
      smoothingFactor: options?.smoothingFactor ?? 0.7,
    };
  }

  /**
   * Updates tracker with detections from current frame
   */
  public update(detections: DetectionInput[], timestamp = Date.now()): TrackedObject[] {
    // 1. Predict new positions for all existing tracks using velocity
    for (const track of this.tracks) {
      track.age++;
      track.timeSinceUpdate++;

      track.bbox.x += track.velocity.vx;
      track.bbox.y += track.velocity.vy;
      track.bbox.width += track.velocity.vw;
      track.bbox.height += track.velocity.vh;
    }

    // 2. Greedy IoU matching between predicted tracks and current detections
    const matchedTracks = new Set<number>();
    const matchedDetections = new Set<number>();

    // Prioritize marker matches if any
    for (let d = 0; d < detections.length; d++) {
      const det = detections[d];
      let bestTrackIdx = -1;
      let bestIoU = -1;

      for (let t = 0; t < this.tracks.length; t++) {
        if (matchedTracks.has(t)) continue;
        const track = this.tracks[t];

        // Must match either equipmentId, markerId, or classLabel
        const classMatch =
          det.equipmentId === track.equipmentId ||
          (det.isMarker && track.isMarker && det.markerId === track.markerId) ||
          det.classLabel === track.classLabel;

        if (!classMatch) continue;

        const iou = calculateIoU(track.bbox, det.bbox);
        if (iou >= this.options.iouThreshold && iou > bestIoU) {
          bestIoU = iou;
          bestTrackIdx = t;
        }
      }

      if (bestTrackIdx !== -1) {
        // Matched track: update state and smooth box
        matchedTracks.add(bestTrackIdx);
        matchedDetections.add(d);
        const trk = this.tracks[bestTrackIdx];

        // Box smoothing: alpha * new + (1 - alpha) * old
        const alpha = this.options.smoothingFactor;
        const oldBbox = { ...trk.bbox };

        trk.bbox.x = alpha * det.bbox.x + (1 - alpha) * trk.bbox.x;
        trk.bbox.y = alpha * det.bbox.y + (1 - alpha) * trk.bbox.y;
        trk.bbox.width = alpha * det.bbox.width + (1 - alpha) * trk.bbox.width;
        trk.bbox.height = alpha * det.bbox.height + (1 - alpha) * trk.bbox.height;

        // Update velocity
        trk.velocity.vx = trk.bbox.x - oldBbox.x;
        trk.velocity.vy = trk.bbox.y - oldBbox.y;
        trk.velocity.vw = trk.bbox.width - oldBbox.width;
        trk.velocity.vh = trk.bbox.height - oldBbox.height;

        trk.confidence = alpha * det.confidence + (1 - alpha) * trk.confidence;
        trk.hits++;
        trk.timeSinceUpdate = 0;
        trk.lastSeenTimestamp = timestamp;

        if (det.markerCorners) {
          trk.markerCorners = det.markerCorners;
        }

        // Check lock condition: stable track for lockDurationMs
        const elapsed = timestamp - trk.firstSeenTimestamp;
        if (elapsed >= this.options.lockDurationMs && trk.hits >= 5) {
          trk.isLocked = true;
        }
      }
    }

    // 3. Create new tracks for unmatched detections
    for (let d = 0; d < detections.length; d++) {
      if (!matchedDetections.has(d)) {
        const det = detections[d];
        const newTrack: TrackedObject = {
          id: this.nextTrackId++,
          classLabel: det.classLabel,
          equipmentId: det.equipmentId,
          bbox: { ...det.bbox },
          velocity: { vx: 0, vy: 0, vw: 0, vh: 0 },
          confidence: det.confidence,
          hits: 1,
          age: 1,
          timeSinceUpdate: 0,
          firstSeenTimestamp: timestamp,
          lastSeenTimestamp: timestamp,
          isLocked: false,
          isMarker: det.isMarker,
          markerId: det.markerId,
          markerCorners: det.markerCorners,
        };
        this.tracks.push(newTrack);
      }
    }

    // 4. Remove tracks that exceeded maxLostFrames (dropped lost tracks)
    this.tracks = this.tracks.filter(
      (trk) => trk.timeSinceUpdate <= this.options.maxLostFrames
    );

    return this.tracks;
  }

  /**
   * Returns all currently active tracks
   */
  public getTracks(): TrackedObject[] {
    return this.tracks;
  }

  /**
   * Returns the primary / highest confidence locked track, or best candidate
   */
  public getPrimaryTrack(): TrackedObject | null {
    if (this.tracks.length === 0) return null;

    // Prefer locked tracks
    const locked = this.tracks.filter((t) => t.isLocked);
    if (locked.length > 0) {
      return locked.sort((a, b) => b.confidence - a.confidence)[0];
    }

    // Otherwise highest hits & confidence
    return [...this.tracks].sort((a, b) => b.hits * b.confidence - a.hits * a.confidence)[0];
  }

  /**
   * Clears all tracks
   */
  public reset(): void {
    this.tracks = [];
  }
}

export const defaultTracker = new LabLensTracker();
