/**
 * Camera Animator Tests
 *
 * Tests for smooth camera animation with easing functions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { CameraAnimator } from './camera-animation';

describe('CameraAnimator', () => {
  let camera: THREE.PerspectiveCamera;
  let animator: CameraAnimator;

  beforeEach(() => {
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.set(0, 0, 10);
    animator = new CameraAnimator(camera);
  });

  describe('animateTo', () => {
    it('should animate to target position', () => {
      const targetPosition = new THREE.Vector3(5, 5, 5);
      const lookAtTarget = new THREE.Vector3(0, 0, 0);

      animator.animateTo(targetPosition, lookAtTarget, { duration: 1 });

      // Simulate 60 frames at 60fps (1 second)
      for (let i = 0; i < 60; i++) {
        animator.update(1 / 60);
      }

      // Camera should be at target (within tolerance)
      expect(camera.position.distanceTo(targetPosition)).toBeLessThan(0.01);
    });

    it('should start animating immediately after call', () => {
      const startPosition = camera.position.clone();
      const targetPosition = new THREE.Vector3(10, 0, 0);

      animator.animateTo(targetPosition, targetPosition, { duration: 1 });
      animator.update(0.1); // Small update

      // Should have moved from starting position
      expect(camera.position.x).toBeGreaterThan(startPosition.x);
    });
  });

  describe('onComplete callback', () => {
    it('should call onComplete when animation finishes', () => {
      const onComplete = vi.fn();
      const targetPosition = new THREE.Vector3(5, 5, 5);

      animator.animateTo(targetPosition, targetPosition, {
        duration: 1,
        onComplete,
      });

      // Fast-forward past animation duration
      for (let i = 0; i < 120; i++) {
        animator.update(1 / 60);
      }

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should not call onComplete before animation completes', () => {
      const onComplete = vi.fn();
      const targetPosition = new THREE.Vector3(5, 5, 5);

      animator.animateTo(targetPosition, targetPosition, {
        duration: 1,
        onComplete,
      });

      // Only update halfway
      animator.update(0.5);

      expect(onComplete).not.toHaveBeenCalled();
    });

    it('should call onComplete only once', () => {
      const onComplete = vi.fn();
      const targetPosition = new THREE.Vector3(5, 5, 5);

      animator.animateTo(targetPosition, targetPosition, {
        duration: 0.5,
        onComplete,
      });

      // Update multiple times past completion
      animator.update(0.6);
      animator.update(0.5);
      animator.update(0.5);

      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('easing functions', () => {
    it('should support linear easing', () => {
      const targetPosition = new THREE.Vector3(10, 0, 0);
      animator.animateTo(targetPosition, targetPosition, {
        duration: 1,
        easing: 'linear',
      });

      // Update to exactly halfway
      animator.update(0.5);

      // With linear easing, should be exactly halfway
      expect(camera.position.x).toBeCloseTo(5, 1);
    });

    it('should support easeInOutCubic (non-linear)', () => {
      const targetPosition = new THREE.Vector3(10, 0, 0);
      animator.animateTo(targetPosition, targetPosition, {
        duration: 1,
        easing: 'easeInOutCubic',
      });

      // Update to halfway through time
      animator.update(0.5);

      // With cubic easing at t=0.5, should be at position = 0.5 (exactly halfway)
      // easeInOutCubic(0.5) = 0.5, so position should still be 5
      expect(camera.position.x).toBeCloseTo(5, 1);
    });

    it('should support easeOutCubic easing', () => {
      const targetPosition = new THREE.Vector3(10, 0, 0);
      animator.animateTo(targetPosition, targetPosition, {
        duration: 1,
        easing: 'easeOutCubic',
      });

      // Update to 25% through time
      animator.update(0.25);

      // easeOutCubic starts fast, so should be more than 25% of the way
      // easeOutCubic(0.25) = 1 - (0.75)^3 = 1 - 0.421875 = 0.578125
      expect(camera.position.x).toBeGreaterThan(2.5);
    });

    it('should default to easeInOutCubic when no easing specified', () => {
      const targetPosition = new THREE.Vector3(10, 0, 0);
      animator.animateTo(targetPosition, targetPosition, { duration: 1 });

      // Animate to 25% through time
      animator.update(0.25);

      // easeInOutCubic(0.25) = 4 * 0.25^3 = 4 * 0.015625 = 0.0625
      // So position should be at 10 * 0.0625 = 0.625
      expect(camera.position.x).toBeCloseTo(0.625, 1);
    });
  });

  describe('isAnimating', () => {
    it('should return false when no animation started', () => {
      expect(animator.isAnimating()).toBe(false);
    });

    it('should return true during animation', () => {
      const targetPosition = new THREE.Vector3(5, 5, 5);
      animator.animateTo(targetPosition, targetPosition, { duration: 1 });

      animator.update(0.5);

      expect(animator.isAnimating()).toBe(true);
    });

    it('should return false after animation completes', () => {
      const targetPosition = new THREE.Vector3(5, 5, 5);
      animator.animateTo(targetPosition, targetPosition, { duration: 0.5 });

      animator.update(1); // Past duration

      expect(animator.isAnimating()).toBe(false);
    });
  });

  describe('camera lookAt', () => {
    it('should update camera lookAt during animation', () => {
      const targetPosition = new THREE.Vector3(0, 0, 5);
      const lookAtTarget = new THREE.Vector3(0, 0, 0);

      animator.animateTo(targetPosition, lookAtTarget, { duration: 1 });
      animator.update(0.5);

      // Camera should be looking towards the lookAt target
      // This is tricky to test directly, but we can verify the camera direction
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);

      // Camera at Z=7.5 looking at origin should have negative Z direction
      expect(direction.z).toBeLessThan(0);
    });
  });

  describe('interrupting animations', () => {
    it('should start new animation from current position', () => {
      // Start first animation
      animator.animateTo(new THREE.Vector3(10, 0, 0), new THREE.Vector3(0, 0, 0), {
        duration: 1,
      });
      animator.update(0.5); // Move halfway

      const midwayX = camera.position.x;

      // Start second animation to a different target
      animator.animateTo(new THREE.Vector3(0, 10, 0), new THREE.Vector3(0, 0, 0), {
        duration: 1,
      });

      // The new animation should start from current position
      expect(animator.isAnimating()).toBe(true);

      // After completing second animation
      animator.update(2);

      expect(camera.position.y).toBeCloseTo(10, 1);
    });
  });

  describe('default duration', () => {
    it('should use 1 second default duration', () => {
      const onComplete = vi.fn();
      const targetPosition = new THREE.Vector3(5, 5, 5);

      animator.animateTo(targetPosition, targetPosition, { onComplete });

      // Update for less than 1 second
      animator.update(0.9);
      expect(onComplete).not.toHaveBeenCalled();

      // Update past 1 second total
      animator.update(0.2);
      expect(onComplete).toHaveBeenCalled();
    });
  });
});
