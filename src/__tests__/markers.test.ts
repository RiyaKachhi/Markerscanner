import { describe, it, expect } from 'vitest';
import { defaultArUcoDetector, getMarkerBits4x4, generateMarkerSVG } from '../lib/markers';
import aruco4x4Data from '../data/aruco_4x4_50.json';

describe('ArUco 4x4 Marker Generation & Recognition', () => {
  it('generates valid 4x4 bit patterns for all 50 markers', () => {
    for (let id = 0; id < 50; id++) {
      const bits = getMarkerBits4x4(id);
      expect(bits.length).toBe(4);
      for (const row of bits) {
        expect(row.length).toBe(4);
        for (const b of row) {
          expect(b === 0 || b === 1).toBe(true);
        }
      }
    }
  });

  it('generates well-formed SVG marker markup', () => {
    const svg = generateMarkerSVG(0, 240, 'Digital Multimeter');
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('Digital Multimeter');
  });

  it('detects a synthetic ArUco marker 0 with 100% precision', () => {
    const size = 240;
    const cellSize = 20;
    const margin = 60;
    const data = new Uint8ClampedArray(size * size * 4);
    data.fill(255); // white background

    const code = (aruco4x4Data[0][0][0] << 8) | aruco4x4Data[0][0][1];

    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        let isWhite = false;
        if (r === 0 || r === 5 || c === 0 || c === 5) {
          isWhite = false; // black border
        } else {
          const bitIdx = 15 - ((r - 1) * 4 + (c - 1));
          isWhite = ((code >> bitIdx) & 1) === 1;
        }
        const val = isWhite ? 255 : 0;
        for (let py = 0; py < cellSize; py++) {
          for (let px = 0; px < cellSize; px++) {
            const x = margin + c * cellSize + px;
            const y = margin + r * cellSize + py;
            const idx = (y * size + x) * 4;
            data[idx] = val;
            data[idx + 1] = val;
            data[idx + 2] = val;
            data[idx + 3] = 255;
          }
        }
      }
    }

    const img = { width: size, height: size, data };
    const detected = defaultArUcoDetector.detect(img, size, size);

    expect(detected.length).toBe(1);
    expect(detected[0].id).toBe(0);
    expect(detected[0].corners.length).toBe(4);
    expect(detected[0].area).toBeGreaterThan(1000);
  });
});
