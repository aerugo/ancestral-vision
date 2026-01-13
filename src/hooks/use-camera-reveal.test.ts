/**
 * Camera Reveal Hook Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useCameraReveal,
  triggerCameraReveal,
  DEFAULT_REVEAL_PARAMS,
} from './use-camera-reveal';

describe('Camera Reveal Hook', () => {
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    // Mock localStorage
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
      (key: string) => mockStorage[key] || null
    );
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
      (key: string, value: string) => {
        mockStorage[key] = value;
      }
    );
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(
      (key: string) => {
        delete mockStorage[key];
      }
    );

    // Clear storage before each test
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('triggerCameraReveal', () => {
    it('should set reveal flag in localStorage', () => {
      triggerCameraReveal();

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'ancestral-vision:pending-reveal',
        'true'
      );
    });
  });

  describe('useCameraReveal', () => {
    it('should return shouldReveal as false when no flag is set', () => {
      const { result } = renderHook(() => useCameraReveal());

      expect(result.current.shouldReveal).toBe(false);
    });

    it('should return shouldReveal as true when flag is set', () => {
      mockStorage['ancestral-vision:pending-reveal'] = 'true';

      const { result } = renderHook(() => useCameraReveal());

      expect(result.current.shouldReveal).toBe(true);
    });

    it('should clear reveal flag when clearReveal is called', () => {
      mockStorage['ancestral-vision:pending-reveal'] = 'true';

      const { result } = renderHook(() => useCameraReveal());

      act(() => {
        result.current.clearReveal();
      });

      expect(localStorage.removeItem).toHaveBeenCalledWith(
        'ancestral-vision:pending-reveal'
      );
      expect(result.current.shouldReveal).toBe(false);
    });
  });

  describe('DEFAULT_REVEAL_PARAMS', () => {
    it('should have valid start position', () => {
      expect(DEFAULT_REVEAL_PARAMS.startPosition).toHaveProperty('x');
      expect(DEFAULT_REVEAL_PARAMS.startPosition).toHaveProperty('y');
      expect(DEFAULT_REVEAL_PARAMS.startPosition).toHaveProperty('z');
    });

    it('should have valid end position', () => {
      expect(DEFAULT_REVEAL_PARAMS.endPosition).toHaveProperty('x');
      expect(DEFAULT_REVEAL_PARAMS.endPosition).toHaveProperty('y');
      expect(DEFAULT_REVEAL_PARAMS.endPosition).toHaveProperty('z');
    });

    it('should have start position closer to origin than end position', () => {
      const startDistance = Math.sqrt(
        DEFAULT_REVEAL_PARAMS.startPosition.x ** 2 +
        DEFAULT_REVEAL_PARAMS.startPosition.y ** 2 +
        DEFAULT_REVEAL_PARAMS.startPosition.z ** 2
      );
      const endDistance = Math.sqrt(
        DEFAULT_REVEAL_PARAMS.endPosition.x ** 2 +
        DEFAULT_REVEAL_PARAMS.endPosition.y ** 2 +
        DEFAULT_REVEAL_PARAMS.endPosition.z ** 2
      );

      expect(startDistance).toBeLessThan(endDistance);
    });

    it('should have a duration greater than 0', () => {
      expect(DEFAULT_REVEAL_PARAMS.duration).toBeGreaterThan(0);
    });
  });
});
