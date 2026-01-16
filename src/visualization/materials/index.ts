/**
 * TSL Materials
 * Re-exports all material-related functions for constellation visualization
 *
 * Note: WebGL/GLSL materials have been deprecated. All materials now use TSL (WebGPU).
 */

export {
  createNodeMaterial,
  updateNodeMaterialTime,
  disposeNodeMaterial,
  type NodeMaterialConfig,
  type NodeMaterialUniforms,
  type NodeMaterialResult,
} from './node-material';

export {
  createTSLCloudMaterial,
  createTSLCloudMaterialWithPreset,
  updateTSLCloudMaterialTime,
  disposeTSLCloudMaterial,
  getTSLCloudPresetNames,
  getRandomTSLCloudPreset,
  TSL_CLOUD_PRESETS,
  type TSLCloudMaterialConfig,
  type TSLCloudMaterialUniforms,
  type TSLCloudMaterialResult,
  type TSLCloudPreset,
} from './tsl-cloud-material';

export {
  createEdgeMaterial,
  updateEdgeMaterialTime,
  disposeEdgeMaterial,
  type EdgeMaterialConfig,
  type EdgeMaterialUniforms,
  type EdgeMaterialResult,
} from './edge-material';

export {
  createGhostNodeMaterial,
  updateGhostNodeMaterialTime,
  disposeGhostNodeMaterial,
  type GhostNodeMaterialConfig,
  type GhostNodeMaterialUniforms,
  type GhostNodeMaterialResult,
} from './ghost-node-material';

export {
  SCIFI_PALETTE,
  PALETTE_SIZE,
  GHOST_COLOR,
  SELECTION_STATE,
  getRandomColorIndex,
  getPaletteColor,
  type SelectionStateValue,
} from './palette';
