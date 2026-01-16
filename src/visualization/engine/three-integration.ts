/**
 * Three.js Integration
 *
 * Provides hooks and utilities for integrating custom WebGPU pipelines
 * with Three.js WebGPURenderer. Allows custom render passes to run
 * before, after, or alongside Three.js rendering.
 */

import type * as THREE from 'three';
import type { WebGPURenderer } from 'three/webgpu';
import type { DeviceManager } from './device-manager';

export type RenderCallback = (
  encoder: GPUCommandEncoder,
  frameData: FrameData
) => void;

export interface FrameData {
  /** Current frame timestamp in milliseconds */
  timestamp: number;
  /** Time since last frame in seconds */
  deltaTime: number;
  /** Total elapsed time in seconds */
  elapsedTime: number;
  /** Frame number since start */
  frameNumber: number;
  /** Canvas width in pixels */
  width: number;
  /** Canvas height in pixels */
  height: number;
  /** Camera matrices (if available) */
  camera?: {
    projectionMatrix: THREE.Matrix4;
    viewMatrix: THREE.Matrix4;
    position: THREE.Vector3;
    near: number;
    far: number;
  };
}

export interface ThreeIntegration {
  /**
   * Register a callback to run before Three.js render
   * Use for compute passes, data updates, etc.
   */
  onBeforeRender(callback: RenderCallback): () => void;

  /**
   * Register a callback to run after Three.js render
   * Use for post-processing, overlays, etc.
   */
  onAfterRender(callback: RenderCallback): () => void;

  /**
   * Get the current render target texture (color)
   * May be MSAA resolved texture
   */
  getColorTexture(): GPUTexture | null;

  /**
   * Get the current depth texture
   */
  getDepthTexture(): GPUTexture | null;

  /**
   * Get camera uniform data for custom shaders
   */
  getCameraData(camera: THREE.Camera): CameraUniformData;

  /**
   * Submit custom commands alongside Three.js
   * Call this from within a render callback
   */
  submitCommands(commands: GPUCommandBuffer[]): void;

  /**
   * Update frame data (called internally by render loop)
   */
  updateFrameData(timestamp: number, camera?: THREE.Camera): void;

  /**
   * Get current frame data
   */
  getFrameData(): FrameData;

  /**
   * Dispose resources
   */
  dispose(): void;
}

export interface CameraUniformData {
  projectionMatrix: Float32Array;
  viewMatrix: Float32Array;
  inverseProjectionMatrix: Float32Array;
  inverseViewMatrix: Float32Array;
  position: Float32Array;
  near: number;
  far: number;
}

/**
 * Camera uniform buffer layout (std140 aligned)
 *
 * struct CameraUniforms {
 *   projectionMatrix: mat4x4<f32>,  // 64 bytes
 *   viewMatrix: mat4x4<f32>,        // 64 bytes
 *   inverseProjection: mat4x4<f32>, // 64 bytes
 *   inverseView: mat4x4<f32>,       // 64 bytes
 *   position: vec3<f32>,            // 12 bytes
 *   near: f32,                      // 4 bytes
 *   far: f32,                       // 4 bytes
 *   time: f32,                      // 4 bytes
 *   _padding: vec2<f32>,            // 8 bytes (align to 16)
 * };
 *
 * Total: 288 bytes
 */
export const CAMERA_UNIFORM_SIZE = 288;

export interface ThreeIntegrationConfig {
  /** The Three.js WebGPU renderer */
  renderer: WebGPURenderer;
  /** The device manager */
  deviceManager: DeviceManager;
  /** Canvas element for size tracking */
  canvas: HTMLCanvasElement;
}

/**
 * Creates Three.js integration for custom WebGPU rendering
 */
