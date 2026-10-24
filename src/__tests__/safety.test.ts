import { describe, it, expect } from 'vitest';
import { evaluateSafetyGate, isHighHazardClass } from '../config/model.config';

describe('Safety Gate Logic', () => {
  it('identifies high hazard instruments accurately', () => {
    expect(isHighHazardClass('soldering_iron')).toBe(true);
    expect(isHighHazardClass('bunsen_burner')).toBe(true);
    expect(isHighHazardClass('vernier_caliper')).toBe(false);
    expect(isHighHazardClass('multimeter_digital')).toBe(false);
  });

  it('rejects high-hazard instruments when confidence is below 0.80 and unconfirmed', () => {
    const result = evaluateSafetyGate('soldering_iron', 0.72, true, false);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('High-hazard instrument requires confidence >= 80%');
  });

  it('allows high-hazard instruments when confidence meets or exceeds 0.80', () => {
    const result = evaluateSafetyGate('soldering_iron', 0.85, true, false);
    expect(result.allowed).toBe(true);
  });

  it('allows high-hazard instruments with low confidence if user manually tapped confirmation', () => {
    // Failsafe override: user explicitly inspected and confirmed "Yes, this is a Soldering Iron"
    const result = evaluateSafetyGate('soldering_iron', 0.65, true, true);
    expect(result.allowed).toBe(true);
    expect(result.reason).toContain('user explicitly confirmed');
  });

  it('evaluates standard per-class thresholds for low/medium hazard equipment', () => {
    // Multimeter threshold is 0.65
    expect(evaluateSafetyGate('multimeter_digital', 0.66, false, false).allowed).toBe(true);
    expect(evaluateSafetyGate('multimeter_digital', 0.58, false, false).allowed).toBe(false);
  });
});
