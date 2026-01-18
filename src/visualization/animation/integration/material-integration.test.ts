/**
 * Integration tests for AnimationSystem with existing material uniforms
 *
 * TDD: These tests define the expected behavior for material integration
 * before implementing the actual integration code.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnimationSystem } from '../core/animation-system';
import type { ShaderUniforms } from '../types';

describe('AnimationSystem Material Integration', () => {
  let system: AnimationSystem;

  beforeEach(() => {
    system = new AnimationSystem();
  });

  describe('shader uniform registration', () => {
    it('should register ghost node material uniforms', () => {
      const ghostUniforms: ShaderUniforms = { uTime: { value: 0 } };

      system.registerShaderLoop('ghostNodes', ghostUniforms);

      expect(system.hasShaderLoop('ghostNodes')).toBe(true);
    });

    it('should register biography cloud material uniforms', () => {
      const biographyUniforms: ShaderUniforms = { uTime: { value: 0 } };

      system.registerShaderLoop('biographyNodes', biographyUniforms);

      expect(system.hasShaderLoop('biographyNodes')).toBe(true);
    });

    it('should register edge material uniforms', () => {
      const edgeUniforms: ShaderUniforms = { uTime: { value: 0 } };

      system.registerShaderLoop('edges', edgeUniforms);

      expect(system.hasShaderLoop('edges')).toBe(true);
    });

    it('should register background particles uniforms', () => {
      const backgroundUniforms: ShaderUniforms = { uTime: { value: 0 } };

      system.registerShaderLoop('backgroundParticles', backgroundUniforms);

      expect(system.hasShaderLoop('backgroundParticles')).toBe(true);
    });

    it('should register event fireflies uniforms', () => {
      const firefliesUniforms: ShaderUniforms = { uTime: { value: 0 } };

      system.registerShaderLoop('eventFireflies', firefliesUniforms);

      expect(system.hasShaderLoop('eventFireflies')).toBe(true);
    });
  });

  describe('unified time updates', () => {
    it('should update all registered materials with same elapsed time', () => {
      const ghostUniforms: ShaderUniforms = { uTime: { value: 0 } };
      const biographyUniforms: ShaderUniforms = { uTime: { value: 0 } };
      const edgeUniforms: ShaderUniforms = { uTime: { value: 0 } };
      const backgroundUniforms: ShaderUniforms = { uTime: { value: 0 } };
      const firefliesUniforms: ShaderUniforms = { uTime: { value: 0 } };

      system.registerShaderLoop('ghostNodes', ghostUniforms);
      system.registerShaderLoop('biographyNodes', biographyUniforms);
      system.registerShaderLoop('edges', edgeUniforms);
      system.registerShaderLoop('backgroundParticles', backgroundUniforms);
      system.registerShaderLoop('eventFireflies', firefliesUniforms);

      // Simulate multiple frames
      system.update(0.016); // ~60fps
      system.update(0.016);
      system.update(0.016);

      const expectedTime = 0.048;

      expect(ghostUniforms.uTime.value).toBeCloseTo(expectedTime);
      expect(biographyUniforms.uTime.value).toBeCloseTo(expectedTime);
      expect(edgeUniforms.uTime.value).toBeCloseTo(expectedTime);
      expect(backgroundUniforms.uTime.value).toBeCloseTo(expectedTime);
      expect(firefliesUniforms.uTime.value).toBeCloseTo(expectedTime);
    });
  });

  describe('pause/resume affects all materials', () => {
    it('should freeze all material times when paused', () => {
      const ghostUniforms: ShaderUniforms = { uTime: { value: 0 } };
      const biographyUniforms: ShaderUniforms = { uTime: { value: 0 } };

      system.registerShaderLoop('ghostNodes', ghostUniforms);
      system.registerShaderLoop('biographyNodes', biographyUniforms);

      system.update(0.05);
      const frozenTime = system.getElapsedTime();

      system.pause();
      system.update(0.05);
      system.update(0.05);

      // Times should not advance while paused
      expect(ghostUniforms.uTime.value).toBeCloseTo(frozenTime);
      expect(biographyUniforms.uTime.value).toBeCloseTo(frozenTime);
    });

    it('should resume time advancement for all materials', () => {
      const ghostUniforms: ShaderUniforms = { uTime: { value: 0 } };
      const biographyUniforms: ShaderUniforms = { uTime: { value: 0 } };

      system.registerShaderLoop('ghostNodes', ghostUniforms);
      system.registerShaderLoop('biographyNodes', biographyUniforms);

      system.update(0.05);
      system.pause();
      system.update(0.05); // This should not advance
      system.resume();
      system.update(0.05); // This should advance

      const expectedTime = 0.1; // 0.05 before pause + 0.05 after resume

      expect(ghostUniforms.uTime.value).toBeCloseTo(expectedTime);
      expect(biographyUniforms.uTime.value).toBeCloseTo(expectedTime);
    });
  });

  describe('time scale affects all materials', () => {
    it('should apply time scale to all material updates', () => {
      const ghostUniforms: ShaderUniforms = { uTime: { value: 0 } };
      const biographyUniforms: ShaderUniforms = { uTime: { value: 0 } };

      system.registerShaderLoop('ghostNodes', ghostUniforms);
      system.registerShaderLoop('biographyNodes', biographyUniforms);

      system.setTimeScale(0.5); // Half speed
      system.update(0.1);

      const expectedTime = 0.05; // 0.1 * 0.5

      expect(ghostUniforms.uTime.value).toBeCloseTo(expectedTime);
      expect(biographyUniforms.uTime.value).toBeCloseTo(expectedTime);
    });

    it('should support slow-motion debugging', () => {
      const uniforms: ShaderUniforms = { uTime: { value: 0 } };
      system.registerShaderLoop('test', uniforms);

      system.setTimeScale(0.1); // 10x slower
      system.update(0.1);

      expect(uniforms.uTime.value).toBeCloseTo(0.01);
    });

    it('should support fast-forward', () => {
      const uniforms: ShaderUniforms = { uTime: { value: 0 } };
      system.registerShaderLoop('test', uniforms);

      system.setTimeScale(2.0); // 2x faster
      system.update(0.05);

      expect(uniforms.uTime.value).toBeCloseTo(0.1);
    });
  });

  describe('delta time capping for tab sleep recovery', () => {
    it('should cap large deltas to prevent animation catch-up', () => {
      const uniforms: ShaderUniforms = { uTime: { value: 0 } };
      system.registerShaderLoop('test', uniforms);

      // Simulate returning from browser tab sleep with 5 second delta
      system.update(5.0);

      // Should be capped at max delta (0.1s default)
      expect(uniforms.uTime.value).toBe(0.1);
    });

    it('should maintain smooth animation after sleep recovery', () => {
      const uniforms: ShaderUniforms = { uTime: { value: 0 } };
      system.registerShaderLoop('test', uniforms);

      // Large delta from sleep
      system.update(5.0);
      // Normal frames after
      system.update(0.016);
      system.update(0.016);

      // Should be 0.1 (capped) + 0.016 + 0.016 = 0.132
      expect(uniforms.uTime.value).toBeCloseTo(0.132);
    });
  });

  describe('material lifecycle management', () => {
    it('should unregister materials when disposed', () => {
      const uniforms: ShaderUniforms = { uTime: { value: 0 } };
      system.registerShaderLoop('test', uniforms);

      system.unregisterShaderLoop('test');
      uniforms.uTime.value = 999; // Set arbitrary value

      system.update(0.05);

      // Should not be updated since unregistered
      expect(uniforms.uTime.value).toBe(999);
    });

    it('should clear all registrations on dispose', () => {
      const uniforms1: ShaderUniforms = { uTime: { value: 0 } };
      const uniforms2: ShaderUniforms = { uTime: { value: 0 } };

      system.registerShaderLoop('ghost', uniforms1);
      system.registerShaderLoop('biography', uniforms2);

      system.dispose();

      expect(system.hasShaderLoop('ghost')).toBe(false);
      expect(system.hasShaderLoop('biography')).toBe(false);
    });

    it('should allow re-registration after dispose', () => {
      const uniforms: ShaderUniforms = { uTime: { value: 0 } };

      system.registerShaderLoop('test', uniforms);
      system.dispose();

      // Re-register
      system.registerShaderLoop('test', uniforms);
      system.update(0.05);

      expect(uniforms.uTime.value).toBeCloseTo(0.05);
    });
  });
});

describe('AnimationSystem Debug Integration', () => {
  it('should provide debug info about registered materials', () => {
    const system = new AnimationSystem();

    const ghostUniforms: ShaderUniforms = { uTime: { value: 0 } };
    const biographyUniforms: ShaderUniforms = { uTime: { value: 0 } };

    system.registerShaderLoop('ghostNodes', ghostUniforms);
    system.registerShaderLoop('biographyNodes', biographyUniforms);

    const info = system.getDebugInfo();

    expect(info.shaderLoopCount).toBe(2);
    expect(info.shaderLoopNames).toContain('ghostNodes');
    expect(info.shaderLoopNames).toContain('biographyNodes');
  });
});
