/**
 * LabLens Native ArUco Engine (ESM)
 * 
 * Clean, modern TypeScript/ESM implementation of ArUco & Computer Vision primitives
 * adapted from Juan Mellado and Damiano Falcioni's js-aruco / js-aruco2.
 * 
 * Fully self-contained, tree-shakeable, and zero CommonJS runtime dependencies.
 * Runs seamlessly in modern browser ESM and Node.js testing environments without
 * any 'this.CV' or 'require()' evaluation errors.
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface ContourPoint extends Point2D {
  hole?: boolean;
}

export interface ImageBuffer {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array | number[];
}

// -------------------------------------------------------------
// CV: Minimal Computer Vision Primitives
// -------------------------------------------------------------

class BlurStack {
  color: number = 0;
  next: BlurStack | null = null;
}

const stackBoxBlurMult = [1, 171, 205, 293, 57, 373, 79, 137, 241, 27, 391, 357, 41, 19, 283, 265];
const stackBoxBlurShift = [0, 9, 10, 11, 9, 12, 10, 11, 12, 9, 13, 13, 10, 9, 13, 13];

const neighborhood = [
  [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1], [1, 1]
];

export class CVImage implements ImageBuffer {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array | number[];

  constructor(width = 0, height = 0, data?: Uint8ClampedArray | Uint8Array | number[]) {
    this.width = width;
    this.height = height;
    this.data = data || [];
  }
}

export const CV = {
  Image: CVImage,

  grayscale(imageSrc: ImageBuffer, imageDst: CVImage): CVImage {
    const src = imageSrc.data;
    const len = src.length;
    if (!imageDst.data || imageDst.data.length !== len >>> 2) {
      imageDst.data = new Uint8Array(len >>> 2);
    }
    const dst = imageDst.data as Uint8Array;
    let i = 0;
    let j = 0;

    for (; i < len; i += 4) {
      dst[j++] = ((src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114 + 0.5) & 0xff);
    }

    imageDst.width = imageSrc.width;
    imageDst.height = imageSrc.height;
    return imageDst;
  },

  threshold(imageSrc: ImageBuffer, imageDst: CVImage, thresholdValue: number): CVImage {
    const src = imageSrc.data;
    const len = src.length;
    if (!imageDst.data || imageDst.data.length !== len) {
      imageDst.data = new Uint8Array(len);
    }
    const dst = imageDst.data as Uint8Array;
    const tab = new Uint8Array(256);

    for (let i = 0; i < 256; ++i) {
      tab[i] = i <= thresholdValue ? 0 : 255;
    }

    for (let i = 0; i < len; ++i) {
      dst[i] = tab[src[i]];
    }

    imageDst.width = imageSrc.width;
    imageDst.height = imageSrc.height;
    return imageDst;
  },

  stackBoxBlur(imageSrc: ImageBuffer, imageDst: CVImage, kernelSize: number): CVImage {
    const src = imageSrc.data;
    const height = imageSrc.height;
    const width = imageSrc.width;
    if (!imageDst.data || imageDst.data.length !== src.length) {
      imageDst.data = new Uint8Array(src.length);
    }
    const dst = imageDst.data as Uint8Array;
    const heightMinus1 = height - 1;
    const widthMinus1 = width - 1;
    const size = kernelSize + kernelSize + 1;
    const radius = kernelSize + 1;
    const mult = stackBoxBlurMult[kernelSize];
    const shift = stackBoxBlurShift[kernelSize];

    let stack: BlurStack;
    let stackStart: BlurStack = new BlurStack();
    stack = stackStart;
    for (let i = 1; i < size; ++i) {
      stack.next = new BlurStack();
      stack = stack.next;
    }
    stack.next = stackStart;

    let pos = 0;

    for (let y = 0; y < height; ++y) {
      const start = pos;
      let color = src[pos];
      let sum = radius * color;

      stack = stackStart;
      for (let i = 0; i < radius; ++i) {
        stack.color = color;
        stack = stack.next!;
      }
      for (let i = 1; i < radius; ++i) {
        stack.color = src[pos + i];
        sum += stack.color;
        stack = stack.next!;
      }

      stack = stackStart;
      for (let x = 0; x < width; ++x) {
        dst[pos++] = (sum * mult) >>> shift;
        const p = start + (x + radius < widthMinus1 ? x + radius : widthMinus1);
        sum -= stack.color - src[p];
        stack.color = src[p];
        stack = stack.next!;
      }
    }

    for (let x = 0; x < width; ++x) {
      pos = x;
      let start = pos + width;
      let color = dst[pos];
      let sum = radius * color;

      stack = stackStart;
      for (let i = 0; i < radius; ++i) {
        stack.color = color;
        stack = stack.next!;
      }
      for (let i = 1; i < radius; ++i) {
        stack.color = dst[start];
        sum += stack.color;
        stack = stack.next!;
        start += width;
      }

      stack = stackStart;
      for (let y = 0; y < height; ++y) {
        dst[pos] = (sum * mult) >>> shift;
        const p = x + ((y + radius < heightMinus1 ? y + radius : heightMinus1) * width);
        sum -= stack.color - dst[p];
        stack.color = dst[p];
        stack = stack.next!;
        pos += width;
      }
    }

    return imageDst;
  },

  adaptiveThreshold(imageSrc: ImageBuffer, imageDst: CVImage, kernelSize: number, thresholdValue: number): CVImage {
    const src = imageSrc.data;
    const len = src.length;
    if (!imageDst.data || imageDst.data.length !== len) {
      imageDst.data = new Uint8Array(len);
    }

    CV.stackBoxBlur(imageSrc, imageDst, kernelSize);

    const dst = imageDst.data as Uint8Array;
    const tab = new Uint8Array(768);

    for (let i = 0; i < 768; ++i) {
      tab[i] = i - 255 <= -thresholdValue ? 255 : 0;
    }

    for (let i = 0; i < len; ++i) {
      dst[i] = tab[src[i] - dst[i] + 255];
    }

    imageDst.width = imageSrc.width;
    imageDst.height = imageSrc.height;
    return imageDst;
  },

  otsu(imageSrc: ImageBuffer): number {
    const src = imageSrc.data;
    const len = src.length;
    const hist = new Int32Array(256);
    let thresholdValue = 0;
    let sum = 0;
    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let max = 0;

    for (let i = 0; i < len; ++i) {
      hist[src[i]]++;
    }

    for (let i = 0; i < 256; ++i) {
      sum += hist[i] * i;
    }

    for (let i = 0; i < 256; ++i) {
      wB += hist[i];
      if (wB !== 0) {
        wF = len - wB;
        if (wF === 0) break;

        sumB += hist[i] * i;
        const mu = (sumB / wB) - ((sum - sumB) / wF);
        const between = wB * wF * mu * mu;

        if (between > max) {
          max = between;
          thresholdValue = i;
        }
      }
    }

    return thresholdValue;
  },

  binaryBorder(imageSrc: ImageBuffer, dst: number[] | Int32Array): number[] | Int32Array {
    const src = imageSrc.data;
    const height = imageSrc.height;
    const width = imageSrc.width;
    let posSrc = 0;
    let posDst = 0;

    for (let j = -2; j < width; ++j) {
      dst[posDst++] = 0;
    }

    for (let i = 0; i < height; ++i) {
      dst[posDst++] = 0;
      for (let j = 0; j < width; ++j) {
        dst[posDst++] = src[posSrc++] === 0 ? 0 : 1;
      }
      dst[posDst++] = 0;
    }

    for (let j = -2; j < width; ++j) {
      dst[posDst++] = 0;
    }

    return dst;
  },

  neighborhoodDeltas(width: number): number[] {
    const deltas: number[] = [];
    const len = neighborhood.length;
    for (let i = 0; i < len; ++i) {
      deltas[i] = neighborhood[i][0] + (neighborhood[i][1] * width);
    }
    return deltas.concat(deltas);
  },

  borderFollowing(
    src: number[] | Int32Array,
    pos: number,
    nbd: number,
    point: Point2D,
    hole: boolean,
    deltas: number[]
  ): ContourPoint[] {
    const contour: ContourPoint[] = [];
    let s = hole ? 0 : 4;
    const s_end_initial = s;
    let pos1 = 0;

    do {
      s = (s - 1) & 7;
      pos1 = pos + deltas[s];
      if (src[pos1] !== 0) {
        break;
      }
    } while (s !== s_end_initial);

    if (s === s_end_initial) {
      src[pos] = -nbd;
      contour.push({ x: point.x, y: point.y, hole });
    } else {
      let pos3 = pos;

      while (true) {
        const s_end = s;
        let pos4 = 0;

        do {
          pos4 = pos3 + deltas[++s];
        } while (src[pos4] === 0);

        s &= 7;

        if (((s - 1) >>> 0) < (s_end >>> 0)) {
          src[pos3] = -nbd;
        } else if (src[pos3] === 1) {
          src[pos3] = nbd;
        }

        contour.push({ x: point.x, y: point.y, hole });

        point.x += neighborhood[s][0];
        point.y += neighborhood[s][1];

        if (pos4 === pos && pos3 === pos1) {
          break;
        }

        pos3 = pos4;
        s = (s + 4) & 7;
      }
    }

    return contour;
  },

  findContours(imageSrc: ImageBuffer, binary: number[] | Int32Array): ContourPoint[][] {
    const width = imageSrc.width;
    const height = imageSrc.height;
    const contours: ContourPoint[][] = [];

    const borderSize = (width + 2) * (height + 2);
    if (!binary || binary.length < borderSize) {
      binary = new Int32Array(borderSize);
    }

    const src = CV.binaryBorder(imageSrc, binary);
    const deltas = CV.neighborhoodDeltas(width + 2);

    let pos = width + 3;
    let nbd = 1;

    for (let i = 0; i < height; ++i, pos += 2) {
      for (let j = 0; j < width; ++j, ++pos) {
        const pix = src[pos];
        if (pix !== 0) {
          let outer = false;
          let hole = false;

          if (pix === 1 && src[pos - 1] === 0) {
            outer = true;
          } else if (pix >= 1 && src[pos + 1] === 0) {
            hole = true;
          }

          if (outer || hole) {
            ++nbd;
            contours.push(CV.borderFollowing(src, pos, nbd, { x: j, y: i }, hole, deltas));
          }
        }
      }
    }

    return contours;
  },

  approxPolyDP(contour: Point2D[], epsilon: number): Point2D[] {
    const slice = { start_index: 0, end_index: 0 };
    const right_slice = { start_index: 0, end_index: 0 };
    const poly: Point2D[] = [];
    const stack: { start_index: number; end_index: number }[] = [];
    const len = contour.length;

    epsilon *= epsilon;
    let k = 0;
    let max_dist = 0;
    let start_pt: Point2D = contour[0];

    for (let i = 0; i < 3; ++i) {
      max_dist = 0;
      k = (k + right_slice.start_index) % len;
      start_pt = contour[k];
      if (++k === len) k = 0;

      for (let j = 1; j < len; ++j) {
        const pt = contour[k];
        if (++k === len) k = 0;

        const dx = pt.x - start_pt.x;
        const dy = pt.y - start_pt.y;
        const dist = dx * dx + dy * dy;

        if (dist > max_dist) {
          max_dist = dist;
          right_slice.start_index = j;
        }
      }
    }

    if (max_dist <= epsilon) {
      poly.push({ x: start_pt.x, y: start_pt.y });
    } else {
      slice.start_index = k;
      slice.end_index = (right_slice.start_index += slice.start_index);

      right_slice.start_index -= right_slice.start_index >= len ? len : 0;
      right_slice.end_index = slice.start_index;
      if (right_slice.end_index < right_slice.start_index) {
        right_slice.end_index += len;
      }

      stack.push({ start_index: right_slice.start_index, end_index: right_slice.end_index });
      stack.push({ start_index: slice.start_index, end_index: slice.end_index });
    }

    while (stack.length !== 0) {
      const currentSlice = stack.pop()!;
      const end_pt = contour[currentSlice.end_index % len];
      start_pt = contour[k = currentSlice.start_index % len];
      if (++k === len) k = 0;

      let le_eps = false;

      if (currentSlice.end_index <= currentSlice.start_index + 1) {
        le_eps = true;
      } else {
        max_dist = 0;
        const dx = end_pt.x - start_pt.x;
        const dy = end_pt.y - start_pt.y;

        for (let i = currentSlice.start_index + 1; i < currentSlice.end_index; ++i) {
          const pt = contour[k];
          if (++k === len) k = 0;

          const dist = Math.abs((pt.y - start_pt.y) * dx - (pt.x - start_pt.x) * dy);

          if (dist > max_dist) {
            max_dist = dist;
            right_slice.start_index = i;
          }
        }

        le_eps = max_dist * max_dist <= epsilon * (dx * dx + dy * dy);
      }

      if (le_eps) {
        poly.push({ x: start_pt.x, y: start_pt.y });
      } else {
        right_slice.end_index = currentSlice.end_index;
        currentSlice.end_index = right_slice.start_index;

        stack.push({ start_index: right_slice.start_index, end_index: right_slice.end_index });
        stack.push({ start_index: currentSlice.start_index, end_index: currentSlice.end_index });
      }
    }

    return poly;
  },

  isContourConvex(contour: Point2D[]): boolean {
    let orientation = 0;
    let convex = true;
    const len = contour.length;
    let j = 0;

    let prev_pt = contour[len - 1];
    let cur_pt = contour[0];

    let dx0 = cur_pt.x - prev_pt.x;
    let dy0 = cur_pt.y - prev_pt.y;

    for (let i = 0; i < len; ++i) {
      if (++j === len) j = 0;

      prev_pt = cur_pt;
      cur_pt = contour[j];

      const dx = cur_pt.x - prev_pt.x;
      const dy = cur_pt.y - prev_pt.y;
      const dxdy0 = dx * dy0;
      const dydx0 = dy * dx0;

      orientation |= dydx0 > dxdy0 ? 1 : (dydx0 < dxdy0 ? 2 : 3);

      if (orientation === 3) {
        convex = false;
        break;
      }

      dx0 = dx;
      dy0 = dy;
    }

    return convex;
  },

  perimeter(poly: Point2D[]): number {
    const len = poly.length;
    let p = 0.0;
    for (let i = 0, j = len - 1; i < len; j = i++) {
      const dx = poly[i].x - poly[j].x;
      const dy = poly[i].y - poly[j].y;
      p += Math.sqrt(dx * dx + dy * dy);
    }
    return p;
  },

  minEdgeLength(poly: Point2D[]): number {
    const len = poly.length;
    let min = Infinity;
    for (let i = 0, j = len - 1; i < len; j = i++) {
      const dx = poly[i].x - poly[j].x;
      const dy = poly[i].y - poly[j].y;
      const d = dx * dx + dy * dy;
      if (d < min) {
        min = d;
      }
    }
    return Math.sqrt(min);
  },

  countNonZero(imageSrc: ImageBuffer, square: { x: number; y: number; width: number; height: number }): number {
    const src = imageSrc.data;
    const height = square.height;
    const width = square.width;
    let pos = square.x + (square.y * imageSrc.width);
    const span = imageSrc.width - width;
    let nz = 0;

    for (let i = 0; i < height; ++i) {
      for (let j = 0; j < width; ++j) {
        if (src[pos++] !== 0) {
          ++nz;
        }
      }
      pos += span;
    }

    return nz;
  },

  square2quad(src: Point2D[]): number[] {
    const sq: number[] = [];
    const px = src[0].x - src[1].x + src[2].x - src[3].x;
    const py = src[0].y - src[1].y + src[2].y - src[3].y;

    if (px === 0 && py === 0) {
      sq[0] = src[1].x - src[0].x;
      sq[1] = src[2].x - src[1].x;
      sq[2] = src[0].x;
      sq[3] = src[1].y - src[0].y;
      sq[4] = src[2].y - src[1].y;
      sq[5] = src[0].y;
      sq[6] = 0;
      sq[7] = 0;
      sq[8] = 1;
    } else {
      const dx1 = src[1].x - src[2].x;
      const dx2 = src[3].x - src[2].x;
      const dy1 = src[1].y - src[2].y;
      const dy2 = src[3].y - src[2].y;
      const den = dx1 * dy2 - dx2 * dy1;

      sq[6] = (px * dy2 - dx2 * py) / den;
      sq[7] = (dx1 * py - px * dy1) / den;
      sq[8] = 1;
      sq[0] = src[1].x - src[0].x + sq[6] * src[1].x;
      sq[1] = src[3].x - src[0].x + sq[7] * src[3].x;
      sq[2] = src[0].x;
      sq[3] = src[1].y - src[0].y + sq[6] * src[1].y;
      sq[4] = src[3].y - src[0].y + sq[7] * src[3].y;
      sq[5] = src[0].y;
    }

    return sq;
  },

  getPerspectiveTransform(src: Point2D[], size: number): number[] {
    const rq = CV.square2quad(src);
    rq[0] /= size;
    rq[1] /= size;
    rq[3] /= size;
    rq[4] /= size;
    rq[6] /= size;
    rq[7] /= size;
    return rq;
  },

  warp(imageSrc: ImageBuffer, imageDst: CVImage, contour: Point2D[], warpSize: number): CVImage {
    const src = imageSrc.data;
    if (!imageDst.data || imageDst.data.length !== warpSize * warpSize) {
      imageDst.data = new Uint8Array(warpSize * warpSize);
    }
    const dst = imageDst.data as Uint8Array;
    const width = imageSrc.width;
    const height = imageSrc.height;
    let pos = 0;

    const m = CV.getPerspectiveTransform(contour, warpSize - 1);

    let r = m[8];
    let s = m[2];
    let t = m[5];

    for (let i = 0; i < warpSize; ++i) {
      r += m[7];
      s += m[1];
      t += m[4];

      let u = r;
      let v = s;
      let w = t;

      for (let j = 0; j < warpSize; ++j) {
        u += m[6];
        v += m[0];
        w += m[3];

        const x = v / u;
        const y = w / u;

        const sx1 = x >>> 0;
        const sx2 = sx1 === width - 1 ? sx1 : sx1 + 1;
        const dx1 = x - sx1;
        const dx2 = 1.0 - dx1;

        const sy1 = y >>> 0;
        const sy2 = sy1 === height - 1 ? sy1 : sy1 + 1;
        const dy1 = y - sy1;
        const dy2 = 1.0 - dy1;

        const p1 = sy1 * width;
        const p2 = p1;
        const p3 = sy2 * width;
        const p4 = p3;

        dst[pos++] = (
          (dy2 * (dx2 * src[p1 + sx1] + dx1 * src[p2 + sx2]) +
           dy1 * (dx2 * src[p3 + sx1] + dx1 * src[p4 + sx2])) & 0xff
        );
      }
    }

    imageDst.width = warpSize;
    imageDst.height = warpSize;
    return imageDst;
  }
};

// -------------------------------------------------------------
// AR: Marker Detection & ArUco Dictionary Processing
// -------------------------------------------------------------

export interface ARDictionaryConfig {
  nBits: number;
  tau?: number;
  codeList: (number | string | number[])[];
}

export class ARMarker {
  id: number;
  corners: Point2D[];
  hammingDistance: number;

  constructor(id: number, corners: Point2D[], hammingDistance: number) {
    this.id = id;
    this.corners = corners;
    this.hammingDistance = hammingDistance;
  }
}

export class ARDictionary {
  dicName: string;
  nBits: number = 0;
  markSize: number = 0;
  tau: number = 0;
  codeList: string[] = [];
  codes: Record<string, { id: number }> = {};

  constructor(dicName: string, customConfig?: ARDictionaryConfig) {
    this.dicName = dicName;
    const config = customConfig || AR.DICTIONARIES[dicName];
    if (!config) {
      throw new Error(`The dictionary "${dicName}" is not recognized.`);
    }

    this.nBits = config.nBits;
    this.markSize = Math.sqrt(config.nBits) + 2;
    this.codes = {};
    this.codeList = [];

    for (let i = 0; i < config.codeList.length; i++) {
      let code: string | null = null;
      const item = config.codeList[i];
      if (typeof item === 'number') {
        code = this._hex2bin(item, this.nBits);
      } else if (typeof item === 'string') {
        code = this._hex2bin(parseInt(item, 16), this.nBits);
      } else if (Array.isArray(item)) {
        code = this._bytes2bin(item, this.nBits);
      }

      if (code === null) {
        throw new Error(`Invalid code at index ${i} in dictionary ${dicName}`);
      }
      if (code.length !== this.nBits) {
        throw new Error(`The code ${i} in ${dicName} is ${code.length} bits instead of ${this.nBits}`);
      }

      this.codeList.push(code);
      this.codes[code] = { id: i };
    }

    this.tau = config.tau || this._calculateTau();
  }

  private _hex2bin(hex: number, nBits: number): string {
    return hex.toString(2).padStart(nBits, '0');
  }

  private _bytes2bin(byteList: number[], nBits: number): string {
    let bits = '';
    for (const byte of byteList) {
      const remaining = nBits - bits.length;
      bits += byte.toString(2).padStart(remaining < 8 ? remaining : 8, '0');
    }
    return bits;
  }

  private _hammingDistance(str1: string, str2: string): number {
    if (str1.length !== str2.length) {
      throw new Error('Hamming distance calculation requires inputs of same length');
    }
    let distance = 0;
    for (let i = 0; i < str1.length; i++) {
      if (str1[i] !== str2[i]) distance++;
    }
    return distance;
  }

  private _calculateTau(): number {
    let tau = Number.MAX_VALUE;
    for (let i = 0; i < this.codeList.length; i++) {
      for (let j = i + 1; j < this.codeList.length; j++) {
        const d = this._hammingDistance(this.codeList[i], this.codeList[j]);
        if (d < tau) tau = d;
      }
    }
    return tau;
  }

  find(bits: (number | string)[][]): { id: number; distance: number } | null {
    let val = '';
    for (let i = 0; i < bits.length; i++) {
      for (let j = 0; j < bits[i].length; j++) {
        val += bits[i][j];
      }
    }

    const exact = this.codes[val];
    if (exact) {
      return { id: exact.id, distance: 0 };
    }

    let minFound: { id: number; distance: number } | null = null;
    for (let i = 0; i < this.codeList.length; i++) {
      const code = this.codeList[i];
      const distance = this._hammingDistance(val, code);
      if (distance < this.tau) {
        if (!minFound || minFound.distance > distance) {
          minFound = { id: this.codes[code].id, distance };
        }
      }
    }

    return minFound;
  }
}

export class ARDetector {
  private grey: CVImage = new CVImage();
  private thres: CVImage = new CVImage();
  private homography: CVImage = new CVImage();
  private binary: Int32Array = new Int32Array(0);
  contours: ContourPoint[][] = [];
  polys: Point2D[][] = [];
  candidates: Point2D[][] = [];
  dictionary: ARDictionary;

  constructor(config: { dictionaryName: string; maxHammingDistance?: number; customConfig?: ARDictionaryConfig }) {
    const dictName = config.dictionaryName || 'ARUCO';
    this.dictionary = new ARDictionary(dictName, config.customConfig);
    if (config.maxHammingDistance != null) {
      this.dictionary.tau = config.maxHammingDistance;
    }
  }

  detect(image: ImageBuffer): ARMarker[] {
    CV.grayscale(image, this.grey);
    CV.adaptiveThreshold(this.grey, this.thres, 2, 7);

    this.contours = CV.findContours(this.thres, this.binary);
    // Candidates threshold: min length based on image width
    this.candidates = this.findCandidates(this.contours, image.width * 0.01, 0.05, 10);
    this.candidates = this.clockwiseCorners(this.candidates);
    this.candidates = this.notTooNear(this.candidates, 10);

    return this.findMarkers(this.grey, this.candidates, 49);
  }

  private findCandidates(contours: ContourPoint[][], minSize: number, epsilon: number, minLength: number): Point2D[][] {
    const candidates: Point2D[][] = [];
    this.polys = [];

    for (let i = 0; i < contours.length; ++i) {
      const contour = contours[i];
      if (contour.length >= minSize) {
        const poly = CV.approxPolyDP(contour, contour.length * epsilon);
        this.polys.push(poly);

        if (poly.length === 4 && CV.isContourConvex(poly)) {
          if (CV.minEdgeLength(poly) >= minLength) {
            candidates.push(poly);
          }
        }
      }
    }

    return candidates;
  }

  private clockwiseCorners(candidates: Point2D[][]): Point2D[][] {
    for (let i = 0; i < candidates.length; ++i) {
      const c = candidates[i];
      const dx1 = c[1].x - c[0].x;
      const dy1 = c[1].y - c[0].y;
      const dx2 = c[2].x - c[0].x;
      const dy2 = c[2].y - c[0].y;

      if ((dx1 * dy2 - dy1 * dx2) < 0) {
        const swap = c[1];
        c[1] = c[3];
        c[3] = swap;
      }
    }
    return candidates;
  }

  private notTooNear(candidates: (Point2D[] & { tooNear?: boolean })[], minDist: number): Point2D[][] {
    const notTooNearList: Point2D[][] = [];
    const len = candidates.length;
    const minDistSq = minDist * minDist;

    for (let i = 0; i < len; ++i) {
      for (let j = i + 1; j < len; ++j) {
        let dist = 0;
        for (let k = 0; k < 4; ++k) {
          const dx = candidates[i][k].x - candidates[j][k].x;
          const dy = candidates[i][k].y - candidates[j][k].y;
          dist += dx * dx + dy * dy;
        }

        if ((dist / 4) < minDistSq) {
          if (CV.perimeter(candidates[i]) < CV.perimeter(candidates[j])) {
            candidates[i].tooNear = true;
          } else {
            candidates[j].tooNear = true;
          }
        }
      }
    }

    for (let i = 0; i < len; ++i) {
      if (!candidates[i].tooNear) {
        notTooNearList.push(candidates[i]);
      }
    }

    return notTooNearList;
  }

  private findMarkers(imageSrc: ImageBuffer, candidates: Point2D[][], warpSize: number): ARMarker[] {
    const markers: ARMarker[] = [];

    for (let i = 0; i < candidates.length; ++i) {
      const candidate = candidates[i];
      CV.warp(imageSrc, this.homography, candidate, warpSize);
      CV.threshold(this.homography, this.homography, CV.otsu(this.homography));

      const marker = this.getMarker(this.homography, candidate);
      if (marker) {
        markers.push(marker);
      }
    }

    return markers;
  }

  private getMarker(imageSrc: ImageBuffer, candidate: Point2D[]): ARMarker | null {
    const markSize = this.dictionary.markSize;
    const width = (imageSrc.width / markSize) >>> 0;
    const minZero = (width * width) >> 1;
    const bits: number[][] = [];

    // 1. Verify black border
    for (let i = 0; i < markSize; ++i) {
      const inc = (i === 0 || i === markSize - 1) ? 1 : markSize - 1;
      for (let j = 0; j < markSize; j += inc) {
        const square = { x: j * width, y: i * width, width, height: width };
        if (CV.countNonZero(imageSrc, square) > minZero) {
          return null; // Border is not solid black
        }
      }
    }

    // 2. Read inner grid bits
    for (let i = 0; i < markSize - 2; ++i) {
      bits[i] = [];
      for (let j = 0; j < markSize - 2; ++j) {
        const square = { x: (j + 1) * width, y: (i + 1) * width, width, height: width };
        bits[i][j] = CV.countNonZero(imageSrc, square) > minZero ? 1 : 0;
      }
    }

    // 3. Test 4 possible 90-degree rotations
    const rotations: number[][][] = [];
    rotations[0] = bits;

    let foundMin: { id: number; distance: number } | null = null;
    let rot = 0;

    for (let i = 0; i < 4; i++) {
      const found = this.dictionary.find(rotations[i]);
      if (found && (foundMin === null || found.distance < foundMin.distance)) {
        foundMin = found;
        rot = i;
        if (foundMin.distance === 0) break;
      }
      rotations[i + 1] = this.rotate(rotations[i]);
    }

    if (foundMin) {
      return new ARMarker(foundMin.id, this.rotate2(candidate, 4 - rot), foundMin.distance);
    }

    return null;
  }

  private rotate(src: number[][]): number[][] {
    const dst: number[][] = [];
    const len = src.length;
    for (let i = 0; i < len; ++i) {
      dst[i] = [];
      for (let j = 0; j < src[i].length; ++j) {
        dst[i][j] = src[src[i].length - j - 1][i];
      }
    }
    return dst;
  }

  private rotate2(src: Point2D[], rotation: number): Point2D[] {
    const dst: Point2D[] = [];
    const len = src.length;
    for (let i = 0; i < len; ++i) {
      dst[i] = src[(rotation + i) % len];
    }
    return dst;
  }
}

export const AR = {
  Dictionary: ARDictionary,
  Detector: ARDetector,
  Marker: ARMarker,
  DICTIONARIES: {
    ARUCO: {
      nBits: 25,
      tau: 3,
      codeList: [
        0x1084210,0x1084217,0x1084209,0x108420e,0x10842f0,0x10842f7,0x10842e9,0x10842ee,
        0x1084130,0x1084137,0x1084129,0x108412e,0x10841d0,0x10841d7,0x10841c9,0x10841ce,
        0x1085e10,0x1085e17,0x1085e09,0x1085e0e,0x1085ef0,0x1085ef7,0x1085ee9,0x1085eee,
        0x1085d30,0x1085d37,0x1085d29,0x1085d2e,0x1085dd0,0x1085dd7,0x1085dc9,0x1085dce,
        0x1082610,0x1082617,0x1082609,0x108260e,0x10826f0,0x10826f7,0x10826e9,0x10826ee,
        0x1082530,0x1082537,0x1082529,0x108252e,0x10825d0,0x10825d7,0x10825c9,0x10825ce,
        0x1083a10,0x1083a17,0x1083a09,0x1083a0e,0x1083af0,0x1083af7,0x1083ae9,0x1083aee,
        0x1083930,0x1083937,0x1083929,0x108392e,0x10839d0,0x10839d7,0x10839c9,0x10839ce
      ]
    } as ARDictionaryConfig
  } as Record<string, ARDictionaryConfig>
};
