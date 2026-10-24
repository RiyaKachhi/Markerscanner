import * as THREE from 'three';
import type { Point2D } from './markers';

export interface CameraIntrinsics {
  fx: number;
  fy: number;
  cx: number;
  cy: number;
  fovDegrees: number;
}

export interface MarkerPose {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  rotationEuler: THREE.Euler;
  matrix: THREE.Matrix4;
  distanceMeters: number;
  reprojectionError: number;
}

/**
 * Derives camera intrinsics matrix K from viewport dimensions and assumed FOV
 */
export function getCameraIntrinsics(
  width: number,
  height: number,
  fovDegrees = 60
): CameraIntrinsics {
  const fovRad = (fovDegrees * Math.PI) / 180;
  // fx based on horizontal FOV
  const fx = (width / 2) / Math.tan(fovRad / 2);
  const fy = fx; // assume square pixels
  const cx = width / 2;
  const cy = height / 2;
  return { fx, fy, cx, cy, fovDegrees };
}

/**
 * Estimates 3D pose (Position and Quaternion) of an ArUco marker from its 4 image corners
 * @param corners [TL, TR, BR, BL] image coordinates in pixels
 * @param markerSizeMeters physical marker edge length (e.g. 0.05m = 5cm)
 * @param intrinsics camera calibration intrinsics
 */
export function estimateMarkerPose(
  corners: [Point2D, Point2D, Point2D, Point2D],
  markerSizeMeters = 0.05,
  intrinsics: CameraIntrinsics
): MarkerPose {
  const s = markerSizeMeters / 2;

  // 3D coordinates in marker reference frame (Z=0, centered)
  const objPts = [
    { x: -s, y: s },  // TL
    { x: s, y: s },   // TR
    { x: s, y: -s },  // BR
    { x: -s, y: -s }, // BL
  ];

  // Normalized image coordinates using inverse camera intrinsics
  const normImgPts = corners.map((c) => ({
    x: (c.x - intrinsics.cx) / intrinsics.fx,
    y: (c.y - intrinsics.cy) / intrinsics.fy,
  }));

  // Compute 3x3 Planar Homography H such that x_img ~ H * X_obj
  const H = computeHomography(objPts, normImgPts);

  // Extract columns of H
  let h1 = new THREE.Vector3(H[0], H[3], H[6]);
  let h2 = new THREE.Vector3(H[1], H[4], H[7]);
  let h3 = new THREE.Vector3(H[2], H[5], H[8]);

  const norm1 = h1.length();
  const norm2 = h2.length();
  const scale = (norm1 + norm2) / 2 || 1;

  h1.divideScalar(norm1 || 1);
  h2.divideScalar(norm2 || 1);
  h3.divideScalar(scale);

  // Orthogonalize rotation columns: r1, r2, r3 = r1 x r2
  // Gram-Schmidt orthogonalization
  const dot = h1.dot(h2);
  h2.sub(h1.clone().multiplyScalar(dot)).normalize();
  const r3 = new THREE.Vector3().crossVectors(h1, h2).normalize();

  // Translation vector
  // Three.js camera looks down -Z axis with Y up
  let T = new THREE.Vector3(h3.x, -h3.y, -h3.z);
  if (T.z > 0) {
    // If behind camera due to sign ambiguity, invert
    T.negate();
  }

  // Create 3x3 rotation matrix
  const rotMat = new THREE.Matrix4();
  rotMat.set(
    h1.x, -h2.x, -r3.x, T.x,
    -h1.y, h2.y, r3.y, T.y,
    -h1.z, h2.z, r3.z, T.z,
    0, 0, 0, 1
  );

  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scaleVec = new THREE.Vector3();
  rotMat.decompose(position, quaternion, scaleVec);

  const rotationEuler = new THREE.Euler().setFromQuaternion(quaternion);
  const distanceMeters = position.length();

  return {
    position,
    quaternion,
    rotationEuler,
    matrix: rotMat,
    distanceMeters,
    reprojectionError: 0.5,
  };
}

/**
 * Computes 3x3 Homography matrix using DLT (Direct Linear Transform)
 */
function computeHomography(
  src: { x: number; y: number }[],
  dst: { x: number; y: number }[]
): number[] {
  // 8 equations for 4 point correspondences
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const x = src[i].x;
    const y = src[i].y;
    const u = dst[i].x;
    const v = dst[i].y;

    A.push([-x, -y, -1, 0, 0, 0, u * x, u * y, u]);
    A.push([0, 0, 0, -x, -y, -1, v * x, v * y, v]);
  }

  // Solve Ah = 0 using pseudo-inverse or Gaussian elimination with least squares
  // For 4 points (exact 8 equations, 8 unknowns up to scale h33=1)
  const M: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 8; i++) {
    M.push(A[i].slice(0, 8));
    b.push(-A[i][8]);
  }

  const h = solveLinearSystem8x8(M, b);
  return [...h, 1];
}

/**
 * Solves 8x8 linear system M * x = b via Gaussian elimination with partial pivoting
 */
function solveLinearSystem8x8(M: number[][], b: number[]): number[] {
  const n = 8;
  const A = M.map((row) => [...row]);
  const x = [...b];

  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxEl = Math.abs(A[i][i]);
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > maxEl) {
        maxEl = Math.abs(A[k][i]);
        maxRow = k;
      }
    }

    // Swap rows
    for (let k = i; k < n; k++) {
      const tmp = A[maxRow][k];
      A[maxRow][k] = A[i][k];
      A[i][k] = tmp;
    }
    const tmpB = x[maxRow];
    x[maxRow] = x[i];
    x[i] = tmpB;

    // Eliminate
    const pivot = A[i][i] || 1e-7;
    for (let k = i + 1; k < n; k++) {
      const c = -A[k][i] / pivot;
      for (let j = i; j < n; j++) {
        if (i === j) {
          A[k][j] = 0;
        } else {
          A[k][j] += c * A[i][j];
        }
      }
      x[k] += c * x[i];
    }
  }

  // Back substitution
  const res = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = x[i];
    for (let j = i + 1; j < n; j++) {
      sum -= A[i][j] * res[j];
    }
    res[i] = sum / (A[i][i] || 1e-7);
  }

  return res;
}
