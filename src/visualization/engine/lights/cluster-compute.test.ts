/**
 * @vitest-environment node
 *
 * ClusterCompute Tests (TDD)
 *
 * Tests for the compute shader pipeline that handles cluster bounds
 * calculation and light assignment.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock GPU objects
const mockShaderModule = { label: 'mock-shader-module' };
const mockComputePipeline = { label: 'mock-compute-pipeline' };
const mockBindGroupLayout = { label: 'mock-layout' };
const mockBindGroup = { label: 'mock-bind-group' };
const mockPipelineLayout = { label: 'mock-pipeline-layout' };

const mockComputePassEncoder = {
  setPipeline: vi.fn(),
  setBindGroup: vi.fn(),
  dispatchWorkgroups: vi.fn(),
  end: vi.fn(),
};

const mockCommandEncoder = {
  beginComputePass: vi.fn(() => mockComputePassEncoder),
};

const mockConfigBuffer = { destroy: vi.fn(), label: 'config-buffer' };

const mockDevice = {
  createShaderModule: vi.fn(() => mockShaderModule),
  createComputePipeline: vi.fn(() => mockComputePipeline),
  createComputePipelineAsync: vi.fn(() => {
    const pipeline = {
      ...mockComputePipeline,
      getBindGroupLayout: vi.fn(() => mockBindGroupLayout),
    };
    return Promise.resolve(pipeline);
  }),
  createBindGroupLayout: vi.fn(() => mockBindGroupLayout),
  createBindGroup: vi.fn(() => mockBindGroup),
  createPipelineLayout: vi.fn(() => mockPipelineLayout),
  createBuffer: vi.fn(() => mockConfigBuffer),
  queue: {
    writeBuffer: vi.fn(),
  },
};

// Mock camera uniform buffer
const mockCameraBuffer = { label: 'camera-buffer' };
const mockCameraBindGroup = { label: 'camera-bind-group' };

// Mock light manager
const mockLightsBuffer = { label: 'lights-buffer' };
const mockLightCountBuffer = { label: 'light-count-buffer' };
const mockLightManager = {
  getBuffers: vi.fn(() => ({
    lightsBuffer: mockLightsBuffer,
    lightCountBuffer: mockLightCountBuffer,
  })),
  getLightCount: vi.fn(() => 10),
};

// Mock cluster grid
const mockClusterBoundsBuffer = { label: 'cluster-bounds' };
const mockClusterLightsBuffer = { label: 'cluster-lights' };
const mockClusterIndicesBuffer = { label: 'cluster-indices' };
const mockClusterGrid = {
  getBuffers: vi.fn(() => ({
    clusterBoundsBuffer: mockClusterBoundsBuffer,
    clusterLightsBuffer: mockClusterLightsBuffer,
    clusterIndicesBuffer: mockClusterIndicesBuffer,
  })),
  getConfig: vi.fn(() => ({
    tileCountX: 8,
    tileCountY: 8,
    tileCountZ: 12,
    maxLightsPerCluster: 20,
    viewportWidth: 1920,
    viewportHeight: 1080,
    near: 0.1,
    far: 1000,
  })),
};

import {
  createClusterCompute,
  type ClusterCompute,
  type ClusterComputeConfig,
} from './cluster-compute';

import type { LightManager } from './light-manager';
import type { ClusterGrid } from './cluster-grid';

describe('cluster-compute module', () => {
  let compute: ClusterCompute;

  beforeEach(() => {
    vi.clearAllMocks();
    compute = createClusterCompute(
      mockDevice as unknown as GPUDevice,
      mockLightManager as unknown as LightManager,
      mockClusterGrid as unknown as ClusterGrid
    );
  });

  describe('createClusterCompute', () => {
    it('should export createClusterCompute function', () => {
      expect(createClusterCompute).toBeDefined();
      expect(typeof createClusterCompute).toBe('function');
    });

    it('should return a ClusterCompute instance', () => {
      expect(compute).toHaveProperty('initialize');
      expect(compute).toHaveProperty('updateBounds');
      expect(compute).toHaveProperty('assignLights');
      expect(compute).toHaveProperty('execute');
      expect(compute).toHaveProperty('isInitialized');
      expect(compute).toHaveProperty('dispose');
    });

    it('should create shader modules', () => {
      expect(mockDevice.createShaderModule).toHaveBeenCalled();
    });
  });

  describe('initialize', () => {
    it('should create compute pipelines', async () => {
      await compute.initialize();

      expect(mockDevice.createComputePipelineAsync).toHaveBeenCalled();
    });

    it('should mark as initialized', async () => {
      expect(compute.isInitialized()).toBe(false);

      await compute.initialize();

      expect(compute.isInitialized()).toBe(true);
    });

    it('should create bind groups', async () => {
      await compute.initialize();

      expect(mockDevice.createBindGroup).toHaveBeenCalled();
    });

    it('should be idempotent', async () => {
      await compute.initialize();
      vi.clearAllMocks();
      await compute.initialize();

      // Should not recreate pipelines
      expect(mockDevice.createComputePipelineAsync).not.toHaveBeenCalled();
    });
  });

  describe('updateBounds', () => {
    it('should throw if not initialized', () => {
      expect(() =>
        compute.updateBounds(mockCommandEncoder as unknown as GPUCommandEncoder)
      ).toThrow('ClusterCompute not initialized');
    });

    it('should begin compute pass', async () => {
      await compute.initialize();

      compute.updateBounds(mockCommandEncoder as unknown as GPUCommandEncoder);

      expect(mockCommandEncoder.beginComputePass).toHaveBeenCalled();
    });

    it('should set pipeline and bind groups', async () => {
      await compute.initialize();

      compute.updateBounds(mockCommandEncoder as unknown as GPUCommandEncoder);

      expect(mockComputePassEncoder.setPipeline).toHaveBeenCalled();
      expect(mockComputePassEncoder.setBindGroup).toHaveBeenCalled();
    });

    it('should dispatch correct workgroups for cluster bounds', async () => {
      await compute.initialize();

      compute.updateBounds(mockCommandEncoder as unknown as GPUCommandEncoder);

      // 8x8x12 clusters with 4x4x4 workgroup = 2x2x3 dispatches
      expect(mockComputePassEncoder.dispatchWorkgroups).toHaveBeenCalledWith(
        2, 2, 3
      );
    });

    it('should end compute pass', async () => {
      await compute.initialize();

      compute.updateBounds(mockCommandEncoder as unknown as GPUCommandEncoder);

      expect(mockComputePassEncoder.end).toHaveBeenCalled();
    });
  });

  describe('assignLights', () => {
    it('should throw if not initialized', () => {
      expect(() =>
        compute.assignLights(mockCommandEncoder as unknown as GPUCommandEncoder)
      ).toThrow('ClusterCompute not initialized');
    });

    it('should begin compute pass', async () => {
      await compute.initialize();
      vi.clearAllMocks();

      compute.assignLights(mockCommandEncoder as unknown as GPUCommandEncoder);

      expect(mockCommandEncoder.beginComputePass).toHaveBeenCalled();
    });

    it('should dispatch workgroups based on light count', async () => {
      await compute.initialize();
      vi.clearAllMocks();

      compute.assignLights(mockCommandEncoder as unknown as GPUCommandEncoder);

      // 10 lights with workgroup size 64 = 1 dispatch
      expect(mockComputePassEncoder.dispatchWorkgroups).toHaveBeenCalled();
    });

    it('should skip dispatch if no lights', async () => {
      mockLightManager.getLightCount.mockReturnValue(0);

      await compute.initialize();
      vi.clearAllMocks();

      compute.assignLights(mockCommandEncoder as unknown as GPUCommandEncoder);

      // Should still begin and end pass for clearing
      expect(mockCommandEncoder.beginComputePass).toHaveBeenCalled();
    });
  });

  describe('execute', () => {
    it('should throw if not initialized', () => {
      expect(() =>
        compute.execute(mockCommandEncoder as unknown as GPUCommandEncoder)
      ).toThrow('ClusterCompute not initialized');
    });

    it('should run both updateBounds and assignLights', async () => {
      await compute.initialize();
      vi.clearAllMocks();

      compute.execute(mockCommandEncoder as unknown as GPUCommandEncoder);

      // Should have two compute passes
      expect(mockCommandEncoder.beginComputePass).toHaveBeenCalledTimes(2);
    });

    it('should accept optional camera bind group', async () => {
      await compute.initialize();

      expect(() =>
        compute.execute(
          mockCommandEncoder as unknown as GPUCommandEncoder,
          mockCameraBindGroup as unknown as GPUBindGroup
        )
      ).not.toThrow();
    });
  });

  describe('setCameraBuffer', () => {
    it('should update camera uniform buffer reference', async () => {
      await compute.initialize();

      compute.setCameraBuffer(mockCameraBuffer as unknown as GPUBuffer);

      // Should recreate bind groups with new camera buffer
      expect(mockDevice.createBindGroup).toHaveBeenCalled();
    });
  });

  describe('getShaderCode', () => {
    it('should return cluster bounds shader code', () => {
      const code = compute.getShaderCode('bounds');

      expect(code).toContain('fn main');
      expect(code).toContain('@compute');
    });

    it('should return light assignment shader code', () => {
      const code = compute.getShaderCode('assignment');

      expect(code).toContain('fn main');
      expect(code).toContain('@compute');
    });
  });

  describe('dispose', () => {
    it('should not throw before initialization', () => {
      expect(() => compute.dispose()).not.toThrow();
    });

    it('should not throw after initialization', async () => {
      await compute.initialize();
      expect(() => compute.dispose()).not.toThrow();
    });

    it('should mark as not initialized', async () => {
      await compute.initialize();
      compute.dispose();

      expect(compute.isInitialized()).toBe(false);
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
