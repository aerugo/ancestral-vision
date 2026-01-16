/**
 * WebGPU Graphics Engine
 *
 * A hybrid rendering engine that works alongside Three.js to provide
 * advanced WebGPU features like clustered lighting, compute shaders,
 * and custom render pipelines.
 *
 * Key components:
 * - DeviceManager: WebGPU device access and pipeline caching
 * - StagingBufferRing: Efficient CPU-to-GPU data transfer
 * - ThreeIntegration: Hooks for custom rendering alongside Three.js
 */

// Core infrastructure
export {
  createDeviceManagerFromThree,
  createStandaloneDeviceManager,
  type DeviceManager,
  type DeviceManagerConfig,
} from './device-manager';

export {
  createStagingBufferRing,
  type StagingBufferRing,
  type StagingBufferRingConfig,
} from './staging-ring';

export {
  createThreeIntegration,
  getCameraBindGroupLayout,
  CAMERA_UNIFORMS_WGSL,
  CAMERA_UNIFORM_SIZE,
  type ThreeIntegration,
  type ThreeIntegrationConfig,
  type FrameData,
  type RenderCallback,
  type CameraUniformData,
} from './three-integration';

// Phase 1: Core Rendering Pipeline
export {
  createRenderPassManager,
  type RenderPassManager,
  type RenderPassConfig,
  type DrawCall,
} from './render-pass';

export {
  createPipelineFactory,
  type PipelineFactory,
} from './pipeline-factory';

export {
  createMSAAManager,
  SAMPLE_COUNTS,
  type MSAAManager,
  type MSAAConfig,
  type SampleCount,
} from './msaa';

export {
  createCameraUniformBuffer,
  CAMERA_UNIFORM_SIZE as CAMERA_BUFFER_SIZE,
  type CameraUniformBuffer,
} from './camera-uniforms';

// Phase 2: Clustered Lighting
export {
  // Light Manager
  createLightManager,
  LIGHT_STRUCT_SIZE,
  DEFAULT_MAX_LIGHTS,
  type LightManager,
  type PointLight,
  type PointLightUpdate,
  type PointLightData,
  type LightManagerConfig,
  type LightBuffers,
  // Cluster Grid
  createClusterGrid,
  TILE_COUNT_X,
  TILE_COUNT_Y,
  TILE_COUNT_Z,
  MAX_LIGHTS_PER_CLUSTER,
  CLUSTER_COUNT,
  type ClusterGrid,
  type ClusterGridConfig,
  type ClusterGridFullConfig,
  type ClusterBuffers,
  type ClusterUniformData,
  // Cluster Compute
  createClusterCompute,
  type ClusterCompute,
  type ClusterComputeConfig,
} from './lights';
