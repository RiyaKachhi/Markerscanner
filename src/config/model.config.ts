export type ModelType = 
  | 'marker-only' 
  | 'custom-tfjs-detector' 
  | 'coco-ssd' 
  | 'teachable-machine';

export interface ModelConfig {
  type: ModelType;
  modelUrl: string;
  inputSize: { width: number; height: number };
  defaultConfidenceThreshold: number;
  highHazardConfidenceThreshold: number;
  perClassConfidenceThresholds: Record<string, number>;
  classToEquipmentMap: Record<string, string>;
  isDevPlaceholder: boolean;
  devNotice?: string;
}

/**
 * Active Model Configuration for LabLens
 * Change `type` here to swap models across the entire application.
 */
export const activeModelConfig: ModelConfig = {
  // Swappable: 'marker-only' (default rock-solid), 'custom-tfjs-detector', 'coco-ssd' (placeholder only), 'teachable-machine'
  type: 'marker-only',
  modelUrl: '/models/lablens/model.json',
  inputSize: { width: 640, height: 640 },
  defaultConfidenceThreshold: 0.60,
  highHazardConfidenceThreshold: 0.80,

  // Per-class thresholds tuned for safety & precision
  perClassConfidenceThresholds: {
    multimeter_digital: 0.65,
    vernier_caliper: 0.65,
    micrometer_screw_gauge: 0.70,
    oscilloscope: 0.70,
    function_generator: 0.70,
    dc_power_supply: 0.75,
    breadboard: 0.60,
    soldering_iron: 0.80, // High hazard: strictly 0.80 or confirmation
    arduino_uno: 0.65,
    raspberry_pi: 0.65,
    bunsen_burner: 0.80, // High hazard: strictly 0.80 or confirmation
    beaker_measuring_cylinder: 0.65,
    digital_weighing_balance: 0.70,
    tachometer_stopwatch: 0.65,
    safety_gear_kit: 0.60,
  },

  // Direct mapping of custom detector class names to LabLens equipment IDs
  classToEquipmentMap: {
    multimeter: 'multimeter_digital',
    caliper: 'vernier_caliper',
    micrometer: 'micrometer_screw_gauge',
    oscilloscope: 'oscilloscope',
    function_generator: 'function_generator',
    power_supply: 'dc_power_supply',
    breadboard: 'breadboard',
    soldering_iron: 'soldering_iron',
    arduino: 'arduino_uno',
    raspberry_pi: 'raspberry_pi',
    bunsen_burner: 'bunsen_burner',
    beaker: 'beaker_measuring_cylinder',
    weighing_scale: 'digital_weighing_balance',
    tachometer: 'tachometer_stopwatch',
    safety_gear: 'safety_gear_kit',
  },

  isDevPlaceholder: false,
  devNotice: 'COCO-SSD is a generic 80-class dev placeholder and cannot identify lab equipment. Use Marker Mode or Demo Mode.',
};

/**
 * Returns true if the instrument requires extra safety gating (hazardLevel high)
 */
export function isHighHazardClass(equipmentId: string): boolean {
  return equipmentId === 'soldering_iron' || equipmentId === 'bunsen_burner';
}

/**
 * Evaluates whether a recognition result passes safety gates
 */
export function evaluateSafetyGate(
  equipmentId: string,
  confidence: number,
  isHighHazard: boolean,
  isConfirmedByUser: boolean
): { allowed: boolean; reason: string } {
  const threshold = isHighHazard
    ? activeModelConfig.highHazardConfidenceThreshold
    : activeModelConfig.perClassConfidenceThresholds[equipmentId] ?? activeModelConfig.defaultConfidenceThreshold;

  if (isHighHazard) {
    if (confidence >= threshold || isConfirmedByUser) {
      return { allowed: true, reason: 'High hazard threshold met or user explicitly confirmed' };
    }
    return {
      allowed: false,
      reason: `High-hazard instrument requires confidence >= ${(threshold * 100).toFixed(0)}% (current: ${(confidence * 100).toFixed(0)}%) or explicit manual confirmation.`,
    };
  }

  if (confidence >= threshold) {
    return { allowed: true, reason: 'Confidence above per-class threshold' };
  }

  return {
    allowed: false,
    reason: `Confidence ${(confidence * 100).toFixed(0)}% below required threshold ${(threshold * 100).toFixed(0)}%.`,
  };
}
