import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PropagationAnimator, type GraphPathFinder } from './propagation-animator';

// Mock graph
const createMockGraph = (): GraphPathFinder => ({
  findPath: vi.fn().mockReturnValue(['a', 'b', 'c']),
});

describe('PropagationAnimator', () => {
  let mockGraph: GraphPathFinder & { findPath: ReturnType<typeof vi.fn> };
  let animator: PropagationAnimator;

  beforeEach(() => {
    mockGraph = createMockGraph() as GraphPathFinder & { findPath: ReturnType<typeof vi.fn> };
    animator = new PropagationAnimator(mockGraph);
  });

  describe('startPulse', () => {
    it('should start a pulse animation', () => {
      animator.startPulse('a', 'c');
      expect(animator.isAnimating()).toBe(true);
    });

    it('should find path using graph', () => {
      animator.startPulse('a', 'c');
      expect(mockGraph.findPath).toHaveBeenCalledWith('a', 'c');
    });

    it('should not animate if no path found', () => {
      mockGraph.findPath.mockReturnValueOnce([]);
      animator.startPulse('a', 'z');
      expect(animator.isAnimating()).toBe(false);
    });

    it('should not animate if path is null', () => {
      mockGraph.findPath.mockReturnValueOnce(null);
      animator.startPulse('a', 'z');
      expect(animator.isAnimating()).toBe(false);
    });

    it('should reset previous animation on new pulse', () => {
      animator.startPulse('a', 'c');
      animator.update(0.1);

      animator.startPulse('a', 'c');
      expect(animator.isBreathing()).toBe(false);
    });
  });

  describe('update', () => {
    it('should advance the pulse', () => {
      animator.startPulse('a', 'c');

      animator.update(0.5);

      expect(animator.isAnimating()).toBe(true);
    });

    it('should complete after reaching end', () => {
      animator.startPulse('a', 'c');

      // Update past the expected duration (2 edges at 2 edges/sec = 1 sec)
      animator.update(10.0);

      expect(animator.isBreathing()).toBe(true);
    });

    it('should do nothing when not animating', () => {
      expect(() => animator.update(0.1)).not.toThrow();
      expect(animator.isAnimating()).toBe(false);
    });

    it('should handle single node path', () => {
      mockGraph.findPath.mockReturnValueOnce(['a']);
      animator.startPulse('a', 'a');
      animator.update(0.1);

      // Single node = 0 edges, should immediately complete
      expect(animator.isBreathing()).toBe(true);
    });
  });

  describe('getNodeIntensity', () => {
    it('should return 0 for unvisited nodes', () => {
      expect(animator.getNodeIntensity('unknown')).toBe(0);
    });

    it('should return intensity for nodes in path', () => {
      animator.startPulse('a', 'c');
      animator.update(0.1);

      // First node should have some intensity
      const intensity = animator.getNodeIntensity('a');
      expect(intensity).toBeGreaterThanOrEqual(0);
      expect(intensity).toBeLessThanOrEqual(1);
    });

    it('should return approaching node intensity', () => {
      animator.startPulse('a', 'c');
      animator.update(0.25); // Pulse is 25% through first edge

      // Second node (b) should have some intensity
      const intensity = animator.getNodeIntensity('b');
      expect(intensity).toBeGreaterThan(0);
      expect(intensity).toBeLessThan(1);
    });
  });

  describe('getEdgeIntensity', () => {
    it('should return 0 for edges not in path', () => {
      expect(animator.getEdgeIntensity('x', 'y')).toBe(0);
    });

    it('should return intensity for edges in path', () => {
      animator.startPulse('a', 'c');
      animator.update(0.25);

      // First edge should be active
      const intensity = animator.getEdgeIntensity('a', 'b');
      expect(intensity).toBe(1);
    });

    it('should fade past edges', () => {
      animator.startPulse('a', 'c');
      animator.update(0.6); // Past first edge at 0.5 sec

      // First edge should be fading
      const intensity = animator.getEdgeIntensity('a', 'b');
      expect(intensity).toBeLessThan(1);
    });
  });

  describe('getAllNodeIntensities', () => {
    it('should return empty map when not animating', () => {
      const intensities = animator.getAllNodeIntensities();
      expect(intensities.size).toBe(0);
    });

    it('should return all node intensities during animation', () => {
      animator.startPulse('a', 'c');
      animator.update(0.5);

      const intensities = animator.getAllNodeIntensities();
      expect(intensities.size).toBeGreaterThan(0);
    });

    it('should return a copy of intensities', () => {
      animator.startPulse('a', 'c');
      animator.update(0.1);

      const intensities = animator.getAllNodeIntensities();
      intensities.set('x', 999);

      expect(animator.getNodeIntensity('x')).toBe(0);
    });
  });

  describe('isBreathing', () => {
    it('should not be breathing initially', () => {
      expect(animator.isBreathing()).toBe(false);
    });

    it('should be breathing after pulse completes', () => {
      animator.startPulse('a', 'c');
      animator.update(10.0); // Complete the pulse

      expect(animator.isBreathing()).toBe(true);
    });

    it('should update breathing intensity', () => {
      animator.startPulse('a', 'c');
      animator.update(10.0); // Complete pulse

      const intensity1 = animator.getNodeIntensity('a');
      animator.update(0.25); // Quarter of breathing cycle
      const intensity2 = animator.getNodeIntensity('a');

      // Intensity should change with breathing
      expect(intensity1).not.toBe(intensity2);
    });
  });

  describe('dispose', () => {
    it('should stop animation and clean up', () => {
      animator.startPulse('a', 'c');
      animator.dispose();

      expect(animator.isAnimating()).toBe(false);
      expect(animator.isBreathing()).toBe(false);
    });

    it('should clear intensities', () => {
      animator.startPulse('a', 'c');
      animator.update(0.5);
      animator.dispose();

      expect(animator.getNodeIntensity('a')).toBe(0);
      expect(animator.getAllNodeIntensities().size).toBe(0);
    });
  });

  describe('config', () => {
    it('should accept custom pulse speed', () => {
      const fastAnimator = new PropagationAnimator(mockGraph, { pulseSpeed: 10.0 });
      fastAnimator.startPulse('a', 'c');
      fastAnimator.update(0.2); // 2 edges at 10 edges/sec = 0.2 sec

      expect(fastAnimator.isBreathing()).toBe(true);
    });

    it('should accept custom breathing speed', () => {
      const slowBreather = new PropagationAnimator(mockGraph, { breathingSpeed: 0.5 });
      slowBreather.startPulse('a', 'c');
      slowBreather.update(10.0); // Complete pulse

      const intensity1 = slowBreather.getNodeIntensity('a');
      slowBreather.update(0.5); // Half a breathing cycle at slow speed
      const intensity2 = slowBreather.getNodeIntensity('a');

      expect(intensity1).not.toBe(intensity2);
    });
  });
});
