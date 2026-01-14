/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createPerformanceMonitor,
  disposePerformanceMonitor,
  type PerformanceMonitor,
  type PerformanceMetrics,
  type PerformanceConfig,
} from './benchmark';

describe('performance benchmark module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock performance.now() for consistent testing
    vi.spyOn(performance, 'now').mockReturnValue(0);
  });

  describe('createPerformanceMonitor', () => {
    it('should export createPerformanceMonitor function', () => {
      expect(createPerformanceMonitor).toBeDefined();
      expect(typeof createPerformanceMonitor).toBe('function');
    });

    it('should return performance monitor interface', () => {
      const monitor = createPerformanceMonitor();
      expect(monitor).toHaveProperty('startFrame');
      expect(monitor).toHaveProperty('endFrame');
      expect(monitor).toHaveProperty('getMetrics');
      expect(monitor).toHaveProperty('reset');
      expect(monitor).toHaveProperty('setNodeCount');
      expect(monitor).toHaveProperty('setEdgeCount');
      disposePerformanceMonitor(monitor);
    });

    it('should accept configuration', () => {
      const config: PerformanceConfig = {
        sampleSize: 120,
        targetFps: 60,
      };
      const monitor = createPerformanceMonitor(config);
      expect(monitor.getConfig().sampleSize).toBe(120);
      expect(monitor.getConfig().targetFps).toBe(60);
      disposePerformanceMonitor(monitor);
    });

    it('should use default sample size of 60', () => {
      const monitor = createPerformanceMonitor();
      expect(monitor.getConfig().sampleSize).toBe(60);
      disposePerformanceMonitor(monitor);
    });

    it('should use default target FPS of 60', () => {
      const monitor = createPerformanceMonitor();
      expect(monitor.getConfig().targetFps).toBe(60);
      disposePerformanceMonitor(monitor);
    });
  });

  describe('PerformanceMonitor.startFrame/endFrame', () => {
    it('should track frame time', () => {
      const monitor = createPerformanceMonitor();

      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(0)    // startFrame
        .mockReturnValueOnce(16); // endFrame (16ms = 60fps)

      monitor.startFrame();
      monitor.endFrame();

      const metrics = monitor.getMetrics();
      expect(metrics.lastFrameTime).toBe(16);
      disposePerformanceMonitor(monitor);
    });

    it('should calculate average frame time', () => {
      const monitor = createPerformanceMonitor({ sampleSize: 3 });

      // Simulate 3 frames: 16ms, 20ms, 14ms
      let time = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => time);

      monitor.startFrame();
      time = 16;
      monitor.endFrame();

      monitor.startFrame();
      time = 36;
      monitor.endFrame();

      monitor.startFrame();
      time = 50;
      monitor.endFrame();

      const metrics = monitor.getMetrics();
      expect(metrics.avgFrameTime).toBeCloseTo((16 + 20 + 14) / 3);
      disposePerformanceMonitor(monitor);
    });

    it('should calculate FPS from frame time', () => {
      const monitor = createPerformanceMonitor({ sampleSize: 1 });

      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(16.67); // ~60fps

      monitor.startFrame();
      monitor.endFrame();

      const metrics = monitor.getMetrics();
      expect(metrics.fps).toBeCloseTo(60, 0);
      disposePerformanceMonitor(monitor);
    });

    it('should track min and max frame time', () => {
      const monitor = createPerformanceMonitor({ sampleSize: 3 });

      let time = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => time);

      // Frame 1: 10ms
      monitor.startFrame();
      time = 10;
      monitor.endFrame();

      // Frame 2: 30ms
      monitor.startFrame();
      time = 40;
      monitor.endFrame();

      // Frame 3: 20ms
      monitor.startFrame();
      time = 60;
      monitor.endFrame();

      const metrics = monitor.getMetrics();
      expect(metrics.minFrameTime).toBe(10);
      expect(metrics.maxFrameTime).toBe(30);
      disposePerformanceMonitor(monitor);
    });

    it('should count total frames', () => {
      const monitor = createPerformanceMonitor();

      vi.spyOn(performance, 'now').mockReturnValue(0);

      for (let i = 0; i < 5; i++) {
        monitor.startFrame();
        monitor.endFrame();
      }

      const metrics = monitor.getMetrics();
      expect(metrics.totalFrames).toBe(5);
      disposePerformanceMonitor(monitor);
    });
  });

  describe('PerformanceMonitor.setNodeCount/setEdgeCount', () => {
    it('should track node count', () => {
      const monitor = createPerformanceMonitor();
      monitor.setNodeCount(500);

      const metrics = monitor.getMetrics();
      expect(metrics.nodeCount).toBe(500);
      disposePerformanceMonitor(monitor);
    });

    it('should track edge count', () => {
      const monitor = createPerformanceMonitor();
      monitor.setEdgeCount(1200);

      const metrics = monitor.getMetrics();
      expect(metrics.edgeCount).toBe(1200);
      disposePerformanceMonitor(monitor);
    });
  });

  describe('PerformanceMonitor.getMetrics', () => {
    it('should return complete metrics object', () => {
      const monitor = createPerformanceMonitor();

      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(16);

      monitor.startFrame();
      monitor.endFrame();
      monitor.setNodeCount(100);
      monitor.setEdgeCount(200);

      const metrics = monitor.getMetrics();

      expect(metrics).toHaveProperty('fps');
      expect(metrics).toHaveProperty('avgFrameTime');
      expect(metrics).toHaveProperty('lastFrameTime');
      expect(metrics).toHaveProperty('minFrameTime');
      expect(metrics).toHaveProperty('maxFrameTime');
      expect(metrics).toHaveProperty('totalFrames');
      expect(metrics).toHaveProperty('nodeCount');
      expect(metrics).toHaveProperty('edgeCount');
      expect(metrics).toHaveProperty('belowTargetFps');
      disposePerformanceMonitor(monitor);
    });

    it('should detect when below target FPS', () => {
      const monitor = createPerformanceMonitor({ targetFps: 60, sampleSize: 1 });

      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(20); // 50fps - below 60fps target

      monitor.startFrame();
      monitor.endFrame();

      const metrics = monitor.getMetrics();
      expect(metrics.belowTargetFps).toBe(true);
      disposePerformanceMonitor(monitor);
    });

    it('should detect when at or above target FPS', () => {
      const monitor = createPerformanceMonitor({ targetFps: 60, sampleSize: 1 });

      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(16); // ~62fps - above 60fps target

      monitor.startFrame();
      monitor.endFrame();

      const metrics = monitor.getMetrics();
      expect(metrics.belowTargetFps).toBe(false);
      disposePerformanceMonitor(monitor);
    });
  });

  describe('PerformanceMonitor.reset', () => {
    it('should reset all metrics', () => {
      const monitor = createPerformanceMonitor();

      vi.spyOn(performance, 'now').mockReturnValue(0);

      monitor.startFrame();
      monitor.endFrame();
      monitor.setNodeCount(100);
      monitor.setEdgeCount(200);

      monitor.reset();

      const metrics = monitor.getMetrics();
      expect(metrics.totalFrames).toBe(0);
      expect(metrics.avgFrameTime).toBe(0);
      expect(metrics.nodeCount).toBe(0);
      expect(metrics.edgeCount).toBe(0);
      disposePerformanceMonitor(monitor);
    });
  });

  describe('disposePerformanceMonitor', () => {
    it('should dispose monitor', () => {
      const monitor = createPerformanceMonitor();
      expect(() => disposePerformanceMonitor(monitor)).not.toThrow();
    });

    it('should be safe to call multiple times', () => {
      const monitor = createPerformanceMonitor();
      disposePerformanceMonitor(monitor);
      expect(() => disposePerformanceMonitor(monitor)).not.toThrow();
    });
  });

  describe('performance thresholds', () => {
    it('should calculate performance score (0-100)', () => {
      const monitor = createPerformanceMonitor({ targetFps: 60, sampleSize: 1 });

      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(16.67); // exactly 60fps

      monitor.startFrame();
      monitor.endFrame();

      const metrics = monitor.getMetrics();
      expect(metrics.performanceScore).toBeCloseTo(100, 0);
      disposePerformanceMonitor(monitor);
    });

    it('should cap performance score at 100', () => {
      const monitor = createPerformanceMonitor({ targetFps: 30, sampleSize: 1 });

      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(16.67); // 60fps but target is 30

      monitor.startFrame();
      monitor.endFrame();

      const metrics = monitor.getMetrics();
      expect(metrics.performanceScore).toBe(100);
      disposePerformanceMonitor(monitor);
    });

    it('should scale performance score based on FPS', () => {
      const monitor = createPerformanceMonitor({ targetFps: 60, sampleSize: 1 });

      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(33.33); // 30fps = 50% of 60fps target

      monitor.startFrame();
      monitor.endFrame();

      const metrics = monitor.getMetrics();
      expect(metrics.performanceScore).toBeCloseTo(50, 0);
      disposePerformanceMonitor(monitor);
    });
  });
});
