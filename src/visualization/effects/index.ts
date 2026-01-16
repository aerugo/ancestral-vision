/**
 * Visual Effects
 * Re-exports all effect-related functions for constellation visualization
 */

export {
  createSacredGeometryGrid,
  createAnimatedSacredGeometryGrid,
  updateSacredGeometryGrid,
  disposeSacredGeometryGrid,
  type SacredGeometryConfig,
  type SacredGeometryGridResult,
} from './sacred-geometry-grid';

export {
  createPostProcessing,
  updatePostProcessingSize,
  renderWithPostProcessing,
  disposePostProcessing,
  type PostProcessingConfig,
  type PostProcessingResult,
  type BloomConfig,
  type VignetteConfig,
} from './post-processing';

export {
  createTSLPostProcessing,
  updateTSLPostProcessingSize,
  renderWithTSLPostProcessing,
  disposeTSLPostProcessing,
  type TSLPostProcessingConfig,
  type TSLPostProcessingResult,
  type TSLBloomConfig,
  type TSLVignetteConfig,
} from './webgpu-post-processing';
