import { describe, it, expect } from 'vitest';
import { easings, getEasing } from './easing';

describe('easing functions', () => {
  describe('linear', () => {
    it('should return t unchanged', () => {
      expect(easings.linear(0)).toBe(0);
      expect(easings.linear(0.5)).toBe(0.5);
      expect(easings.linear(1)).toBe(1);
    });
  });

  describe('easeInCubic', () => {
    it('should start slow (t^3)', () => {
      expect(easings.easeInCubic(0.5)).toBeCloseTo(0.125);
    });
  });

  describe('easeOutCubic', () => {
    it('should end slow', () => {
      expect(easings.easeOutCubic(0.5)).toBeCloseTo(0.875);
    });
  });

  describe('easeInOutCubic', () => {
    it('should be symmetric', () => {
      expect(easings.easeInOutCubic(0.5)).toBeCloseTo(0.5);
      const sum = easings.easeInOutCubic(0.25) + easings.easeInOutCubic(0.75);
      expect(sum).toBeCloseTo(1);
    });
  });

  describe('easeInQuart', () => {
    it('should start very slow (t^4)', () => {
      expect(easings.easeInQuart(0.5)).toBeCloseTo(0.0625);
    });
  });

  describe('easeOutQuart', () => {
    it('should end very slow', () => {
      expect(easings.easeOutQuart(0.5)).toBeCloseTo(0.9375);
    });
  });

  describe('boundary conditions', () => {
    const allEasings = Object.entries(easings);

    it('all easings should return 0 at t=0', () => {
      for (const [name, fn] of allEasings) {
        expect(fn(0), `${name} at t=0`).toBe(0);
      }
    });

    it('all easings should return 1 at t=1', () => {
      for (const [name, fn] of allEasings) {
        expect(fn(1), `${name} at t=1`).toBe(1);
      }
    });
  });

  describe('getEasing', () => {
    it('should return the correct easing function by name', () => {
      expect(getEasing('linear')).toBe(easings.linear);
      expect(getEasing('easeInCubic')).toBe(easings.easeInCubic);
    });
  });
});
