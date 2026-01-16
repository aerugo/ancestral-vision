/**
 * TSL Materials
 * Re-exports all material-related functions for constellation visualization
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
  createCustomNodeMaterial,
  updateCustomNodeMaterialTime,
  updateCustomNodeMaterialColors,
  updateCustomNodeMaterialTheme,
  disposeCustomNodeMaterial,
  type CustomNodeMaterialConfig,
  type CustomNodeMaterialUniforms,
  type CustomNodeMaterialResult,
} from './custom-node-material';

export {
  createCloudNodeMaterial,
  createCloudNodeMaterialWithPreset,
  updateCloudNodeMaterialTime,
  updateCloudNodeMaterialColors,
  updateCloudNodeMaterialTheme,
  updateCloudNodeMaterialParams,
  disposeCloudNodeMaterial,
  CLOUD_PRESETS,
  type CloudNodeMaterialConfig,
  type CloudNodeMaterialUniforms,
  type CloudNodeMaterialResult,
  type CloudPreset,
} from './cloud-node-material';

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