export function createThreeIntegration(config: ThreeIntegrationConfig): ThreeIntegration {
  const { renderer, deviceManager, canvas } = config;
  const device = deviceManager.device;

  // Callbacks
  const beforeRenderCallbacks: Set<RenderCallback> = new Set();
  const afterRenderCallbacks: Set<RenderCallback> = new Set();

  // Frame tracking
  let lastTimestamp = 0;
  let frameNumber = 0;
  let elapsedTime = 0;
  let currentFrameData: FrameData = {
    timestamp: 0,
    deltaTime: 0,
    elapsedTime: 0,
    frameNumber: 0,
    width: canvas.width,
    height: canvas.height,
  };

  // Pending command buffers
  const pendingCommands: GPUCommandBuffer[] = [];

  // Create camera uniform buffer
  const cameraUniformBuffer = device.createBuffer({
    size: CAMERA_UNIFORM_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    label: 'CameraUniforms',
  });

  // Temporary matrices for camera calculations
  const tempMatrix = new Float32Array(16);

  return {
    onBeforeRender(callback: RenderCallback): () => void {
      beforeRenderCallbacks.add(callback);
      return () => beforeRenderCallbacks.delete(callback);
    },

    onAfterRender(callback: RenderCallback): () => void {
      afterRenderCallbacks.add(callback);
      return () => afterRenderCallbacks.delete(callback);
    },

    getColorTexture(): GPUTexture | null {
      // Access Three.js internal render target
      // Note: This is accessing internal APIs
      try {
        const backend = (renderer as unknown as { backend: ThreeBackend }).backend;
        const renderContext = backend.get?.(renderer);
        return renderContext?.colorTexture ?? null;
      } catch {
        return null;
      }
    },

    getDepthTexture(): GPUTexture | null {
      try {
        const backend = (renderer as unknown as { backend: ThreeBackend }).backend;
        const renderContext = backend.get?.(renderer);
        return renderContext?.depthTexture ?? null;
      } catch {
        return null;
      }
    },

    getCameraData(camera: THREE.Camera): CameraUniformData {
      // Get matrices from Three.js camera
      const projMatrix = (camera as THREE.PerspectiveCamera).projectionMatrix;
      const viewMatrix = camera.matrixWorldInverse;

      // Calculate inverse matrices
      const invProjMatrix = projMatrix.clone().invert();
      const invViewMatrix = viewMatrix.clone().invert();

      // Get near/far (only available on PerspectiveCamera)
      const perspCamera = camera as THREE.PerspectiveCamera;
      const near = perspCamera.near ?? 0.1;
      const far = perspCamera.far ?? 1000;

      return {
        projectionMatrix: new Float32Array(projMatrix.elements),
        viewMatrix: new Float32Array(viewMatrix.elements),
        inverseProjectionMatrix: new Float32Array(invProjMatrix.elements),
        inverseViewMatrix: new Float32Array(invViewMatrix.elements),
        position: new Float32Array([
          camera.position.x,
          camera.position.y,
          camera.position.z,
        ]),
        near,
        far,
      };
    },

    submitCommands(commands: GPUCommandBuffer[]): void {
      pendingCommands.push(...commands);
    },

    updateFrameData(timestamp: number, camera?: THREE.Camera): void {
      const deltaTime = lastTimestamp > 0 ? (timestamp - lastTimestamp) / 1000 : 0;
      elapsedTime += deltaTime;
      lastTimestamp = timestamp;
      frameNumber++;

      currentFrameData = {
        timestamp,
        deltaTime,
        elapsedTime,
        frameNumber,
        width: canvas.width,
        height: canvas.height,
      };

      if (camera) {
        const perspCamera = camera as THREE.PerspectiveCamera;
        currentFrameData.camera = {
          projectionMatrix: perspCamera.projectionMatrix,
          viewMatrix: camera.matrixWorldInverse,
          position: camera.position.clone(),
          near: perspCamera.near ?? 0.1,
          far: perspCamera.far ?? 1000,
        };

        // Update camera uniform buffer
        const cameraData = this.getCameraData(camera);
        const uniformData = new ArrayBuffer(CAMERA_UNIFORM_SIZE);
        const view = new DataView(uniformData);

        // Write matrices (column-major)
        let offset = 0;
        for (let i = 0; i < 16; i++) {
          view.setFloat32(offset, cameraData.projectionMatrix[i], true);
          offset += 4;
        }
        for (let i = 0; i < 16; i++) {
          view.setFloat32(offset, cameraData.viewMatrix[i], true);
          offset += 4;
        }
        for (let i = 0; i < 16; i++) {
          view.setFloat32(offset, cameraData.inverseProjectionMatrix[i], true);
          offset += 4;
        }
        for (let i = 0; i < 16; i++) {
          view.setFloat32(offset, cameraData.inverseViewMatrix[i], true);
          offset += 4;
        }

        // Write position (vec3)
        view.setFloat32(offset, cameraData.position[0], true);
        offset += 4;
        view.setFloat32(offset, cameraData.position[1], true);
        offset += 4;
        view.setFloat32(offset, cameraData.position[2], true);
        offset += 4;

        // Write near, far, time
        view.setFloat32(offset, cameraData.near, true);
        offset += 4;
        view.setFloat32(offset, cameraData.far, true);
        offset += 4;
        view.setFloat32(offset, elapsedTime, true);

        device.queue.writeBuffer(cameraUniformBuffer, 0, uniformData);
      }
    },

    getFrameData(): FrameData {
      return currentFrameData;
    },

    dispose(): void {
      beforeRenderCallbacks.clear();
      afterRenderCallbacks.clear();
      pendingCommands.length = 0;
      cameraUniformBuffer.destroy();
    },
  };
}

/**
 * Get the camera uniform buffer bind group layout
 */
export function getCameraBindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
  return device.createBindGroupLayout({
    label: 'CameraBindGroupLayout',
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE,
        buffer: { type: 'uniform' },
      },
    ],
  });
}

/**
 * WGSL struct definition for camera uniforms
 * Include this in your shaders
 */
export const CAMERA_UNIFORMS_WGSL = `
struct CameraUniforms {
  projectionMatrix: mat4x4<f32>,
  viewMatrix: mat4x4<f32>,
  inverseProjectionMatrix: mat4x4<f32>,
  inverseViewMatrix: mat4x4<f32>,
  position: vec3<f32>,
  near: f32,
  far: f32,
  time: f32,
  _padding: vec2<f32>,
};

@group(0) @binding(0) var<uniform> camera: CameraUniforms;
`;

/**
 * Internal Three.js backend type (for accessing internals)
 */
interface ThreeBackend {
  device: GPUDevice;
  adapter: GPUAdapter;
  context: GPUCanvasContext;
  get?: (renderer: WebGPURenderer) => {
    colorTexture?: GPUTexture;
    depthTexture?: GPUTexture;
  };
}
