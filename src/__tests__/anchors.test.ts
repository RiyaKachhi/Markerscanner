import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { resolvePartAnchor } from '../lib/anchors';
import type { PartAnchor } from '../types/equipment';
import type { MarkerPose, CameraIntrinsics } from '../lib/pose';

describe('Anchor Resolution & Fallback Hierarchy', () => {
  const dummyPart: PartAnchor = {
    id: 'selector_dial',
    name: 'Selector Dial',
    nameHi: 'डायल',
    bboxAnchor: { x: 0.5, y: 0.6 },
    markerOffset: { x: 1.0, y: -0.5, z: 0.1 },
    detectorClass: 'dial',
  };

  const dummyBbox = { x: 100, y: 100, width: 200, height: 200 };
  const intrinsics: CameraIntrinsics = {
    fx: 800,
    fy: 800,
    cx: 320,
    cy: 240,
    fovDegrees: 60,
  };

  it('selects Marker-anchored (Mode 1) when markerPose is available', () => {
    const dummyPose: MarkerPose = {
      position: new THREE.Vector3(0, 0, -0.4),
      quaternion: new THREE.Quaternion(),
      rotationEuler: new THREE.Euler(),
      matrix: new THREE.Matrix4(),
      distanceMeters: 0.4,
      reprojectionError: 0.1,
    };

    const res = resolvePartAnchor(
      dummyPart,
      dummyBbox,
      dummyPose,
      intrinsics,
      640,
      480,
      0.05
    );

    expect(res.anchorMode).toBe('Marker-anchored');
    expect(res.worldPos).toBeDefined();
    expect(res.distanceMeters).toBeCloseTo(0.4, 1);
  });

  it('falls back to Part-detected (Mode 2) when no markerPose but detectedPartBbox is present', () => {
    const detectedPart = { x: 150, y: 160, width: 40, height: 40 };

    const res = resolvePartAnchor(
      dummyPart,
      dummyBbox,
      null, // no marker pose
      intrinsics,
      640,
      480,
      0.05,
      detectedPart
    );

    expect(res.anchorMode).toBe('Part-detected');
    expect(res.screenX).toBe(170); // 150 + 40/2
    expect(res.screenY).toBe(180); // 160 + 40/2
  });

  it('falls back to Approximate (Mode 3) when neither marker nor part detector is active', () => {
    const res = resolvePartAnchor(
      dummyPart,
      dummyBbox,
      null,
      intrinsics,
      640,
      480,
      0.05
    );

    expect(res.anchorMode).toBe('Approximate');
    // 100 + 0.5 * 200 = 200
    expect(res.screenX).toBe(200);
    // 100 + 0.6 * 200 = 220
    expect(res.screenY).toBe(220);
  });

  it('detects when an anchor is off-screen and flags the proper direction', () => {
    const farPart: PartAnchor = {
      ...dummyPart,
      bboxAnchor: { x: 4.5, y: 0.5 }, // Way off to the right
    };

    const res = resolvePartAnchor(
      farPart,
      dummyBbox,
      null,
      intrinsics,
      640,
      480
    );

    expect(res.isOffScreen).toBe(true);
    expect(res.offScreenDirection).toBe('right');
  });
});
