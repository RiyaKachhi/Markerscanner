import { AR, ARDetector } from './aruco-engine';
import aruco4x4Data from '../data/aruco_4x4_50.json';

export interface Point2D {
  x: number;
  y: number;
}

export interface DetectedMarker {
  id: number;
  corners: [Point2D, Point2D, Point2D, Point2D]; // [TL, TR, BR, BL] in viewport screen pixels
  rawCorners: [Point2D, Point2D, Point2D, Point2D]; // in video frame pixel coordinates
  center: Point2D;
  area: number;
  rotation: number;
  hammingDistance: number;
  dictionary: '4x4_50' | '5x5_ARUCO';
}

export interface ViewportTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
  renderWidth: number;
  renderHeight: number;
}

/**
 * Calculates scale and offset for CSS object-cover video alignment
 */
export function computeObjectCoverTransform(
  videoWidth: number,
  videoHeight: number,
  containerWidth: number,
  containerHeight: number
): ViewportTransform {
  if (!videoWidth || !videoHeight || !containerWidth || !containerHeight) {
    return {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      renderWidth: containerWidth,
      renderHeight: containerHeight,
    };
  }

  const videoAspect = videoWidth / videoHeight;
  const containerAspect = containerWidth / containerHeight;

  let renderWidth: number;
  let renderHeight: number;
  let offsetX = 0;
  let offsetY = 0;

  if (containerAspect > videoAspect) {
    // Container is wider: match width, crop top/bottom
    renderWidth = containerWidth;
    renderHeight = containerWidth / videoAspect;
    offsetY = (containerHeight - renderHeight) / 2;
  } else {
    // Container is taller: match height, crop left/right
    renderHeight = containerHeight;
    renderWidth = containerHeight * videoAspect;
    offsetX = (containerWidth - renderWidth) / 2;
  }

  const scale = renderWidth / videoWidth;

  return { scale, offsetX, offsetY, renderWidth, renderHeight };
}

// 1. Register OpenCV DICT_4X4_50 in js-aruco2
if (AR && !AR.DICTIONARIES['ARUCO_4X4_50']) {
  const codes: number[] = [];
  const list = aruco4x4Data as number[][][];
  for (let id = 0; id < list.length; id++) {
    const b0 = list[id][0][0];
    const b1 = list[id][0][1];
    codes.push((b0 << 8) | b1);
  }

  AR.DICTIONARIES['ARUCO_4X4_50'] = {
    nBits: 16,
    tau: 1, // allow up to 1-bit Hamming error correction for camera noise
    codeList: codes,
  };
}

/**
 * Returns the 4x4 bit matrix (4 rows of 4 bits: 0 or 1) for a given marker ID
 */
export function getMarkerBits4x4(id: number): number[][] {
  const list = aruco4x4Data as number[][][];
  if (id < 0 || id >= list.length) {
    throw new Error(`Marker ID ${id} out of range (0-49)`);
  }
  const b0 = list[id][0][0];
  const b1 = list[id][0][1];
  const code = (b0 << 8) | b1;
  const grid: number[][] = [];
  for (let row = 0; row < 4; row++) {
    const rowBits: number[] = [];
    for (let col = 0; col < 4; col++) {
      const bitIndex = 15 - (row * 4 + col);
      rowBits.push((code >> bitIndex) & 1);
    }
    grid.push(rowBits);
  }
  return grid;
}

/**
 * Generates an SVG string representation of an ArUco 4x4 marker (6x6 including black border)
 */
export function generateMarkerSVG(id: number, sizePx = 240, equipmentName?: string): string {
  const bits = getMarkerBits4x4(id);
  const cellSize = sizePx / 6;

  let rects = '';
  // Outer border is black (cells where r === 0 or r === 5 or c === 0 or c === 5)
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      let isBlack = false;
      if (r === 0 || r === 5 || c === 0 || c === 5) {
        isBlack = true; // border
      } else {
        // Inner 4x4: 0 = black, 1 = white
        const innerRow = r - 1;
        const innerCol = c - 1;
        isBlack = bits[innerRow][innerCol] === 0;
      }

      if (isBlack) {
        rects += `<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000000" />\n`;
      }
    }
  }

  const labelText = equipmentName
    ? `<text x="${sizePx / 2}" y="${sizePx + 24}" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle" fill="#000000">ID #${id}: ${equipmentName}</text>`
    : '';
  const totalHeight = equipmentName ? sizePx + 36 : sizePx;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${totalHeight}" viewBox="0 0 ${sizePx} ${totalHeight}">
  <rect width="${sizePx}" height="${sizePx}" fill="#ffffff" />
  ${rects}
  ${labelText}
