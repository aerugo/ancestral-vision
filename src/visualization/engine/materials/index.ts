/**
 * Materials Module
 *
 * Provides animated flowing materials with tri-planar texturing,
 * PBR properties, and visual presets.
 */

// Flowing Material
export {
  createFlowingMaterial,
  FLOWING_MATERIAL_UNIFORM_SIZE,
  type FlowingMaterial,
  type FlowingMaterialConfig,
  type FlowingMaterialUniforms,
} from './flowing-material';

// Material Presets
export {
  MATERIAL_PRESETS,
  getPresetNames,
  getPreset,
  getRandomPreset,
  createMaterialFromPreset,
  applyPresetToMaterial,
  type MaterialPreset,
  type MaterialPresetName,
  // Legacy exports (deprecated)
  MYSTICAL_PRESETS,
  LAVA_PRESET,
  CELESTIAL_PRESET,
  SACRED_PRESET,
  getMysticalPreset,
  getRandomMysticalPreset,
  assignMysticalPresets,
  groupByPreset,
  type MysticalPreset,
  type MysticalPresetConfig,
} from './presets';
