import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isWebGPUSupported, WebGPUNotSupportedError } from './renderer';

describe('Renderer', () => {
  let originalNavigator: Navigator;

  beforeEach(() => {
    // Setup mock DOM
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    document.body.appendChild(canvas);

    // Store original navigator
    originalNavigator = globalThis.navigator;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    // Restore navigator
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  describe('WebGPUNotSupportedError', () => {
    it('should create error with default message', () => {
      const error = new WebGPUNotSupportedError();
      expect(error.name).toBe('WebGPUNotSupportedError');
      expect(error.message).toContain('WebGPU is not supported');
      expect(error.message).toContain('Chrome 113+');
    });

    it('should create error with custom reason', () => {
      const error = new WebGPUNotSupportedError('adapter failed');
      expect(error.name).toBe('WebGPUNotSupportedError');
      expect(error.message).toContain('adapter failed');
    });

    it('should be instance of Error', () => {
      const error = new WebGPUNotSupportedError();
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('isWebGPUSupported', () => {
    it('should detect WebGPU support when available', async () => {
      const mockNavigator = {
        ...originalNavigator,
        gpu: {
          requestAdapter: vi.fn().mockResolvedValue({}),
        },
      };
      Object.defineProperty(globalThis, 'navigator', {
        value: mockNavigator,
        writable: true,
        configurable: true,
      });

      const supported = await isWebGPUSupported();
      expect(supported).toBe(true);
    });

    it('should return false when WebGPU unavailable', async () => {
      const mockNavigator = {
        ...originalNavigator,
        gpu: undefined,
      };
      Object.defineProperty(globalThis, 'navigator', {
        value: mockNavigator,
        writable: true,
        configurable: true,
      });

      const supported = await isWebGPUSupported();
      expect(supported).toBe(false);
    });

    it('should return false when requestAdapter returns null', async () => {
      const mockNavigator = {
        ...originalNavigator,
        gpu: {
          requestAdapter: vi.fn().mockResolvedValue(null),
        },
      };
      Object.defineProperty(globalThis, 'navigator', {
        value: mockNavigator,
        writable: true,
        configurable: true,
      });

      const supported = await isWebGPUSupported();
      expect(supported).toBe(false);
    });

    it('should return false when requestAdapter throws', async () => {
      const mockNavigator = {
        ...originalNavigator,
        gpu: {
          requestAdapter: vi.fn().mockRejectedValue(new Error('WebGPU error')),
        },
      };
      Object.defineProperty(globalThis, 'navigator', {
        value: mockNavigator,
        writable: true,
        configurable: true,
      });

      const supported = await isWebGPUSupported();
      expect(supported).toBe(false);
    });

    it('should return false when navigator is undefined', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const supported = await isWebGPUSupported();
      expect(supported).toBe(false);
    });
  });

  describe('createRenderer', () => {
    it('should throw WebGPUNotSupportedError when WebGPU is not available', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { ...originalNavigator, gpu: undefined },
        writable: true,
        configurable: true,
      });

      // Dynamic import to get fresh module
      const { createRenderer } = await import('./renderer');
      const canvas = document.querySelector('canvas')!;

      await expect(createRenderer(canvas)).rejects.toThrow(WebGPUNotSupportedError);
    });

    it('should throw WebGPUNotSupportedError with reason when adapter fails', async () => {
      const mockNavigator = {
        ...originalNavigator,
        gpu: {
          requestAdapter: vi.fn().mockResolvedValue(null),
        },
      };
      Object.defineProperty(globalThis, 'navigator', {
        value: mockNavigator,
        writable: true,
        configurable: true,
      });

      const { createRenderer } = await import('./renderer');
      const canvas = document.querySelector('canvas')!;

      await expect(createRenderer(canvas)).rejects.toThrow(
        /navigator\.gpu not available|adapter request failed/
      );
    });
  });
});
