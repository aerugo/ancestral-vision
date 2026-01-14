/**
 * Performance Benchmarking System
 * Tracks FPS, frame times, and performance metrics for visualization
 */

/**
 * Performance configuration
 */
export interface PerformanceConfig {
  /** Number of frames to average for metrics (default: 60) */
  sampleSize?: number;
  /** Target FPS for performance scoring (default: 60) */
  targetFps?: number;
}

/**
 * Resolved configuration with defaults
 */
interface ResolvedConfig {
  sampleSize: number;
  targetFps: number;
}

/**
 * Performance metrics snapshot
 */
export interface PerformanceMetrics {
  /** Current frames per second */
  fps: number;
  /** Average frame time in milliseconds */
  avgFrameTime: number;
  /** Last frame time in milliseconds */
  lastFrameTime: number;
  /** Minimum frame time in sample window */
  minFrameTime: number;
  /** Maximum frame time in sample window */
  maxFrameTime: number;
  /** Total frames rendered */
  totalFrames: number;
  /** Current node count */
  nodeCount: number;
  /** Current edge count */
  edgeCount: number;
  /** Whether current FPS is below target */
  belowTargetFps: boolean;
  /** Performance score 0-100 (100 = at or above target FPS) */
  performanceScore: number;
}

/**
 * Performance monitor interface
 */
export interface PerformanceMonitor {
  /** Mark start of frame */
  startFrame(): void;
  /** Mark end of frame */
  endFrame(): void;
  /** Get current performance metrics */
  getMetrics(): PerformanceMetrics;
  /** Get configuration */
  getConfig(): ResolvedConfig;
  /** Reset all metrics */
  reset(): void;
  /** Set current node count */
  setNodeCount(count: number): void;
  /** Set current edge count */
  setEdgeCount(count: number): void;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: ResolvedConfig = {
  sampleSize: 60,
  targetFps: 60,
};

/**
 * Creates a performance monitor
 * @param config - Optional configuration
 * @returns Performance monitor instance
 */
export function createPerformanceMonitor(config: PerformanceConfig = {}): PerformanceMonitor {
  const resolvedConfig: ResolvedConfig = {
    sampleSize: config.sampleSize ?? DEFAULT_CONFIG.sampleSize,
    targetFps: config.targetFps ?? DEFAULT_CONFIG.targetFps,
  };

  // Internal state
  let frameStartTime = 0;
  let totalFrames = 0;
  let nodeCount = 0;
  let edgeCount = 0;
  let disposed = false;

  // Frame time samples (ring buffer)
  const frameTimes: number[] = [];
  let frameTimeIndex = 0;

  // Min/max tracking
  let minFrameTime = Infinity;
  let maxFrameTime = 0;

  /**
   * Calculate average frame time from samples
   */
  function calculateAvgFrameTime(): number {
    if (frameTimes.length === 0) return 0;
    const sum = frameTimes.reduce((a, b) => a + b, 0);
    return sum / frameTimes.length;
  }

  /**
   * Calculate FPS from average frame time
   */
  function calculateFps(): number {
    const avgFrameTime = calculateAvgFrameTime();
    if (avgFrameTime === 0) return 0;
    return 1000 / avgFrameTime;
  }

  /**
   * Calculate performance score (0-100)
   */
  function calculatePerformanceScore(): number {
    const fps = calculateFps();
    if (fps === 0) return 0;
    const score = (fps / resolvedConfig.targetFps) * 100;
    return Math.min(100, score);
  }

  const monitor: PerformanceMonitor = {
    startFrame(): void {
      if (disposed) return;
      frameStartTime = performance.now();
    },

    endFrame(): void {
      if (disposed) return;
      const frameEndTime = performance.now();
      const frameTime = frameEndTime - frameStartTime;

      // Update min/max
      if (frameTime < minFrameTime) minFrameTime = frameTime;
      if (frameTime > maxFrameTime) maxFrameTime = frameTime;

      // Store frame time in ring buffer
      if (frameTimes.length < resolvedConfig.sampleSize) {
        frameTimes.push(frameTime);
      } else {
        frameTimes[frameTimeIndex] = frameTime;
        frameTimeIndex = (frameTimeIndex + 1) % resolvedConfig.sampleSize;
      }

      totalFrames++;
    },

    getMetrics(): PerformanceMetrics {
      const avgFrameTime = calculateAvgFrameTime();
      const fps = calculateFps();
      const lastFrameTime = frameTimes.length > 0
        ? frameTimes[(frameTimeIndex - 1 + frameTimes.length) % frameTimes.length] || frameTimes[frameTimes.length - 1]
        : 0;

      return {
        fps,
        avgFrameTime,
        lastFrameTime,
        minFrameTime: minFrameTime === Infinity ? 0 : minFrameTime,
        maxFrameTime,
        totalFrames,
        nodeCount,
        edgeCount,
        belowTargetFps: fps > 0 && fps < resolvedConfig.targetFps,
        performanceScore: calculatePerformanceScore(),
      };
    },

    getConfig(): ResolvedConfig {
      return { ...resolvedConfig };
    },

    reset(): void {
      frameTimes.length = 0;
      frameTimeIndex = 0;
      totalFrames = 0;
      nodeCount = 0;
      edgeCount = 0;
      minFrameTime = Infinity;
      maxFrameTime = 0;
    },

    setNodeCount(count: number): void {
      nodeCount = count;
    },

    setEdgeCount(count: number): void {
      edgeCount = count;
    },
  };

  return monitor;
}

/**
 * Disposes a performance monitor
 * @param monitor - Monitor to dispose
 */
export function disposePerformanceMonitor(monitor: PerformanceMonitor): void {
  monitor.reset();
}
