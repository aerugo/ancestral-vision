/**
 * @vitest-environment node
 *
 * LightManager Tests (TDD)
 *
 * Tests for the light management system that handles point lights
 * and synchronizes them to GPU buffers for clustered lighting.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';

// Mock GPU buffers
const mockLightsBuffer = {
  destroy: vi.fn(),
  getMappedRange: vi.fn(() => new ArrayBuffer(1024 * 32)),
  unmap: vi.fn(),
};

const mockLightCountBuffer = {
  destroy: vi.fn(),
  getMappedRange: vi.fn(() => new ArrayBuffer(16)),
  unmap: vi.fn(),
};

const mockDevice = {
  createBuffer: vi.fn((desc) => {
    if (desc.size === 16) return mockLightCountBuffer;
    return mockLightsBuffer;
  }),
  queue: {
    writeBuffer: vi.fn(),
  },
};

import {
  createLightManager,
  type LightManager,
  type PointLight,
  type PointLightData,
  LIGHT_STRUCT_SIZE,
  DEFAULT_MAX_LIGHTS,
} from './light-manager';

describe('light-manager module', () => {
  let manager: LightManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = createLightManager(mockDevice as unknown as GPUDevice);
  });

  describe('createLightManager', () => {
    it('should export createLightManager function', () => {
      expect(createLightManager).toBeDefined();
      expect(typeof createLightManager).toBe('function');
    });

    it('should return a LightManager instance', () => {
      expect(manager).toHaveProperty('addLight');
      expect(manager).toHaveProperty('updateLight');
      expect(manager).toHaveProperty('removeLight');
      expect(manager).toHaveProperty('getLight');
      expect(manager).toHaveProperty('getLightCount');
      expect(manager).toHaveProperty('sync');
      expect(manager).toHaveProperty('dispose');
    });

    it('should create lights buffer', () => {
      expect(mockDevice.createBuffer).toHaveBeenCalledWith(
        expect.objectContaining({
          size: DEFAULT_MAX_LIGHTS * LIGHT_STRUCT_SIZE,
        })
      );
    });

    it('should create light count buffer', () => {
      expect(mockDevice.createBuffer).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 16, // vec4 aligned
        })
      );
    });

    it('should accept custom maxLights configuration', () => {
      vi.clearAllMocks();
      createLightManager(mockDevice as unknown as GPUDevice, { maxLights: 512 });

      expect(mockDevice.createBuffer).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 512 * LIGHT_STRUCT_SIZE,
        })
      );
    });
  });

  describe('LIGHT_STRUCT_SIZE', () => {
    it('should export LIGHT_STRUCT_SIZE constant', () => {
      expect(LIGHT_STRUCT_SIZE).toBeDefined();
      expect(typeof LIGHT_STRUCT_SIZE).toBe('number');
    });

    it('should be large enough for light data', () => {
      // position: vec3 + padding = 16 bytes
      // color: vec3 + padding = 16 bytes
      // range: f32, intensity: f32 + padding = 16 bytes
      // Total: 48 bytes (or 32 bytes packed)
      expect(LIGHT_STRUCT_SIZE).toBeGreaterThanOrEqual(32);
    });
  });

  describe('addLight', () => {
    it('should add a light and return its ID', () => {
      const light: PointLight = {
        position: new THREE.Vector3(1, 2, 3),
        color: new THREE.Color(1, 0.5, 0),
        range: 10,
        intensity: 2,
      };

      const id = manager.addLight(light);

      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThanOrEqual(0);
    });

    it('should increment light count', () => {
      expect(manager.getLightCount()).toBe(0);

      manager.addLight({
        position: new THREE.Vector3(0, 0, 0),
        color: new THREE.Color(1, 1, 1),
        range: 5,
        intensity: 1,
      });

      expect(manager.getLightCount()).toBe(1);
    });

    it('should assign unique IDs to lights', () => {
      const id1 = manager.addLight({
        position: new THREE.Vector3(0, 0, 0),
        color: new THREE.Color(1, 1, 1),
        range: 5,
        intensity: 1,
      });

      const id2 = manager.addLight({
        position: new THREE.Vector3(1, 1, 1),
        color: new THREE.Color(0, 1, 0),
        range: 8,
        intensity: 2,
      });

      expect(id1).not.toBe(id2);
    });

    it('should throw when max lights exceeded', () => {
      const smallManager = createLightManager(mockDevice as unknown as GPUDevice, {
        maxLights: 2,
      });

      smallManager.addLight({
        position: new THREE.Vector3(0, 0, 0),
        color: new THREE.Color(1, 1, 1),
        range: 5,
        intensity: 1,
      });

      smallManager.addLight({
        position: new THREE.Vector3(1, 1, 1),
        color: new THREE.Color(1, 1, 1),
        range: 5,
        intensity: 1,
      });

      expect(() =>
        smallManager.addLight({
          position: new THREE.Vector3(2, 2, 2),
          color: new THREE.Color(1, 1, 1),
          range: 5,
          intensity: 1,
        })
      ).toThrow('Maximum light count exceeded');
    });

    it('should mark manager as dirty', () => {
      manager.addLight({
        position: new THREE.Vector3(0, 0, 0),
        color: new THREE.Color(1, 1, 1),
        range: 5,
        intensity: 1,
      });

      expect(manager.isDirty()).toBe(true);
    });
  });

  describe('updateLight', () => {
    it('should update an existing light', () => {
      const id = manager.addLight({
        position: new THREE.Vector3(0, 0, 0),
        color: new THREE.Color(1, 1, 1),
        range: 5,
        intensity: 1,
      });

      manager.updateLight(id, {
        position: new THREE.Vector3(10, 20, 30),
        range: 15,
      });

      const light = manager.getLight(id);
      expect(light?.position.x).toBe(10);
      expect(light?.position.y).toBe(20);
      expect(light?.position.z).toBe(30);
      expect(light?.range).toBe(15);
    });

    it('should preserve unchanged properties', () => {
      const id = manager.addLight({
        position: new THREE.Vector3(1, 2, 3),
        color: new THREE.Color(1, 0, 0),
        range: 5,
        intensity: 2,
      });

      manager.updateLight(id, { intensity: 3 });

      const light = manager.getLight(id);
      expect(light?.color.r).toBe(1);
      expect(light?.color.g).toBe(0);
      expect(light?.range).toBe(5);
      expect(light?.intensity).toBe(3);
    });

    it('should throw for non-existent light ID', () => {
      expect(() => manager.updateLight(999, { intensity: 1 })).toThrow(
        'Light with ID 999 does not exist'
      );
    });

    it('should mark manager as dirty', () => {
      const id = manager.addLight({
        position: new THREE.Vector3(0, 0, 0),
        color: new THREE.Color(1, 1, 1),
        range: 5,
        intensity: 1,
      });

      manager.sync(); // Clear dirty flag
      manager.updateLight(id, { intensity: 2 });

      expect(manager.isDirty()).toBe(true);
    });
  });

  describe('removeLight', () => {
    it('should remove a light by ID', () => {
      const id = manager.addLight({
        position: new THREE.Vector3(0, 0, 0),
        color: new THREE.Color(1, 1, 1),
        range: 5,
        intensity: 1,
      });

      expect(manager.getLightCount()).toBe(1);

      manager.removeLight(id);

      expect(manager.getLightCount()).toBe(0);
      expect(manager.getLight(id)).toBeUndefined();
    });

    it('should allow the ID to be reused', () => {
      const id1 = manager.addLight({
        position: new THREE.Vector3(0, 0, 0),
        color: new THREE.Color(1, 1, 1),
        range: 5,
        intensity: 1,
      });

      manager.removeLight(id1);

      const id2 = manager.addLight({
        position: new THREE.Vector3(1, 1, 1),
        color: new THREE.Color(0, 1, 0),
        range: 8,
        intensity: 2,
      });

      // The removed slot can be reused
      expect(manager.getLightCount()).toBe(1);
    });

    it('should not throw for non-existent light ID', () => {
      expect(() => manager.removeLight(999)).not.toThrow();
    });

    it('should mark manager as dirty', () => {
      const id = manager.addLight({
        position: new THREE.Vector3(0, 0, 0),
        color: new THREE.Color(1, 1, 1),
        range: 5,
        intensity: 1,
      });

      manager.sync(); // Clear dirty flag
      manager.removeLight(id);

      expect(manager.isDirty()).toBe(true);
    });
  });

  describe('getLight', () => {
    it('should return light data for valid ID', () => {
      const id = manager.addLight({
        position: new THREE.Vector3(1, 2, 3),
        color: new THREE.Color(0.5, 0.6, 0.7),
        range: 10,
        intensity: 1.5,
      });

      const light = manager.getLight(id);

      expect(light).toBeDefined();
      expect(light?.position.x).toBe(1);
      expect(light?.position.y).toBe(2);
      expect(light?.position.z).toBe(3);
      expect(light?.range).toBe(10);
      expect(light?.intensity).toBe(1.5);
    });

    it('should return undefined for non-existent ID', () => {
      expect(manager.getLight(999)).toBeUndefined();
    });

    it('should return undefined for removed light', () => {
      const id = manager.addLight({
        position: new THREE.Vector3(0, 0, 0),
        color: new THREE.Color(1, 1, 1),
        range: 5,
        intensity: 1,
      });

      manager.removeLight(id);

      expect(manager.getLight(id)).toBeUndefined();
    });
  });

  describe('sync', () => {
    it('should upload light data to GPU', () => {
      manager.addLight({
        position: new THREE.Vector3(0, 0, 0),
        color: new THREE.Color(1, 1, 1),
        range: 5,
        intensity: 1,
      });

      manager.sync();

      expect(mockDevice.queue.writeBuffer).toHaveBeenCalled();
    });

    it('should upload light count to GPU', () => {
      manager.addLight({
        position: new THREE.Vector3(0, 0, 0),
        color: new THREE.Color(1, 1, 1),
        range: 5,
        intensity: 1,
      });

      manager.sync();

      // Should write to both buffers
      expect(mockDevice.queue.writeBuffer).toHaveBeenCalledTimes(2);
    });

    it('should clear dirty flag after sync', () => {
      manager.addLight({
        position: new THREE.Vector3(0, 0, 0),
        color: new THREE.Color(1, 1, 1),
        range: 5,
        intensity: 1,
      });

      expect(manager.isDirty()).toBe(true);

      manager.sync();

      expect(manager.isDirty()).toBe(false);
    });

    it('should skip upload if not dirty', () => {
      manager.addLight({
        position: new THREE.Vector3(0, 0, 0),
        color: new THREE.Color(1, 1, 1),
        range: 5,
        intensity: 1,
      });

      manager.sync();
      vi.clearAllMocks();
      manager.sync();

      expect(mockDevice.queue.writeBuffer).not.toHaveBeenCalled();
    });

    it('should force upload when requested', () => {
      manager.addLight({
        position: new THREE.Vector3(0, 0, 0),
        color: new THREE.Color(1, 1, 1),
        range: 5,
        intensity: 1,
      });

      manager.sync();
      vi.clearAllMocks();
      manager.sync(true); // Force sync

      expect(mockDevice.queue.writeBuffer).toHaveBeenCalled();
    });
  });

  describe('getBuffers', () => {
    it('should return lights buffer', () => {
      const buffers = manager.getBuffers();
      expect(buffers.lightsBuffer).toBe(mockLightsBuffer);
    });

    it('should return light count buffer', () => {
      const buffers = manager.getBuffers();
      expect(buffers.lightCountBuffer).toBe(mockLightCountBuffer);
    });
  });

  describe('getBindGroupLayout', () => {
    it('should return bind group layout descriptor', () => {
      const layout = manager.getBindGroupLayout();

      expect(layout).toHaveProperty('entries');
      expect(layout.entries.length).toBe(2); // lights + count buffers
    });

    it('should have read-only storage buffer for lights', () => {
      const layout = manager.getBindGroupLayout();
      const lightsEntry = layout.entries[0];

      expect(lightsEntry.buffer?.type).toBe('read-only-storage');
    });

    it('should have uniform buffer for light count', () => {
      const layout = manager.getBindGroupLayout();
      const countEntry = layout.entries[1];

      expect(countEntry.buffer?.type).toBe('uniform');
    });
  });

  describe('getAllLights', () => {
    it('should return empty array when no lights', () => {
      expect(manager.getAllLights()).toEqual([]);
    });

    it('should return all active lights', () => {
      manager.addLight({
        position: new THREE.Vector3(1, 0, 0),
        color: new THREE.Color(1, 0, 0),
        range: 5,
        intensity: 1,
      });

      manager.addLight({
        position: new THREE.Vector3(0, 1, 0),
        color: new THREE.Color(0, 1, 0),
        range: 8,
        intensity: 2,
      });

      const lights = manager.getAllLights();

      expect(lights.length).toBe(2);
    });

    it('should not include removed lights', () => {
      const id1 = manager.addLight({
        position: new THREE.Vector3(1, 0, 0),
        color: new THREE.Color(1, 0, 0),
        range: 5,
        intensity: 1,
      });

      manager.addLight({
        position: new THREE.Vector3(0, 1, 0),
        color: new THREE.Color(0, 1, 0),
        range: 8,
        intensity: 2,
      });

      manager.removeLight(id1);

      const lights = manager.getAllLights();

      expect(lights.length).toBe(1);
    });
  });

  describe('dispose', () => {
    it('should destroy lights buffer', () => {
      manager.dispose();
      expect(mockLightsBuffer.destroy).toHaveBeenCalled();
    });

    it('should destroy light count buffer', () => {
      manager.dispose();
      expect(mockLightCountBuffer.destroy).toHaveBeenCalled();
    });

    it('should not throw if called multiple times', () => {
      manager.dispose();
      expect(() => manager.dispose()).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should remove all lights', () => {
      manager.addLight({
        position: new THREE.Vector3(1, 0, 0),
        color: new THREE.Color(1, 0, 0),
        range: 5,
        intensity: 1,
      });

      manager.addLight({
        position: new THREE.Vector3(0, 1, 0),
        color: new THREE.Color(0, 1, 0),
        range: 8,
        intensity: 2,
      });

      expect(manager.getLightCount()).toBe(2);

      manager.clear();

      expect(manager.getLightCount()).toBe(0);
    });

    it('should mark manager as dirty', () => {
      manager.addLight({
        position: new THREE.Vector3(0, 0, 0),
        color: new THREE.Color(1, 1, 1),
        range: 5,
        intensity: 1,
      });

      manager.sync();
      manager.clear();

      expect(manager.isDirty()).toBe(true);
    });
  });
});

// Mock GPU constants for Node environment
const GPUBufferUsage = {
  STORAGE: 0x0080,
  UNIFORM: 0x0040,
  COPY_DST: 0x0008,
};
const GPUShaderStage = {
  VERTEX: 0x1,
  FRAGMENT: 0x2,
  COMPUTE: 0x4,
};
(globalThis as Record<string, unknown>).GPUBufferUsage = GPUBufferUsage;
(globalThis as Record<string, unknown>).GPUShaderStage = GPUShaderStage;
