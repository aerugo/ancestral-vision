import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Transition } from './transition';
import type { AnimationDefinition, AnimationEvent } from '../types';

const testDefinition: AnimationDefinition = {
  name: 'test-animation',
  duration: 1.0,
  phases: [
    { name: 'phase1', start: 0, end: 0.5 },
    { name: 'phase2', start: 0.5, end: 1.0 },
  ],
  tracks: [
    {
      name: 'scale',
      keyframes: [
        { time: 0, value: 0 },
        { time: 1, value: 1 },
      ],
    },
  ],
};

describe('Transition', () => {
  let transition: Transition;

  beforeEach(() => {
    transition = new Transition(testDefinition);
  });

  describe('play', () => {
    it('should start playing', () => {
      transition.play();
      expect(transition.isPlaying).toBe(true);
    });

    it('should emit animation:start event', () => {
      const events: AnimationEvent[] = [];
      transition.subscribe((e) => events.push(e));

      transition.play();

      expect(events[0]).toEqual({
        type: 'animation:start',
        animationName: 'test-animation',
      });
    });

    it('should return animation name', () => {
      expect(transition.animationName).toBe('test-animation');
    });

    it('should throw if no definition provided', () => {
      const emptyTransition = new Transition();
      expect(() => emptyTransition.play()).toThrow('No animation definition provided');
    });

    it('should cancel previous animation when restarting', () => {
      const events: AnimationEvent[] = [];
      transition.subscribe((e) => events.push(e));

      transition.play();
      transition.play();

      const cancelEvents = events.filter((e) => e.type === 'animation:cancel');
      expect(cancelEvents.length).toBe(1);
    });
  });

  describe('update', () => {
    it('should advance progress', () => {
      transition.play();
      transition.update(0.5);

      expect(transition.progress).toBeCloseTo(0.5);
    });

    it('should emit phase:enter when entering a phase', () => {
      const events: AnimationEvent[] = [];
      transition.subscribe((e) => events.push(e));

      transition.play();
      transition.update(0.1);

      const enterEvents = events.filter((e) => e.type === 'phase:enter');
      expect(enterEvents.length).toBe(1);
      expect(enterEvents[0]).toMatchObject({
        type: 'phase:enter',
        phase: 'phase1',
      });
    });

    it('should emit track:update with interpolated values', () => {
      const events: AnimationEvent[] = [];
      transition.subscribe((e) => events.push(e));

      transition.play();
      transition.update(0.5);

      const trackEvents = events.filter((e) => e.type === 'track:update');
      expect(trackEvents.length).toBeGreaterThan(0);
      expect(trackEvents[trackEvents.length - 1]).toMatchObject({
        type: 'track:update',
        track: 'scale',
        value: 0.5,
      });
    });

    it('should emit phase:progress during phase', () => {
      const events: AnimationEvent[] = [];
      transition.subscribe((e) => events.push(e));

      transition.play();
      transition.update(0.25);

      const progressEvents = events.filter((e) => e.type === 'phase:progress');
      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[0]).toMatchObject({
        type: 'phase:progress',
        phase: 'phase1',
      });
    });

    it('should emit animation:complete when finished', () => {
      const events: AnimationEvent[] = [];
      transition.subscribe((e) => events.push(e));

      transition.play();
      transition.update(2.0);

      const completeEvents = events.filter((e) => e.type === 'animation:complete');
      expect(completeEvents.length).toBe(1);
      expect(transition.isPlaying).toBe(false);
    });

    it('should not update if not playing', () => {
      transition.update(0.5);
      expect(transition.progress).toBe(0);
    });
  });

  describe('cancel', () => {
    it('should stop the animation', () => {
      transition.play();
      transition.cancel();

      expect(transition.isPlaying).toBe(false);
    });

    it('should emit animation:cancel event', () => {
      const events: AnimationEvent[] = [];
      transition.subscribe((e) => events.push(e));

      transition.play();
      transition.cancel();

      const cancelEvents = events.filter((e) => e.type === 'animation:cancel');
      expect(cancelEvents.length).toBe(1);
    });

    it('should not emit cancel if not playing', () => {
      const events: AnimationEvent[] = [];
      transition.subscribe((e) => events.push(e));

      transition.cancel();

      const cancelEvents = events.filter((e) => e.type === 'animation:cancel');
      expect(cancelEvents.length).toBe(0);
    });
  });

  describe('dispose', () => {
    it('should cancel animation and clear subscribers', () => {
      const handler = vi.fn();
      transition.subscribe(handler);
      transition.play();

      transition.dispose();
      transition.update(0.1);

      // Handler called for start and cancel, then cleared
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should reset internal state', () => {
      transition.play();
      transition.update(0.5);
      transition.dispose();

      expect(transition.isPlaying).toBe(false);
      expect(transition.progress).toBe(0);
      expect(transition.animationName).toBeNull();
    });
  });
});
