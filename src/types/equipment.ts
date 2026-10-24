export type HazardLevel = 'low' | 'medium' | 'high';

export type Category = 
  | 'Measurement'
  | 'Electronics'
  | 'Mechanical'
  | 'Robotics'
  | 'Safety Gear';

export interface PartAnchor {
  id: string;
  name: string;
  nameHi: string;
  // Position inside the equipment bounding box, normalised 0..1 (fallback anchor)
  bboxAnchor: { x: number; y: number };
  // Position relative to marker centre in marker-widths (primary 3D anchor)
  markerOffset: { x: number; y: number; z: number };
  // Label of the part-detector class, if a part model exists
  detectorClass: string | null;
}

export interface OperatingStep {
  stepNumber: number;
  text: string;
  textHi: string;
  targetPartId: string; // which part to highlight in AR
  arrow?: 'up' | 'down' | 'left' | 'right' | 'forward';
  expectedValue?: string | null; // used by OCR stretch goal
  tip?: string;
  tipHi?: string;
}

export interface StaffReview {
  by: string;
  date: string;
  notes?: string;
}

export interface Equipment {
  id: string;
  name: string;
  nameHi: string;
  category: Category;
  aliases: string[];
  markerId: number | null; // ArUco ID (0-49)
  specs: Record<string, string>;
  operatingSteps: OperatingStep[];
  safetyPrecautions: string[];
  safetyPrecautionsHi: string[];
  requiredPPE: string[];
  hazardLevel: HazardLevel;
  commonMistakes: string[];
  commonMistakesHi?: string[];
  imageUrl: string;
  manualLink: string;
  staffReviewed: StaffReview | null;
  parts: PartAnchor[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ScanHistoryItem {
  id?: number;
  equipmentId: string;
  equipmentName: string;
  timestamp: number;
  confidence: number;
  method: 'marker' | 'custom-ml' | 'simulated';
}

export interface BookmarkItem {
  equipmentId: string;
  savedAt: number;
}
