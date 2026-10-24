import { describe, it, expect } from 'vitest';
import equipmentData from '../data/equipment.json';
import type { Equipment } from '../types/equipment';

describe('Equipment Database Schema Integrity', () => {
  const items = equipmentData as unknown as Equipment[];

  it('contains at least 12-15 core laboratory instruments', () => {
    expect(items.length).toBeGreaterThanOrEqual(15);
  });

  it('ensures all instruments have unique IDs and unique non-null marker IDs', () => {
    const ids = new Set<string>();
    const markerIds = new Set<number>();

    for (const item of items) {
      expect(ids.has(item.id)).toBe(false);
      ids.add(item.id);

      if (item.markerId !== null) {
        expect(markerIds.has(item.markerId)).toBe(false);
        markerIds.add(item.markerId);
        expect(item.markerId).toBeGreaterThanOrEqual(0);
        expect(item.markerId).toBeLessThanOrEqual(49);
      }
    }
  });

  it('verifies every instrument has at least 3 parts with valid coordinate anchors', () => {
    for (const item of items) {
      expect(item.parts.length).toBeGreaterThanOrEqual(3);

      for (const part of item.parts) {
        expect(part.id).toBeTruthy();
        expect(part.name).toBeTruthy();
        expect(part.nameHi).toBeTruthy();

        // Normalized bbox coordinates must be roughly within [0, 1] range
        expect(part.bboxAnchor.x).toBeGreaterThanOrEqual(0);
        expect(part.bboxAnchor.x).toBeLessThanOrEqual(1);
        expect(part.bboxAnchor.y).toBeGreaterThanOrEqual(0);
        expect(part.bboxAnchor.y).toBeLessThanOrEqual(1);

        // 3D marker offset must have x, y, z numbers
        expect(typeof part.markerOffset.x).toBe('number');
        expect(typeof part.markerOffset.y).toBe('number');
        expect(typeof part.markerOffset.z).toBe('number');
      }
    }
  });

  it('guarantees every operating step points to a valid targetPartId in that instrument', () => {
    for (const item of items) {
      expect(item.operatingSteps.length).toBeGreaterThan(0);
      const partIds = new Set(item.parts.map((p) => p.id));

      for (const step of item.operatingSteps) {
        expect(step.text).toBeTruthy();
        expect(step.textHi).toBeTruthy();
        expect(partIds.has(step.targetPartId)).toBe(true);
      }
    }
  });

  it('verifies safety requirements, hazard level, and PPE lists', () => {
    const validHazards = new Set(['low', 'medium', 'high']);
    for (const item of items) {
      expect(validHazards.has(item.hazardLevel)).toBe(true);
      expect(item.safetyPrecautions.length).toBeGreaterThanOrEqual(2);
      expect(item.requiredPPE.length).toBeGreaterThanOrEqual(1);
    }
  });
});
