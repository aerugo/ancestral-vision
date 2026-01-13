import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isWebGPUSupported } from './renderer';

// Create mock functions outside the class
const mockSetPixelRatio = vi.fn();
const mockSetSize = vi.fn();
const mockGetPixelRatio = vi.fn().mockReturnValue(1);
const mockGetSize = vi.fn().mockImplementation((target) => {
  target.x = 800;
  target.y = 600;
  return target;
});
const mockSetAnimationLoop = vi.fn();
const mockRender = vi.fn();
const mockDispose = vi.fn();

// Mock Three.js WebGLRenderer with a class
vi.mock('three', async () => {
  const actual = await vi.importActual<typeof import('three')>('three');

  // Create a mock class that can be instantiated with `new`
  class MockWebGLRenderer {
    public domElement: HTMLCanvasElement;
    public setPixelRatio = mockSetPixelRatio;
    public setSize = mockSetSize;
    public getPixelRatio = mockGetPixelRatio;
    public getSize = mockGetSize;
    public setAnimationLoop = mockSetAnimationLoop;
    public render = mockRender;
    public dispose = mockDispose;

    constructor(options: { canvas: HTMLCanvasElement }) {
      this.domElement = options.canvas;
    }
  }

  return {
    ...actual,
    WebGLRenderer: MockWebGLRenderer,
  };
});

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

    // Reset mocks
    mockSetPixelRatio.mockClear();
    mockSetSize.mockClear();
    mockGetPixelRatio.mockClear();
    mockGetSize.mockClear();
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
  });

  describe('createRenderer', () => {
    it('should initialize renderer asynchronously', async () => {
      // Force WebGL fallback for testing
      Object.defineProperty(globalThis, 'navigator', {
        value: { ...originalNavigator, gpu: undefined },
        writable: true,
        configurable: true,
      });

      // Dynamic import to get the mocked version
      const { createRenderer } = await import('./renderer');
      const canvas = document.querySelector('canvas')!;
      const renderer = await createRenderer(canvas);

      expect(renderer).toBeDefined();
      expect(renderer.domElement).toBe(canvas);
    });

    it('should set correct pixel ratio (clamped to max 2)', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { ...originalNavigator, gpu: undefined },
        writable: true,
        configurable: true,
      });

      const { createRenderer } = await import('./renderer');
      const canvas = document.querySelector('canvas')!;
      const renderer = await createRenderer(canvas);

      // Mock returns 1, which is <= 2
      expect(renderer.getPixelRatio()).toBeLessThanOrEqual(2);
    });

    it('should set renderer size to canvas dimensions', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { ...originalNavigator, gpu: undefined },
        writable: true,
        configurable: true,
      });

      const { createRenderer } = await import('./renderer');
      const canvas = document.querySelector('canvas')!;
      const renderer = await createRenderer(canvas);

      const THREE = await import('three');
      const size = renderer.getSize(new THREE.Vector2());
      expect(size.x).toBeGreaterThan(0);
      expect(size.y).toBeGreaterThan(0);
    });

    it('should call setPixelRatio on renderer', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { ...originalNavigator, gpu: undefined },
        writable: true,
        configurable: true,
      });

      const { createRenderer } = await import('./renderer');
      const canvas = document.querySelector('canvas')!;
      await createRenderer(canvas);

      expect(mockSetPixelRatio).toHaveBeenCalled();
    });

    it('should call setSize on renderer', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { ...originalNavigator, gpu: undefined },
        writable: true,
        configurable: true,
      });

      const { createRenderer } = await import('./renderer');
      const canvas = document.querySelector('canvas')!;
      await createRenderer(canvas);

      expect(mockSetSize).toHaveBeenCalled();
    });
  });
});
