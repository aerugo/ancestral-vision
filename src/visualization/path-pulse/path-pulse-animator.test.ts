/**
 * Tests for PathPulseAnimator
 */
import { describe, it, expect, vi } from 'vitest';
import { PathPulseAnimator } from './path-pulse-animator';

describe('PathPulseAnimator', () => {
  describe('constructor', () => {
    it('should create with default config', () => {
      const animator = new PathPulseAnimator();
      expect(animator.isAnimating()).toBe(false);
    });

    it('should accept custom config', () => {
      const animator = new PathPulseAnimator({
        hopDuration: 0.5,
        minDuration: 1.0,
        maxDuration: 5.0,
        easing: 'linear',
        pulseWidth: 0.5,
      });
      expect(animator.isAnimating()).toBe(false);
    });
  });

  describe('start', () => {
    it('should start animation with valid path', () => {
      const animator = new PathPulseAnimator();
      animator.start(['A', 'B', 'C']);
      expect(animator.isAnimating()).toBe(true);
      expect(animator.getPath()).toEqual(['A', 'B', 'C']);
    });

    it('should not animate with single-node path', () => {
      const animator = new PathPulseAnimator();
      const onComplete = vi.fn();
      animator.start(['A'], onComplete);
      expect(animator.isAnimating()).toBe(false);
      expect(onComplete).toHaveBeenCalled();
    });

    it('should not animate with empty path', () => {
      const animator = new PathPulseAnimator();
      const onComplete = vi.fn();
      animator.start([], onComplete);
      expect(animator.isAnimating()).toBe(false);
      expect(onComplete).toHaveBeenCalled();
    });

    it('should cancel previous animation when starting new one', () => {
      const animator = new PathPulseAnimator();
      animator.start(['A', 'B', 'C']);
      animator.start(['X', 'Y', 'Z']);
      expect(animator.getPath()).toEqual(['X', 'Y', 'Z']);
    });
  });

  describe('update', () => {
    it('should progress animation over time', () => {
      // Disable breathing to test just travel phase
      const animator = new PathPulseAnimator({ hopDuration: 0.5, minDuration: 1.0, breathingDuration: 0 });
      animator.start(['A', 'B', 'C']);

      // After half the duration
      animator.update(0.5);
      expect(animator.isAnimating()).toBe(true);

      // After full duration (travel complete + no breathing = done)
      animator.update(0.5);
      expect(animator.isAnimating()).toBe(false);
    });

    it('should call onComplete when animation finishes', () => {
      const onComplete = vi.fn();
      // Disable breathing to test just travel phase
      const animator = new PathPulseAnimator({ hopDuration: 0.1, minDuration: 0.2, breathingDuration: 0 });
      animator.start(['A', 'B'], onComplete);

      animator.update(0.3);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should not call onComplete multiple times', () => {
      const onComplete = vi.fn();
      // Disable breathing to test just travel phase
      const animator = new PathPulseAnimator({ hopDuration: 0.1, minDuration: 0.2, breathingDuration: 0 });
      animator.start(['A', 'B'], onComplete);

      animator.update(0.3);
      animator.update(0.1);
      animator.update(0.1);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should respect maxDuration for long paths', () => {
      const animator = new PathPulseAnimator({
        hopDuration: 1.0, // Would be 9 seconds for 10 nodes
        maxDuration: 3.0,
        breathingDuration: 0, // Disable breathing to test just travel phase
      });
      // Path with 10 nodes = 9 hops
      animator.start(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']);

      // After maxDuration, should be complete (no breathing)
      animator.update(3.0);
      expect(animator.isAnimating()).toBe(false);
    });
  });

  describe('cancel', () => {
    it('should stop animation immediately', () => {
      const animator = new PathPulseAnimator();
      animator.start(['A', 'B', 'C']);
      expect(animator.isAnimating()).toBe(true);

      animator.cancel();
      expect(animator.isAnimating()).toBe(false);
    });

    it('should clear the path', () => {
      const animator = new PathPulseAnimator();
      animator.start(['A', 'B', 'C']);
      animator.cancel();
      expect(animator.getPath()).toEqual([]);
    });
  });

  describe('getNodePulseIntensity', () => {
    it('should return 0 when not animating', () => {
      const animator = new PathPulseAnimator();
      expect(animator.getNodePulseIntensity('A')).toBe(0);
    });

    it('should return 0 for node not in path', () => {
      const animator = new PathPulseAnimator();
      animator.start(['A', 'B', 'C']);
      expect(animator.getNodePulseIntensity('X')).toBe(0);
    });

    it('should return intensity for node in path', () => {
      const animator = new PathPulseAnimator({ easing: 'linear', pulseWidth: 0.5 });
      animator.start(['A', 'B', 'C']);

      // At start, first node should have high intensity
      expect(animator.getNodePulseIntensity('A')).toBeGreaterThan(0);
    });

    it('should have highest intensity at pulse front', () => {
      const animator = new PathPulseAnimator({
        easing: 'linear',
        pulseWidth: 0.3,
        minDuration: 1.0,
        hopDuration: 0.25,
      });
      animator.start(['A', 'B', 'C', 'D', 'E']);

      // Move to middle of path (50% through 4 hops = position 2 = C)
      animator.update(0.5);

      // Middle node (C) should have high intensity (it's at the front)
      const intensityC = animator.getNodePulseIntensity('C');
      expect(intensityC).toBeGreaterThan(0.9);

      // First node (A) should have faded
      const intensityA = animator.getNodePulseIntensity('A');
      expect(intensityA).toBeLessThan(intensityC);
    });
  });

  describe('getEdgePulseIntensity', () => {
    it('should return 0 when not animating', () => {
      const animator = new PathPulseAnimator();
      expect(animator.getEdgePulseIntensity('A', 'B')).toBe(0);
    });

    it('should return 0 for nodes not in path', () => {
      const animator = new PathPulseAnimator();
      animator.start(['A', 'B', 'C']);
      expect(animator.getEdgePulseIntensity('X', 'Y')).toBe(0);
    });

    it('should return 0 for non-adjacent nodes in path', () => {
      const animator = new PathPulseAnimator();
      animator.start(['A', 'B', 'C']);
      expect(animator.getEdgePulseIntensity('A', 'C')).toBe(0);
    });

    it('should return intensity for adjacent nodes in path', () => {
      const animator = new PathPulseAnimator({ easing: 'linear', pulseWidth: 0.5 });
      animator.start(['A', 'B', 'C']);

      // At start, first edge should have some intensity
      expect(animator.getEdgePulseIntensity('A', 'B')).toBeGreaterThan(0);
    });

    it('should work regardless of node order', () => {
      const animator = new PathPulseAnimator({ easing: 'linear', pulseWidth: 0.5 });
      animator.start(['A', 'B', 'C']);

      // Both orders should return the same intensity
      const intensity1 = animator.getEdgePulseIntensity('A', 'B');
      const intensity2 = animator.getEdgePulseIntensity('B', 'A');
      expect(intensity1).toBe(intensity2);
    });
  });

  describe('getAllNodeIntensities', () => {
    it('should return empty map when not animating', () => {
      const animator = new PathPulseAnimator();
      const intensities = animator.getAllNodeIntensities();
      expect(intensities.size).toBe(0);
    });

    it('should return intensities for nodes with non-zero values', () => {
      const animator = new PathPulseAnimator({ easing: 'linear', pulseWidth: 0.5 });
      animator.start(['A', 'B', 'C']);

      const intensities = animator.getAllNodeIntensities();
      expect(intensities.size).toBeGreaterThan(0);
    });
  });

  describe('getAllEdgeIntensities', () => {
    it('should return empty map when not animating', () => {
      const animator = new PathPulseAnimator();
      const intensities = animator.getAllEdgeIntensities();
      expect(intensities.size).toBe(0);
    });

    it('should return intensities for edges with non-zero values', () => {
      const animator = new PathPulseAnimator({ easing: 'linear', pulseWidth: 0.5 });
      animator.start(['A', 'B', 'C']);

      const intensities = animator.getAllEdgeIntensities();
      expect(intensities.size).toBeGreaterThan(0);
    });

    it('should use sorted key for edge lookup', () => {
      const animator = new PathPulseAnimator({ easing: 'linear', pulseWidth: 0.5 });
      animator.start(['B', 'A', 'C']); // B-A edge

      const intensities = animator.getAllEdgeIntensities();
      // Key should be A-B (sorted)
      expect(intensities.has('A-B')).toBe(true);
    });
  });

  describe('pulse propagation', () => {
    it('should light up nodes sequentially', () => {
      const animator = new PathPulseAnimator({
        easing: 'linear',
        pulseWidth: 0.3,
        minDuration: 1.0,
        hopDuration: 0.25,
      });
      animator.start(['A', 'B', 'C', 'D', 'E']);

      // At t=0, first node should be brightest
      let intensityA = animator.getNodePulseIntensity('A');
      let intensityE = animator.getNodePulseIntensity('E');
      expect(intensityA).toBeGreaterThan(intensityE);

      // At t=0.8 (near end but still animating), last node should have intensity
      animator.update(0.8);
      intensityA = animator.getNodePulseIntensity('A');
      intensityE = animator.getNodePulseIntensity('E');
      expect(animator.isAnimating()).toBe(true);
      // At 80% through, pulse is at position 3.2 (near D/E), so E should have some intensity
      expect(intensityE).toBeGreaterThan(0);
    });

    it('should have all zero intensities after animation completes', () => {
      const animator = new PathPulseAnimator({
        easing: 'linear',
        pulseWidth: 0.3,
        minDuration: 1.0,
        hopDuration: 0.25,
        breathingDuration: 0, // Disable breathing to test just travel phase
      });
      animator.start(['A', 'B', 'C']);
      animator.update(1.5); // Well past completion

      expect(animator.isAnimating()).toBe(false);
      expect(animator.getNodePulseIntensity('A')).toBe(0);
      expect(animator.getNodePulseIntensity('B')).toBe(0);
      expect(animator.getNodePulseIntensity('C')).toBe(0);
    });
  });

  describe('getPulsePosition', () => {
    it('should return null when not animating', () => {
      const animator = new PathPulseAnimator();
      expect(animator.getPulsePosition()).toBeNull();
    });

    it('should return position at start of path initially', () => {
      const animator = new PathPulseAnimator({ easing: 'linear' });
      animator.start(['A', 'B', 'C']);

      const position = animator.getPulsePosition();
      expect(position).not.toBeNull();
      expect(position!.edgeIndex).toBe(0);
      expect(position!.edgeProgress).toBeCloseTo(0);
      expect(position!.sourceId).toBe('A');
      expect(position!.targetId).toBe('B');
    });

    it('should track progress through edges', () => {
      const animator = new PathPulseAnimator({
        easing: 'linear',
        minDuration: 1.0,
      });
      animator.start(['A', 'B', 'C', 'D']);

      // At 50% progress, should be at edge index 1.5 -> edge 1, progress 0.5
      animator.update(0.5);
      const position = animator.getPulsePosition();
      expect(position).not.toBeNull();
      expect(position!.edgeIndex).toBe(1);
      expect(position!.edgeProgress).toBeCloseTo(0.5);
      expect(position!.sourceId).toBe('B');
      expect(position!.targetId).toBe('C');
    });

    it('should return null after animation completes', () => {
      const animator = new PathPulseAnimator({
        easing: 'linear',
        minDuration: 1.0,
      });
      animator.start(['A', 'B', 'C']);
      animator.update(1.5); // Past completion

      expect(animator.getPulsePosition()).toBeNull();
    });
  });

  describe('getEdgePulseDetails', () => {
    it('should return empty array when not animating', () => {
      const animator = new PathPulseAnimator();
      expect(animator.getEdgePulseDetails()).toEqual([]);
    });

    it('should return details for edges within pulse width', () => {
      const animator = new PathPulseAnimator({
        easing: 'linear',
        pulseWidth: 0.5,
        minDuration: 1.0,
      });
      animator.start(['A', 'B', 'C', 'D']);

      const details = animator.getEdgePulseDetails();
      expect(details.length).toBeGreaterThan(0);

      // At start, first edge should be included
      const firstEdge = details.find(d => d.sortedKey === 'A-B');
      expect(firstEdge).toBeDefined();
      expect(firstEdge!.edgeIndex).toBe(0);
      expect(firstEdge!.pulseProgressRelativeToEdge).toBeCloseTo(0);
    });

    it('should include sorted key for each edge', () => {
      const animator = new PathPulseAnimator({
        easing: 'linear',
        pulseWidth: 1.0, // Wide pulse to include multiple edges
        minDuration: 1.0,
      });
      animator.start(['B', 'A', 'C']); // Unsorted node order

      const details = animator.getEdgePulseDetails();
      // Edge B-A should have sorted key 'A-B'
      const firstEdge = details.find(d => d.edgeIndex === 0);
      expect(firstEdge).toBeDefined();
      expect(firstEdge!.sortedKey).toBe('A-B');
    });

    it('should track pulse movement through edges', () => {
      const animator = new PathPulseAnimator({
        easing: 'linear',
        pulseWidth: 0.3,
        minDuration: 1.0,
      });
      animator.start(['A', 'B', 'C', 'D', 'E']);

      // Move to middle of path
      animator.update(0.5);
      const details = animator.getEdgePulseDetails();

      // At 50% through 4 edges, pulse is at position 2.0 (edge index 2)
      const middleEdge = details.find(d => d.edgeIndex === 2);
      expect(middleEdge).toBeDefined();
      expect(middleEdge!.sortedKey).toBe('C-D');
    });
  });

  describe('breathing phase', () => {
    it('should enter breathing phase after travel completes', () => {
      const animator = new PathPulseAnimator({
        minDuration: 1.0,
        breathingDuration: 1.0,
      });
      animator.start(['A', 'B', 'C']);

      // Travel phase - still animating but not breathing
      animator.update(0.5);
      expect(animator.isAnimating()).toBe(true);
      expect(animator.isBreathing()).toBe(false);

      // Complete travel phase
      animator.update(0.6);
      expect(animator.isAnimating()).toBe(true);
      expect(animator.isBreathing()).toBe(true);
    });

    it('should return breathing intensity for target node during breathing', () => {
      const animator = new PathPulseAnimator({
        minDuration: 0.5,
        breathingDuration: 1.0,
      });
      animator.start(['A', 'B', 'C']);

      // Complete travel phase
      animator.update(0.6);

      // During breathing, only target node should have intensity
      expect(animator.getNodePulseIntensity('A')).toBe(0);
      expect(animator.getNodePulseIntensity('B')).toBe(0);
      expect(animator.getNodePulseIntensity('C')).toBeGreaterThan(0);
    });

    it('should call onComplete after breathing finishes', () => {
      const onComplete = vi.fn();
      const animator = new PathPulseAnimator({
        minDuration: 0.5,
        breathingDuration: 0.5,
      });
      animator.start(['A', 'B', 'C'], onComplete);

      // Complete travel
      animator.update(0.6);
      expect(onComplete).not.toHaveBeenCalled();

      // Complete breathing
      animator.update(0.6);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should return 0 for edge intensity during breathing', () => {
      const animator = new PathPulseAnimator({
        minDuration: 0.5,
        breathingDuration: 1.0,
      });
      animator.start(['A', 'B', 'C']);

      // Complete travel phase
      animator.update(0.6);
      expect(animator.isBreathing()).toBe(true);

      // No edge glow during breathing
      expect(animator.getEdgePulseIntensity('A', 'B')).toBe(0);
      expect(animator.getEdgePulseIntensity('B', 'C')).toBe(0);
    });

    it('should return null for pulse position during breathing', () => {
      const animator = new PathPulseAnimator({
        minDuration: 0.5,
        breathingDuration: 1.0,
      });
      animator.start(['A', 'B', 'C']);

      // Complete travel phase
      animator.update(0.6);
      expect(animator.isBreathing()).toBe(true);

      // No pulse position during breathing
      expect(animator.getPulsePosition()).toBeNull();
    });

    it('should provide getTargetNodeId', () => {
      const animator = new PathPulseAnimator();
      animator.start(['A', 'B', 'C']);
      expect(animator.getTargetNodeId()).toBe('C');
    });

    it('should have breathing intensity decay over time', () => {
      const animator = new PathPulseAnimator({
        minDuration: 0.5,
        breathingDuration: 1.0,
        breathingCycles: 2,
      });
      animator.start(['A', 'B', 'C']);

      // Complete travel
      animator.update(0.6);

      // Get initial breathing intensity
      const initialIntensity = animator.getBreathingIntensity();
      expect(initialIntensity).toBeGreaterThan(0);

      // After more time, intensity should decay
      animator.update(0.9);
      const laterIntensity = animator.getBreathingIntensity();
      expect(laterIntensity).toBeLessThan(initialIntensity);
    });
  });
});
