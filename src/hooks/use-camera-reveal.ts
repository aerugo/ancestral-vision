/**
 * Camera Reveal Hook
 *
 * Manages the "aha moment" camera reveal animation after onboarding.
 * Uses localStorage to track if the reveal should be triggered.
 */
import { useState, useEffect, useCallback } from 'react';

const REVEAL_FLAG_KEY = 'ancestral-vision:pending-reveal';

/**
 * Mark that a reveal animation should happen on next constellation load
 */
export function triggerCameraReveal(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(REVEAL_FLAG_KEY, 'true');
  }
}

/**
 * Hook to check if a camera reveal animation should be triggered
 *
 * @returns Object with shouldReveal flag and clearReveal function
 */
export function useCameraReveal(): {
  shouldReveal: boolean;
  clearReveal: () => void;
} {
  const [shouldReveal, setShouldReveal] = useState(false);

  // Check for pending reveal on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pendingReveal = localStorage.getItem(REVEAL_FLAG_KEY);
      if (pendingReveal === 'true') {
        setShouldReveal(true);
      }
    }
  }, []);

  // Clear the reveal flag
  const clearReveal = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(REVEAL_FLAG_KEY);
    }
    setShouldReveal(false);
  }, []);

  return { shouldReveal, clearReveal };
}

/**
 * Camera reveal animation parameters
 */
export interface CameraRevealParams {
  /** Starting position (close to origin) */
  startPosition: { x: number; y: number; z: number };
  /** Ending position (normal view) */
  endPosition: { x: number; y: number; z: number };
  /** Point to look at */
  lookAt: { x: number; y: number; z: number };
  /** Animation duration in seconds */
  duration: number;
}

/**
 * Default reveal animation parameters
 */
export const DEFAULT_REVEAL_PARAMS: CameraRevealParams = {
  startPosition: { x: 0, y: 5, z: 20 },
  endPosition: { x: 0, y: 30, z: 100 },
  lookAt: { x: 0, y: 0, z: 0 },
  duration: 2.5,
};
