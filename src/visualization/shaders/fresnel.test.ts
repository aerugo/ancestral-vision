/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { createFresnelNode, type FresnelConfig } from './fresnel';

describe('fresnel module', () => {
  describe('createFresnelNode', () => {
    it('should export createFresnelNode', () => {
      expect(createFresnelNode).toBeDefined();
      expect(typeof createFresnelNode).toBe('function');
    });

    it('should return a TSL node', () => {
      const fresnelNode = createFresnelNode();
      expect(fresnelNode).toBeDefined();
    });

    it('should accept power configuration', () => {
      const fresnelNode = createFresnelNode({ power: 3.0 });
      expect(fresnelNode).toBeDefined();
    });

    it('should accept intensity configuration', () => {
      const fresnelNode = createFresnelNode({ intensity: 1.5 });
      expect(fresnelNode).toBeDefined();
    });

    it('should accept both power and intensity', () => {
      const fresnelNode = createFresnelNode({ power: 2.0, intensity: 2.0 });
      expect(fresnelNode).toBeDefined();
    });
  });
});
