/**
 * CameraUniformBuffer
 *
 * Manages camera uniform data for WebGPU shaders. Packs projection,
 * view, and inverse projection matrices along with camera position
 * and timing data into a GPU buffer.
 */
import * as THREE from 'three';

/**
 * Size of the camera uniform buffer in bytes.
 *
 * Layout (256 bytes, 16-byte aligned):
 * - projectionMatrix: mat4x4<f32> = 64 bytes (offset 0)
 * - viewMatrix: mat4x4<f32> = 64 bytes (offset 64)
 * - inverseProjection: mat4x4<f32> = 64 bytes (offset 128)
 * - position: vec3<f32> + padding = 16 bytes (offset 192)
 * - near: f32 = 4 bytes (offset 208)
 * - far: f32 = 4 bytes (offset 212)
 * - time: f32 = 4 bytes (offset 216)
 * - padding: 4 bytes (offset 220)
 * - reserved: 32 bytes (offset 224)
 * Total: 256 bytes
 */
export const CAMERA_UNIFORM_SIZE = 256;

/**
 * WGSL struct definition for camera uniforms
 */
const CAMERA_UNIFORM_STRUCT = `
struct CameraUniforms {
  projectionMatrix: mat4x4<f32>,
  viewMatrix: mat4x4<f32>,
  inverseProjection: mat4x4<f32>,
  position: vec3<f32>,
  _pad0: f32,
  near: f32,
  far: f32,
  time: f32,
  _pad1: f32,
}
`;

/**
 * CameraUniformBuffer interface
 */
export interface CameraUniformBuffer {
  /** Update the buffer with camera data */
  update(camera: THREE.Camera, time?: number): void;
  /** Get the underlying GPU buffer */
  getBuffer(): GPUBuffer;
  /** Get the bind group layout descriptor */
  getBindGroupLayout(): GPUBindGroupLayoutDescriptor;
  /** Get the bind group descriptor */
  getBindGroup(): GPUBindGroupDescriptor;
  /** Get the WGSL struct definition */
  getUniformStruct(): string;
  /** Dispose of GPU resources */
  dispose(): void;
}

/**
 * Creates a new CameraUniformBuffer
 *
 * @param device - The GPUDevice to create the buffer on
 * @returns A CameraUniformBuffer instance
 */
export function createCameraUniformBuffer(device: GPUDevice): CameraUniformBuffer {
  // Create the GPU buffer
  const buffer = device.createBuffer({
    size: CAMERA_UNIFORM_SIZE,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // Reusable typed array for data packing
  const data = new Float32Array(CAMERA_UNIFORM_SIZE / 4);

  // Reusable matrices for computation
  const inverseProjection = new THREE.Matrix4();

  let disposed = false;

  /**
   * Pack a Three.js Matrix4 into the data array at the given offset
   */
  function packMatrix4(matrix: THREE.Matrix4, offset: number): void {
    const elements = matrix.elements;
    for (let i = 0; i < 16; i++) {
      data[offset + i] = elements[i];
    }
  }

  return {
    update(camera: THREE.Camera, time = 0): void {
      if (disposed) return;

      // Projection matrix (offset 0, 16 floats)
      packMatrix4(camera.projectionMatrix, 0);

      // View matrix (offset 16, 16 floats)
      // View matrix is the inverse of the camera's world matrix
      packMatrix4(camera.matrixWorldInverse, 16);

      // Inverse projection matrix (offset 32, 16 floats)
      inverseProjection.copy(camera.projectionMatrix).invert();
      packMatrix4(inverseProjection, 32);

      // Camera position (offset 48, 3 floats + 1 padding)
      const position = camera.getWorldPosition(new THREE.Vector3());
      data[48] = position.x;
      data[49] = position.y;
      data[50] = position.z;
      data[51] = 0; // padding

      // Near/far planes and time (offset 52, 4 floats)
      if (camera instanceof THREE.PerspectiveCamera) {
        data[52] = camera.near;
        data[53] = camera.far;
      } else if (camera instanceof THREE.OrthographicCamera) {
        data[52] = camera.near;
        data[53] = camera.far;
      } else {
        data[52] = 0.1;
        data[53] = 1000;
      }
      data[54] = time;
      data[55] = 0; // padding

      // Upload to GPU
      device.queue.writeBuffer(buffer, 0, data.buffer);
    },

    getBuffer(): GPUBuffer {
      return buffer;
    },

    getBindGroupLayout(): GPUBindGroupLayoutDescriptor {
      return {
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            buffer: {
              type: 'uniform',
            },
          },
        ],
      };
    },

    getBindGroup(): GPUBindGroupDescriptor {
      return {
        layout: undefined as unknown as GPUBindGroupLayout, // Will be set by caller
        entries: [
          {
            binding: 0,
            resource: {
              buffer,
            },
          },
        ],
      };
    },

    getUniformStruct(): string {
      return CAMERA_UNIFORM_STRUCT;
    },

    dispose(): void {
      if (!disposed) {
        buffer.destroy();
        disposed = true;
      }
    },
  };
}
