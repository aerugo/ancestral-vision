/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import {
  createTSLPostProcessing,
  updateTSLPostProcessingSize,
  renderWithTSLPostProcessing,
  disposeTSLPostProcessing,
  type TSLPostProcessingConfig,
  type TSLPostProcessingResult,
} from './webgpu-post-processing';

// Mock Three.js TSL modules
vi.mock('three/tsl', () => {
  function createMockNode(): Record<string, unknown> {
    const node: Record<string, unknown> = {};
    const mockFn = () => createMockNode();
    node.mul = vi.fn(mockFn);
    node.add = vi.fn(mockFn);
    node.sub = vi.fn(mockFn);
    node.div = vi.fn(mockFn);
    return node;
  }

  return {
    uniform: vi.fn((value) => {
      const node = createMockNode();
      node.value = value;
      node.isUniform = true;
      return node;
    }),
    float: vi.fn((v) => {
      const node = createMockNode();
      node.value = v;
      node.type = 'float';
      return node;
    }),
    vec2: vi.fn(() => createMockNode()),
    vec3: vi.fn(() => createMockNode()),
    vec4: vi.fn(() => createMockNode()),
    texture: vi.fn(() => createMockNode()),
    uv: vi.fn(() => createMockNode()),
    mul: vi.fn(() => createMockNode()),
    add: vi.fn(() => createMockNode()),
    sub: vi.fn(() => createMockNode()),
    pow: vi.fn(() => createMockNode()),
    max: vi.fn(() => createMockNode()),
    min: vi.fn(() => createMockNode()),
    smoothstep: vi.fn(() => createMockNode()),
    length: vi.fn(() => createMockNode()),
    distance: vi.fn(() => createMockNode()),
    screenUV: createMockNode(),
    screenSize: createMockNode(),
    pass: vi.fn(() => ({
      getTextureNode: vi.fn(() => createMockNode()),
    })),
    bloom: vi.fn(() => createMockNode()),
    output: vi.fn(() => createMockNode()),
    PostProcessing: vi.fn().mockImplementation(() => ({
      outputNode: null,
      render: vi.fn(),
      setSize: vi.fn(),
      dispose: vi.fn(),
    })),
  };
});

