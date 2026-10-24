import Dexie, { type Table } from 'dexie';
import type { Equipment, ScanHistoryItem, BookmarkItem } from '../types/equipment';
import initialEquipmentData from '../data/equipment.json';

/**
 * ============================================================================
 * HOW TO ADD A NEW INSTRUMENT IN UNDER 2 MINUTES:
 * ----------------------------------------------------------------------------
 * 1. Open src/data/equipment.json (or use the in-app Admin page at /admin).
 * 2. Add an object with:
 *    - "id": Unique string key (e.g. "centrifuge_benchtop")
 *    - "name": English name
 *    - "nameHi": Hindi translation
 *    - "category": "Measurement" | "Electronics" | "Mechanical" | "Robotics" | "Safety Gear"
 *    - "markerId": An unused ArUco integer ID between 0 and 49 (e.g. 15)
 *    - "hazardLevel": "low" | "medium" | "high" (high triggers mandatory PPE checklist & safety confirmation)
 *    - "specs": Key-value pairs of technical limits
 *    - "parts": At least 3 physical parts with bboxAnchor {x, y} and markerOffset {x, y, z}
 *    - "operatingSteps": Step-by-step array with targetPartId referencing one of the parts
 *    - "safetyPrecautions", "requiredPPE", "commonMistakes"
 * 3. Save! The app seeds and updates IndexedDB automatically.
 * ============================================================================
 */

export class LabLensDatabase extends Dexie {
  equipment!: Table<Equipment, string>;
  scanHistory!: Table<ScanHistoryItem, number>;
  bookmarks!: Table<BookmarkItem, string>;

  constructor() {
    super('LabLensDatabase');
    this.version(1).stores({
      equipment: 'id, name, category, markerId, hazardLevel',
      scanHistory: '++id, equipmentId, timestamp',
      bookmarks: 'equipmentId, savedAt',
    });
  }
}

export const db = new LabLensDatabase();

/**
 * Initialize and seed the database with default equipment data
 */
export async function initDatabase(): Promise<void> {
  try {
    const count = await db.equipment.count();
    if (count === 0) {
      console.log('Seeding initial lab equipment dataset...');
      await db.equipment.bulkAdd(initialEquipmentData as unknown as Equipment[]);
    }
  } catch (err) {
    console.error('Failed to initialize or seed LabLens database:', err);
  }
}

export async function getAllEquipment(): Promise<Equipment[]> {
  await initDatabase();
  return await db.equipment.toArray();
}

export async function getEquipmentById(id: string): Promise<Equipment | undefined> {
  await initDatabase();
  return await db.equipment.get(id);
}

export async function getEquipmentByMarkerId(markerId: number): Promise<Equipment | undefined> {
  await initDatabase();
  return await db.equipment.where('markerId').equals(markerId).first();
}

export async function searchEquipment(query: string, category?: string): Promise<Equipment[]> {
  await initDatabase();
  let collection = db.equipment.toCollection();
  
  const all = await collection.toArray();
  const lowerQuery = query.toLowerCase().trim();

  return all.filter((item) => {
    const matchesCat = !category || category === 'All' || item.category === category;
    if (!matchesCat) return false;
    if (!lowerQuery) return true;

    return (
      item.name.toLowerCase().includes(lowerQuery) ||
      (item.nameHi && item.nameHi.includes(lowerQuery)) ||
      item.aliases.some((a) => a.toLowerCase().includes(lowerQuery)) ||
      item.category.toLowerCase().includes(lowerQuery)
    );
  });
}

export async function addEquipment(item: Equipment): Promise<void> {
  item.updatedAt = new Date().toISOString();
  await db.equipment.put(item);
}

export async function updateEquipment(item: Equipment): Promise<void> {
  item.updatedAt = new Date().toISOString();
  await db.equipment.put(item);
}

export async function deleteEquipment(id: string): Promise<void> {
  await db.equipment.delete(id);
}

export async function markReviewed(id: string, reviewerName: string, notes?: string): Promise<void> {
  const item = await db.equipment.get(id);
  if (item) {
    item.staffReviewed = {
      by: reviewerName,
      date: new Date().toISOString().split('T')[0],
      notes,
    };
    item.updatedAt = new Date().toISOString();
    await db.equipment.put(item);
  }
}

export async function addScanHistory(item: Omit<ScanHistoryItem, 'id'>): Promise<void> {
  try {
    await db.scanHistory.add(item);
    // Keep only the last 20 scans
    const all = await db.scanHistory.orderBy('timestamp').toArray();
    if (all.length > 20) {
      const toDelete = all.slice(0, all.length - 20);
      for (const old of toDelete) {
        if (old.id) await db.scanHistory.delete(old.id);
      }
    }
  } catch (err) {
    console.error('Error recording scan history:', err);
  }
}

export async function getRecentScans(limit = 20): Promise<ScanHistoryItem[]> {
  return await db.scanHistory.orderBy('timestamp').reverse().limit(limit).toArray();
}

export async function toggleBookmark(equipmentId: string): Promise<boolean> {
  const existing = await db.bookmarks.get(equipmentId);
  if (existing) {
    await db.bookmarks.delete(equipmentId);
    return false;
  } else {
    await db.bookmarks.put({ equipmentId, savedAt: Date.now() });
    return true;
  }
}

export async function isBookmarked(equipmentId: string): Promise<boolean> {
  const item = await db.bookmarks.get(equipmentId);
  return !!item;
}

export async function getBookmarkedIds(): Promise<string[]> {
  const items = await db.bookmarks.toArray();
  return items.map((i) => i.equipmentId);
}
