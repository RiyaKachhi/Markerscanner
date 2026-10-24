import * as THREE from 'three';
import type { PartAnchor } from '../types/equipment';
import type { BoundingBox } from './tracker';
import type { MarkerPose, CameraIntrinsics } from './pose';

export type AnchorMode = 'Marker-anchored' | 'Part-detected' | 'Approximate';

export interface ResolvedPartAnchor {
  partId: string;
  name: string;
  nameHi: string;
  // 2D screen coordinate in pixels
  screenX: number;
  screenY: number;
  // 3D camera coordinate if available
  worldPos?: THREE.Vector3;
  anchorMode: AnchorMode;
  isOffScreen: boolean;
  offScreenDirection?: 'top' | 'bottom' | 'left' | 'right';
  distanceMeters?: number;
}

/**
 * Resolves physical part anchor coordinates following strict fallback order:
 * 1. Marker pose + 3D part offset (Marker-anchored)
 * 2. Detected part bounding box (Part-detected)
 * 3. Equipment bounding box + normalised bboxAnchor (Approximate)
 */
export function resolvePartAnchor(
  part: PartAnchor,
  equipmentBbox: BoundingBox,
  markerPose: MarkerPose | null,
  intrinsics: CameraIntrinsics,
  viewportWidth: number,
  viewportHeight: number,
  markerSizeMeters = 0.05,
  detectedPartBbox?: BoundingBox
): ResolvedPartAnchor {
  // Mode 1: Marker-anchored (Primary 3D anchor)
  if (markerPose) {
    const offset = new THREE.Vector3(
      part.markerOffset.x * markerSizeMeters,
      part.markerOffset.y * markerSizeMeters,
      part.markerOffset.z * markerSizeMeters
    );

    // Rotate offset by marker quaternion
    offset.applyQuaternion(markerPose.quaternion);
    const worldPos = markerPose.position.clone().add(offset);

    // Project 3D worldPos to 2D screen pixels using camera intrinsics
    // Three.js camera: X right, Y up, -Z forward
    // In camera image plane: u = fx * (X / -Z) + cx, v = fy * (-Y / -Z) + cy
    const z = Math.abs(worldPos.z) || 0.1;
    const screenX = (intrinsics.fx * worldPos.x) / z + intrinsics.cx;
    const screenY = (intrinsics.fy * -worldPos.y) / z + intrinsics.cy;

    const offScreenInfo = checkOffScreen(screenX, screenY, viewportWidth, viewportHeight);

    return {
      partId: part.id,
      name: part.name,
      nameHi: part.nameHi,
      screenX,
      screenY,
      worldPos,
      anchorMode: 'Marker-anchored',
      isOffScreen: offScreenInfo.isOffScreen,
      offScreenDirection: offScreenInfo.direction,
      distanceMeters: worldPos.length(),
    };
  }

  // Mode 2: Detected Part Bounding Box (if detector exists)
  if (detectedPartBbox) {
    const screenX = detectedPartBbox.x + detectedPartBbox.width / 2;
    const screenY = detectedPartBbox.y + detectedPartBbox.height / 2;
    const offScreenInfo = checkOffScreen(screenX, screenY, viewportWidth, viewportHeight);

    return {
      partId: part.id,
      name: part.name,
      nameHi: part.nameHi,
      screenX,
      screenY,
      anchorMode: 'Part-detected',
      isOffScreen: offScreenInfo.isOffScreen,
      offScreenDirection: offScreenInfo.direction,
    };
  }

  // Mode 3: Normalized Bounding Box Relative Coordinate (Approximate fallback)
  const screenX = equipmentBbox.x + part.bboxAnchor.x * equipmentBbox.width;
  const screenY = equipmentBbox.y + part.bboxAnchor.y * equipmentBbox.height;
  const offScreenInfo = checkOffScreen(screenX, screenY, viewportWidth, viewportHeight);

  return {
    partId: part.id,
    name: part.name,
    nameHi: part.nameHi,
    screenX,
    screenY,
    anchorMode: 'Approximate',
    isOffScreen: offScreenInfo.isOffScreen,
    offScreenDirection: offScreenInfo.direction,
  };
}

function checkOffScreen(
  x: number,
  y: number,
  w: number,
  h: number
): { isOffScreen: boolean; direction?: 'top' | 'bottom' | 'left' | 'right' } {
  const margin = 20;
  if (x < margin) return { isOffScreen: true, direction: 'left' };
  if (x > w - margin) return { isOffScreen: true, direction: 'right' };
  if (y < margin) return { isOffScreen: true, direction: 'top' };
  if (y > h - margin) return { isOffScreen: true, direction: 'bottom' };
  return { isOffScreen: false };
}
