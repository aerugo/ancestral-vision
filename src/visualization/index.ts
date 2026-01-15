/**
 * Visualization module exports
 */

// Core rendering
export { createRenderer, isWebGPUSupported, isWebGPURenderer, disposeRenderer } from './renderer';
export { createScene, createCamera, createControls, disposeScene } from './scene';
export {
  createConstellationMesh,
  updateConstellation,
  generatePlaceholderPeople,
  disposeConstellation,
  type PlaceholderPerson,
} from './constellation';

// Visualization Engine (orchestrates all systems)
export {
  createVisualizationEngine,
  disposeVisualizationEngine,
  type VisualizationEngine,
  type VisualizationData,
  type VisualizationConfig,
  type NodeData,
  type EdgeData as EngineEdgeData,
  type NodeConfig,
  type EdgeConfig,
  type ParticleConfig,
} from './engine';

// TSL Shaders
export { createNoiseFunction, defaultNoise, type NoiseConfig, type NoiseFunction } from './shaders/noise';
export { createFresnelNode, defaultFresnel, type FresnelConfig } from './shaders/fresnel';

// TSL Materials
export { createNodeMaterial, disposeNodeMaterial, type NodeMaterialConfig } from './materials/node-material';
export { createEdgeMaterial, disposeEdgeMaterial, type EdgeMaterialConfig } from './materials/edge-material';

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
  disposeSacredGeometryGrid,
  type SacredGeometryConfig,
} from './effects/sacred-geometry-grid';
export {
  createPostProcessing,
  updatePostProcessingSize,
  renderWithPostProcessing,
  disposePostProcessing,
  type PostProcessingConfig,
  type PostProcessingResult,
  type BloomConfig,
  type VignetteConfig,
} from './effects/post-processing';

// TSL Post-Processing (WebGPU-compatible, Phase 9.3)
export {
  createTSLPostProcessing,
  updateTSLPostProcessingSize,
  renderWithTSLPostProcessing,
  disposeTSLPostProcessing,
  type TSLPostProcessingConfig,
  type TSLPostProcessingResult,
  type TSLBloomConfig,
  type TSLVignetteConfig,
  type TSLPostProcessingUniforms,
} from './effects/webgpu-post-processing';

// Instanced constellation (advanced)
export {
  createInstancedConstellation,
  updateConstellationTime,
  updateInstanceBiographyWeight,
  disposeInstancedConstellation,
  type ConstellationConfig,
  type ConstellationData,
  type InstancedConstellationResult,
} from './instanced-constellation';

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

// Layout System
export {
  ForceLayout,
  GOLDEN_ANGLE,
  type LayoutNode,
  type LayoutEdge,
  type Vector3,
  type ForceLayoutConfig,
} from './layout';
