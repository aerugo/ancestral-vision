import { describe, it, expect, beforeEach } from 'vitest';
import { AnimationSystem } from './animation-system';
import type { ShaderUniforms } from '../types';

describe('AnimationSystem', () => {
  let system: AnimationSystem;

  beforeEach(() => {
    system = new AnimationSystem();
  });

  describe('TimeProvider integration', () => {
    it('should provide elapsed time', () => {
      system.update(0.05);
      expect(system.getElapsedTime()).toBeCloseTo(0.05);
    });

    it('should provide delta time', () => {
      system.update(0.016);
      expect(system.getDeltaTime()).toBeCloseTo(0.016);
    });

    it('should accumulate elapsed time', () => {
      system.update(0.05);
      system.update(0.05);
      expect(system.getElapsedTime()).toBeCloseTo(0.1);
    });
  });

  describe('pause/resume', () => {
    it('should pause all animations', () => {
      system.update(0.05);
      const elapsed = system.getElapsedTime();

      system.pause();
      system.update(0.05);

      expect(system.getElapsedTime()).toBe(elapsed);
      expect(system.isPaused()).toBe(true);
    });

    it('should resume all animations', () => {
      system.pause();
      system.resume();
      system.update(0.05);

      expect(system.getElapsedTime()).toBeCloseTo(0.05);
      expect(system.isPaused()).toBe(false);
    });

    it('should not be paused initially', () => {
      expect(system.isPaused()).toBe(false);
    });
  });

  describe('time scale', () => {
    it('should apply time scale to all animations', () => {
      system.setTimeScale(2.0);
      system.update(0.05);

      expect(system.getElapsedTime()).toBeCloseTo(0.1);
    });

    it('should get current time scale', () => {
      system.setTimeScale(0.5);
      expect(system.getTimeScale()).toBe(0.5);
    });

    it('should default to time scale 1.0', () => {
      expect(system.getTimeScale()).toBe(1.0);
    });
  });

  describe('ShaderLoop registration', () => {
    it('should register and update shader loops', () => {
      const uniforms: ShaderUniforms = { uTime: { value: 0 } };
      system.registerShaderLoop('test', uniforms);

      system.update(0.05);

      expect(uniforms.uTime.value).toBe(0.05);
    });

    it('should unregister shader loops', () => {
      const uniforms: ShaderUniforms = { uTime: { value: 0 } };
      system.registerShaderLoop('test', uniforms);

      system.unregisterShaderLoop('test');
      uniforms.uTime.value = 0;
      system.update(0.05);

      expect(uniforms.uTime.value).toBe(0);
    });

    it('should check if shader loop is registered', () => {
      const uniforms: ShaderUniforms = { uTime: { value: 0 } };

      expect(system.hasShaderLoop('test')).toBe(false);
      system.registerShaderLoop('test', uniforms);
      expect(system.hasShaderLoop('test')).toBe(true);
    });

    it('should update multiple shader loops', () => {
      const uniforms1: ShaderUniforms = { uTime: { value: 0 } };
      const uniforms2: ShaderUniforms = { uTime: { value: 0 } };

      system.registerShaderLoop('test1', uniforms1);
      system.registerShaderLoop('test2', uniforms2);

      system.update(0.05);

      expect(uniforms1.uTime.value).toBe(0.05);
      expect(uniforms2.uTime.value).toBe(0.05);
    });
  });

  describe('isAnyAnimating', () => {
    it('should return false when no animations', () => {
      expect(system.isAnyAnimating()).toBe(false);
    });
  });

  describe('getDebugInfo', () => {
    it('should return debug information', () => {
      const info = system.getDebugInfo();

      expect(info).toHaveProperty('elapsedTime');
      expect(info).toHaveProperty('isPaused');
      expect(info).toHaveProperty('timeScale');
      expect(info).toHaveProperty('shaderLoopCount');
      expect(info).toHaveProperty('shaderLoopNames');
      expect(info).toHaveProperty('deltaTime');
    });

    it('should reflect current state', () => {
      const uniforms: ShaderUniforms = { uTime: { value: 0 } };
      system.registerShaderLoop('test', uniforms);
      system.setTimeScale(0.5);
      system.update(0.1);

      const info = system.getDebugInfo();

      expect(info.elapsedTime).toBeCloseTo(0.05);
      expect(info.timeScale).toBe(0.5);
      expect(info.shaderLoopCount).toBe(1);
      expect(info.shaderLoopNames).toContain('test');
    });
  });

  describe('dispose', () => {
    it('should clean up all resources', () => {
      const uniforms: ShaderUniforms = { uTime: { value: 0 } };
      system.registerShaderLoop('test', uniforms);

      system.dispose();

      expect(system.getDebugInfo().shaderLoopCount).toBe(0);
    });

    it('should reset elapsed time', () => {
      system.update(0.05);
      system.dispose();

      expect(system.getElapsedTime()).toBe(0);
    });
  });

  describe('delta time capping', () => {
    it('should cap large delta times', () => {
      // System has default max delta of 0.1
      system.update(5.0); // Very large delta (tab sleep)

      expect(system.getDeltaTime()).toBe(0.1);
      expect(system.getElapsedTime()).toBeCloseTo(0.1);
    });
  });
});
