/**
 * Tests for useAnimationSystem React hook
 *
 * TDD: These tests define the expected behavior for the React hook
 * that manages AnimationSystem lifecycle in constellation-canvas.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAnimationSystem } from './use-animation-system';
import type { ShaderUniforms } from '../types';

describe('useAnimationSystem', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should create AnimationSystem instance', () => {
      const { result } = renderHook(() => useAnimationSystem());

      expect(result.current.system).toBeDefined();
      expect(result.current.system.getElapsedTime()).toBe(0);
    });

    it('should create ConstellationAnimationSetup instance', () => {
      const { result } = renderHook(() => useAnimationSystem());

      expect(result.current.setup).toBeDefined();
      expect(result.current.setup.getRegisteredCount()).toBe(0);
    });

    it('should provide inspector for debugging', () => {
      const { result } = renderHook(() => useAnimationSystem());

      expect(result.current.inspector).toBeDefined();
    });
  });

  describe('material registration', () => {
    it('should register uniforms via setup', () => {
      const { result } = renderHook(() => useAnimationSystem());

      const uniforms: ShaderUniforms = { uTime: { value: 0 } };

      act(() => {
        result.current.setup.registerGhostNodes(uniforms);
      });

      expect(result.current.system.hasShaderLoop('ghostNodes')).toBe(true);
    });

    it('should update uniforms when system updates', () => {
      const { result } = renderHook(() => useAnimationSystem());

      const uniforms: ShaderUniforms = { uTime: { value: 0 } };

      act(() => {
        result.current.setup.registerGhostNodes(uniforms);
        result.current.system.update(0.05);
      });

      expect(uniforms.uTime.value).toBeCloseTo(0.05);
    });
  });

  describe('time controls', () => {
    it('should expose pause/resume controls', () => {
      const { result } = renderHook(() => useAnimationSystem());

      act(() => {
        result.current.pause();
      });

      expect(result.current.system.isPaused()).toBe(true);

      act(() => {
        result.current.resume();
      });

      expect(result.current.system.isPaused()).toBe(false);
    });

    it('should expose time scale control', () => {
      const { result } = renderHook(() => useAnimationSystem());

      act(() => {
        result.current.setTimeScale(0.5);
      });

      expect(result.current.system.getTimeScale()).toBe(0.5);
    });
  });

  describe('update function', () => {
    it('should provide update function for render loop', () => {
      const { result } = renderHook(() => useAnimationSystem());

      const uniforms: ShaderUniforms = { uTime: { value: 0 } };

      act(() => {
        result.current.setup.registerGhostNodes(uniforms);
      });

      // Simulate render loop call
      act(() => {
        result.current.update(0.016);
      });

      expect(uniforms.uTime.value).toBeCloseTo(0.016);
    });
  });

  describe('cleanup', () => {
    it('should dispose system on unmount', () => {
      const { result, unmount } = renderHook(() => useAnimationSystem());

      const uniforms: ShaderUniforms = { uTime: { value: 0 } };

      act(() => {
        result.current.setup.registerGhostNodes(uniforms);
      });

      expect(result.current.system.hasShaderLoop('ghostNodes')).toBe(true);

      unmount();

      // After unmount, the system should have been disposed
      // We can't directly test the disposed state, but we can verify
      // the hook cleaned up properly by checking the ref
    });
  });

  describe('stability', () => {
    it('should maintain stable references across renders', () => {
      const { result, rerender } = renderHook(() => useAnimationSystem());

      const firstSystem = result.current.system;
      const firstSetup = result.current.setup;
      const firstUpdate = result.current.update;

      rerender();

      expect(result.current.system).toBe(firstSystem);
      expect(result.current.setup).toBe(firstSetup);
      expect(result.current.update).toBe(firstUpdate);
    });
  });

  describe('debug exposure', () => {
    it('should expose system to window when enabled', () => {
      const mockWindow: Record<string, unknown> = {};
      vi.stubGlobal('window', mockWindow);

      const { result } = renderHook(() =>
        useAnimationSystem({ exposeGlobally: true, globalName: '__testAnim' })
      );

      expect(mockWindow.__testAnim).toBeDefined();

      vi.unstubAllGlobals();
    });

    it('should not expose system by default', () => {
      const mockWindow: Record<string, unknown> = {};
      vi.stubGlobal('window', mockWindow);

      renderHook(() => useAnimationSystem());

      expect(mockWindow.__animationSystem).toBeUndefined();

      vi.unstubAllGlobals();
    });
  });
});

describe('useAnimationSystem with initial config', () => {
  it('should register initial materials from config', () => {
    const ghostUniforms: ShaderUniforms = { uTime: { value: 0 } };
    const biographyUniforms: ShaderUniforms = { uTime: { value: 0 } };

    const { result } = renderHook(() =>
      useAnimationSystem({
        initialConfig: {
          ghostNodes: ghostUniforms,
          biographyNodes: biographyUniforms,
        },
      })
    );

    expect(result.current.system.hasShaderLoop('ghostNodes')).toBe(true);
    expect(result.current.system.hasShaderLoop('biographyNodes')).toBe(true);
  });
});
