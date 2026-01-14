/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import {
  createPostProcessing,
  updatePostProcessingSize,
  renderWithPostProcessing,
  disposePostProcessing,
  type PostProcessingConfig,
} from './post-processing';

// Mock Three.js post-processing modules using class syntax
vi.mock('three/addons/postprocessing/EffectComposer.js', () => {
  class MockEffectComposer {
    public addPass = vi.fn();
    public setSize = vi.fn();
    public render = vi.fn();
    public dispose = vi.fn();
    public passes: unknown[] = [];
  }
  return { EffectComposer: MockEffectComposer };
});

vi.mock('three/addons/postprocessing/RenderPass.js', () => {
  class MockRenderPass {
    public enabled = true;
  }
  return { RenderPass: MockRenderPass };
});

vi.mock('three/addons/postprocessing/UnrealBloomPass.js', () => {
  class MockUnrealBloomPass {
    public enabled = true;
    public strength = 0;
    public radius = 0;
    public threshold = 0;
  }
  return { UnrealBloomPass: MockUnrealBloomPass };
});

vi.mock('three/addons/postprocessing/ShaderPass.js', () => {
  class MockShaderPass {
    public enabled = true;
    public uniforms = {
      darkness: { value: 0 },
      offset: { value: 0 },
    };
  }
  return { ShaderPass: MockShaderPass };
});

vi.mock('three/addons/postprocessing/OutputPass.js', () => {
  class MockOutputPass {
    public enabled = true;
  }
  return { OutputPass: MockOutputPass };
});

describe('post-processing module', () => {
  let mockRenderer: THREE.WebGLRenderer;
  let mockScene: THREE.Scene;
  let mockCamera: THREE.PerspectiveCamera;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRenderer = {
      setSize: vi.fn(),
      getSize: vi.fn().mockImplementation((target: THREE.Vector2) => {
        target.set(1920, 1080);
        return target;
      }),
      getPixelRatio: vi.fn().mockReturnValue(1),
      dispose: vi.fn(),
    } as unknown as THREE.WebGLRenderer;

    mockScene = new THREE.Scene();
    mockCamera = new THREE.PerspectiveCamera();
  });

  describe('createPostProcessing', () => {
    it('should export createPostProcessing function', () => {
      expect(createPostProcessing).toBeDefined();
      expect(typeof createPostProcessing).toBe('function');
    });

    it('should return composer and config', () => {
      const result = createPostProcessing(mockRenderer, mockScene, mockCamera);
      expect(result).toHaveProperty('composer');
      expect(result).toHaveProperty('config');
    });

    it('should add render pass', () => {
      const { composer } = createPostProcessing(mockRenderer, mockScene, mockCamera);
      expect(composer.addPass).toHaveBeenCalled();
    });

    it('should accept bloom configuration', () => {
      const config: PostProcessingConfig = {
        bloom: {
          enabled: true,
          intensity: 0.8,
          threshold: 0.5,
          radius: 0.5,
        },
      };
      const { config: resultConfig } = createPostProcessing(
        mockRenderer,
        mockScene,
        mockCamera,
        config
      );
      expect(resultConfig.bloom.intensity).toBe(0.8);
    });

    it('should accept vignette configuration', () => {
      const config: PostProcessingConfig = {
        vignette: {
          enabled: true,
          darkness: 0.5,
          offset: 0.4,
        },
      };
      const { config: resultConfig } = createPostProcessing(
        mockRenderer,
        mockScene,
        mockCamera,
        config
      );
      expect(resultConfig.vignette.darkness).toBe(0.5);
    });

    it('should use default bloom intensity of 0.6', () => {
      const { config } = createPostProcessing(mockRenderer, mockScene, mockCamera);
      expect(config.bloom.intensity).toBe(0.6);
    });

    it('should use default vignette darkness of 0.4', () => {
      const { config } = createPostProcessing(mockRenderer, mockScene, mockCamera);
      expect(config.vignette.darkness).toBe(0.4);
    });

    it('should use default bloom threshold of 0.3', () => {
      const { config } = createPostProcessing(mockRenderer, mockScene, mockCamera);
      expect(config.bloom.threshold).toBe(0.3);
    });

    it('should use default bloom radius of 0.5', () => {
      const { config } = createPostProcessing(mockRenderer, mockScene, mockCamera);
      expect(config.bloom.radius).toBe(0.5);
    });

    it('should use default vignette offset of 0.3', () => {
      const { config } = createPostProcessing(mockRenderer, mockScene, mockCamera);
      expect(config.vignette.offset).toBe(0.3);
    });

    it('should add multiple passes to composer', () => {
      const { composer } = createPostProcessing(mockRenderer, mockScene, mockCamera);
      // RenderPass + BloomPass + VignettePass + OutputPass = 4 passes
      expect(composer.addPass).toHaveBeenCalledTimes(4);
    });

    it('should skip bloom pass when disabled', () => {
      const config: PostProcessingConfig = {
        bloom: { enabled: false },
      };
      const { composer } = createPostProcessing(mockRenderer, mockScene, mockCamera, config);
      // RenderPass + VignettePass + OutputPass = 3 passes
      expect(composer.addPass).toHaveBeenCalledTimes(3);
    });

    it('should skip vignette pass when disabled', () => {
      const config: PostProcessingConfig = {
        vignette: { enabled: false },
      };
      const { composer } = createPostProcessing(mockRenderer, mockScene, mockCamera, config);
      // RenderPass + BloomPass + OutputPass = 3 passes
      expect(composer.addPass).toHaveBeenCalledTimes(3);
    });
  });

  describe('updatePostProcessingSize', () => {
    it('should call composer setSize', () => {
      const { composer } = createPostProcessing(mockRenderer, mockScene, mockCamera);
      updatePostProcessingSize(composer, 800, 600);
      expect(composer.setSize).toHaveBeenCalledWith(800, 600);
    });

    it('should accept different dimensions', () => {
      const { composer } = createPostProcessing(mockRenderer, mockScene, mockCamera);
      updatePostProcessingSize(composer, 1280, 720);
      expect(composer.setSize).toHaveBeenCalledWith(1280, 720);
    });
  });

  describe('renderWithPostProcessing', () => {
    it('should call composer render', () => {
      const { composer } = createPostProcessing(mockRenderer, mockScene, mockCamera);
      renderWithPostProcessing(composer);
      expect(composer.render).toHaveBeenCalled();
    });

    it('should call render once per invocation', () => {
      const { composer } = createPostProcessing(mockRenderer, mockScene, mockCamera);
      renderWithPostProcessing(composer);
      renderWithPostProcessing(composer);
      expect(composer.render).toHaveBeenCalledTimes(2);
    });
  });

  describe('disposePostProcessing', () => {
    it('should call composer dispose', () => {
      const { composer } = createPostProcessing(mockRenderer, mockScene, mockCamera);
      disposePostProcessing(composer);
      expect(composer.dispose).toHaveBeenCalled();
    });

    it('should only dispose once', () => {
      const { composer } = createPostProcessing(mockRenderer, mockScene, mockCamera);
      disposePostProcessing(composer);
      expect(composer.dispose).toHaveBeenCalledTimes(1);
    });
  });
});
