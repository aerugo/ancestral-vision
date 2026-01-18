import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnimationTimeline } from './timeline';
import type { AnimationDefinition } from '../types';

const testDefinition: AnimationDefinition = {
  name: 'test',
  duration: 2.0,
  phases: [
    { name: 'phase1', start: 0, end: 0.5 },
    { name: 'phase2', start: 0.5, end: 1.0 },
  ],
  tracks: [],
};

describe('AnimationTimeline', () => {
  let timeline: AnimationTimeline;

  beforeEach(() => {
    timeline = new AnimationTimeline(testDefinition);
  });

  describe('progress', () => {
    it('should initialize with progress 0', () => {
      expect(timeline.progress).toBe(0);
    });

    it('should advance progress on update', () => {
      timeline.update(0.5); // 0.5 / 2.0 = 0.25
      expect(timeline.progress).toBeCloseTo(0.25);
    });

    it('should clamp progress to 0-1', () => {
      timeline.update(5.0);
      expect(timeline.progress).toBe(1);
    });

    it('should report isComplete when progress >= 1', () => {
      expect(timeline.isComplete).toBe(false);
      timeline.update(2.0);
      expect(timeline.isComplete).toBe(true);
    });

    it('should reset progress on reset()', () => {
      timeline.update(1.0);
      timeline.reset();
      expect(timeline.progress).toBe(0);
      expect(timeline.isComplete).toBe(false);
    });

    it('should calculate correct progress from deltaTime and duration', () => {
      timeline.update(0.2); // 0.2 / 2.0 = 0.1
      expect(timeline.progress).toBeCloseTo(0.1);

      timeline.update(0.3); // +0.15, total 0.25
      expect(timeline.progress).toBeCloseTo(0.25);
    });
  });

  describe('properties', () => {
    it('should return duration from definition', () => {
      expect(timeline.duration).toBe(2.0);
    });

    it('should return name from definition', () => {
      expect(timeline.name).toBe('test');
    });
  });

  describe('getCurrentPhases', () => {
    it('should return phases that contain current progress', () => {
      timeline.update(0.5); // progress = 0.25, in phase1
      const phases = timeline.getCurrentPhases();
      expect(phases).toContain('phase1');
      expect(phases).not.toContain('phase2');
    });

    it('should return multiple phases when overlapping', () => {
      const overlappingDef: AnimationDefinition = {
        name: 'test',
        duration: 1.0,
        phases: [
          { name: 'long', start: 0, end: 1.0 },
          { name: 'short', start: 0.25, end: 0.75 },
        ],
        tracks: [],
      };
      const tl = new AnimationTimeline(overlappingDef);
      tl.update(0.5);
      const phases = tl.getCurrentPhases();
      expect(phases).toContain('long');
      expect(phases).toContain('short');
    });
  });

  describe('getPhaseProgress', () => {
    it('should return 0-1 progress within a phase', () => {
      timeline.update(0.5); // progress = 0.25, phase1 is 0-0.5
      expect(timeline.getPhaseProgress('phase1')).toBeCloseTo(0.5);
    });

    it('should return null for inactive phase', () => {
      timeline.update(0.5); // progress = 0.25, phase2 not started
      expect(timeline.getPhaseProgress('phase2')).toBeNull();
    });
  });

  describe('phase events', () => {
    it('should call onPhaseEnter when entering a phase', () => {
      const onEnter = vi.fn();
      timeline.onPhaseEnter = onEnter;

      timeline.update(0.1);
      expect(onEnter).toHaveBeenCalledWith('phase1', expect.any(Number));
    });

    it('should call onPhaseExit when leaving a phase', () => {
      const onExit = vi.fn();
      timeline.onPhaseExit = onExit;

      timeline.update(1.0); // Enter phase1
      timeline.update(0.1); // Exit phase1
      expect(onExit).toHaveBeenCalledWith('phase1', expect.any(Number));
    });

    it('should not call onPhaseEnter twice for same phase', () => {
      const onEnter = vi.fn();
      timeline.onPhaseEnter = onEnter;

      timeline.update(0.1);
      timeline.update(0.1);
      timeline.update(0.1);

      expect(onEnter).toHaveBeenCalledTimes(1);
    });

    it('should call onPhaseExit for active phases on reset', () => {
      const onExit = vi.fn();
      timeline.onPhaseExit = onExit;

      timeline.update(0.1); // Enter phase1
      timeline.reset();

      expect(onExit).toHaveBeenCalledWith('phase1', expect.any(Number));
    });
  });
});
