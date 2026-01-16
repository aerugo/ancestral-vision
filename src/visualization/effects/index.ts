/**
 * Visual Effects
 * Re-exports all effect-related functions for constellation visualization
 *
 * Note: Post-processing is handled by the tsl-pipeline module (WebGPU-native).
 */

export {
  createSacredGeometryGrid,
  createAnimatedSacredGeometryGrid,
  updateSacredGeometryGrid,
  disposeSacredGeometryGrid,
  type SacredGeometryConfig,
  type SacredGeometryGridResult,
} from './sacred-geometry-grid';
