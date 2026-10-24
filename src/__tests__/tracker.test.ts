import { describe, it, expect } from 'vitest';
import { LabLensTracker, calculateIoU, type DetectionInput } from '../lib/tracker';

describe('LabLensTracker & IoU', () => {
  it('calculates IoU correctly for identical, overlapping, and disjoint boxes', () => {
    const boxA = { x: 10, y: 10, width: 100, height: 100 };
    const boxIdentical = { x: 10, y: 10, width: 100, height: 100 };
    expect(calculateIoU(boxA, boxIdentical)).toBeCloseTo(1.0);

    const boxHalfOverlap = { x: 60, y: 10, width: 100, height: 100 };
    // intersection = 50 * 100 = 5000. union = 10000 + 10000 - 5000 = 15000. IoU = 5000/15000 = 0.333
    expect(calculateIoU(boxA, boxHalfOverlap)).toBeCloseTo(0.333, 2);

    const boxDisjoint = { x: 200, y: 200, width: 50, height: 50 };
    expect(calculateIoU(boxA, boxDisjoint)).toBe(0);
  });

  it('maintains the same track ID through short occlusions (10 frames) and coasts', () => {
    const tracker = new LabLensTracker({ maxLostFrames: 12, lockDurationMs: 500 });

    const det1: DetectionInput = {
      bbox: { x: 50, y: 50, width: 120, height: 120 },
      classLabel: 'multimeter_digital',
      equipmentId: 'multimeter_digital',
      confidence: 0.95,
      isMarker: false,
    };

    // Frame 1: Initial detection
    const t1 = tracker.update([det1], 1000);
    expect(t1.length).toBe(1);
    const initialTrackId = t1[0].id;
    expect(initialTrackId).toBeGreaterThan(0);

    // Frame 2..6: Steady updates to establish track
    for (let f = 1; f <= 5; f++) {
      tracker.update([det1], 1000 + f * 100);
    }

    // Now simulate an occlusion (e.g. hand in front for 6 consecutive frames with 0 detections)
    for (let f = 6; f <= 11; f++) {
      const activeDuringOcclusion = tracker.update([], 1000 + f * 100);
      // Track must NOT be dropped immediately during short occlusion!
      expect(activeDuringOcclusion.length).toBe(1);
      expect(activeDuringOcclusion[0].id).toBe(initialTrackId);
      expect(activeDuringOcclusion[0].timeSinceUpdate).toBe(f - 5);
    }

    // After occlusion clears, detection reappears
    const tAfter = tracker.update([det1], 2500);
    expect(tAfter.length).toBe(1);
    expect(tAfter[0].id).toBe(initialTrackId); // ID persisted!
    expect(tAfter[0].timeSinceUpdate).toBe(0);
  });

  it('drops lost tracks once occlusion exceeds maxLostFrames', () => {
    const tracker = new LabLensTracker({ maxLostFrames: 5 });

    const det: DetectionInput = {
      bbox: { x: 20, y: 20, width: 80, height: 80 },
      classLabel: 'oscilloscope',
      equipmentId: 'oscilloscope',
      confidence: 0.9,
      isMarker: false,
    };

    tracker.update([det], 100);
    expect(tracker.getTracks().length).toBe(1);

    // Miss 6 frames (exceeds maxLostFrames=5)
    for (let i = 0; i < 6; i++) {
      tracker.update([], 200 + i * 100);
    }

    // Track should now be dropped
    expect(tracker.getTracks().length).toBe(0);
  });
});
