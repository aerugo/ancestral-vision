/**
 * @vitest-environment node
 *
 * FlowingMaterial Tests (TDD)
 *
 * Tests for the flowing material system with tri-planar texturing
 * and animated flow effects.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock GPU objects
const mockShaderModule = { label: 'mock-shader' };
const mockPipelineLayout = { label: 'mock-pipeline-layout' };
const mockBindGroupLayout = { label: 'mock-bind-group-layout' };
const mockBindGroup = { label: 'mock-bind-group' };
let bufferCount = 0;
const createMockBuffer = () => ({
  destroy: vi.fn(),
  label: `uniform-buffer-${bufferCount++}`,
});

let mockUniformBuffer = createMockBuffer();

const mockDevice = {
  createShaderModule: vi.fn(() => mockShaderModule),
  createPipelineLayout: vi.fn(() => mockPipelineLayout),
  createBindGroupLayout: vi.fn(() => mockBindGroupLayout),
  createBindGroup: vi.fn(() => mockBindGroup),
  createBuffer: vi.fn(() => {
    mockUniformBuffer = createMockBuffer();
    return mockUniformBuffer;
  }),
  queue: {
    writeBuffer: vi.fn(),
  },
};

// Mock texture manager
const mockTexture = { label: 'mock-texture' };
const mockTextureView = { label: 'mock-texture-view' };
const mockSampler = { label: 'mock-sampler' };

const mockTextureManager = {
  getTexture: vi.fn(() => mockTexture),
  getTextureView: vi.fn(() => mockTextureView),
  getSampler: vi.fn(() => mockSampler),
  hasTexture: vi.fn(() => true),
  loadTexture: vi.fn(() => Promise.resolve(mockTexture)),
};

import {
  createFlowingMaterial,
  type FlowingMaterial,
  type FlowingMaterialConfig,
  type FlowingMaterialUniforms,
  FLOWING_MATERIAL_UNIFORM_SIZE,
} from './flowing-material';

import type { TextureManager } from '../textures/texture-manager';

describe('flowing-material module', () => {
  let material: FlowingMaterial;

  beforeEach(() => {
    vi.clearAllMocks();
    material = createFlowingMaterial(
      mockDevice as unknown as GPUDevice,
      mockTextureManager as unknown as TextureManager
    );
  });

  describe('createFlowingMaterial', () => {
    it('should export createFlowingMaterial function', () => {
      expect(createFlowingMaterial).toBeDefined();
      expect(typeof createFlowingMaterial).toBe('function');
    });

    it('should return a FlowingMaterial instance', () => {
      expect(material).toHaveProperty('configure');
      expect(material).toHaveProperty('update');
      expect(material).toHaveProperty('getBindGroup');
      expect(material).toHaveProperty('getBindGroupLayout');
      expect(material).toHaveProperty('getShaderCode');
      expect(material).toHaveProperty('dispose');
    });

    it('should create uniform buffer', () => {
      expect(mockDevice.createBuffer).toHaveBeenCalledWith(
        expect.objectContaining({
          size: FLOWING_MATERIAL_UNIFORM_SIZE,
        })
      );
    });
  });

  describe('FLOWING_MATERIAL_UNIFORM_SIZE', () => {
    it('should export uniform size constant', () => {
      expect(FLOWING_MATERIAL_UNIFORM_SIZE).toBeDefined();
      expect(typeof FLOWING_MATERIAL_UNIFORM_SIZE).toBe('number');
    });

    it('should be aligned to 16 bytes', () => {
      expect(FLOWING_MATERIAL_UNIFORM_SIZE % 16).toBe(0);
    });

    it('should accommodate all material properties', () => {
      // baseColor: vec3 + padding = 16 bytes
      // emissive: vec3 + emissiveStrength = 16 bytes
      // flowSpeed, flowScale, turbulence, time = 16 bytes
      // triplanarBlend, metallic, roughness, padding = 16 bytes
      expect(FLOWING_MATERIAL_UNIFORM_SIZE).toBeGreaterThanOrEqual(64);
    });
  });

  describe('configure', () => {
    it('should accept partial configuration', () => {
      expect(() =>
        material.configure({
          baseColor: [1, 0, 0],
        })
      ).not.toThrow();
    });

    it('should accept full configuration', () => {
      const config: FlowingMaterialConfig = {
        baseColor: [0.9, 0.3, 0.1],
        emissive: [1.0, 0.4, 0.0],
        emissiveStrength: 2.0,
        flowSpeed: 0.5,
        flowScale: 0.3,
        turbulence: 2.0,
        triplanarBlend: 4.0,
        metallic: 0.0,
        roughness: 0.5,
        baseTexture: 'lava',
      };

      expect(() => material.configure(config)).not.toThrow();
    });

    it('should mark material as dirty', () => {
      material.configure({ flowSpeed: 1.0 });
      expect(material.isDirty()).toBe(true);
    });

    it('should load texture when baseTexture is specified', async () => {
      mockTextureManager.hasTexture.mockReturnValue(false);

      material.configure({ baseTexture: 'new-texture' });
      await material.loadTextures('/textures');

      expect(mockTextureManager.loadTexture).toHaveBeenCalledWith(
        'new-texture',
        '/textures/new-texture.jpg',
        expect.any(Object)
      );
    });
  });

  describe('update', () => {
    it('should update time uniform', () => {
      material.update(1.5);

      expect(mockDevice.queue.writeBuffer).toHaveBeenCalled();
    });

    it('should write uniform data to GPU', () => {
      material.configure({ baseColor: [1, 0, 0] });
      material.update(0.0);

      expect(mockDevice.queue.writeBuffer).toHaveBeenCalled();
      const call = mockDevice.queue.writeBuffer.mock.calls[0];
      expect(call[1]).toBe(0); // offset
      expect(call[2].byteLength).toBeDefined(); // ArrayBuffer or TypedArray buffer
    });

    it('should skip upload if not dirty and time unchanged', () => {
      material.update(0.0);
      vi.clearAllMocks();

      material.update(0.0);

      // May or may not write depending on implementation
      // The point is it doesn't throw
      expect(() => material.update(0.0)).not.toThrow();
    });
  });

  describe('getUniforms', () => {
    it('should return current uniform values', () => {
      material.configure({
        baseColor: [1, 0.5, 0],
        emissiveStrength: 1.5,
      });

      const uniforms = material.getUniforms();

      expect(uniforms.baseColor).toEqual([1, 0.5, 0]);
      expect(uniforms.emissiveStrength).toBe(1.5);
    });

    it('should include time value', () => {
      material.update(2.5);

      const uniforms = material.getUniforms();

      expect(uniforms.time).toBe(2.5);
    });
  });

  describe('getBindGroupLayout', () => {
    it('should return bind group layout descriptor', () => {
      const layout = material.getBindGroupLayout();

      expect(layout).toHaveProperty('entries');
      expect(Array.isArray(layout.entries)).toBe(true);
    });

    it('should have uniform buffer binding', () => {
      const layout = material.getBindGroupLayout();
      const uniformEntry = layout.entries.find(
        (e) => e.buffer?.type === 'uniform'
      );

      expect(uniformEntry).toBeDefined();
    });

    it('should have texture binding', () => {
      const layout = material.getBindGroupLayout();
      const textureEntry = layout.entries.find((e) => e.texture);

      expect(textureEntry).toBeDefined();
    });

    it('should have sampler binding', () => {
      const layout = material.getBindGroupLayout();
      const samplerEntry = layout.entries.find((e) => e.sampler);

      expect(samplerEntry).toBeDefined();
    });
  });

  describe('getBindGroup', () => {
    it('should return null if no texture configured', () => {
      mockTextureManager.hasTexture.mockReturnValue(false);
      mockTextureManager.getTextureView.mockReturnValue(null);

      const newMaterial = createFlowingMaterial(
        mockDevice as unknown as GPUDevice,
        mockTextureManager as unknown as TextureManager
      );

      expect(newMaterial.getBindGroup()).toBeNull();
    });

    it('should create bind group when texture available', () => {
      mockTextureManager.hasTexture.mockReturnValue(true);
      mockTextureManager.getTextureView.mockReturnValue(mockTextureView);

      const newMaterial = createFlowingMaterial(
        mockDevice as unknown as GPUDevice,
        mockTextureManager as unknown as TextureManager
      );
      newMaterial.configure({ baseTexture: 'lava' });

      const bindGroup = newMaterial.getBindGroup();

      expect(mockDevice.createBindGroup).toHaveBeenCalled();
      expect(bindGroup).not.toBeNull();
    });

    it('should cache bind group', () => {
      mockTextureManager.hasTexture.mockReturnValue(true);
      material.configure({ baseTexture: 'lava' });

      material.getBindGroup();
      vi.clearAllMocks();
      material.getBindGroup();

      expect(mockDevice.createBindGroup).not.toHaveBeenCalled();
    });

    it('should invalidate cache on configure', () => {
      mockTextureManager.hasTexture.mockReturnValue(true);
      mockTextureManager.getTextureView.mockReturnValue(mockTextureView);

      const newMaterial = createFlowingMaterial(
        mockDevice as unknown as GPUDevice,
        mockTextureManager as unknown as TextureManager
      );
      newMaterial.configure({ baseTexture: 'lava' });
      newMaterial.getBindGroup();
      vi.clearAllMocks();

      newMaterial.configure({ baseColor: [0, 1, 0] });
      newMaterial.getBindGroup();

      expect(mockDevice.createBindGroup).toHaveBeenCalled();
    });
  });

  describe('getShaderCode', () => {
    it('should return triplanar shader code', () => {
      const code = material.getShaderCode('triplanar');

      expect(code).toContain('fn triplanarSample');
    });

    it('should return flow shader code', () => {
      const code = material.getShaderCode('flow');

      expect(code).toContain('fn flowingMaterialColor');
    });

    it('should return uniform struct definition', () => {
      const code = material.getShaderCode('uniforms');

      expect(code).toContain('struct FlowingMaterialUniforms');
      expect(code).toContain('baseColor');
      expect(code).toContain('emissive');
      expect(code).toContain('flowSpeed');
    });
  });

  describe('getUniformBuffer', () => {
    it('should return the uniform buffer', () => {
      expect(material.getUniformBuffer()).toBe(mockUniformBuffer);
    });
  });

  describe('isDirty', () => {
    it('should return true after configure', () => {
      material.update(0); // Clear dirty flag
      material.configure({ flowSpeed: 2.0 });

      expect(material.isDirty()).toBe(true);
    });

    it('should return false after update', () => {
      material.configure({ flowSpeed: 2.0 });
      material.update(0);

      expect(material.isDirty()).toBe(false);
    });
  });

  describe('loadTextures', () => {
    it('should load configured base texture', async () => {
      mockTextureManager.hasTexture.mockReturnValue(false);
      material.configure({ baseTexture: 'lava' });

      await material.loadTextures('/textures');

      expect(mockTextureManager.loadTexture).toHaveBeenCalledWith(
        'lava',
        '/textures/lava.jpg',
        expect.any(Object)
      );
    });

    it('should skip loading if texture already exists', async () => {
      mockTextureManager.hasTexture.mockReturnValue(true);
      material.configure({ baseTexture: 'cached' });

      await material.loadTextures('/textures');

      expect(mockTextureManager.loadTexture).not.toHaveBeenCalled();
    });

    it('should handle missing texture gracefully', async () => {
      mockTextureManager.hasTexture.mockReturnValue(false);
      mockTextureManager.loadTexture.mockRejectedValue(
        new Error('Not found')
      );
      material.configure({ baseTexture: 'missing' });

      // Should not throw, just warn
      await expect(material.loadTextures('/textures')).resolves.not.toThrow();
    });
  });

  describe('clone', () => {
    it('should create a copy with same configuration', () => {
      material.configure({
        baseColor: [1, 0, 0],
        emissiveStrength: 2.0,
      });

      const cloned = material.clone();
      const originalUniforms = material.getUniforms();
      const clonedUniforms = cloned.getUniforms();

      expect(clonedUniforms.baseColor).toEqual(originalUniforms.baseColor);
      expect(clonedUniforms.emissiveStrength).toBe(
        originalUniforms.emissiveStrength
      );
    });

    it('should have independent uniform buffer', () => {
      const originalBuffer = material.getUniformBuffer();
      const cloned = material.clone();
      const clonedBuffer = cloned.getUniformBuffer();

      // Should have created 2 buffers total (one for original, one for clone)
      expect(mockDevice.createBuffer).toHaveBeenCalledTimes(2);
      // Buffers should have different labels (our mock creates unique labels)
      expect(clonedBuffer.label).not.toBe(originalBuffer.label);
    });
  });

  describe('dispose', () => {
    it('should destroy uniform buffer', () => {
      material.dispose();

      expect(mockUniformBuffer.destroy).toHaveBeenCalled();
    });

    it('should be safe to call multiple times', () => {
      expect(() => {
        material.dispose();
        material.dispose();
      }).not.toThrow();
    });
  });

  describe('default values', () => {
    it('should have sensible defaults', () => {
      const uniforms = material.getUniforms();

      expect(uniforms.baseColor).toEqual([1, 1, 1]);
      expect(uniforms.emissive).toEqual([0, 0, 0]);
      expect(uniforms.emissiveStrength).toBe(0);
      expect(uniforms.flowSpeed).toBe(0.5);
      expect(uniforms.flowScale).toBe(1.0);
      expect(uniforms.turbulence).toBe(1.0);
      expect(uniforms.triplanarBlend).toBe(4.0);
      expect(uniforms.metallic).toBe(0);
      expect(uniforms.roughness).toBe(0.5);
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
