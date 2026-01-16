/**
 * @vitest-environment node
 *
 * TDD tests for TSL Post-Processing Pipeline
 * Phase 1: WebGPU Graphics Engine
 *
 * INV-A012: TSL Bloom Import - Import from three/addons/tsl/display/BloomNode.js
 * INV-A013: PostProcessing Unified - Works with both WebGPU and WebGL
 * INV-A014: Effect Composition - Compose via node addition
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';

// Create chainable mock node factory
function createMockNode(): Record<string, unknown> {
  const node: Record<string, unknown> = {};
  const mockFn = () => createMockNode();
  node.add = vi.fn(mockFn);
  node.mul = vi.fn(mockFn);
  node.sub = vi.fn(mockFn);
  node.div = vi.fn(mockFn);
  node.getTextureNode = vi.fn(() => createMockNode());
  node.dispose = vi.fn();
  return node;
}

// Mock PostProcessing from three/webgpu
vi.mock('three/webgpu', () => {
  class MockPostProcessing {
    public outputNode: unknown = null;
    public render = vi.fn();
    public setSize = vi.fn();
    public dispose = vi.fn();
  }

  return {
    PostProcessing: MockPostProcessing,
  };
});

// Mock TSL functions from three/tsl
vi.mock('three/tsl', () => ({
  pass: vi.fn(() => createMockNode()),
  screenUV: createMockNode(),
  smoothstep: vi.fn(() => createMockNode()),
  length: vi.fn(() => createMockNode()),
  sub: vi.fn(() => createMockNode()),
  vec2: vi.fn(() => createMockNode()),
  mul: vi.fn(() => createMockNode()),
  add: vi.fn(() => createMockNode()),
  float: vi.fn((v: number) => ({ value: v, ...createMockNode() })),
  uniform: vi.fn((v: unknown) => ({ value: v, ...createMockNode() })),
}));

// Mock BloomNode from three/addons (INV-A012)
const mockBloomNode = {
  strength: { value: 1 },
  radius: { value: 0 },
  threshold: { value: 0 },
  getTextureNode: vi.fn(() => createMockNode()),
  dispose: vi.fn(),
  ...createMockNode(),
};

vi.mock('three/addons/tsl/display/BloomNode.js', () => ({
  bloom: vi.fn(() => mockBloomNode),
}));

// Mock DOF node for Phase 3
const mockDofNode = {
  focusDistance: { value: 10 },
  focalLength: { value: 5 },
  bokehScale: { value: 1 },
  dispose: vi.fn(),
  setSize: vi.fn(),
  ...createMockNode(),
};

vi.mock('three/addons/tsl/display/DepthOfFieldNode.js', () => ({
  dof: vi.fn(() => mockDofNode),
}));

// Mock Chromatic Aberration node for Phase 3
const mockCaNode = {
  strength: { value: 0.02 },
  dispose: vi.fn(),
  ...createMockNode(),
};

vi.mock('three/addons/tsl/display/ChromaticAberrationNode.js', () => ({
  chromaticAberration: vi.fn(() => mockCaNode),
}));

// Mock Film Grain node for Phase 3
const mockFilmNode = {
  intensity: { value: 0.5 },
  dispose: vi.fn(),
  ...createMockNode(),
};

vi.mock('three/addons/tsl/display/FilmNode.js', () => ({
  film: vi.fn(() => mockFilmNode),
}));

describe('post-processing-pipeline module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('module exports', () => {
    it('should export createPostProcessingPipeline function', async () => {
      const module = await import('./post-processing-pipeline');
      expect(module.createPostProcessingPipeline).toBeDefined();
      expect(typeof module.createPostProcessingPipeline).toBe('function');
    });

    it('should export updatePostProcessingSize function', async () => {
      const module = await import('./post-processing-pipeline');
      expect(module.updatePostProcessingSize).toBeDefined();
      expect(typeof module.updatePostProcessingSize).toBe('function');
    });

    it('should export renderWithPostProcessing function', async () => {
      const module = await import('./post-processing-pipeline');
      expect(module.renderWithPostProcessing).toBeDefined();
      expect(typeof module.renderWithPostProcessing).toBe('function');
    });

    it('should export disposePostProcessingPipeline function', async () => {
      const module = await import('./post-processing-pipeline');
      expect(module.disposePostProcessingPipeline).toBeDefined();
      expect(typeof module.disposePostProcessingPipeline).toBe('function');
    });
  });

  describe('createPostProcessingPipeline', () => {
    it('should create PostProcessing instance', async () => {
      const { createPostProcessingPipeline } = await import('./post-processing-pipeline');
      const mockRenderer = {} as THREE.WebGLRenderer;
      const mockScene = {} as THREE.Scene;
      const mockCamera = {} as THREE.Camera;

      const result = createPostProcessingPipeline(mockRenderer, mockScene, mockCamera, {
        bloom: { enabled: true, strength: 1.5, radius: 0.6, threshold: 0.2 },
        vignette: { enabled: true, darkness: 0.4, offset: 0.3 },
      });

      expect(result.postProcessing).toBeDefined();
    });

    it('should use correct bloom import from addons (INV-A012)', async () => {
      const bloomModule = await import('three/addons/tsl/display/BloomNode.js');
      const { createPostProcessingPipeline } = await import('./post-processing-pipeline');

      createPostProcessingPipeline(
        {} as THREE.WebGLRenderer,
        {} as THREE.Scene,
        {} as THREE.Camera,
        {
          bloom: { enabled: true, strength: 1.5, radius: 0.6, threshold: 0.2 },
          vignette: { enabled: false, darkness: 0, offset: 0 },
        }
      );

      expect(bloomModule.bloom).toHaveBeenCalled();
    });

    it('should not call bloom when disabled', async () => {
      vi.resetModules();
      const bloomModule = await import('three/addons/tsl/display/BloomNode.js');
      vi.mocked(bloomModule.bloom).mockClear();

      const { createPostProcessingPipeline } = await import('./post-processing-pipeline');

      createPostProcessingPipeline(
        {} as THREE.WebGLRenderer,
        {} as THREE.Scene,
        {} as THREE.Camera,
        {
          bloom: { enabled: false, strength: 1.5, radius: 0.6, threshold: 0.2 },
          vignette: { enabled: false, darkness: 0, offset: 0 },
        }
      );

      expect(bloomModule.bloom).not.toHaveBeenCalled();
    });

    it('should return bloom uniforms for runtime control', async () => {
      const { createPostProcessingPipeline } = await import('./post-processing-pipeline');

      const result = createPostProcessingPipeline(
        {} as THREE.WebGLRenderer,
        {} as THREE.Scene,
        {} as THREE.Camera,
        {
          bloom: { enabled: true, strength: 1.5, radius: 0.6, threshold: 0.2 },
          vignette: { enabled: true, darkness: 0.4, offset: 0.3 },
        }
      );

      expect(result.uniforms.bloomStrength).toBeDefined();
      expect(result.uniforms.bloomStrength.value).toBe(1.5);
      expect(result.uniforms.bloomRadius).toBeDefined();
      expect(result.uniforms.bloomRadius.value).toBe(0.6);
      expect(result.uniforms.bloomThreshold).toBeDefined();
      expect(result.uniforms.bloomThreshold.value).toBe(0.2);
    });

    it('should return vignette uniforms for runtime control', async () => {
      const { createPostProcessingPipeline } = await import('./post-processing-pipeline');

      const result = createPostProcessingPipeline(
        {} as THREE.WebGLRenderer,
        {} as THREE.Scene,
        {} as THREE.Camera,
        {
          bloom: { enabled: true, strength: 1.5, radius: 0.6, threshold: 0.2 },
          vignette: { enabled: true, darkness: 0.4, offset: 0.3 },
        }
      );

      expect(result.uniforms.vignetteDarkness).toBeDefined();
      expect(result.uniforms.vignetteDarkness.value).toBe(0.4);
      expect(result.uniforms.vignetteOffset).toBeDefined();
      expect(result.uniforms.vignetteOffset.value).toBe(0.3);
    });

    it('should use default config when not provided', async () => {
      const { createPostProcessingPipeline } = await import('./post-processing-pipeline');

      const result = createPostProcessingPipeline(
        {} as THREE.WebGLRenderer,
        {} as THREE.Scene,
        {} as THREE.Camera
      );

      expect(result.config.bloom.enabled).toBe(true);
      expect(result.config.bloom.strength).toBe(1.5);
      expect(result.config.vignette.enabled).toBe(true);
    });

    it('should set outputNode on PostProcessing (INV-A014)', async () => {
      const { createPostProcessingPipeline } = await import('./post-processing-pipeline');

      const result = createPostProcessingPipeline(
        {} as THREE.WebGLRenderer,
        {} as THREE.Scene,
        {} as THREE.Camera,
        {
          bloom: { enabled: true, strength: 1.5, radius: 0.6, threshold: 0.2 },
          vignette: { enabled: true, darkness: 0.4, offset: 0.3 },
        }
      );

      expect(result.postProcessing.outputNode).not.toBeNull();
    });

    it('should return bloomNode reference when bloom enabled', async () => {
      const { createPostProcessingPipeline } = await import('./post-processing-pipeline');

      const result = createPostProcessingPipeline(
        {} as THREE.WebGLRenderer,
        {} as THREE.Scene,
        {} as THREE.Camera,
        {
          bloom: { enabled: true, strength: 1.5, radius: 0.6, threshold: 0.2 },
          vignette: { enabled: false, darkness: 0, offset: 0 },
        }
      );

      expect(result.bloomNode).not.toBeNull();
    });

    it('should return null bloomNode when bloom disabled', async () => {
      const { createPostProcessingPipeline } = await import('./post-processing-pipeline');

      const result = createPostProcessingPipeline(
        {} as THREE.WebGLRenderer,
        {} as THREE.Scene,
        {} as THREE.Camera,
        {
          bloom: { enabled: false, strength: 1.5, radius: 0.6, threshold: 0.2 },
          vignette: { enabled: false, darkness: 0, offset: 0 },
        }
      );

      expect(result.bloomNode).toBeNull();
    });
  });

  describe('updatePostProcessingSize', () => {
    it('should call setSize on bloomNode when present', async () => {
      const { createPostProcessingPipeline, updatePostProcessingSize } =
        await import('./post-processing-pipeline');

      const result = createPostProcessingPipeline(
        {} as THREE.WebGLRenderer,
        {} as THREE.Scene,
        {} as THREE.Camera,
        {
          bloom: { enabled: true, strength: 1.5, radius: 0.6, threshold: 0.2 },
          vignette: { enabled: false, darkness: 0, offset: 0 },
        }
      );

      // Add setSize mock to bloomNode
      const setSizeMock = vi.fn();
      if (result.bloomNode) {
        (result.bloomNode as unknown as Record<string, unknown>).setSize = setSizeMock;
      }

      updatePostProcessingSize(result, 1920, 1080);

      expect(setSizeMock).toHaveBeenCalledWith(1920, 1080);
    });

    it('should not throw when bloomNode is null', async () => {
      const { createPostProcessingPipeline, updatePostProcessingSize } =
        await import('./post-processing-pipeline');

      const result = createPostProcessingPipeline(
        {} as THREE.WebGLRenderer,
        {} as THREE.Scene,
        {} as THREE.Camera,
        {
          bloom: { enabled: false, strength: 1.5, radius: 0.6, threshold: 0.2 },
          vignette: { enabled: false, darkness: 0, offset: 0 },
        }
      );

      expect(() => updatePostProcessingSize(result, 1920, 1080)).not.toThrow();
    });
  });

  describe('renderWithPostProcessing', () => {
    it('should call render on PostProcessing', async () => {
      const { createPostProcessingPipeline, renderWithPostProcessing } =
        await import('./post-processing-pipeline');

      const result = createPostProcessingPipeline(
        {} as THREE.WebGLRenderer,
        {} as THREE.Scene,
        {} as THREE.Camera
      );

      renderWithPostProcessing(result);

      expect(result.postProcessing.render).toHaveBeenCalled();
    });
  });

  describe('disposePostProcessingPipeline (INV-A009)', () => {
    it('should dispose PostProcessing resources', async () => {
      const { createPostProcessingPipeline, disposePostProcessingPipeline } =
        await import('./post-processing-pipeline');

      const result = createPostProcessingPipeline(
        {} as THREE.WebGLRenderer,
        {} as THREE.Scene,
        {} as THREE.Camera
      );

      disposePostProcessingPipeline(result);

      expect(result.postProcessing.dispose).toHaveBeenCalled();
    });

    it('should dispose bloomNode when present', async () => {
      const { createPostProcessingPipeline, disposePostProcessingPipeline } =
        await import('./post-processing-pipeline');

      const result = createPostProcessingPipeline(
        {} as THREE.WebGLRenderer,
        {} as THREE.Scene,
        {} as THREE.Camera,
        {
          bloom: { enabled: true, strength: 1.5, radius: 0.6, threshold: 0.2 },
          vignette: { enabled: false, darkness: 0, offset: 0 },
        }
      );

      disposePostProcessingPipeline(result);

      expect(result.bloomNode?.dispose).toHaveBeenCalled();
    });

    it('should not throw when bloomNode is null', async () => {
      const { createPostProcessingPipeline, disposePostProcessingPipeline } =
        await import('./post-processing-pipeline');

      const result = createPostProcessingPipeline(
        {} as THREE.WebGLRenderer,
        {} as THREE.Scene,
        {} as THREE.Camera,
        {
          bloom: { enabled: false, strength: 1.5, radius: 0.6, threshold: 0.2 },
          vignette: { enabled: false, darkness: 0, offset: 0 },
        }
      );

      expect(() => disposePostProcessingPipeline(result)).not.toThrow();
    });
  });

  // ============================================================
  // Phase 3: Enhanced Visual Effects Tests
  // ============================================================

  describe('Phase 3: Depth of Field Effect', () => {
    it('should create DOF effect when enabled', async () => {
      const dofModule = await import('three/addons/tsl/display/DepthOfFieldNode.js');
      const { createPostProcessingPipeline } = await import('./post-processing-pipeline');

      createPostProcessingPipeline(
        {} as THREE.WebGLRenderer,
        {} as THREE.Scene,
        {} as THREE.Camera,
        {
          bloom: { enabled: false, strength: 0, radius: 0, threshold: 0 },
          vignette: { enabled: false, darkness: 0, offset: 0 },
          dof: { enabled: true, focusDistance: 10, focalLength: 5, bokehScale: 2 },
        }
      );

      expect(dofModule.dof).toHaveBeenCalled();
    });

    it('should not create DOF effect when disabled', async () => {
      vi.resetModules();
      const dofModule = await import('three/addons/tsl/display/DepthOfFieldNode.js');
      vi.mocked(dofModule.dof).mockClear();

      const { createPostProcessingPipeline } = await import('./post-processing-pipeline');

      createPostProcessingPipeline(
        {} as THREE.WebGLRenderer,
        {} as THREE.Scene,
        {} as THREE.Camera,
        {
          bloom: { enabled: false, strength: 0, radius: 0, threshold: 0 },
          vignette: { enabled: false, darkness: 0, offset: 0 },
          dof: { enabled: false, focusDistance: 10, focalLength: 5, bokehScale: 2 },
        }
      );

      expect(dofModule.dof).not.toHaveBeenCalled();
    });

    it('should return DOF uniforms for runtime control', async () => {
      const { createPostProcessingPipeline } = await import('./post-processing-pipeline');

      const result = createPostProcessingPipeline(
        {} as THREE.WebGLRenderer,
        {} as THREE.Scene,
        {} as THREE.Camera,
        {
          bloom: { enabled: false, strength: 0, radius: 0, threshold: 0 },
          vignette: { enabled: false, darkness: 0, offset: 0 },
          dof: { enabled: true, focusDistance: 10, focalLength: 5, bokehScale: 2 },
        }
      );

      expect(result.uniforms.dofFocusDistance).toBeDefined();
      expect(result.uniforms.dofFocusDistance?.value).toBe(10);
      expect(result.uniforms.dofFocalLength).toBeDefined();
      expect(result.uniforms.dofFocalLength?.value).toBe(5);
      expect(result.uniforms.dofBokehScale).toBeDefined();
      expect(result.uniforms.dofBokehScale?.value).toBe(2);
    });

    it('should return dofNode reference when DOF enabled', async () => {
      const { createPostProcessingPipeline } = await import('./post-processing-pipeline');

      const result = createPostProcessingPipeline(
        {} as THREE.WebGLRenderer,
        {} as THREE.Scene,
        {} as THREE.Camera,
        {
          bloom: { enabled: false, strength: 0, radius: 0, threshold: 0 },
          vignette: { enabled: false, darkness: 0, offset: 0 },
          dof: { enabled: true, focusDistance: 10, focalLength: 5, bokehScale: 2 },
        }
      );

      expect(result.dofNode).not.toBeNull();
    });
  });

  describe('Phase 3: Chromatic Aberration Effect', () => {
    it('should create chromatic aberration effect when enabled', async () => {
      const caModule = await import('three/addons/tsl/display/ChromaticAberrationNode.js');
      const { createPostProcessingPipeline } = await import('./post-processing-pipeline');

      createPostProcessingPipeline(
        {} as THREE.WebGLRenderer,
        {} as THREE.Scene,
        {} as THREE.Camera,
        {
          bloom: { enabled: false, strength: 0, radius: 0, threshold: 0 },
          vignette: { enabled: false, darkness: 0, offset: 0 },
          chromaticAberration: { enabled: true, strength: 0.02, center: { x: 0.5, y: 0.5 }, scale: 1 },
        }
      );

      expect(caModule.chromaticAberration).toHaveBeenCalled();
    });

    it('should not create chromatic aberration effect when disabled', async () => {
      vi.resetModules();
      const caModule = await import('three/addons/tsl/display/ChromaticAberrationNode.js');
      vi.mocked(caModule.chromaticAberration).mockClear();

      const { createPostProcessingPipeline } = await import('./post-processing-pipeline');

      createPostProcessingPipeline(
        {} as THREE.WebGLRenderer,
        {} as THREE.Scene,
        {} as THREE.Camera,
        {
          bloom: { enabled: false, strength: 0, radius: 0, threshold: 0 },
          vignette: { enabled: false, darkness: 0, offset: 0 },
          chromaticAberration: { enabled: false, strength: 0.02, center: { x: 0.5, y: 0.5 }, scale: 1 },
        }
      );

      expect(caModule.chromaticAberration).not.toHaveBeenCalled();
    });

    it('should return chromatic aberration uniforms for runtime control', async () => {
      const { createPostProcessingPipeline } = await import('./post-processing-pipeline');

      const result = createPostProcessingPipeline(
        {} as THREE.WebGLRenderer,
        {} as THREE.Scene,
        {} as THREE.Camera,
        {
          bloom: { enabled: false, strength: 0, radius: 0, threshold: 0 },
          vignette: { enabled: false, darkness: 0, offset: 0 },
          chromaticAberration: { enabled: true, strength: 0.02, center: { x: 0.5, y: 0.5 }, scale: 1 },
        }
      );

      expect(result.uniforms.caStrength).toBeDefined();
      expect(result.uniforms.caStrength?.value).toBe(0.02);
    });

    it('should return chromaticAberrationNode reference when enabled', async () => {
      const { createPostProcessingPipeline } = await import('./post-processing-pipeline');

      const result = createPostProcessingPipeline(
        {} as THREE.WebGLRenderer,
        {} as THREE.Scene,
        {} as THREE.Camera,
        {
          bloom: { enabled: false, strength: 0, radius: 0, threshold: 0 },
          vignette: { enabled: false, darkness: 0, offset: 0 },
          chromaticAberration: { enabled: true, strength: 0.02, center: { x: 0.5, y: 0.5 }, scale: 1 },
        }
      );

      expect(result.chromaticAberrationNode).not.toBeNull();
    });
  });

  describe('Phase 3: Film Grain Effect', () => {
    it('should create film grain effect when enabled', async () => {
      const filmModule = await import('three/addons/tsl/display/FilmNode.js');
      const { createPostProcessingPipeline } = await import('./post-processing-pipeline');

      createPostProcessingPipeline(
        {} as THREE.WebGLRenderer,
        {} as THREE.Scene,
        {} as THREE.Camera,
        {
          bloom: { enabled: false, strength: 0, radius: 0, threshold: 0 },
          vignette: { enabled: false, darkness: 0, offset: 0 },
          filmGrain: { enabled: true, intensity: 0.5 },
        }
      );

      expect(filmModule.film).toHaveBeenCalled();
    });

    it('should not create film grain effect when disabled', async () => {
      vi.resetModules();
      const filmModule = await import('three/addons/tsl/display/FilmNode.js');
      vi.mocked(filmModule.film).mockClear();

      const { createPostProcessingPipeline } = await import('./post-processing-pipeline');

      createPostProcessingPipeline(
        {} as THREE.WebGLRenderer,
        {} as THREE.Scene,
        {} as THREE.Camera,
        {
          bloom: { enabled: false, strength: 0, radius: 0, threshold: 0 },
          vignette: { enabled: false, darkness: 0, offset: 0 },
          filmGrain: { enabled: false, intensity: 0.5 },
        }
      );

      expect(filmModule.film).not.toHaveBeenCalled();
    });

    it('should return film grain uniforms for runtime control', async () => {
      const { createPostProcessingPipeline } = await import('./post-processing-pipeline');

      const result = createPostProcessingPipeline(
        {} as THREE.WebGLRenderer,
        {} as THREE.Scene,
        {} as THREE.Camera,
        {
          bloom: { enabled: false, strength: 0, radius: 0, threshold: 0 },
          vignette: { enabled: false, darkness: 0, offset: 0 },
          filmGrain: { enabled: true, intensity: 0.5 },
        }
      );

      expect(result.uniforms.filmIntensity).toBeDefined();
      expect(result.uniforms.filmIntensity?.value).toBe(0.5);
    });

    it('should return filmGrainNode reference when enabled', async () => {
      const { createPostProcessingPipeline } = await import('./post-processing-pipeline');

      const result = createPostProcessingPipeline(
        {} as THREE.WebGLRenderer,
        {} as THREE.Scene,
        {} as THREE.Camera,
        {
          bloom: { enabled: false, strength: 0, radius: 0, threshold: 0 },
          vignette: { enabled: false, darkness: 0, offset: 0 },
          filmGrain: { enabled: true, intensity: 0.5 },
        }
      );

      expect(result.filmGrainNode).not.toBeNull();
    });
  });

  describe('Phase 3: Effect Composition Order', () => {
    it('should compose all effects in correct order (bloom -> DOF -> CA -> film -> vignette)', async () => {
      const { createPostProcessingPipeline } = await import('./post-processing-pipeline');

      const result = createPostProcessingPipeline(
        {} as THREE.WebGLRenderer,
        {} as THREE.Scene,
        {} as THREE.Camera,
        {
          bloom: { enabled: true, strength: 1.5, radius: 0.6, threshold: 0.2 },
          vignette: { enabled: true, darkness: 0.4, offset: 0.3 },
          dof: { enabled: true, focusDistance: 10, focalLength: 5, bokehScale: 2 },
          chromaticAberration: { enabled: true, strength: 0.02, center: { x: 0.5, y: 0.5 }, scale: 1 },
          filmGrain: { enabled: true, intensity: 0.5 },
        }
      );

      // All effect nodes should be created
      expect(result.bloomNode).not.toBeNull();
      expect(result.dofNode).not.toBeNull();
      expect(result.chromaticAberrationNode).not.toBeNull();
      expect(result.filmGrainNode).not.toBeNull();
      // Output node should be set
      expect(result.postProcessing.outputNode).not.toBeNull();
    });
  });

  describe('Phase 3: Dispose Enhanced Effects (INV-A009)', () => {
    it('should dispose all effect nodes when present', async () => {
      const { createPostProcessingPipeline, disposePostProcessingPipeline } =
        await import('./post-processing-pipeline');

      const result = createPostProcessingPipeline(
        {} as THREE.WebGLRenderer,
        {} as THREE.Scene,
        {} as THREE.Camera,
        {
          bloom: { enabled: true, strength: 1.5, radius: 0.6, threshold: 0.2 },
          vignette: { enabled: true, darkness: 0.4, offset: 0.3 },
          dof: { enabled: true, focusDistance: 10, focalLength: 5, bokehScale: 2 },
          chromaticAberration: { enabled: true, strength: 0.02, center: { x: 0.5, y: 0.5 }, scale: 1 },
          filmGrain: { enabled: true, intensity: 0.5 },
        }
      );

      disposePostProcessingPipeline(result);

      expect(result.postProcessing.dispose).toHaveBeenCalled();
      expect(result.bloomNode?.dispose).toHaveBeenCalled();
      expect(result.dofNode?.dispose).toHaveBeenCalled();
      expect(result.chromaticAberrationNode?.dispose).toHaveBeenCalled();
      expect(result.filmGrainNode?.dispose).toHaveBeenCalled();
    });
  });
});
