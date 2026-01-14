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
  createEdgeMaterial,
  updateEdgeMaterialTime,
  disposeEdgeMaterial,
  type EdgeMaterialConfig,
  type EdgeMaterialUniforms,
  type EdgeMaterialResult,
} from './edge-material';
