import { describe, it, expect, beforeEach } from 'vitest';
import { ReactiveBinding } from './reactive-binding';

describe('ReactiveBinding', () => {
  describe('immediate mode (no transition)', () => {
    let binding: ReactiveBinding<boolean>;

    beforeEach(() => {
      binding = new ReactiveBinding({
        initialState: false,
        transform: (state) => (state ? 1.0 : 0.0),
      });
    });

    it('should return initial value', () => {
      expect(binding.getValue()).toBe(0.0);
    });

    it('should update value immediately when state changes', () => {
      binding.setState(true);
      expect(binding.getValue()).toBe(1.0);
    });

    it('should handle multiple state changes', () => {
      binding.setState(true);
      expect(binding.getValue()).toBe(1.0);

      binding.setState(false);
      expect(binding.getValue()).toBe(0.0);
    });

    it('should return current state', () => {
      expect(binding.getState()).toBe(false);

      binding.setState(true);
      expect(binding.getState()).toBe(true);
    });
  });

  describe('transition mode', () => {
    let binding: ReactiveBinding<boolean>;

    beforeEach(() => {
      binding = new ReactiveBinding({
        initialState: false,
        transform: (state) => (state ? 1.0 : 0.0),
        transitionDuration: 500, // 500ms
      });
    });

    it('should start at initial value', () => {
      expect(binding.getValue()).toBe(0.0);
    });

    it('should not change immediately when transitioning', () => {
      binding.setState(true);
      // Without update, value should still be 0
      expect(binding.getValue()).toBe(0.0);
    });

    it('should transition smoothly over time', () => {
      binding.setState(true);

      // Update with 250ms (half of transition)
      binding.update(0.25);
      expect(binding.getValue()).toBeCloseTo(0.5, 1);

      // Update with another 250ms (complete transition)
      binding.update(0.25);
      expect(binding.getValue()).toBeCloseTo(1.0, 1);
    });

    it('should handle reverse transitions', () => {
      binding.setState(true);
      binding.update(0.5); // Complete forward
      expect(binding.getValue()).toBeCloseTo(1.0);

      binding.setState(false);
      binding.update(0.25); // Half of reverse
      expect(binding.getValue()).toBeCloseTo(0.5, 1);

      binding.update(0.25); // Complete reverse
      expect(binding.getValue()).toBeCloseTo(0.0, 1);
    });

    it('should handle mid-transition state changes', () => {
      binding.setState(true);
      binding.update(0.25); // At 0.5

      binding.setState(false); // Reverse mid-way
      binding.update(0.25); // Should go down

      expect(binding.getValue()).toBeLessThan(0.5);
    });

    it('should not update after transition completes', () => {
      binding.setState(true);
      binding.update(0.5); // Complete

      const value = binding.getValue();
      binding.update(0.5); // Extra update should not change anything

      expect(binding.getValue()).toBe(value);
    });
  });

  describe('isTransitioning', () => {
    it('should return false when not transitioning', () => {
      const binding = new ReactiveBinding({
        initialState: false,
        transform: (state) => (state ? 1.0 : 0.0),
        transitionDuration: 500,
      });

      expect(binding.isTransitioning()).toBe(false);
    });

    it('should return true during transition', () => {
      const binding = new ReactiveBinding({
        initialState: false,
        transform: (state) => (state ? 1.0 : 0.0),
        transitionDuration: 500,
      });

      binding.setState(true);
      binding.update(0.1);

      expect(binding.isTransitioning()).toBe(true);
    });

    it('should return false after transition completes', () => {
      const binding = new ReactiveBinding({
        initialState: false,
        transform: (state) => (state ? 1.0 : 0.0),
        transitionDuration: 500,
      });

      binding.setState(true);
      binding.update(0.5); // Complete

      expect(binding.isTransitioning()).toBe(false);
    });
  });

  describe('setTransitionDuration', () => {
    it('should update transition duration', () => {
      const binding = new ReactiveBinding({
        initialState: false,
        transform: (state) => (state ? 1.0 : 0.0),
        transitionDuration: 500,
      });

      binding.setTransitionDuration(1000);
      binding.setState(true);
      binding.update(0.5); // Half of new duration

      expect(binding.getValue()).toBeCloseTo(0.5, 1);
    });
  });

  describe('dispose', () => {
    it('should reset to initial state value', () => {
      const binding = new ReactiveBinding({
        initialState: false,
        transform: (state) => (state ? 1.0 : 0.0),
        transitionDuration: 500,
      });

      binding.setState(true);
      binding.update(0.5);
      binding.dispose();

      expect(binding.getValue()).toBe(0.0);
    });

    it('should stop transitioning', () => {
      const binding = new ReactiveBinding({
        initialState: false,
        transform: (state) => (state ? 1.0 : 0.0),
        transitionDuration: 500,
      });

      binding.setState(true);
      binding.update(0.1);
      binding.dispose();

      expect(binding.isTransitioning()).toBe(false);
    });
  });

  describe('numeric state', () => {
    it('should handle numeric state with transform', () => {
      const binding = new ReactiveBinding({
        initialState: 0,
        transform: (state: number) => state * 2,
      });

      expect(binding.getValue()).toBe(0);

      binding.setState(5);
      expect(binding.getValue()).toBe(10);
    });
  });
});
