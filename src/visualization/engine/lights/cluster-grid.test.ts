/**
 * @vitest-environment node
 *
 * ClusterGrid Tests (TDD)
 *
 * Tests for the cluster grid that subdivides the view frustum
 * for clustered lighting.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock GPU buffers
const mockClusterBoundsBuffer = { destroy: vi.fn(), label: 'cluster-bounds' };
const mockClusterLightsBuffer = { destroy: vi.fn(), label: 'cluster-lights' };
const mockClusterIndicesBuffer = { destroy: vi.fn(), label: 'cluster-indices' };

const mockBindGroupLayout = { label: 'mock-layout' };
const mockBindGroup = { label: 'mock-bind-group' };

const mockDevice = {
  createBuffer: vi.fn((desc) => {
    if (desc.label === 'cluster-bounds') return mockClusterBoundsBuffer;
    if (desc.label === 'cluster-lights') return mockClusterLightsBuffer;
    if (desc.label === 'cluster-indices') return mockClusterIndicesBuffer;
    return { destroy: vi.fn() };
  }),
  createBindGroupLayout: vi.fn(() => mockBindGroupLayout),
  createBindGroup: vi.fn(() => mockBindGroup),
};

import {
  createClusterGrid,
  type ClusterGrid,
  type ClusterGridConfig,
  TILE_COUNT_X,
  TILE_COUNT_Y,
  TILE_COUNT_Z,
  MAX_LIGHTS_PER_CLUSTER,
  CLUSTER_COUNT,
} from './cluster-grid';

describe('cluster-grid module', () => {
  let grid: ClusterGrid;

  beforeEach(() => {
    vi.clearAllMocks();
    grid = createClusterGrid(mockDevice as unknown as GPUDevice);
  });

  describe('constants', () => {
    it('should export TILE_COUNT constants', () => {
      expect(TILE_COUNT_X).toBe(8);
      expect(TILE_COUNT_Y).toBe(8);
      expect(TILE_COUNT_Z).toBe(12);
    });

    it('should export MAX_LIGHTS_PER_CLUSTER', () => {
      expect(MAX_LIGHTS_PER_CLUSTER).toBe(20);
    });

    it('should export CLUSTER_COUNT', () => {
      expect(CLUSTER_COUNT).toBe(8 * 8 * 12); // 768
    });
  });

  describe('createClusterGrid', () => {
    it('should export createClusterGrid function', () => {
      expect(createClusterGrid).toBeDefined();
      expect(typeof createClusterGrid).toBe('function');
    });

    it('should return a ClusterGrid instance', () => {
      expect(grid).toHaveProperty('getBuffers');
      expect(grid).toHaveProperty('getBindGroupLayout');
      expect(grid).toHaveProperty('getBindGroup');
      expect(grid).toHaveProperty('getConfig');
      expect(grid).toHaveProperty('resize');
      expect(grid).toHaveProperty('dispose');
    });

    it('should create cluster bounds buffer', () => {
      expect(mockDevice.createBuffer).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'cluster-bounds',
        })
      );
    });

    it('should create cluster lights buffer', () => {
      expect(mockDevice.createBuffer).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'cluster-lights',
        })
      );
    });

    it('should create cluster indices buffer', () => {
      expect(mockDevice.createBuffer).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'cluster-indices',
        })
      );
    });

    it('should accept custom tile counts', () => {
      vi.clearAllMocks();

      createClusterGrid(mockDevice as unknown as GPUDevice, {
        tileCountX: 16,
        tileCountY: 16,
        tileCountZ: 24,
      });

      // Should create buffers with larger size
      expect(mockDevice.createBuffer).toHaveBeenCalled();
    });
  });

  describe('buffer sizes', () => {
    it('should create bounds buffer with correct size', () => {
      // Each cluster has min/max AABB (6 floats = 24 bytes, aligned to 32)
      // 768 clusters * 32 bytes = 24,576 bytes
      expect(mockDevice.createBuffer).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'cluster-bounds',
          size: expect.any(Number),
        })
      );

      const boundsCall = mockDevice.createBuffer.mock.calls.find(
        (c) => c[0].label === 'cluster-bounds'
      );
      expect(boundsCall[0].size).toBeGreaterThanOrEqual(CLUSTER_COUNT * 24);
    });

    it('should create lights buffer with correct size', () => {
      // Each cluster has light count (u32) = 4 bytes, aligned to 16
      // 768 clusters * 16 bytes = 12,288 bytes
      expect(mockDevice.createBuffer).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'cluster-lights',
          size: expect.any(Number),
        })
      );
    });

    it('should create indices buffer with correct size', () => {
      // Each cluster can have MAX_LIGHTS_PER_CLUSTER indices (u32)
      // 768 clusters * 20 lights * 4 bytes = 61,440 bytes
      expect(mockDevice.createBuffer).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'cluster-indices',
          size: expect.any(Number),
        })
      );

      const indicesCall = mockDevice.createBuffer.mock.calls.find(
        (c) => c[0].label === 'cluster-indices'
      );
      expect(indicesCall[0].size).toBe(
        CLUSTER_COUNT * MAX_LIGHTS_PER_CLUSTER * 4
      );
    });
  });

  describe('getBuffers', () => {
    it('should return all cluster buffers', () => {
      const buffers = grid.getBuffers();

      expect(buffers).toHaveProperty('clusterBoundsBuffer');
      expect(buffers).toHaveProperty('clusterLightsBuffer');
      expect(buffers).toHaveProperty('clusterIndicesBuffer');
    });

    it('should return the created buffers', () => {
      const buffers = grid.getBuffers();

      expect(buffers.clusterBoundsBuffer).toBe(mockClusterBoundsBuffer);
      expect(buffers.clusterLightsBuffer).toBe(mockClusterLightsBuffer);
      expect(buffers.clusterIndicesBuffer).toBe(mockClusterIndicesBuffer);
    });
  });

  describe('getBindGroupLayout', () => {
    it('should return bind group layout descriptor', () => {
      const layout = grid.getBindGroupLayout();

      expect(layout).toHaveProperty('entries');
      expect(layout.entries.length).toBe(3);
    });

    it('should have storage buffer entries for compute shader', () => {
      const layout = grid.getBindGroupLayout();

      // All buffers should be storage for compute shader writes
      layout.entries.forEach((entry) => {
        expect(entry.buffer).toBeDefined();
      });
    });

    it('should have correct visibility for compute and fragment', () => {
      const layout = grid.getBindGroupLayout();

      layout.entries.forEach((entry) => {
        expect(entry.visibility).toBeDefined();
      });
    });
  });

  describe('getBindGroup', () => {
    it('should create and return bind group', () => {
      const bindGroup = grid.getBindGroup();

      expect(mockDevice.createBindGroup).toHaveBeenCalled();
      expect(bindGroup).toBe(mockBindGroup);
    });

    it('should cache the bind group', () => {
      grid.getBindGroup();
      grid.getBindGroup();

      // Should only create once
      expect(mockDevice.createBindGroup).toHaveBeenCalledTimes(1);
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = grid.getConfig();

      expect(config.tileCountX).toBe(TILE_COUNT_X);
      expect(config.tileCountY).toBe(TILE_COUNT_Y);
      expect(config.tileCountZ).toBe(TILE_COUNT_Z);
      expect(config.maxLightsPerCluster).toBe(MAX_LIGHTS_PER_CLUSTER);
    });

    it('should return custom configuration if provided', () => {
      const customGrid = createClusterGrid(mockDevice as unknown as GPUDevice, {
        tileCountX: 16,
        tileCountY: 8,
        tileCountZ: 24,
        maxLightsPerCluster: 32,
      });

      const config = customGrid.getConfig();

      expect(config.tileCountX).toBe(16);
      expect(config.tileCountY).toBe(8);
      expect(config.tileCountZ).toBe(24);
      expect(config.maxLightsPerCluster).toBe(32);
    });
  });

  describe('resize', () => {
    it('should update viewport dimensions', () => {
      grid.resize(1920, 1080, 0.1, 1000);

      const config = grid.getConfig();
      expect(config.viewportWidth).toBe(1920);
      expect(config.viewportHeight).toBe(1080);
    });

    it('should update near/far planes', () => {
      grid.resize(1920, 1080, 0.5, 500);

      const config = grid.getConfig();
      expect(config.near).toBe(0.5);
      expect(config.far).toBe(500);
    });

    it('should invalidate cached bind group', () => {
      grid.getBindGroup(); // Cache it
      vi.clearAllMocks();

      grid.resize(1920, 1080, 0.1, 1000);
      grid.getBindGroup(); // Should recreate

      // Bind group should be recreated after resize
      expect(mockDevice.createBindGroup).toHaveBeenCalled();
    });
  });

  describe('getClusterIndex', () => {
    it('should compute cluster index from screen position and depth', () => {
      grid.resize(1920, 1080, 0.1, 1000);

      // Test various positions
      const index = grid.getClusterIndex(960, 540, 10);

      expect(typeof index).toBe('number');
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(CLUSTER_COUNT);
    });

    it('should return different indices for different positions', () => {
      grid.resize(1920, 1080, 0.1, 1000);

      const index1 = grid.getClusterIndex(0, 0, 1);
      const index2 = grid.getClusterIndex(1920, 1080, 100);

      expect(index1).not.toBe(index2);
    });

    it('should clamp to valid range', () => {
      grid.resize(1920, 1080, 0.1, 1000);

      // Out of bounds positions should still return valid indices
      const index = grid.getClusterIndex(-100, -100, 0.01);

      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(CLUSTER_COUNT);
    });
  });

  describe('getTileSize', () => {
    it('should return tile size in pixels', () => {
      grid.resize(1920, 1080, 0.1, 1000);

      const tileSize = grid.getTileSize();

      expect(tileSize.x).toBe(1920 / TILE_COUNT_X);
      expect(tileSize.y).toBe(1080 / TILE_COUNT_Y);
    });
  });

  describe('getUniformData', () => {
    it('should return uniform data for shaders', () => {
      grid.resize(1920, 1080, 0.1, 1000);

      const data = grid.getUniformData();

      expect(data).toHaveProperty('tileCount');
      expect(data).toHaveProperty('tileSize');
      expect(data).toHaveProperty('near');
      expect(data).toHaveProperty('far');
      expect(data).toHaveProperty('viewportSize');
    });

    it('should have correct tile count', () => {
      const data = grid.getUniformData();

      expect(data.tileCount).toEqual([TILE_COUNT_X, TILE_COUNT_Y, TILE_COUNT_Z]);
    });
  });

  describe('dispose', () => {
    it('should destroy all buffers', () => {
      grid.dispose();

      expect(mockClusterBoundsBuffer.destroy).toHaveBeenCalled();
      expect(mockClusterLightsBuffer.destroy).toHaveBeenCalled();
      expect(mockClusterIndicesBuffer.destroy).toHaveBeenCalled();
    });

    it('should not throw if called multiple times', () => {
      grid.dispose();
      expect(() => grid.dispose()).not.toThrow();
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
