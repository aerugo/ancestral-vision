/**
 * GraphicsEngine Unit Tests
 *
 * Phase 4: Graphics Engine Class
 *
 * Invariants tested:
 * - INV-A001: WebGPURenderer Init
 * - INV-A002: Animation Loop via setAnimationLoop
 * - INV-A008: WebGPU/TSL Imports
 * - INV-A009: Resource Disposal
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';

// ============================================================
// Mocks
// ============================================================

// Mock canvas element
const mockCanvas = {
  width: 800,
  height: 600,
  getContext: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  style: {},
} as unknown as HTMLCanvasElement;

// Mock document.createElement for canvas creation
vi.stubGlobal('document', {
  createElement: vi.fn().mockReturnValue(mockCanvas),
});

// Mock the renderer module
const mockRenderer = {
  setSize: vi.fn(),
  setPixelRatio: vi.fn(),
  setAnimationLoop: vi.fn(),
  render: vi.fn(),
  dispose: vi.fn(),
  domElement: {} as HTMLCanvasElement,
};

vi.mock('./renderer', () => ({
  createRenderer: vi.fn().mockResolvedValue(mockRenderer),
  isWebGPURenderer: vi.fn().mockReturnValue(false),
}));

// Mock TSL pipeline
const mockPostProcessingResult = {
  postProcessing: {
    outputNode: null,
    render: vi.fn(),
    dispose: vi.fn(),
  },
  config: {
    bloom: { enabled: true, strength: 1.5, radius: 0.6, threshold: 0.2 },
    vignette: { enabled: true, darkness: 0.4, offset: 0.3 },
  },
  uniforms: {
    bloomStrength: { value: 1.5 },
    bloomRadius: { value: 0.6 },
    bloomThreshold: { value: 0.2 },
    vignetteDarkness: { value: 0.4 },
    vignetteOffset: { value: 0.3 },
  },
  bloomNode: { dispose: vi.fn() },
  dofNode: null,
  chromaticAberrationNode: null,
  filmGrainNode: null,
};

vi.mock('./tsl-pipeline/post-processing-pipeline', () => ({
  createPostProcessingPipeline: vi.fn().mockReturnValue(mockPostProcessingResult),
  disposePostProcessingPipeline: vi.fn(),
  updatePostProcessingSize: vi.fn(),
  renderWithPostProcessing: vi.fn(),
}));

// Helper to create a mock container
function createMockContainer(): HTMLElement {
  return {
    clientWidth: 800,
    clientHeight: 600,
    appendChild: vi.fn(),
    removeChild: vi.fn(),
  } as unknown as HTMLElement;
}

describe('GraphicsEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================
  // Module Export Tests
  // ============================================================

  describe('module exports', () => {
    it('should export createGraphicsEngine function', async () => {
      const module = await import('./graphics-engine');
      expect(module.createGraphicsEngine).toBeDefined();
      expect(typeof module.createGraphicsEngine).toBe('function');
    });

    it('should export GraphicsEngine class', async () => {
      const module = await import('./graphics-engine');
      expect(module.GraphicsEngine).toBeDefined();
    });
  });

  // ============================================================
  // Factory Function Tests
  // ============================================================

  describe('createGraphicsEngine factory', () => {
    it('should create a GraphicsEngine instance from container', async () => {
      const { createGraphicsEngine } = await import('./graphics-engine');
      const container = createMockContainer();

      const result = await createGraphicsEngine(container);

      expect(result.engine).toBeDefined();
      expect(result.uniforms).toBeDefined();
    });

    it('should call createRenderer with container', async () => {
      const { createGraphicsEngine } = await import('./graphics-engine');
      const { createRenderer } = await import('./renderer');
      const container = createMockContainer();

      await createGraphicsEngine(container);

      expect(createRenderer).toHaveBeenCalled();
    });

    it('should create TSL post-processing pipeline', async () => {
      const { createGraphicsEngine } = await import('./graphics-engine');
      const { createPostProcessingPipeline } = await import('./tsl-pipeline/post-processing-pipeline');
      const container = createMockContainer();

      await createGraphicsEngine(container);

      expect(createPostProcessingPipeline).toHaveBeenCalled();
    });

    it('should pass post-processing config to pipeline', async () => {
      const { createGraphicsEngine } = await import('./graphics-engine');
      const { createPostProcessingPipeline } = await import('./tsl-pipeline/post-processing-pipeline');
      const container = createMockContainer();

      await createGraphicsEngine(container, {
        bloom: { enabled: true, strength: 2.0, radius: 0.8, threshold: 0.3 },
        vignette: { enabled: true, darkness: 0.5, offset: 0.4 },
      });

      expect(createPostProcessingPipeline).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          bloom: expect.objectContaining({ strength: 2.0 }),
          vignette: expect.objectContaining({ darkness: 0.5 }),
        })
      );
    });

    it('should return effect uniforms for runtime control', async () => {
      const { createGraphicsEngine } = await import('./graphics-engine');
      const container = createMockContainer();

      const result = await createGraphicsEngine(container);

      expect(result.uniforms.bloomStrength).toBeDefined();
      expect(result.uniforms.bloomRadius).toBeDefined();
      expect(result.uniforms.bloomThreshold).toBeDefined();
      expect(result.uniforms.vignetteDarkness).toBeDefined();
      expect(result.uniforms.vignetteOffset).toBeDefined();
    });
  });

  // ============================================================
  // GraphicsEngine Class Tests
  // ============================================================

  describe('GraphicsEngine class', () => {
    describe('core properties', () => {
      it('should expose renderer', async () => {
        const { createGraphicsEngine } = await import('./graphics-engine');
        const container = createMockContainer();

        const { engine } = await createGraphicsEngine(container);

        expect(engine.renderer).toBeDefined();
      });

      it('should expose scene', async () => {
        const { createGraphicsEngine } = await import('./graphics-engine');
        const container = createMockContainer();

        const { engine } = await createGraphicsEngine(container);

        expect(engine.scene).toBeDefined();
        expect(engine.scene).toBeInstanceOf(THREE.Scene);
      });

      it('should expose camera', async () => {
        const { createGraphicsEngine } = await import('./graphics-engine');
        const container = createMockContainer();

        const { engine } = await createGraphicsEngine(container);

        expect(engine.camera).toBeDefined();
        expect(engine.camera).toBeInstanceOf(THREE.PerspectiveCamera);
      });

      it('should create scene with correct background color', async () => {
        const { createGraphicsEngine } = await import('./graphics-engine');
        const container = createMockContainer();

        const { engine } = await createGraphicsEngine(container);

        expect(engine.scene.background).toBeDefined();
      });

      it('should create camera with correct aspect ratio', async () => {
        const { createGraphicsEngine } = await import('./graphics-engine');
        const container = createMockContainer();

        const { engine } = await createGraphicsEngine(container);

        // 800/600 = 1.333...
        expect(engine.camera.aspect).toBeCloseTo(800 / 600, 2);
      });
    });

    describe('start() method (INV-A002)', () => {
      it('should start animation loop using setAnimationLoop', async () => {
        const { createGraphicsEngine } = await import('./graphics-engine');
        const container = createMockContainer();

        const { engine } = await createGraphicsEngine(container);
        engine.start();

        expect(mockRenderer.setAnimationLoop).toHaveBeenCalledWith(expect.any(Function));
      });

      it('should set isRunning to true', async () => {
        const { createGraphicsEngine } = await import('./graphics-engine');
        const container = createMockContainer();

        const { engine } = await createGraphicsEngine(container);

        expect(engine.isRunning()).toBe(false);
        engine.start();
        expect(engine.isRunning()).toBe(true);
      });

      it('should not start if already running', async () => {
        const { createGraphicsEngine } = await import('./graphics-engine');
        const container = createMockContainer();

        const { engine } = await createGraphicsEngine(container);
        engine.start();
        engine.start(); // Second call

        // Should only be called once
        expect(mockRenderer.setAnimationLoop).toHaveBeenCalledTimes(1);
      });
    });

    describe('stop() method', () => {
      it('should stop animation loop', async () => {
        const { createGraphicsEngine } = await import('./graphics-engine');
        const container = createMockContainer();

        const { engine } = await createGraphicsEngine(container);
        engine.start();
        engine.stop();

        expect(mockRenderer.setAnimationLoop).toHaveBeenLastCalledWith(null);
      });

      it('should set isRunning to false', async () => {
        const { createGraphicsEngine } = await import('./graphics-engine');
        const container = createMockContainer();

        const { engine } = await createGraphicsEngine(container);
        engine.start();
        expect(engine.isRunning()).toBe(true);

        engine.stop();
        expect(engine.isRunning()).toBe(false);
      });
    });

    describe('resize() method', () => {
      it('should update renderer size', async () => {
        const { createGraphicsEngine } = await import('./graphics-engine');
        const container = createMockContainer();

        const { engine } = await createGraphicsEngine(container);
        engine.resize(1920, 1080);

        expect(mockRenderer.setSize).toHaveBeenCalledWith(1920, 1080);
      });

      it('should update camera aspect ratio', async () => {
        const { createGraphicsEngine } = await import('./graphics-engine');
        const container = createMockContainer();

        const { engine } = await createGraphicsEngine(container);
        engine.resize(1920, 1080);

        expect(engine.camera.aspect).toBeCloseTo(1920 / 1080, 2);
      });

      it('should update post-processing size', async () => {
        const { createGraphicsEngine } = await import('./graphics-engine');
        const { updatePostProcessingSize } = await import('./tsl-pipeline/post-processing-pipeline');
        const container = createMockContainer();

        const { engine } = await createGraphicsEngine(container);
        engine.resize(1920, 1080);

        expect(updatePostProcessingSize).toHaveBeenCalledWith(
          expect.anything(),
          1920,
          1080
        );
      });
    });

    describe('dispose() method (INV-A009)', () => {
      it('should stop animation loop', async () => {
        const { createGraphicsEngine } = await import('./graphics-engine');
        const container = createMockContainer();

        const { engine } = await createGraphicsEngine(container);
        engine.start();
        engine.dispose();

        expect(mockRenderer.setAnimationLoop).toHaveBeenLastCalledWith(null);
      });

      it('should dispose post-processing pipeline', async () => {
        const { createGraphicsEngine } = await import('./graphics-engine');
        const { disposePostProcessingPipeline } = await import('./tsl-pipeline/post-processing-pipeline');
        const container = createMockContainer();

        const { engine } = await createGraphicsEngine(container);
        engine.dispose();

        expect(disposePostProcessingPipeline).toHaveBeenCalled();
      });

      it('should dispose renderer', async () => {
        const { createGraphicsEngine } = await import('./graphics-engine');
        const container = createMockContainer();

        const { engine } = await createGraphicsEngine(container);
        engine.dispose();

        expect(mockRenderer.dispose).toHaveBeenCalled();
      });

      it('should set isDisposed to true', async () => {
        const { createGraphicsEngine } = await import('./graphics-engine');
        const container = createMockContainer();

        const { engine } = await createGraphicsEngine(container);

        expect(engine.isDisposed()).toBe(false);
        engine.dispose();
        expect(engine.isDisposed()).toBe(true);
      });

      it('should not dispose twice', async () => {
        const { createGraphicsEngine } = await import('./graphics-engine');
        const container = createMockContainer();

        const { engine } = await createGraphicsEngine(container);
        engine.dispose();
        engine.dispose(); // Second call

        expect(mockRenderer.dispose).toHaveBeenCalledTimes(1);
      });
    });

    describe('safety after dispose', () => {
      it('should not start after dispose', async () => {
        const { createGraphicsEngine } = await import('./graphics-engine');
        const container = createMockContainer();

        const { engine } = await createGraphicsEngine(container);
        engine.dispose();

        mockRenderer.setAnimationLoop.mockClear();
        engine.start();

        expect(mockRenderer.setAnimationLoop).not.toHaveBeenCalled();
      });

      it('should not resize after dispose', async () => {
        const { createGraphicsEngine } = await import('./graphics-engine');
        const container = createMockContainer();

        const { engine } = await createGraphicsEngine(container);
        engine.dispose();

        mockRenderer.setSize.mockClear();
        engine.resize(1920, 1080);

        expect(mockRenderer.setSize).not.toHaveBeenCalled();
      });
    });

    describe('getPostProcessingResult()', () => {
      it('should return the post-processing result', async () => {
        const { createGraphicsEngine } = await import('./graphics-engine');
        const container = createMockContainer();

        const { engine } = await createGraphicsEngine(container);
        const result = engine.getPostProcessingResult();

        expect(result).toBeDefined();
        expect(result.postProcessing).toBeDefined();
        expect(result.uniforms).toBeDefined();
      });
    });

    // ============================================================
    // Phase 5 Integration: Performance Preset Tests
    // ============================================================

    describe('performance preset integration', () => {
      it('should accept performancePreset in config', async () => {
        const { createGraphicsEngine } = await import('./graphics-engine');
        const { PerformancePreset } = await import('./tsl-pipeline/performance-config');
        const container = createMockContainer();

        // Should not throw when passing performancePreset
        const result = await createGraphicsEngine(container, {
          performancePreset: PerformancePreset.HIGH,
        });

        expect(result.engine).toBeDefined();
      });

      it('should apply LOW preset and disable optional effects', async () => {
        const { createGraphicsEngine } = await import('./graphics-engine');
        const { PerformancePreset } = await import('./tsl-pipeline/performance-config');
        const { createPostProcessingPipeline } = await import('./tsl-pipeline/post-processing-pipeline');
        const container = createMockContainer();

        await createGraphicsEngine(container, {
          performancePreset: PerformancePreset.LOW,
          bloom: { enabled: true, strength: 1.5, radius: 0.6, threshold: 0.2 },
          vignette: { enabled: true, darkness: 0.4, offset: 0.3 },
          dof: { enabled: true, focusDistance: 10, focalLength: 5, bokehScale: 2 },
          chromaticAberration: { enabled: true, strength: 0.02, center: { x: 0.5, y: 0.5 }, scale: 1 },
          filmGrain: { enabled: true, intensity: 0.5 },
        });

        // LOW preset should disable DOF, CA, and film grain
        const call = (createPostProcessingPipeline as ReturnType<typeof vi.fn>).mock.calls[0];
        const passedConfig = call[3];

        expect(passedConfig.dof).toBeUndefined();
        expect(passedConfig.chromaticAberration).toBeUndefined();
        expect(passedConfig.filmGrain).toBeUndefined();
        // Bloom and vignette should still be present
        expect(passedConfig.bloom).toBeDefined();
        expect(passedConfig.vignette).toBeDefined();
      });

      it('should apply ULTRA preset and enable all effects', async () => {
        const { createGraphicsEngine } = await import('./graphics-engine');
        const { PerformancePreset } = await import('./tsl-pipeline/performance-config');
        const { createPostProcessingPipeline } = await import('./tsl-pipeline/post-processing-pipeline');
        const container = createMockContainer();

        await createGraphicsEngine(container, {
          performancePreset: PerformancePreset.ULTRA,
          bloom: { enabled: true, strength: 1.5, radius: 0.6, threshold: 0.2 },
          dof: { enabled: true, focusDistance: 10, focalLength: 5, bokehScale: 2 },
          chromaticAberration: { enabled: true, strength: 0.02, center: { x: 0.5, y: 0.5 }, scale: 1 },
          filmGrain: { enabled: true, intensity: 0.5 },
        });

        // ULTRA preset should keep all effects
        const call = (createPostProcessingPipeline as ReturnType<typeof vi.fn>).mock.calls[0];
        const passedConfig = call[3];

        expect(passedConfig.bloom).toBeDefined();
        expect(passedConfig.dof).toBeDefined();
        expect(passedConfig.chromaticAberration).toBeDefined();
        expect(passedConfig.filmGrain).toBeDefined();
      });

      it('should accept custom performanceConfig overrides', async () => {
        const { createGraphicsEngine } = await import('./graphics-engine');
        const { PerformancePreset } = await import('./tsl-pipeline/performance-config');
        const { createPostProcessingPipeline } = await import('./tsl-pipeline/post-processing-pipeline');
        const container = createMockContainer();

        // Use LOW preset but override to enable DOF
        await createGraphicsEngine(container, {
          performancePreset: PerformancePreset.LOW,
          performanceConfig: {
            enableDof: true,
          },
          dof: { enabled: true, focusDistance: 10, focalLength: 5, bokehScale: 2 },
        });

        const call = (createPostProcessingPipeline as ReturnType<typeof vi.fn>).mock.calls[0];
        const passedConfig = call[3];

        // DOF should be enabled due to override
        expect(passedConfig.dof).toBeDefined();
        // CA and film grain still disabled from LOW preset
        expect(passedConfig.chromaticAberration).toBeUndefined();
        expect(passedConfig.filmGrain).toBeUndefined();
      });

      it('should use HIGH preset by default when no preset specified', async () => {
        const { createGraphicsEngine } = await import('./graphics-engine');
        const { createPostProcessingPipeline } = await import('./tsl-pipeline/post-processing-pipeline');
        const container = createMockContainer();

        await createGraphicsEngine(container, {
          bloom: { enabled: true, strength: 1.5, radius: 0.6, threshold: 0.2 },
          dof: { enabled: true, focusDistance: 10, focalLength: 5, bokehScale: 2 },
          chromaticAberration: { enabled: true, strength: 0.02, center: { x: 0.5, y: 0.5 }, scale: 1 },
          filmGrain: { enabled: true, intensity: 0.5 },
        });

        // HIGH preset enables DOF and CA but not film grain
        const call = (createPostProcessingPipeline as ReturnType<typeof vi.fn>).mock.calls[0];
        const passedConfig = call[3];

        expect(passedConfig.bloom).toBeDefined();
        expect(passedConfig.dof).toBeDefined();
        expect(passedConfig.chromaticAberration).toBeDefined();
        expect(passedConfig.filmGrain).toBeUndefined();
      });
    });
  });
});
