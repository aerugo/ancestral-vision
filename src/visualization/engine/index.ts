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