</svg>`.trim();
}

/**
 * Industrial-grade ArUco Detector powered by js-aruco2
 * Detects both 4x4 (DICT_4X4_50) and 5x5 markers, and maps coordinates to screen pixels.
 */
export class RobustArUcoDetector {
  private detector4x4: ARDetector | null = null;
  private detector5x5: ARDetector | null = null;
  private tempCanvas: HTMLCanvasElement | null = null;
  private tempCtx: CanvasRenderingContext2D | null = null;

  constructor() {
    if (typeof document !== 'undefined') {
      this.tempCanvas = document.createElement('canvas');
      this.tempCtx = this.tempCanvas.getContext('2d', { willReadFrequently: true });
    }

    if (AR) {
      try {
        this.detector4x4 = new AR.Detector({
          dictionaryName: 'ARUCO_4X4_50',
          maxHammingDistance: 1,
        });
      } catch (e) {
        console.error('Failed to init 4x4 ArUco detector:', e);
      }

      try {
        this.detector5x5 = new AR.Detector({
          dictionaryName: 'ARUCO',
          maxHammingDistance: 2,
        });
      } catch (e) {
        console.error('Failed to init 5x5 ArUco detector:', e);
      }
    }
  }

  /**
   * Detects markers and projects corners to screen coordinates
   * @param source HTMLVideoElement, HTMLCanvasElement, or ImageData
   * @param viewportWidth container/screen width for coordinate mapping
   * @param viewportHeight container/screen height for coordinate mapping
   */
  public detect(
    source: HTMLVideoElement | HTMLCanvasElement | ImageData | { width: number; height: number; data: Uint8ClampedArray | Uint8Array },
    viewportWidth?: number,
    viewportHeight?: number
  ): DetectedMarker[] {
    if (!this.detector4x4) return [];

    let rawW = 0;
    let rawH = 0;
    let imgData: { width: number; height: number; data: Uint8ClampedArray | Uint8Array };

    const isDirectImage =
      (typeof ImageData !== 'undefined' && source instanceof ImageData) ||
      (source && typeof source === 'object' && 'data' in source && 'width' in source && 'height' in source);

    if (isDirectImage) {
      imgData = source as { width: number; height: number; data: Uint8ClampedArray | Uint8Array };
      rawW = source.width;
      rawH = source.height;
    } else {
      const isVideo = typeof HTMLVideoElement !== 'undefined' && source instanceof HTMLVideoElement;
      rawW = isVideo ? (source as HTMLVideoElement).videoWidth : (source as HTMLCanvasElement).width;
      rawH = isVideo ? (source as HTMLVideoElement).videoHeight : (source as HTMLCanvasElement).height;

      if (!rawW || !rawH) return [];

      // Process at high resolution (up to 1280px) for tiny/distant markers
      const maxDim = 960;
      let targetW = rawW;
      let targetH = rawH;

      if (rawW > maxDim) {
        targetW = maxDim;
        targetH = Math.round((rawH * maxDim) / rawW);
      }

      if (!this.tempCanvas && typeof document !== 'undefined') {
        this.tempCanvas = document.createElement('canvas');
        this.tempCtx = this.tempCanvas.getContext('2d', { willReadFrequently: true });
      }
      if (!this.tempCanvas || !this.tempCtx) return [];

      this.tempCanvas.width = targetW;
      this.tempCanvas.height = targetH;
      this.tempCtx.drawImage(source, 0, 0, targetW, targetH);
      imgData = this.tempCtx.getImageData(0, 0, targetW, targetH);
    }

    const procW = imgData.width;
    const procH = imgData.height;

    // Downscale factor from raw video to processed canvas
    const downscaleX = rawW / procW;
    const downscaleY = rawH / procH;

    // Object-cover transform to map raw video pixels to viewport screen pixels
    const vw = viewportWidth || rawW;
    const vh = viewportHeight || rawH;
    const transform = computeObjectCoverTransform(rawW, rawH, vw, vh);

    // 1. Primary detection with 4x4 detector
    let rawMarkers = this.detector4x4.detect(imgData);
    let dictName: '4x4_50' | '5x5_ARUCO' = '4x4_50';

    // 2. Fallback to 5x5 detector if 0 found and 5x5 detector exists
    if (rawMarkers.length === 0 && this.detector5x5) {
      const markers5x5 = this.detector5x5.detect(imgData);
      if (markers5x5.length > 0) {
        rawMarkers = markers5x5;
        dictName = '5x5_ARUCO';
      }
    }

    const detected: DetectedMarker[] = [];

    for (const m of rawMarkers) {
      // Map corners:
      // Step A: from processed canvas pixels to raw video pixels
      // Step B: from raw video pixels to viewport screen pixels via object-cover
      const screenCorners: Point2D[] = [];
      const rawCorners: Point2D[] = [];

      for (let i = 0; i < 4; i++) {
        const cx = m.corners[i].x * downscaleX;
        const cy = m.corners[i].y * downscaleY;
        rawCorners.push({ x: cx, y: cy });

        const sx = transform.offsetX + cx * transform.scale;
        const sy = transform.offsetY + cy * transform.scale;
        screenCorners.push({ x: sx, y: sy });
      }

      const centerScreen: Point2D = {
        x: (screenCorners[0].x + screenCorners[1].x + screenCorners[2].x + screenCorners[3].x) / 4,
        y: (screenCorners[0].y + screenCorners[1].y + screenCorners[2].y + screenCorners[3].y) / 4,
      };

      const area = this.polygonArea(screenCorners);

      detected.push({
        id: m.id,
        corners: [
          screenCorners[0],
          screenCorners[1],
          screenCorners[2],
          screenCorners[3],
        ],
        rawCorners: [
          rawCorners[0],
          rawCorners[1],
          rawCorners[2],
          rawCorners[3],
        ],
        center: centerScreen,
        area,
        rotation: 0,
        hammingDistance: m.hammingDistance || 0,
        dictionary: dictName,
      });
    }

    return detected;
  }

  private polygonArea(pts: Point2D[]): number {
    let area = 0;
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      area += pts[i].x * pts[j].y;
      area -= pts[j].x * pts[i].y;
    }
    return Math.abs(area) / 2;
  }
}

export const defaultArUcoDetector = new RobustArUcoDetector();
