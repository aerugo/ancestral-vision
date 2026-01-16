/**
 * @vitest-environment node
 *
 * PipelineFactory Tests (TDD)
 *
 * Tests for the pipeline factory that handles async pipeline creation
 * with caching to avoid redundant compilation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock GPUDevice
const mockRenderPipeline = { label: 'mock-render-pipeline' };
const mockComputePipeline = { label: 'mock-compute-pipeline' };

const mockDevice = {
  createRenderPipelineAsync: vi.fn(() => Promise.resolve(mockRenderPipeline)),
  createComputePipelineAsync: vi.fn(() => Promise.resolve(mockComputePipeline)),
  createRenderPipeline: vi.fn(() => mockRenderPipeline),
  createComputePipeline: vi.fn(() => mockComputePipeline),
};

const mockShaderModule = { label: 'mock-shader' };

import {
  createPipelineFactory,
  type PipelineFactory,
} from './pipeline-factory';

describe('pipeline-factory module', () => {
  let factory: PipelineFactory;

  beforeEach(() => {
    vi.clearAllMocks();
    factory = createPipelineFactory(mockDevice as unknown as GPUDevice);
  });

  describe('createPipelineFactory', () => {
    it('should export createPipelineFactory function', () => {
      expect(createPipelineFactory).toBeDefined();
      expect(typeof createPipelineFactory).toBe('function');
    });

    it('should return a PipelineFactory instance', () => {
      expect(factory).toHaveProperty('createRenderPipelineAsync');
      expect(factory).toHaveProperty('createComputePipelineAsync');
      expect(factory).toHaveProperty('getOrCreateRenderPipeline');
      expect(factory).toHaveProperty('getOrCreateComputePipeline');
      expect(factory).toHaveProperty('getCachedPipeline');
      expect(factory).toHaveProperty('hasPipeline');
      expect(factory).toHaveProperty('clearCache');
    });
  });

  describe('createRenderPipelineAsync', () => {
    it('should call device.createRenderPipelineAsync', async () => {
      const descriptor: GPURenderPipelineDescriptor = {
        layout: 'auto',
        vertex: {
          module: mockShaderModule as unknown as GPUShaderModule,
          entryPoint: 'vertexMain',
        },
      };

      await factory.createRenderPipelineAsync(descriptor);

      expect(mockDevice.createRenderPipelineAsync).toHaveBeenCalledWith(descriptor);
    });

    it('should return the created pipeline', async () => {
      const descriptor: GPURenderPipelineDescriptor = {
        layout: 'auto',
        vertex: {
          module: mockShaderModule as unknown as GPUShaderModule,
          entryPoint: 'vertexMain',
        },
      };

      const pipeline = await factory.createRenderPipelineAsync(descriptor);

      expect(pipeline).toBe(mockRenderPipeline);
    });
  });

  describe('createComputePipelineAsync', () => {
    it('should call device.createComputePipelineAsync', async () => {
      const descriptor: GPUComputePipelineDescriptor = {
        layout: 'auto',
        compute: {
          module: mockShaderModule as unknown as GPUShaderModule,
          entryPoint: 'computeMain',
        },
      };

      await factory.createComputePipelineAsync(descriptor);

      expect(mockDevice.createComputePipelineAsync).toHaveBeenCalledWith(descriptor);
    });

    it('should return the created pipeline', async () => {
      const descriptor: GPUComputePipelineDescriptor = {
        layout: 'auto',
        compute: {
          module: mockShaderModule as unknown as GPUShaderModule,
          entryPoint: 'computeMain',
        },
      };

      const pipeline = await factory.createComputePipelineAsync(descriptor);

      expect(pipeline).toBe(mockComputePipeline);
    });
  });

  describe('getOrCreateRenderPipeline (caching)', () => {
    it('should create pipeline on first call', async () => {
      const descriptor: GPURenderPipelineDescriptor = {
        layout: 'auto',
        vertex: {
          module: mockShaderModule as unknown as GPUShaderModule,
          entryPoint: 'vertexMain',
        },
      };

      await factory.getOrCreateRenderPipeline('test-key', descriptor);

      expect(mockDevice.createRenderPipelineAsync).toHaveBeenCalledTimes(1);
    });

    it('should return cached pipeline on subsequent calls', async () => {
      const descriptor: GPURenderPipelineDescriptor = {
        layout: 'auto',
        vertex: {
          module: mockShaderModule as unknown as GPUShaderModule,
          entryPoint: 'vertexMain',
        },
      };

      const first = await factory.getOrCreateRenderPipeline('cache-test', descriptor);
      const second = await factory.getOrCreateRenderPipeline('cache-test', descriptor);

      expect(first).toBe(second);
      expect(mockDevice.createRenderPipelineAsync).toHaveBeenCalledTimes(1);
    });

    it('should create different pipelines for different keys', async () => {
      const descriptor1: GPURenderPipelineDescriptor = {
        layout: 'auto',
        vertex: {
          module: mockShaderModule as unknown as GPUShaderModule,
          entryPoint: 'vertexMain1',
        },
      };
      const descriptor2: GPURenderPipelineDescriptor = {
        layout: 'auto',
        vertex: {
          module: mockShaderModule as unknown as GPUShaderModule,
          entryPoint: 'vertexMain2',
        },
      };

      await factory.getOrCreateRenderPipeline('key1', descriptor1);
      await factory.getOrCreateRenderPipeline('key2', descriptor2);

      expect(mockDevice.createRenderPipelineAsync).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent requests for same key', async () => {
      const descriptor: GPURenderPipelineDescriptor = {
        layout: 'auto',
        vertex: {
          module: mockShaderModule as unknown as GPUShaderModule,
          entryPoint: 'vertexMain',
        },
      };

      // Start both requests simultaneously
      const [first, second] = await Promise.all([
        factory.getOrCreateRenderPipeline('concurrent-test', descriptor),
        factory.getOrCreateRenderPipeline('concurrent-test', descriptor),
      ]);

      expect(first).toBe(second);
      // Should only create once despite concurrent requests
      expect(mockDevice.createRenderPipelineAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('getOrCreateComputePipeline (caching)', () => {
    it('should create pipeline on first call', async () => {
      const descriptor: GPUComputePipelineDescriptor = {
        layout: 'auto',
        compute: {
          module: mockShaderModule as unknown as GPUShaderModule,
          entryPoint: 'computeMain',
        },
      };

      await factory.getOrCreateComputePipeline('compute-key', descriptor);

      expect(mockDevice.createComputePipelineAsync).toHaveBeenCalledTimes(1);
    });

    it('should return cached pipeline on subsequent calls', async () => {
      const descriptor: GPUComputePipelineDescriptor = {
        layout: 'auto',
        compute: {
          module: mockShaderModule as unknown as GPUShaderModule,
          entryPoint: 'computeMain',
        },
      };

      const first = await factory.getOrCreateComputePipeline('compute-cache', descriptor);
      const second = await factory.getOrCreateComputePipeline('compute-cache', descriptor);

      expect(first).toBe(second);
      expect(mockDevice.createComputePipelineAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCachedPipeline', () => {
    it('should return null for non-existent key', () => {
      expect(factory.getCachedPipeline('non-existent')).toBeNull();
    });

    it('should return cached render pipeline', async () => {
      const descriptor: GPURenderPipelineDescriptor = {
        layout: 'auto',
        vertex: {
          module: mockShaderModule as unknown as GPUShaderModule,
          entryPoint: 'vertexMain',
        },
      };

      await factory.getOrCreateRenderPipeline('get-cached-test', descriptor);
      const cached = factory.getCachedPipeline('get-cached-test');

      expect(cached).toBe(mockRenderPipeline);
    });

    it('should return cached compute pipeline', async () => {
      const descriptor: GPUComputePipelineDescriptor = {
        layout: 'auto',
        compute: {
          module: mockShaderModule as unknown as GPUShaderModule,
          entryPoint: 'computeMain',
        },
      };

      await factory.getOrCreateComputePipeline('get-cached-compute', descriptor);
      const cached = factory.getCachedPipeline('get-cached-compute');

      expect(cached).toBe(mockComputePipeline);
    });
  });

  describe('hasPipeline', () => {
    it('should return false for non-existent key', () => {
      expect(factory.hasPipeline('non-existent')).toBe(false);
    });

    it('should return true for cached pipeline', async () => {
      const descriptor: GPURenderPipelineDescriptor = {
        layout: 'auto',
        vertex: {
          module: mockShaderModule as unknown as GPUShaderModule,
          entryPoint: 'vertexMain',
        },
      };

      await factory.getOrCreateRenderPipeline('has-test', descriptor);

      expect(factory.hasPipeline('has-test')).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached pipelines', async () => {
      const descriptor: GPURenderPipelineDescriptor = {
        layout: 'auto',
        vertex: {
          module: mockShaderModule as unknown as GPUShaderModule,
          entryPoint: 'vertexMain',
        },
      };

      await factory.getOrCreateRenderPipeline('clear-test-1', descriptor);
      await factory.getOrCreateRenderPipeline('clear-test-2', descriptor);

      expect(factory.hasPipeline('clear-test-1')).toBe(true);
      expect(factory.hasPipeline('clear-test-2')).toBe(true);

      factory.clearCache();

      expect(factory.hasPipeline('clear-test-1')).toBe(false);
      expect(factory.hasPipeline('clear-test-2')).toBe(false);
    });

    it('should allow recreation after clear', async () => {
      const descriptor: GPURenderPipelineDescriptor = {
        layout: 'auto',
        vertex: {
          module: mockShaderModule as unknown as GPUShaderModule,
          entryPoint: 'vertexMain',
        },
      };

      await factory.getOrCreateRenderPipeline('recreate-test', descriptor);
      factory.clearCache();
      await factory.getOrCreateRenderPipeline('recreate-test', descriptor);

      // Should have been created twice (once before clear, once after)
      expect(mockDevice.createRenderPipelineAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('getCacheSize', () => {
    it('should return 0 for empty cache', () => {
      expect(factory.getCacheSize()).toBe(0);
    });

    it('should return correct count of cached pipelines', async () => {
      const renderDesc: GPURenderPipelineDescriptor = {
        layout: 'auto',
        vertex: {
          module: mockShaderModule as unknown as GPUShaderModule,
          entryPoint: 'vertexMain',
        },
      };
      const computeDesc: GPUComputePipelineDescriptor = {
        layout: 'auto',
        compute: {
          module: mockShaderModule as unknown as GPUShaderModule,
          entryPoint: 'computeMain',
        },
      };

      await factory.getOrCreateRenderPipeline('size-test-1', renderDesc);
      await factory.getOrCreateRenderPipeline('size-test-2', renderDesc);
      await factory.getOrCreateComputePipeline('size-test-3', computeDesc);

      expect(factory.getCacheSize()).toBe(3);
    });
  });
});
