/**
 * Visualization module exports
 *
 * Note: WebGL support has been deprecated. This module only supports WebGPU.
 */

// Core rendering
export {
  createRenderer,
  isWebGPUSupported,
  disposeRenderer,
  WebGPUNotSupportedError,
  type WebGPURendererType,
} from './renderer';
export { createScene, createCamera, createControls, disposeScene } from './scene';

// TSL Shaders
export { createNoiseFunction, defaultNoise, type NoiseConfig, type NoiseFunction } from './shaders/noise';
export { createFresnelNode, defaultFresnel, type FresnelConfig } from './shaders/fresnel';

// TSL Materials
export { createNodeMaterial, disposeNodeMaterial, type NodeMaterialConfig } from './materials/node-material';
export { createEdgeMaterial, disposeEdgeMaterial, type EdgeMaterialConfig } from './materials/edge-material';
export {
  createTSLCloudMaterial,
  updateTSLCloudMaterialTime,
  disposeTSLCloudMaterial,
  createTSLCloudMaterialWithPreset,
  getTSLCloudPresetNames,
  getRandomTSLCloudPreset,
  TSL_CLOUD_PRESETS,
  type TSLCloudPreset,
  type TSLCloudMaterialConfig,
  type TSLCloudMaterialUniforms,
  type TSLCloudMaterialResult,
} from './materials/tsl-cloud-material';

// Edges
export {
  createEdgeSystem,
  updateEdgeSystemTime,
  disposeEdgeSystem,
  type EdgeSystemConfig,
  type EdgeSystemData,
  type EdgeData,
  type EdgeGeometryConfig,
} from './edges';

// Particles
export {
  createBackgroundParticles,
  updateBackgroundParticlesTime,
  disposeBackgroundParticles,
  type BackgroundParticleConfig,
} from './particles/background-particles';
export {
  createEventFireflies,
  updateEventFirefliesTime,
  disposeEventFireflies,
  getEventColor,
  type EventFireflyConfig,
  type EventFireflyData,
} from './particles/event-fireflies';

// Effects
export {
  createSacredGeometryGrid,
  updateSacredGeometryGrid,
  disposeSacredGeometryGrid,
  type SacredGeometryConfig,
} from './effects/sacred-geometry-grid';

// TSL Post-Processing Pipeline (WebGPU-only)
export {
  createPostProcessingPipeline,
  updatePostProcessingSize,
  renderWithPostProcessing,
  disposePostProcessingPipeline,
  type PostProcessingPipelineConfig,
  type PostProcessingPipelineResult,
  type PostProcessingPipelineUniforms,
  type BloomConfig,
  type VignetteConfig,
  type DepthOfFieldConfig,
  type ChromaticAberrationConfig,
  type FilmGrainConfig,
} from './tsl-pipeline';

// Instanced constellation
export {
  createInstancedConstellation,
  updateConstellationTime,
  updateInstanceBiographyWeight,
  disposeInstancedConstellation,
  type MaterialMode,
  type ConstellationConfig,
  type ConstellationData,
  type ConstellationUniforms,
  type InstancedConstellationResult,
} from './instanced-constellation';

// Selection
export { ConstellationSelection } from './selection';

// Camera animation
export { CameraAnimator } from './camera-animation';

// Performance monitoring and LOD
export {
  createPerformanceMonitor,
  disposePerformanceMonitor,
  createLODSystem,
  disposeLODSystem,
  type PerformanceMonitor,
  type PerformanceMetrics,
  type PerformanceConfig,
  type LODSystem,
  type LODConfig,
  type LODLevel,
  type LODMetrics,
  type PerformanceMode,
} from './performance';

// Layout System (ported from prototype)
export {
  ForceDirectedLayout,
  FamilyGraph,
  BarnesHutTree,
  calculateBiographyWeight,
  GOLDEN_ANGLE,
  BARNES_HUT_THRESHOLD,
  DEFAULT_LAYOUT_CONFIG,
  EDGE_IDEAL_DISTANCE_MULTIPLIERS,
  EDGE_STRENGTH_DEFAULTS,
  vec3Add,
  vec3Sub,
  vec3Scale,
  vec3Length,
  vec3Normalize,
  type Vec3,
  type GraphNode,
  type GraphEdge,
  type EdgeType,
  type LayoutPerson,
  type LayoutConfig,
  type PersonInput,
  type ParentChildInput,
  type SpouseInput,
} from './layout';
