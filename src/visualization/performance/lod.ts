/**
 * Level of Detail (LOD) System
 * Dynamically adjusts visual detail based on distance and performance
 */
import * as THREE from 'three';

/**
 * LOD level definition
 */
export interface LODLevel {
  /** Distance threshold for this level */
  distance: number;
  /** Sphere geometry segments for nodes */
  nodeDetail: number;
  /** Multiplier for particle counts (0-1) */
  particleMultiplier: number;
}

/**
 * LOD configuration
 */
export interface LODConfig {
  /** LOD levels sorted by distance */
  levels?: LODLevel[];
  /** Enable adaptive LOD based on FPS */
  enableAdaptive?: boolean;
}

/**
 * Resolved configuration
 */
interface ResolvedConfig {
  levels: LODLevel[];
  enableAdaptive: boolean;
}

/**
 * LOD metrics
 */
export interface LODMetrics {
  /** Current LOD level index */
  currentLevel: number;
  /** Current distance to center */
  currentDistance: number;
  /** Current performance mode */
  performanceMode: PerformanceMode;
  /** Number of level changes */
  levelChanges: number;
}

/**
 * Performance mode presets
 */
export type PerformanceMode = 'quality' | 'balanced' | 'performance';

/**
 * LOD system interface
 */
export interface LODSystem {
  /** Update LOD based on camera position */
  update(camera: THREE.Camera, centerPoint: THREE.Vector3): LODLevel;
  /** Get LOD level for a specific distance */
  getLevelForDistance(distance: number): LODLevel;
  /** Get current configuration */
  getConfig(): ResolvedConfig;
  /** Get LOD metrics */
  getMetrics(): LODMetrics;
  /** Set performance mode preset */
  setPerformanceMode(mode: PerformanceMode): void;
  /** Update adaptive LOD based on FPS */
  updateAdaptive(currentFps: number, targetFps: number): void;
}

/**
 * Default LOD levels
 */
const DEFAULT_LEVELS: LODLevel[] = [
  { distance: 0, nodeDetail: 32, particleMultiplier: 1.0 },
  { distance: 100, nodeDetail: 24, particleMultiplier: 0.8 },
  { distance: 200, nodeDetail: 16, particleMultiplier: 0.5 },
  { distance: 400, nodeDetail: 12, particleMultiplier: 0.3 },
  { distance: 800, nodeDetail: 8, particleMultiplier: 0.15 },
];

/**
 * Performance mode level multipliers
 */
const PERFORMANCE_MODE_MULTIPLIERS: Record<PerformanceMode, number> = {
  quality: 1.0,
  balanced: 0.7,
  performance: 0.4,
};

/**
 * Creates an LOD system
 * @param config - Optional configuration
 * @returns LOD system instance
 */
export function createLODSystem(config: LODConfig = {}): LODSystem {
  const resolvedConfig: ResolvedConfig = {
    levels: config.levels ?? [...DEFAULT_LEVELS],
    enableAdaptive: config.enableAdaptive ?? false,
  };

  // Sort levels by distance
  resolvedConfig.levels.sort((a, b) => a.distance - b.distance);

  // Internal state
  let currentLevelIndex = 0;
  let currentDistance = 0;
  let performanceMode: PerformanceMode = 'balanced';
  let levelChanges = 0;
  let adaptiveMultiplier = 1.0;
  let disposed = false;

  /**
   * Get the effective particle multiplier based on mode and adaptive adjustments
   */
  function getEffectiveMultiplier(baseMultiplier: number): number {
    const modeMultiplier = PERFORMANCE_MODE_MULTIPLIERS[performanceMode];
    return baseMultiplier * modeMultiplier * adaptiveMultiplier;
  }

  /**
   * Find the LOD level for a given distance
   */
  function findLevelForDistance(distance: number): { level: LODLevel; index: number } {
    let selectedLevel = resolvedConfig.levels[0];
    let selectedIndex = 0;

    for (let i = resolvedConfig.levels.length - 1; i >= 0; i--) {
      if (distance >= resolvedConfig.levels[i].distance) {
        selectedLevel = resolvedConfig.levels[i];
        selectedIndex = i;
        break;
      }
    }

    return { level: selectedLevel, index: selectedIndex };
  }

  const system: LODSystem = {
    update(camera: THREE.Camera, centerPoint: THREE.Vector3): LODLevel {
      if (disposed) return resolvedConfig.levels[0];

      // Calculate distance from camera to center point
      currentDistance = camera.position.distanceTo(centerPoint);

      const { level, index } = findLevelForDistance(currentDistance);

      // Track level changes
      if (index !== currentLevelIndex) {
        levelChanges++;
        currentLevelIndex = index;
      }

      // Return level with effective multipliers applied
      return {
        distance: level.distance,
        nodeDetail: level.nodeDetail,
        particleMultiplier: getEffectiveMultiplier(level.particleMultiplier),
      };
    },

    getLevelForDistance(distance: number): LODLevel {
      if (disposed) return resolvedConfig.levels[0];

      const { level } = findLevelForDistance(distance);

      return {
        distance: level.distance,
        nodeDetail: level.nodeDetail,
        particleMultiplier: getEffectiveMultiplier(level.particleMultiplier),
      };
    },

    getConfig(): ResolvedConfig {
      return {
        levels: [...resolvedConfig.levels],
        enableAdaptive: resolvedConfig.enableAdaptive,
      };
    },

    getMetrics(): LODMetrics {
      return {
        currentLevel: currentLevelIndex,
        currentDistance,
        performanceMode,
        levelChanges,
      };
    },

    setPerformanceMode(mode: PerformanceMode): void {
      performanceMode = mode;
    },

    updateAdaptive(currentFps: number, targetFps: number): void {
      if (!resolvedConfig.enableAdaptive) return;

      // Calculate adaptive multiplier based on FPS ratio
      const fpsRatio = currentFps / targetFps;

      if (fpsRatio < 0.5) {
        // Severe performance issue - reduce significantly
        adaptiveMultiplier = 0.3;
      } else if (fpsRatio < 0.8) {
        // Moderate performance issue - reduce somewhat
        adaptiveMultiplier = 0.6;
      } else if (fpsRatio >= 1.0) {
        // Good performance - maintain full detail
        adaptiveMultiplier = 1.0;
      } else {
        // Scale linearly between 0.8 and 1.0
        adaptiveMultiplier = 0.6 + (fpsRatio - 0.8) * 2.0;
      }
    },
  };

  return system;
}

/**
 * Disposes an LOD system
 * @param system - LOD system to dispose
 */
export function disposeLODSystem(system: LODSystem): void {
  // Reset is handled internally, nothing to clean up externally
}
