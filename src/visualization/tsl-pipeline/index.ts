/**
 * WebGPU Graphics Engine
 *
 * Unified rendering engine for Ancestral Vision constellation visualization.
 * Provides TSL-based post-processing that works with both WebGPU and WebGL renderers.
 *
 * INV-A012: TSL Bloom Import - Import from three/addons/tsl/display/BloomNode.js
 * INV-A013: PostProcessing Unified - Use TSL PostProcessing for both renderers
 * INV-A014: Effect Composition - Post-processing effects composed via node addition
 */

export {
  createPostProcessingPipeline,
  updatePostProcessingSize,
  renderWithPostProcessing,
  disposePostProcessingPipeline,
  type BloomConfig,
  type VignetteConfig,
  type DepthOfFieldConfig,
  type ChromaticAberrationConfig,
  type FilmGrainConfig,
  type PostProcessingPipelineConfig,
  type PostProcessingPipelineResult,
  type PostProcessingPipelineUniforms,
} from './post-processing-pipeline';

// Phase 5: Performance configuration
export {
  PerformancePreset,
  getPerformanceConfig,
  applyPerformanceConfig,
  detectRecommendedPreset,
  DEFAULT_PERFORMANCE_CONFIG,
  type PerformanceConfig,
} from './performance-config';
