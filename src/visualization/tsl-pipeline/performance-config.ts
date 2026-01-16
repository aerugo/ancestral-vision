/**
 * Performance Configuration for TSL Post-Processing
 *
 * Phase 5: Performance Optimization
 *
 * Provides configurable performance presets that control:
 * - Bloom mip levels (quality vs performance)
 * - Resolution scaling (for lower-end devices)
 * - Effect enables (DOF, chromatic aberration, film grain)
 */
import type { PostProcessingPipelineConfig } from './post-processing-pipeline';

/**
 * Performance preset levels
 */
export enum PerformancePreset {
  /** Lowest quality, best performance - for integrated GPUs */
  LOW = 'LOW',
  /** Balanced quality and performance - for mid-range devices */
  MEDIUM = 'MEDIUM',
  /** High quality - for dedicated GPUs (default) */
  HIGH = 'HIGH',
  /** Maximum quality - for high-end GPUs */
  ULTRA = 'ULTRA',
}

/**
 * Performance configuration options
 */
export interface PerformanceConfig {
  /**
   * Number of mip levels for bloom effect
   * - 3: Fast, visible banding on large blooms
   * - 4: Good balance for most devices
   * - 5: High quality, recommended for dedicated GPUs
   * - 6: Ultra quality, may impact performance on integrated GPUs
   */
  bloomMipLevels: number;

  /**
   * Resolution scale factor (0.5-1.0)
   * - 0.5: 25% of pixels, very fast but noticeably blurry
   * - 0.75: 56% of pixels, good balance for integrated GPUs
   * - 1.0: Full resolution, best quality
   */
  resolutionScale: number;

  /**
   * Maximum number of post-processing effects
   * Limits which effects can be enabled simultaneously
   */
  maxEffects: number;

  /** Enable Depth of Field effect (expensive) */
  enableDof: boolean;

  /** Enable Chromatic Aberration effect */
  enableChromaticAberration: boolean;

  /** Enable Film Grain effect */
  enableFilmGrain: boolean;
}

/**
 * Performance preset configurations
 */
const PERFORMANCE_PRESETS: Record<PerformancePreset, PerformanceConfig> = {
  [PerformancePreset.LOW]: {
    bloomMipLevels: 3,
    resolutionScale: 0.5,
    maxEffects: 2,
    enableDof: false,
    enableChromaticAberration: false,
    enableFilmGrain: false,
  },
  [PerformancePreset.MEDIUM]: {
    bloomMipLevels: 4,
    resolutionScale: 0.75,
    maxEffects: 3,
    enableDof: false,
    enableChromaticAberration: true,
    enableFilmGrain: false,
  },
  [PerformancePreset.HIGH]: {
    bloomMipLevels: 5,
    resolutionScale: 1.0,
    maxEffects: 4,
    enableDof: true,
    enableChromaticAberration: true,
    enableFilmGrain: false,
  },
  [PerformancePreset.ULTRA]: {
    bloomMipLevels: 6,
    resolutionScale: 1.0,
    maxEffects: 5,
    enableDof: true,
    enableChromaticAberration: true,
    enableFilmGrain: true,
  },
};

/**
 * Default performance configuration (HIGH preset)
 */
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = PERFORMANCE_PRESETS[PerformancePreset.HIGH];

/**
 * Gets performance configuration for a given preset
 *
 * @param preset - Performance preset (defaults to HIGH)
 * @param overrides - Optional custom overrides
 * @returns Complete performance configuration
 *
 * @example
 * ```typescript
 * // Get HIGH preset configuration
 * const config = getPerformanceConfig(PerformancePreset.HIGH);
 *
 * // Get LOW preset with custom mip levels
 * const customConfig = getPerformanceConfig(PerformancePreset.LOW, {
 *   bloomMipLevels: 5,
 * });
 * ```
 */
export function getPerformanceConfig(
  preset: PerformancePreset = PerformancePreset.HIGH,
  overrides?: Partial<PerformanceConfig>
): PerformanceConfig {
  const baseConfig = PERFORMANCE_PRESETS[preset] ?? DEFAULT_PERFORMANCE_CONFIG;

  if (overrides) {
    return {
      ...baseConfig,
      ...overrides,
    };
  }

  return { ...baseConfig };
}

/**
 * Applies performance configuration to post-processing config
 *
 * Takes a full post-processing configuration and applies performance
 * constraints based on the preset. Effects that are disabled by the
 * performance config will be removed from the result.
 *
 * @param preset - Performance preset to apply
 * @param config - Post-processing configuration
 * @param performanceOverrides - Optional performance config overrides
 * @returns Modified post-processing configuration
 *
 * @example
 * ```typescript
 * const fullConfig = {
 *   bloom: { enabled: true, ... },
 *   dof: { enabled: true, ... },
 *   chromaticAberration: { enabled: true, ... },
 *   filmGrain: { enabled: true, ... },
 * };
 *
 * // Apply LOW preset - disables DOF, CA, and film grain
 * const optimizedConfig = applyPerformanceConfig(PerformancePreset.LOW, fullConfig);
 * ```
 */
export function applyPerformanceConfig(
  preset: PerformancePreset = PerformancePreset.HIGH,
  config: Partial<PostProcessingPipelineConfig>,
  performanceOverrides?: Partial<PerformanceConfig>
): Partial<PostProcessingPipelineConfig> {
  const performanceConfig = getPerformanceConfig(preset, performanceOverrides);

  const result: Partial<PostProcessingPipelineConfig> = {
    ...config,
  };

  // Apply effect enables based on performance config
  if (!performanceConfig.enableDof) {
    delete result.dof;
  }

  if (!performanceConfig.enableChromaticAberration) {
    delete result.chromaticAberration;
  }

  if (!performanceConfig.enableFilmGrain) {
    delete result.filmGrain;
  }

  return result;
}

/**
 * Detects recommended performance preset based on device capabilities
 *
 * This is a heuristic-based detection that considers:
 * - Device pixel ratio (higher = more capable device)
 * - Hardware concurrency (CPU cores)
 * - Memory (if available via performance API)
 *
 * Note: This is a best-effort detection. Users should be able to
 * override with their preferred preset.
 *
 * @returns Recommended performance preset
 */
export function detectRecommendedPreset(): PerformancePreset {
  // Server-side rendering check
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return PerformancePreset.HIGH;
  }

  // Check hardware concurrency (CPU cores)
  const cores = navigator.hardwareConcurrency || 4;

  // Check device pixel ratio (higher = likely better device)
  const pixelRatio = window.devicePixelRatio || 1;

  // Simple heuristic
  if (cores <= 2 || pixelRatio < 1.5) {
    return PerformancePreset.LOW;
  } else if (cores <= 4 || pixelRatio < 2) {
    return PerformancePreset.MEDIUM;
  } else if (cores <= 8) {
    return PerformancePreset.HIGH;
  } else {
    return PerformancePreset.ULTRA;
  }
}
