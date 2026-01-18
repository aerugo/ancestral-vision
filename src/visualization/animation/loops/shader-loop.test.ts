import { describe, it, expect, beforeEach } from 'vitest';
import { ShaderLoop } from './shader-loop';
import type { ShaderUniforms } from '../types';

describe('ShaderLoop', () => {
  let uniforms: ShaderUniforms;
  let shaderLoop: ShaderLoop;

  beforeEach(() => {
    uniforms = {
      uTime: { value: 0 },
    };
    shaderLoop = new ShaderLoop(uniforms);
  });

  describe('update', () => {
    it('should update uTime uniform with elapsed time', () => {
      shaderLoop.update(1.5);
      expect(uniforms.uTime.value).toBe(1.5);
    });

    it('should track elapsed time correctly across multiple updates', () => {
      shaderLoop.update(0.5);
      expect(uniforms.uTime.value).toBe(0.5);

      shaderLoop.update(1.0);
      expect(uniforms.uTime.value).toBe(1.0);
    });
  });

  describe('frequency multiplier', () => {
    it('should default to frequency multiplier 1.0', () => {
      shaderLoop.update(1.0);
      expect(uniforms.uTime.value).toBe(1.0);
    });

    it('should apply frequency multiplier to time', () => {
      shaderLoop.setFrequencyMultiplier(2.0); // Double speed
      shaderLoop.update(1.0);
      expect(uniforms.uTime.value).toBe(2.0);
    });

    it('should allow frequency multiplier less than 1', () => {
      shaderLoop.setFrequencyMultiplier(0.5); // Half speed
      shaderLoop.update(2.0);
      expect(uniforms.uTime.value).toBe(1.0);
    });

    it('should return frequency multiplier via getter', () => {
      shaderLoop.setFrequencyMultiplier(2.5);
      expect(shaderLoop.getFrequencyMultiplier()).toBe(2.5);
    });
  });

  describe('phase offset', () => {
    it('should default to phase offset 0', () => {
      shaderLoop.update(1.0);
      expect(uniforms.uTime.value).toBe(1.0);
    });

    it('should add phase offset to time', () => {
      shaderLoop.setPhaseOffset(0.5);
      shaderLoop.update(1.0);
      expect(uniforms.uTime.value).toBe(1.5);
    });

    it('should allow negative phase offset', () => {
      shaderLoop.setPhaseOffset(-0.5);
      shaderLoop.update(1.0);
      expect(uniforms.uTime.value).toBe(0.5);
    });

    it('should return phase offset via getter', () => {
      shaderLoop.setPhaseOffset(0.75);
      expect(shaderLoop.getPhaseOffset()).toBe(0.75);
    });
  });

  describe('combined modifiers', () => {
    it('should apply frequency multiplier before phase offset', () => {
      shaderLoop.setFrequencyMultiplier(2.0);
      shaderLoop.setPhaseOffset(0.5);
      shaderLoop.update(1.0);
      // (1.0 * 2.0) + 0.5 = 2.5
      expect(uniforms.uTime.value).toBe(2.5);
    });
  });

  describe('dispose', () => {
    it('should be disposable', () => {
      expect(() => shaderLoop.dispose()).not.toThrow();
    });
  });
});