describe('TSL Post-Processing (Phase 9.3)', () => {
  describe('createTSLPostProcessing', () => {
    let mockRenderer: THREE.WebGLRenderer;
    let mockScene: THREE.Scene;
    let mockCamera: THREE.Camera;

    beforeEach(() => {
      mockRenderer = {
        getSize: vi.fn((target) => target.set(1920, 1080)),
        setSize: vi.fn(),
        render: vi.fn(),
        dispose: vi.fn(),
      } as unknown as THREE.WebGLRenderer;
      mockScene = new THREE.Scene();
      mockCamera = new THREE.PerspectiveCamera();
    });

    it('should export createTSLPostProcessing function', () => {
      expect(createTSLPostProcessing).toBeDefined();
      expect(typeof createTSLPostProcessing).toBe('function');
    });

    it('should return postProcessing and config', () => {
      const result = createTSLPostProcessing(mockRenderer, mockScene, mockCamera);
      expect(result).toHaveProperty('postProcessing');
      expect(result).toHaveProperty('config');
    });

    it('should have bloom enabled by default', () => {
      const result = createTSLPostProcessing(mockRenderer, mockScene, mockCamera);
      expect(result.config.bloom.enabled).toBe(true);
    });

    it('should have vignette enabled by default', () => {
      const result = createTSLPostProcessing(mockRenderer, mockScene, mockCamera);
      expect(result.config.vignette.enabled).toBe(true);
    });

    it('should accept custom bloom config', () => {
      const config: TSLPostProcessingConfig = {
        bloom: { intensity: 0.8, threshold: 0.5 },
      };
      const result = createTSLPostProcessing(mockRenderer, mockScene, mockCamera, config);
      expect(result.config.bloom.intensity).toBe(0.8);
      expect(result.config.bloom.threshold).toBe(0.5);
    });

    it('should accept custom vignette config', () => {
      const config: TSLPostProcessingConfig = {
        vignette: { darkness: 0.6, offset: 0.4 },
      };
      const result = createTSLPostProcessing(mockRenderer, mockScene, mockCamera, config);
      expect(result.config.vignette.darkness).toBe(0.6);
      expect(result.config.vignette.offset).toBe(0.4);
    });

    it('should allow disabling bloom', () => {
      const config: TSLPostProcessingConfig = {
        bloom: { enabled: false },
      };
      const result = createTSLPostProcessing(mockRenderer, mockScene, mockCamera, config);
      expect(result.config.bloom.enabled).toBe(false);
    });

    it('should allow disabling vignette', () => {
      const config: TSLPostProcessingConfig = {
        vignette: { enabled: false },
      };
      const result = createTSLPostProcessing(mockRenderer, mockScene, mockCamera, config);
      expect(result.config.vignette.enabled).toBe(false);
    });
  });

  describe('updateTSLPostProcessingSize', () => {
    it('should call setSize on postProcessing', () => {
      const mockPostProcessing = {
        setSize: vi.fn(),
        render: vi.fn(),
        dispose: vi.fn(),
        outputNode: null,
      };
      updateTSLPostProcessingSize(mockPostProcessing as unknown as TSLPostProcessingResult['postProcessing'], 1920, 1080);
      expect(mockPostProcessing.setSize).toHaveBeenCalledWith(1920, 1080);
    });
  });

  describe('renderWithTSLPostProcessing', () => {
    it('should call render on postProcessing', () => {
      const mockPostProcessing = {
        render: vi.fn(),
        setSize: vi.fn(),
        dispose: vi.fn(),
        outputNode: null,
      };
      renderWithTSLPostProcessing(mockPostProcessing as unknown as TSLPostProcessingResult['postProcessing']);
      expect(mockPostProcessing.render).toHaveBeenCalled();
    });
  });

  describe('disposeTSLPostProcessing', () => {
    it('should call dispose on postProcessing', () => {
      const mockPostProcessing = {
        dispose: vi.fn(),
        render: vi.fn(),
        setSize: vi.fn(),
        outputNode: null,
      };
      disposeTSLPostProcessing(mockPostProcessing as unknown as TSLPostProcessingResult['postProcessing']);
      expect(mockPostProcessing.dispose).toHaveBeenCalled();
    });
  });

  describe('TSL bloom effect', () => {
    let mockRenderer: THREE.WebGLRenderer;
    let mockScene: THREE.Scene;
    let mockCamera: THREE.Camera;

    beforeEach(() => {
      mockRenderer = {
        getSize: vi.fn((target) => target.set(1920, 1080)),
        setSize: vi.fn(),
        render: vi.fn(),
        dispose: vi.fn(),
      } as unknown as THREE.WebGLRenderer;
      mockScene = new THREE.Scene();
      mockCamera = new THREE.PerspectiveCamera();
    });

    it('should use default bloom intensity of 0.6', () => {
      const result = createTSLPostProcessing(mockRenderer, mockScene, mockCamera);
      expect(result.config.bloom.intensity).toBe(0.6);
    });

    it('should use default bloom threshold of 0.8 (Phase 6 tuned)', () => {
      const result = createTSLPostProcessing(mockRenderer, mockScene, mockCamera);
      expect(result.config.bloom.threshold).toBe(0.8);
    });
  });

  describe('TSL vignette effect', () => {
    let mockRenderer: THREE.WebGLRenderer;
    let mockScene: THREE.Scene;
    let mockCamera: THREE.Camera;

    beforeEach(() => {
      mockRenderer = {
        getSize: vi.fn((target) => target.set(1920, 1080)),
        setSize: vi.fn(),
        render: vi.fn(),
        dispose: vi.fn(),
      } as unknown as THREE.WebGLRenderer;
      mockScene = new THREE.Scene();
      mockCamera = new THREE.PerspectiveCamera();
    });

    it('should use default vignette darkness of 0.4', () => {
      const result = createTSLPostProcessing(mockRenderer, mockScene, mockCamera);
      expect(result.config.vignette.darkness).toBe(0.4);
    });

    it('should use default vignette offset of 0.3', () => {
      const result = createTSLPostProcessing(mockRenderer, mockScene, mockCamera);
      expect(result.config.vignette.offset).toBe(0.3);
    });
  });
});
