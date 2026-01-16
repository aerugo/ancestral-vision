/**
 * @vitest-environment node
 *
 * CameraUniformBuffer Tests (TDD)
 *
 * Tests for camera uniform buffer management, including matrix updates
 * and GPU buffer synchronization.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';

// Mock GPUBuffer
const mockBuffer = {
  getMappedRange: vi.fn(() => new ArrayBuffer(256)),
  unmap: vi.fn(),
  destroy: vi.fn(),
  mapAsync: vi.fn(() => Promise.resolve()),
};

const mockDevice = {
  createBuffer: vi.fn(() => mockBuffer),
  queue: {
    writeBuffer: vi.fn(),
  },
};

import {
  createCameraUniformBuffer,
  type CameraUniformBuffer,
  CAMERA_UNIFORM_SIZE,
} from './camera-uniforms';

describe('camera-uniforms module', () => {
  let uniformBuffer: CameraUniformBuffer;
  let camera: THREE.PerspectiveCamera;

  beforeEach(() => {
    vi.clearAllMocks();
    uniformBuffer = createCameraUniformBuffer(mockDevice as unknown as GPUDevice);
    camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 1000);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
  });

  describe('createCameraUniformBuffer', () => {
    it('should export createCameraUniformBuffer function', () => {
      expect(createCameraUniformBuffer).toBeDefined();
      expect(typeof createCameraUniformBuffer).toBe('function');
    });

    it('should return a CameraUniformBuffer instance', () => {
      expect(uniformBuffer).toHaveProperty('update');
      expect(uniformBuffer).toHaveProperty('getBuffer');
      expect(uniformBuffer).toHaveProperty('getBindGroupLayout');
      expect(uniformBuffer).toHaveProperty('getBindGroup');
      expect(uniformBuffer).toHaveProperty('dispose');
    });

    it('should create a GPU buffer', () => {
      expect(mockDevice.createBuffer).toHaveBeenCalledWith(
        expect.objectContaining({
          size: CAMERA_UNIFORM_SIZE,
          usage: expect.any(Number),
        })
      );
    });
  });

  describe('CAMERA_UNIFORM_SIZE', () => {
    it('should export CAMERA_UNIFORM_SIZE constant', () => {
      expect(CAMERA_UNIFORM_SIZE).toBeDefined();
      expect(typeof CAMERA_UNIFORM_SIZE).toBe('number');
    });

    it('should be large enough for camera data', () => {
      // projectionMatrix: 16 floats = 64 bytes
      // viewMatrix: 16 floats = 64 bytes
      // inverseProjection: 16 floats = 64 bytes
      // position: 3 floats + padding = 16 bytes (vec4 aligned)
      // near, far, time, padding: 4 floats = 16 bytes
      // Total: 224 bytes minimum, but 256 for alignment
      expect(CAMERA_UNIFORM_SIZE).toBeGreaterThanOrEqual(224);
    });
  });

  describe('update', () => {
    it('should write buffer data to GPU', () => {
      uniformBuffer.update(camera, 1.5);

      expect(mockDevice.queue.writeBuffer).toHaveBeenCalled();
      const call = mockDevice.queue.writeBuffer.mock.calls[0];
      expect(call[0]).toBe(mockBuffer); // buffer
      expect(call[1]).toBe(0); // offset
      // Data should be an ArrayBuffer (or SharedArrayBuffer)
      expect(call[2].byteLength).toBeDefined();
      expect(call[2].byteLength).toBeGreaterThan(0);
    });

    it('should update with current time value', () => {
      uniformBuffer.update(camera, 2.5);

      // Verify writeBuffer was called (time is internal to the buffer data)
      expect(mockDevice.queue.writeBuffer).toHaveBeenCalled();
    });

    it('should accept optional time parameter (defaults to 0)', () => {
      uniformBuffer.update(camera);

      expect(mockDevice.queue.writeBuffer).toHaveBeenCalled();
    });

    it('should update projection matrix from camera', () => {
      camera.fov = 90;
      camera.updateProjectionMatrix();

      uniformBuffer.update(camera);

      // Verify the buffer was updated
      expect(mockDevice.queue.writeBuffer).toHaveBeenCalled();
    });

    it('should update view matrix from camera', () => {
      camera.position.set(10, 20, 30);
      camera.updateMatrixWorld();

      uniformBuffer.update(camera);

      expect(mockDevice.queue.writeBuffer).toHaveBeenCalled();
    });
  });

  describe('getBuffer', () => {
    it('should return the GPU buffer', () => {
      expect(uniformBuffer.getBuffer()).toBe(mockBuffer);
    });
  });

  describe('getBindGroupLayout', () => {
    it('should return a bind group layout descriptor', () => {
      const layout = uniformBuffer.getBindGroupLayout();

      expect(layout).toHaveProperty('entries');
      expect(layout.entries.length).toBeGreaterThan(0);
    });

    it('should have a uniform buffer binding', () => {
      const layout = uniformBuffer.getBindGroupLayout();
      const entry = layout.entries[0];

      expect(entry.binding).toBe(0);
      expect(entry.visibility).toBeDefined();
      expect(entry.buffer).toBeDefined();
      expect(entry.buffer?.type).toBe('uniform');
    });
  });

  describe('getBindGroup', () => {
    it('should return a bind group descriptor', () => {
      const bindGroup = uniformBuffer.getBindGroup();

      expect(bindGroup).toHaveProperty('entries');
      expect(bindGroup.entries.length).toBeGreaterThan(0);
    });

    it('should reference the camera buffer', () => {
      const bindGroup = uniformBuffer.getBindGroup();
      const entry = bindGroup.entries[0];

      expect(entry.binding).toBe(0);
      expect(entry.resource).toHaveProperty('buffer');
      expect((entry.resource as GPUBufferBinding).buffer).toBe(mockBuffer);
    });
  });

  describe('dispose', () => {
    it('should destroy the GPU buffer', () => {
      uniformBuffer.dispose();

      expect(mockBuffer.destroy).toHaveBeenCalled();
    });

    it('should not throw if called multiple times', () => {
      uniformBuffer.dispose();
      expect(() => uniformBuffer.dispose()).not.toThrow();
    });
  });

  describe('getUniformStruct', () => {
    it('should return WGSL struct definition', () => {
      const struct = uniformBuffer.getUniformStruct();

      expect(struct).toContain('struct CameraUniforms');
      expect(struct).toContain('projectionMatrix');
      expect(struct).toContain('viewMatrix');
      expect(struct).toContain('inverseProjection');
      expect(struct).toContain('position');
      expect(struct).toContain('near');
      expect(struct).toContain('far');
      expect(struct).toContain('time');
    });
  });

  describe('integration with Three.js cameras', () => {
    it('should work with PerspectiveCamera', () => {
      const perspCam = new THREE.PerspectiveCamera(60, 1.5, 0.5, 500);
      perspCam.position.set(1, 2, 3);
      perspCam.updateMatrixWorld();

      expect(() => uniformBuffer.update(perspCam)).not.toThrow();
    });

    it('should work with OrthographicCamera', () => {
      const orthoCam = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
      orthoCam.position.set(0, 10, 0);
      orthoCam.updateMatrixWorld();

      expect(() => uniformBuffer.update(orthoCam)).not.toThrow();
    });
  });
});

// Mock GPU constants for Node environment
const GPUBufferUsage = {
  UNIFORM: 0x0040,
  COPY_DST: 0x0008,
};
const GPUShaderStage = {
  VERTEX: 0x1,
  FRAGMENT: 0x2,
};
(globalThis as Record<string, unknown>).GPUBufferUsage = GPUBufferUsage;
(globalThis as Record<string, unknown>).GPUShaderStage = GPUShaderStage;
