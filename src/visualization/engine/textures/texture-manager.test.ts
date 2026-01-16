/**
 * @vitest-environment node
 *
 * TextureManager Tests (TDD)
 *
 * Tests for texture loading, caching, and procedural generation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock GPU objects
const mockTexture = {
  destroy: vi.fn(),
  createView: vi.fn(() => ({ label: 'mock-view' })),
  width: 256,
  height: 256,
  label: 'mock-texture',
};

const mockSampler = { label: 'mock-sampler' };

const mockDevice = {
  createTexture: vi.fn(() => mockTexture),
  createSampler: vi.fn(() => mockSampler),
  queue: {
    writeTexture: vi.fn(),
    copyExternalImageToTexture: vi.fn(),
  },
};

// Mock fetch for image loading
const mockImageBitmap = {
  width: 256,
  height: 256,
  close: vi.fn(),
};

global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    blob: () => Promise.resolve(new Blob()),
  })
) as unknown as typeof fetch;

global.createImageBitmap = vi.fn(() =>
  Promise.resolve(mockImageBitmap)
) as unknown as typeof createImageBitmap;

import {
  createTextureManager,
  type TextureManager,
  type TextureConfig,
  DEFAULT_SAMPLER_CONFIG,
} from './texture-manager';

describe('texture-manager module', () => {
  let manager: TextureManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = createTextureManager(mockDevice as unknown as GPUDevice);
  });

  describe('createTextureManager', () => {
    it('should export createTextureManager function', () => {
      expect(createTextureManager).toBeDefined();
      expect(typeof createTextureManager).toBe('function');
    });

    it('should return a TextureManager instance', () => {
      expect(manager).toHaveProperty('loadTexture');
      expect(manager).toHaveProperty('getTexture');
      expect(manager).toHaveProperty('getSampler');
      expect(manager).toHaveProperty('createNoiseTexture');
      expect(manager).toHaveProperty('createGradientTexture');
      expect(manager).toHaveProperty('dispose');
    });
  });

  describe('loadTexture', () => {
    it('should load texture from URL', async () => {
      const texture = await manager.loadTexture('test-texture', '/textures/test.jpg');

      expect(fetch).toHaveBeenCalledWith('/textures/test.jpg');
      expect(mockDevice.createTexture).toHaveBeenCalled();
      expect(texture).toBeDefined();
    });

    it('should cache loaded textures', async () => {
      await manager.loadTexture('cached-texture', '/textures/cached.jpg');
      vi.clearAllMocks();

      const texture = await manager.loadTexture('cached-texture', '/textures/cached.jpg');

      expect(fetch).not.toHaveBeenCalled();
      expect(texture).toBeDefined();
    });

    it('should force reload when specified', async () => {
      await manager.loadTexture('reload-texture', '/textures/reload.jpg');
      vi.clearAllMocks();

      await manager.loadTexture('reload-texture', '/textures/reload.jpg', { forceReload: true });

      expect(fetch).toHaveBeenCalled();
    });

    it('should throw on failed fetch', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(
        manager.loadTexture('missing', '/textures/missing.jpg')
      ).rejects.toThrow('Failed to load texture');
    });

    it('should apply custom texture config', async () => {
      const config: TextureConfig = {
        format: 'rgba8unorm',
        mipLevels: 4,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
      };

      await manager.loadTexture('custom', '/textures/custom.jpg', config);

      expect(mockDevice.createTexture).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'rgba8unorm',
          mipLevelCount: 4,
        })
      );
    });
  });

  describe('getTexture', () => {
    it('should return null for non-existent texture', () => {
      expect(manager.getTexture('nonexistent')).toBeNull();
    });

    it('should return loaded texture', async () => {
      await manager.loadTexture('exists', '/textures/exists.jpg');

      const texture = manager.getTexture('exists');

      expect(texture).not.toBeNull();
    });
  });

  describe('hasTexture', () => {
    it('should return false for non-existent texture', () => {
      expect(manager.hasTexture('nonexistent')).toBe(false);
    });

    it('should return true for loaded texture', async () => {
      await manager.loadTexture('exists', '/textures/exists.jpg');

      expect(manager.hasTexture('exists')).toBe(true);
    });
  });

  describe('getSampler', () => {
    it('should create default sampler on first call', () => {
      const sampler = manager.getSampler();

      expect(mockDevice.createSampler).toHaveBeenCalled();
      expect(sampler).toBeDefined();
    });

    it('should cache default sampler', () => {
      manager.getSampler();
      vi.clearAllMocks();
      manager.getSampler();

      expect(mockDevice.createSampler).not.toHaveBeenCalled();
    });

    it('should create named samplers with custom config', () => {
      const config = {
        magFilter: 'nearest' as GPUFilterMode,
        minFilter: 'nearest' as GPUFilterMode,
      };

      manager.getSampler('nearest', config);

      expect(mockDevice.createSampler).toHaveBeenCalledWith(
        expect.objectContaining(config)
      );
    });

    it('should cache named samplers', () => {
      manager.getSampler('custom', { magFilter: 'linear' });
      vi.clearAllMocks();
      manager.getSampler('custom');

      expect(mockDevice.createSampler).not.toHaveBeenCalled();
    });
  });

  describe('createNoiseTexture', () => {
    it('should create a noise texture', () => {
      const texture = manager.createNoiseTexture('noise', 128, 128);

      expect(mockDevice.createTexture).toHaveBeenCalledWith(
        expect.objectContaining({
          size: [128, 128],
        })
      );
      expect(texture).toBeDefined();
    });

    it('should write noise data to texture', () => {
      manager.createNoiseTexture('noise-data', 64, 64);

      expect(mockDevice.queue.writeTexture).toHaveBeenCalled();
    });

    it('should cache created noise texture', () => {
      manager.createNoiseTexture('cached-noise', 128, 128);
      vi.clearAllMocks();

      const texture = manager.getTexture('cached-noise');

      expect(texture).not.toBeNull();
    });

    it('should accept seed for reproducible noise', () => {
      manager.createNoiseTexture('seeded', 64, 64, { seed: 12345 });

      expect(mockDevice.queue.writeTexture).toHaveBeenCalled();
    });

    it('should accept octaves for FBM noise', () => {
      manager.createNoiseTexture('fbm', 64, 64, { octaves: 4 });

      expect(mockDevice.createTexture).toHaveBeenCalled();
    });
  });

  describe('createGradientTexture', () => {
    it('should create a gradient texture', () => {
      const texture = manager.createGradientTexture('gradient', 256, [
        { position: 0, color: [0, 0, 0, 1] },
        { position: 1, color: [1, 1, 1, 1] },
      ]);

      expect(mockDevice.createTexture).toHaveBeenCalledWith(
        expect.objectContaining({
          size: [256, 1],
        })
      );
      expect(texture).toBeDefined();
    });

    it('should write gradient data to texture', () => {
      manager.createGradientTexture('gradient-data', 128, [
        { position: 0, color: [1, 0, 0, 1] },
        { position: 0.5, color: [0, 1, 0, 1] },
        { position: 1, color: [0, 0, 1, 1] },
      ]);

      expect(mockDevice.queue.writeTexture).toHaveBeenCalled();
    });

    it('should cache gradient texture', () => {
      manager.createGradientTexture('cached-gradient', 128, [
        { position: 0, color: [0, 0, 0, 1] },
        { position: 1, color: [1, 1, 1, 1] },
      ]);

      expect(manager.hasTexture('cached-gradient')).toBe(true);
    });
  });

  describe('createSolidColorTexture', () => {
    it('should create a solid color texture', () => {
      const texture = manager.createSolidColorTexture('solid', [1, 0, 0, 1]);

      expect(mockDevice.createTexture).toHaveBeenCalled();
      expect(texture).toBeDefined();
    });

    it('should use small size for solid colors', () => {
      manager.createSolidColorTexture('small-solid', [0, 1, 0, 1]);

      expect(mockDevice.createTexture).toHaveBeenCalledWith(
        expect.objectContaining({
          size: [1, 1],
        })
      );
    });
  });

  describe('removeTexture', () => {
    it('should remove and destroy texture', async () => {
      await manager.loadTexture('removable', '/textures/removable.jpg');

      manager.removeTexture('removable');

      expect(mockTexture.destroy).toHaveBeenCalled();
      expect(manager.hasTexture('removable')).toBe(false);
    });

    it('should not throw for non-existent texture', () => {
      expect(() => manager.removeTexture('nonexistent')).not.toThrow();
    });
  });

  describe('getTextureView', () => {
    it('should return null for non-existent texture', () => {
      expect(manager.getTextureView('nonexistent')).toBeNull();
    });

    it('should return view for existing texture', async () => {
      await manager.loadTexture('viewable', '/textures/viewable.jpg');

      const view = manager.getTextureView('viewable');

      expect(view).not.toBeNull();
    });
  });

  describe('getBindGroupEntry', () => {
    it('should return bind group entry for texture and sampler', async () => {
      await manager.loadTexture('bindable', '/textures/bindable.jpg');

      const entries = manager.getBindGroupEntries('bindable', 0, 1);

      expect(entries).toHaveLength(2);
      expect(entries[0].binding).toBe(0);
      expect(entries[1].binding).toBe(1);
    });

    it('should throw for non-existent texture', () => {
      expect(() =>
        manager.getBindGroupEntries('nonexistent', 0, 1)
      ).toThrow('Texture not found');
    });
  });

  describe('DEFAULT_SAMPLER_CONFIG', () => {
    it('should export default sampler config', () => {
      expect(DEFAULT_SAMPLER_CONFIG).toBeDefined();
      expect(DEFAULT_SAMPLER_CONFIG.magFilter).toBe('linear');
      expect(DEFAULT_SAMPLER_CONFIG.minFilter).toBe('linear');
      expect(DEFAULT_SAMPLER_CONFIG.addressModeU).toBe('repeat');
      expect(DEFAULT_SAMPLER_CONFIG.addressModeV).toBe('repeat');
    });
  });

  describe('dispose', () => {
    it('should destroy all textures', async () => {
      await manager.loadTexture('tex1', '/textures/tex1.jpg');
      await manager.loadTexture('tex2', '/textures/tex2.jpg');

      manager.dispose();

      expect(mockTexture.destroy).toHaveBeenCalledTimes(2);
    });

    it('should clear texture cache', async () => {
      await manager.loadTexture('cleared', '/textures/cleared.jpg');

      manager.dispose();

      expect(manager.hasTexture('cleared')).toBe(false);
    });

    it('should be safe to call multiple times', () => {
      expect(() => {
        manager.dispose();
        manager.dispose();
      }).not.toThrow();
    });
  });

  describe('getTextureCount', () => {
    it('should return 0 initially', () => {
      expect(manager.getTextureCount()).toBe(0);
    });

    it('should track loaded textures', async () => {
      await manager.loadTexture('counted1', '/textures/counted1.jpg');
      await manager.loadTexture('counted2', '/textures/counted2.jpg');

      expect(manager.getTextureCount()).toBe(2);
    });

    it('should decrease after removal', async () => {
      await manager.loadTexture('removable', '/textures/removable.jpg');
      manager.removeTexture('removable');

      expect(manager.getTextureCount()).toBe(0);
    });
  });
});

// Mock GPU constants for Node environment
const GPUTextureUsage = {
  TEXTURE_BINDING: 0x0004,
  COPY_DST: 0x0008,
  RENDER_ATTACHMENT: 0x0010,
};
(globalThis as Record<string, unknown>).GPUTextureUsage = GPUTextureUsage;
