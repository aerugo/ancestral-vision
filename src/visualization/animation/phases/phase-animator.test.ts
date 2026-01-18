import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PhaseAnimator } from './phase-animator';
import type { AnimationDefinition } from '../types';

const testDefinition: AnimationDefinition = {
  name: 'metamorphosis',
  duration: 2.0,
  phases: [
    { name: 'burst', start: 0.0, end: 0.15 },
    { name: 'expand', start: 0.15, end: 0.35 },
    { name: 'hover', start: 0.35, end: 0.50 },
    { name: 'spiral', start: 0.50, end: 0.70 },
    { name: 'converge', start: 0.70, end: 0.85 },
    { name: 'settle', start: 0.85, end: 0.95 },
    { name: 'fade', start: 0.95, end: 1.0 },
  ],
  tracks: [],
};

describe('PhaseAnimator', () => {
  let animator: PhaseAnimator;
  let onPhaseEnter: ReturnType<typeof vi.fn>;
  let onPhaseExit: ReturnType<typeof vi.fn>;
  let onPhaseProgress: ReturnType<typeof vi.fn>;
  let onComplete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onPhaseEnter = vi.fn();
    onPhaseExit = vi.fn();
    onPhaseProgress = vi.fn();
    onComplete = vi.fn();

    animator = new PhaseAnimator(testDefinition, {
      onPhaseEnter,
      onPhaseExit,
      onPhaseProgress,
      onComplete,
    });
  });

  describe('start', () => {
    it('should start the animation', () => {
      animator.start();
      expect(animator.isAnimating()).toBe(true);
    });

    it('should reset progress to 0', () => {
      animator.start();
      animator.update(1.0);
      animator.start();

      expect(animator.progress).toBe(0);
    });

    it('should emit phase enter for first phase', () => {
      animator.start();
      animator.update(0.01);

      expect(onPhaseEnter).toHaveBeenCalledWith('burst', expect.any(Number));
    });
  });

  describe('update', () => {
    it('should advance progress', () => {
      animator.start();
      animator.update(1.0); // Half of 2s duration

      expect(animator.progress).toBeCloseTo(0.5);
    });

    it('should emit phase progress', () => {
      animator.start();
      animator.update(0.1);

      expect(onPhaseProgress).toHaveBeenCalled();
    });

    it('should emit phase exit when leaving phase', () => {
      animator.start();
      animator.update(0.5); // Past burst phase (ends at 0.15)

      expect(onPhaseExit).toHaveBeenCalledWith('burst', expect.any(Number));
    });

    it('should emit phase enter for subsequent phases', () => {
      animator.start();
      animator.update(0.5); // Into expand phase

      expect(onPhaseEnter).toHaveBeenCalledWith('expand', expect.any(Number));
    });

    it('should complete when progress reaches 1', () => {
      animator.start();
      animator.update(3.0); // Past full duration

      expect(animator.isAnimating()).toBe(false);
      expect(animator.isComplete()).toBe(true);
    });

    it('should call onComplete callback', () => {
      animator.start();
      animator.update(3.0);

      expect(onComplete).toHaveBeenCalled();
    });

    it('should do nothing if not started', () => {
      animator.update(1.0);
      expect(animator.progress).toBe(0);
    });
  });

  describe('getCurrentPhase', () => {
    it('should return null when not started', () => {
      expect(animator.getCurrentPhase()).toBeNull();
    });

    it('should return current phase name', () => {
      animator.start();
      animator.update(0.1); // Progress ~0.05, in burst

      expect(animator.getCurrentPhase()).toBe('burst');
    });

    it('should return correct phase as animation progresses', () => {
      animator.start();
      animator.update(1.0); // Progress 0.5, in spiral

      expect(animator.getCurrentPhase()).toBe('spiral');
    });
  });

  describe('getPhaseProgress', () => {
    it('should return progress within current phase', () => {
      animator.start();
      animator.update(0.15); // At 0.15/2 = 0.075 progress, mid-burst (0-0.15)

      const phaseProgress = animator.getPhaseProgress('burst');
      expect(phaseProgress).toBeCloseTo(0.5, 1);
    });

    it('should return null for inactive phase', () => {
      animator.start();
      animator.update(0.1);

      expect(animator.getPhaseProgress('fade')).toBeNull();
    });
  });

  describe('getActivePhases', () => {
    it('should return empty array when not started', () => {
      expect(animator.getActivePhases()).toEqual([]);
    });

    it('should return active phases', () => {
      animator.start();
      animator.update(0.1);

      const activePhases = animator.getActivePhases();
      expect(activePhases).toContain('burst');
    });
  });

  describe('cancel', () => {
    it('should stop the animation', () => {
      animator.start();
      animator.update(0.5);
      animator.cancel();

      expect(animator.isAnimating()).toBe(false);
    });

    it('should not reset progress', () => {
      animator.start();
      animator.update(0.5);
      animator.cancel();

      expect(animator.progress).toBeGreaterThan(0);
    });
  });

  describe('dispose', () => {
    it('should clean up resources', () => {
      animator.start();
      animator.update(0.5);
      animator.dispose();

      expect(animator.isAnimating()).toBe(false);
      expect(animator.isComplete()).toBe(false);
      expect(animator.progress).toBe(0);
    });

    it('should clear active phases', () => {
      animator.start();
      animator.update(0.1);
      animator.dispose();

      expect(animator.getActivePhases()).toEqual([]);
    });
  });

  describe('overlapping phases', () => {
    it('should handle overlapping phase definitions', () => {
      const overlappingDef: AnimationDefinition = {
        name: 'overlap-test',
        duration: 1.0,
        phases: [
          { name: 'long', start: 0, end: 1.0 },
          { name: 'short', start: 0.25, end: 0.75 },
        ],
        tracks: [],
      };

      const overlappingAnimator = new PhaseAnimator(overlappingDef, {
        onPhaseEnter,
        onPhaseProgress,
      });

      overlappingAnimator.start();
      overlappingAnimator.update(0.5);

      const activePhases = overlappingAnimator.getActivePhases();
      expect(activePhases).toContain('long');
      expect(activePhases).toContain('short');
    });
  });
});
