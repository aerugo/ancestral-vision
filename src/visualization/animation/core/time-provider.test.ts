import { describe, it, expect, beforeEach } from 'vitest';
import { TimeProvider } from './time-provider';

describe('TimeProvider', () => {
  let timeProvider: TimeProvider;

  beforeEach(() => {
    timeProvider = new TimeProvider();
  });

  describe('basic time tracking', () => {
    it('should initialize with elapsed time 0', () => {
      expect(timeProvider.getElapsedTime()).toBe(0);
    });

    it('should accumulate elapsed time on update', () => {
      timeProvider.update(0.016); // ~60fps
      expect(timeProvider.getElapsedTime()).toBeCloseTo(0.016);

      timeProvider.update(0.016);
      expect(timeProvider.getElapsedTime()).toBeCloseTo(0.032);
    });

    it('should return correct delta time', () => {
      timeProvider.update(0.016);
      expect(timeProvider.getDeltaTime()).toBeCloseTo(0.016);
    });
  });

  describe('time scale', () => {
    it('should default to time scale 1.0', () => {
      expect(timeProvider.getTimeScale()).toBe(1.0);
    });

    it('should apply time scale to elapsed time', () => {
      timeProvider.setTimeScale(2.0); // Double speed
      timeProvider.update(0.016);
      expect(timeProvider.getElapsedTime()).toBeCloseTo(0.032);
    });

    it('should apply time scale to delta time', () => {
      timeProvider.setTimeScale(0.5); // Half speed
      timeProvider.update(0.016);
      expect(timeProvider.getDeltaTime()).toBeCloseTo(0.008);
    });

    it('should clamp time scale to non-negative', () => {
      timeProvider.setTimeScale(-1.0);
      expect(timeProvider.getTimeScale()).toBe(0);
    });
  });

  describe('pause/resume', () => {
    it('should not be paused by default', () => {
      expect(timeProvider.isPaused()).toBe(false);
    });

    it('should stop accumulating time when paused', () => {
      timeProvider.update(0.016);
      const elapsed = timeProvider.getElapsedTime();

      timeProvider.pause();
      timeProvider.update(0.016);

      expect(timeProvider.getElapsedTime()).toBe(elapsed);
    });

    it('should return 0 delta time when paused', () => {
      timeProvider.pause();
      timeProvider.update(0.016);
      expect(timeProvider.getDeltaTime()).toBe(0);
    });

    it('should resume time accumulation', () => {
      timeProvider.pause();
      timeProvider.update(0.016);
      timeProvider.resume();
      timeProvider.update(0.016);

      expect(timeProvider.getElapsedTime()).toBeCloseTo(0.016);
    });
  });

  describe('delta capping', () => {
    it('should cap large delta times to prevent catch-up', () => {
      timeProvider.setMaxDeltaTime(0.1); // 100ms max
      timeProvider.update(5.0); // 5 second delta (after sleep/tab switch)

      expect(timeProvider.getDeltaTime()).toBe(0.1);
      expect(timeProvider.getElapsedTime()).toBeCloseTo(0.1);
    });

    it('should not cap normal delta times', () => {
      timeProvider.setMaxDeltaTime(0.1);
      timeProvider.update(0.016);

      expect(timeProvider.getDeltaTime()).toBeCloseTo(0.016);
    });
  });

  describe('reset', () => {
    it('should reset elapsed time to 0', () => {
      timeProvider.update(1.0);
      timeProvider.reset();

      expect(timeProvider.getElapsedTime()).toBe(0);
    });

    it('should preserve settings after reset', () => {
      timeProvider.setTimeScale(2.0);
      timeProvider.setMaxDeltaTime(0.1);
      timeProvider.reset();

      expect(timeProvider.getTimeScale()).toBe(2.0);
    });
  });
});
