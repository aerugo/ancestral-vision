import { describe, it, expect, beforeEach } from 'vitest';
import { AnimationTrack } from './track';
import type { TrackDefinition } from '../types';

describe('AnimationTrack', () => {
  describe('scalar interpolation', () => {
    const scalarTrack: TrackDefinition = {
      name: 'scale',
      keyframes: [
        { time: 0, value: 0 },
        { time: 0.5, value: 1 },
        { time: 1, value: 0.5 },
      ],
    };

    let track: AnimationTrack;

    beforeEach(() => {
      track = new AnimationTrack(scalarTrack);
    });

    it('should return first keyframe value at t=0', () => {
      expect(track.getValue(0)).toBe(0);
    });

    it('should return last keyframe value at t=1', () => {
      expect(track.getValue(1)).toBe(0.5);
    });

    it('should interpolate between keyframes', () => {
      // At t=0.25: lerp from 0 to 1, local progress = 0.5
      expect(track.getValue(0.25)).toBeCloseTo(0.5);
    });

    it('should handle exact keyframe times', () => {
      expect(track.getValue(0.5)).toBe(1);
    });

    it('should return track name', () => {
      expect(track.name).toBe('scale');
    });
  });

  describe('array interpolation', () => {
    const vectorTrack: TrackDefinition = {
      name: 'position',
      keyframes: [
        { time: 0, value: [0, 0, 0] },
        { time: 1, value: [10, 20, 30] },
      ],
    };

    it('should interpolate array values component-wise', () => {
      const track = new AnimationTrack(vectorTrack);
      const value = track.getValue(0.5) as number[];
      expect(value[0]).toBeCloseTo(5);
      expect(value[1]).toBeCloseTo(10);
      expect(value[2]).toBeCloseTo(15);
    });
  });

  describe('easing', () => {
    const easedTrack: TrackDefinition = {
      name: 'scale',
      keyframes: [
        { time: 0, value: 0 },
        { time: 1, value: 1 },
      ],
      easing: 'easeInCubic',
    };

    it('should apply easing function', () => {
      const track = new AnimationTrack(easedTrack);
      // easeInCubic(0.5) = 0.125
      expect(track.getValue(0.5)).toBeCloseTo(0.125);
    });
  });

  describe('edge cases', () => {
    it('should clamp time below 0', () => {
      const track = new AnimationTrack({
        name: 'test',
        keyframes: [
          { time: 0, value: 10 },
          { time: 1, value: 20 },
        ],
      });
      expect(track.getValue(-0.5)).toBe(10);
    });

    it('should clamp time above 1', () => {
      const track = new AnimationTrack({
        name: 'test',
        keyframes: [
          { time: 0, value: 10 },
          { time: 1, value: 20 },
        ],
      });
      expect(track.getValue(1.5)).toBe(20);
    });

    it('should handle single keyframe', () => {
      const track = new AnimationTrack({
        name: 'test',
        keyframes: [{ time: 0.5, value: 42 }],
      });
      expect(track.getValue(0)).toBe(42);
      expect(track.getValue(1)).toBe(42);
    });

    it('should handle empty keyframes', () => {
      const track = new AnimationTrack({
        name: 'test',
        keyframes: [],
      });
      expect(track.getValue(0.5)).toBe(0);
    });

    it('should handle unsorted keyframes', () => {
      const track = new AnimationTrack({
        name: 'test',
        keyframes: [
          { time: 1, value: 100 },
          { time: 0, value: 0 },
          { time: 0.5, value: 50 },
        ],
      });
      expect(track.getValue(0.25)).toBeCloseTo(25);
    });
  });
});
