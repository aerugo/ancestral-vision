/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { createNoiseFunction, type NoiseFunction } from './noise';

describe('noise module', () => {
  describe('createNoiseFunction', () => {
    it('should export createNoiseFunction', () => {
      expect(createNoiseFunction).toBeDefined();
      expect(typeof createNoiseFunction).toBe('function');
    });

    it('should return a function that creates noise nodes', () => {
      const noiseFn = createNoiseFunction();
      expect(noiseFn).toBeDefined();
      expect(typeof noiseFn).toBe('function');
    });

    it('should create noise with configurable scale', () => {
      const noiseFn = createNoiseFunction({ scale: 0.1 });
      expect(noiseFn).toBeDefined();
    });

    it('should create noise with configurable octaves', () => {
      const noiseFn = createNoiseFunction({ octaves: 2 });
      expect(noiseFn).toBeDefined();
    });
  });
});
