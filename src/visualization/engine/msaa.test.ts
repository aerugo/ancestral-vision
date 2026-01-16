/**
 * @vitest-environment node
 *
 * MSAA Manager Tests (TDD)
 *
 * Tests for multi-sample anti-aliasing texture management.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock GPUTexture and GPUDevice
const mockTextureView = { label: 'mock-texture-view' };
const mockTexture = {
  createView: vi.fn(() => mockTextureView),
  destroy: vi.fn(),
  width: 1920,
  height: 1080,
};

const mockDevice = {
  createTexture: vi.fn(() => mockTexture),
};

import {
  createMSAAManager,
  type MSAAManager,
  type MSAAConfig,
  SAMPLE_COUNTS,
} from './msaa';

describe('msaa module', () => {
  let manager: MSAAManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = createMSAAManager(mockDevice as unknown as GPUDevice);
  });

  describe('createMSAAManager', () => {
    it('should export createMSAAManager function', () => {
      expect(createMSAAManager).toBeDefined();
      expect(typeof createMSAAManager).toBe('function');
    });

    it('should return an MSAAManager instance', () => {
      expect(manager).toHaveProperty('createTexture');
      expect(manager).toHaveProperty('resize');
      expect(manager).toHaveProperty('getTexture');
      expect(manager).toHaveProperty('getTextureView');
      expect(manager).toHaveProperty('getSampleCount');
      expect(manager).toHaveProperty('dispose');
    });
  });

  describe('SAMPLE_COUNTS', () => {
    it('should export SAMPLE_COUNTS constant', () => {
      expect(SAMPLE_COUNTS).toBeDefined();
    });

    it('should include common sample counts', () => {
      expect(SAMPLE_COUNTS).toContain(1);
      expect(SAMPLE_COUNTS).toContain(4);
    });
  });

  describe('createTexture', () => {
    it('should create MSAA texture with specified dimensions', () => {
      const config: MSAAConfig = {
        width: 1920,
        height: 1080,
        sampleCount: 4,
        format: 'bgra8unorm',
      };

      manager.createTexture(config);

      expect(mockDevice.createTexture).toHaveBeenCalledWith(
        expect.objectContaining({
          size: [1920, 1080],
          sampleCount: 4,
          format: 'bgra8unorm',
        })
      );
    });

    it('should create texture with RENDER_ATTACHMENT usage', () => {
      const config: MSAAConfig = {
        width: 800,
        height: 600,
        sampleCount: 4,
        format: 'bgra8unorm',
      };

      manager.createTexture(config);

      expect(mockDevice.createTexture).toHaveBeenCalledWith(
        expect.objectContaining({
          usage: GPUTextureUsage.RENDER_ATTACHMENT,
        })
      );
    });

    it('should use default sample count of 4 if not specified', () => {
      manager.createTexture({
        width: 800,
        height: 600,
        format: 'bgra8unorm',
      });

      expect(mockDevice.createTexture).toHaveBeenCalledWith(
        expect.objectContaining({
          sampleCount: 4,
        })
      );
    });

    it('should dispose old texture when creating new one', () => {
      manager.createTexture({
        width: 800,
        height: 600,
        format: 'bgra8unorm',
      });

      manager.createTexture({
        width: 1024,
        height: 768,
        format: 'bgra8unorm',
      });

      expect(mockTexture.destroy).toHaveBeenCalledTimes(1);
    });

    it('should store sample count for later retrieval', () => {
      manager.createTexture({
        width: 800,
        height: 600,
        sampleCount: 4,
        format: 'bgra8unorm',
      });

      expect(manager.getSampleCount()).toBe(4);
    });
  });

  describe('resize', () => {
    it('should recreate texture with new dimensions', () => {
      manager.createTexture({
        width: 800,
        height: 600,
        sampleCount: 4,
        format: 'bgra8unorm',
      });

      vi.clearAllMocks();
      manager.resize(1920, 1080);

      expect(mockDevice.createTexture).toHaveBeenCalledWith(
        expect.objectContaining({
          size: [1920, 1080],
        })
      );
    });

    it('should preserve sample count and format on resize', () => {
      manager.createTexture({
        width: 800,
        height: 600,
        sampleCount: 4,
        format: 'rgba16float',
      });

      vi.clearAllMocks();
      manager.resize(1024, 768);

      expect(mockDevice.createTexture).toHaveBeenCalledWith(
        expect.objectContaining({
          sampleCount: 4,
          format: 'rgba16float',
        })
      );
    });

    it('should throw if no texture has been created yet', () => {
      expect(() => manager.resize(800, 600)).toThrow(
        'No MSAA texture exists. Call createTexture first.'
      );
    });

    it('should dispose old texture when resizing', () => {
      manager.createTexture({
        width: 800,
        height: 600,
        format: 'bgra8unorm',
      });

      vi.clearAllMocks();
      manager.resize(1024, 768);

      expect(mockTexture.destroy).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTexture', () => {
    it('should return null if no texture created', () => {
      expect(manager.getTexture()).toBeNull();
    });

    it('should return the created texture', () => {
      manager.createTexture({
        width: 800,
        height: 600,
        format: 'bgra8unorm',
      });

      expect(manager.getTexture()).toBe(mockTexture);
    });
  });

  describe('getTextureView', () => {
    it('should return null if no texture created', () => {
      expect(manager.getTextureView()).toBeNull();
    });

    it('should return a view of the texture', () => {
      manager.createTexture({
        width: 800,
        height: 600,
        format: 'bgra8unorm',
      });

      const view = manager.getTextureView();

      expect(view).toBe(mockTextureView);
      expect(mockTexture.createView).toHaveBeenCalled();
    });

    it('should cache the texture view', () => {
      manager.createTexture({
        width: 800,
        height: 600,
        format: 'bgra8unorm',
      });

      manager.getTextureView();
      manager.getTextureView();

      // Should only create view once (cached)
      expect(mockTexture.createView).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSampleCount', () => {
    it('should return 1 if no texture created', () => {
      expect(manager.getSampleCount()).toBe(1);
    });

    it('should return the configured sample count', () => {
      manager.createTexture({
        width: 800,
        height: 600,
        sampleCount: 4,
        format: 'bgra8unorm',
      });

      expect(manager.getSampleCount()).toBe(4);
    });
  });

  describe('dispose', () => {
    it('should destroy the texture', () => {
      manager.createTexture({
        width: 800,
        height: 600,
        format: 'bgra8unorm',
      });

      manager.dispose();

      expect(mockTexture.destroy).toHaveBeenCalled();
    });

    it('should not throw if no texture exists', () => {
      expect(() => manager.dispose()).not.toThrow();
    });

    it('should clear texture reference after dispose', () => {
      manager.createTexture({
        width: 800,
        height: 600,
        format: 'bgra8unorm',
      });

      manager.dispose();

      expect(manager.getTexture()).toBeNull();
    });
  });

  describe('getConfig', () => {
    it('should return null if no texture created', () => {
      expect(manager.getConfig()).toBeNull();
    });

    it('should return current configuration', () => {
      manager.createTexture({
        width: 1920,
        height: 1080,
        sampleCount: 4,
        format: 'bgra8unorm',
      });

      const config = manager.getConfig();

      expect(config).toEqual({
        width: 1920,
        height: 1080,
        sampleCount: 4,
        format: 'bgra8unorm',
      });
    });
  });
});

// Mock GPUTextureUsage for Node environment
const GPUTextureUsage = {
  RENDER_ATTACHMENT: 0x10,
};
(globalThis as Record<string, unknown>).GPUTextureUsage = GPUTextureUsage;
