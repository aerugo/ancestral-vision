/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import {
  createVisualizationEngine,
  disposeVisualizationEngine,
  type VisualizationData,
  type VisualizationConfig,
} from './engine';

// Mock the renderer module to avoid WebGPU initialization issues in tests
vi.mock('./renderer', () => ({
  createRenderer: vi.fn().mockImplementation(async () => {
    const mockRenderer = {
      setSize: vi.fn(),
      setAnimationLoop: vi.fn(),
      render: vi.fn(),
      dispose: vi.fn(),
      getSize: vi.fn().mockImplementation((target: THREE.Vector2) => {
        target.set(800, 600);
        return target;
      }),
      domElement: { tagName: 'CANVAS' }, // Mock canvas element
      constructor: { name: 'WebGLRenderer' }, // Indicate WebGL for post-processing
    };
    return mockRenderer;
  }),
}));

// Mock post-processing to avoid WebGL dependencies
vi.mock('./effects/post-processing', () => ({
  createPostProcessing: vi.fn().mockReturnValue({
    composer: {
      render: vi.fn(),
      setSize: vi.fn(),
      dispose: vi.fn(),
    },
  }),
  updatePostProcessingSize: vi.fn(),
  renderWithPostProcessing: vi.fn(),
  disposePostProcessing: vi.fn(),
}));

// Mock sacred geometry grid
vi.mock('./effects/sacred-geometry-grid', () => ({
  createSacredGeometryGrid: vi.fn().mockReturnValue(new THREE.Group()),
  disposeSacredGeometryGrid: vi.fn(),
}));

// Mock TSL imports
vi.mock('three/webgpu', () => ({
  MeshStandardNodeMaterial: class MockMaterial {
    dispose = vi.fn();
    colorNode = null;
    emissiveNode = null;
  },
  PointsNodeMaterial: class MockPointsMaterial {
    dispose = vi.fn();
    colorNode = null;
    sizeNode = null;
    positionNode = null;
    transparent = false;
    opacity = 1;
    blending = THREE.NormalBlending;
    depthWrite = true;
  },
}));

vi.mock('three/tsl', () => ({
  uniform: vi.fn(() => ({ value: 0 })),
  attribute: vi.fn(() => ({})),
  float: vi.fn(() => ({})),
  vec3: vi.fn(() => ({})),
  vec4: vi.fn(() => ({})),
  sin: vi.fn(() => ({})),
  cos: vi.fn(() => ({})),
  mul: vi.fn(() => ({})),
  add: vi.fn(() => ({})),
  sub: vi.fn(() => ({})),
  mix: vi.fn(() => ({})),
  pow: vi.fn(() => ({})),
  max: vi.fn(() => ({})),
  dot: vi.fn(() => ({})),
  normalize: vi.fn(() => ({})),
  positionLocal: {},
  normalLocal: {},
  cameraPosition: {},
}));

describe('visualization engine', () => {
  let container: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create mock container without jsdom dependency
    container = {
      clientWidth: 800,
      clientHeight: 600,
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      contains: vi.fn().mockReturnValue(true),
    } as unknown as HTMLElement;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createVisualizationEngine', () => {
    it('should export createVisualizationEngine function', () => {
      expect(createVisualizationEngine).toBeDefined();
      expect(typeof createVisualizationEngine).toBe('function');
    });

    it('should return engine interface', async () => {
      const engine = await createVisualizationEngine(container);
      expect(engine).toHaveProperty('setData');
      expect(engine).toHaveProperty('start');
      expect(engine).toHaveProperty('stop');
      expect(engine).toHaveProperty('resize');
      expect(engine).toHaveProperty('dispose');
      engine.dispose();
    });

    it('should have getter methods', async () => {
      const engine = await createVisualizationEngine(container);
      expect(engine).toHaveProperty('getRenderer');
      expect(engine).toHaveProperty('getScene');
      expect(engine).toHaveProperty('getCamera');
      expect(engine).toHaveProperty('getConfig');
      expect(engine).toHaveProperty('getNodeCount');
      expect(engine).toHaveProperty('getEdgeCount');
      expect(engine).toHaveProperty('isRunning');
      engine.dispose();
    });

    it('should initialize renderer', async () => {
      const engine = await createVisualizationEngine(container);
      expect(engine.getRenderer()).toBeDefined();
      engine.dispose();
    });

    it('should initialize scene', async () => {
      const engine = await createVisualizationEngine(container);
      expect(engine.getScene()).toBeInstanceOf(THREE.Scene);
      engine.dispose();
    });

    it('should initialize camera', async () => {
      const engine = await createVisualizationEngine(container);
      expect(engine.getCamera()).toBeInstanceOf(THREE.PerspectiveCamera);
      engine.dispose();
    });

    it('should accept configuration', async () => {
      const config: VisualizationConfig = {
        node: { glowIntensity: 2.0 },
        edge: { flowSpeed: 0.8 },
        particles: { count: 500 },
      };
      const engine = await createVisualizationEngine(container, config);
      expect(engine.getConfig().node?.glowIntensity).toBe(2.0);
      engine.dispose();
    });

    it('should use default config when not provided', async () => {
      const engine = await createVisualizationEngine(container);
      const config = engine.getConfig();
      expect(config.particles?.count).toBe(300);
      engine.dispose();
    });
  });

  describe('VisualizationEngine.setData', () => {
    it('should accept node data', async () => {
      const engine = await createVisualizationEngine(container);
      const data: VisualizationData = {
        nodes: [{
          id: 'p1',
          position: new THREE.Vector3(0, 0, 0),
          biographyWeight: 0.5,
          events: ['birth'],
        }],
        edges: [],
      };

      engine.setData(data);
      expect(engine.getNodeCount()).toBe(1);
      engine.dispose();
    });

    it('should accept edge data', async () => {
      const engine = await createVisualizationEngine(container);
      const data: VisualizationData = {
        nodes: [
          { id: 'p1', position: new THREE.Vector3(0, 0, 0), biographyWeight: 0.5, events: [] },
          { id: 'p2', position: new THREE.Vector3(10, 0, 0), biographyWeight: 0.5, events: [] },
        ],
        edges: [{
          id: 'e1',
          sourceId: 'p1',
          targetId: 'p2',
          type: 'parent-child',
          strength: 1.0,
        }],
      };

      engine.setData(data);
      expect(engine.getEdgeCount()).toBe(1);
      engine.dispose();
    });

    it('should handle empty data', async () => {
      const engine = await createVisualizationEngine(container);
      engine.setData({ nodes: [], edges: [] });
      expect(engine.getNodeCount()).toBe(0);
      expect(engine.getEdgeCount()).toBe(0);
      engine.dispose();
    });

    it('should clear previous data on new setData', async () => {
      const engine = await createVisualizationEngine(container);

      engine.setData({
        nodes: [{ id: 'p1', position: new THREE.Vector3(), biographyWeight: 0.5, events: [] }],
        edges: [],
      });

      engine.setData({
        nodes: [
          { id: 'p2', position: new THREE.Vector3(), biographyWeight: 0.5, events: [] },
          { id: 'p3', position: new THREE.Vector3(), biographyWeight: 0.5, events: [] },
        ],
        edges: [],
      });

      expect(engine.getNodeCount()).toBe(2);
      engine.dispose();
    });
  });

  describe('VisualizationEngine.start/stop', () => {
    it('should start animation loop', async () => {
      const engine = await createVisualizationEngine(container);
      engine.start();
      expect(engine.isRunning()).toBe(true);
      engine.stop();
      engine.dispose();
    });

    it('should stop animation loop', async () => {
      const engine = await createVisualizationEngine(container);
      engine.start();
      engine.stop();
      expect(engine.isRunning()).toBe(false);
      engine.dispose();
    });

    it('should not start twice', async () => {
      const engine = await createVisualizationEngine(container);
      engine.start();
      engine.start(); // Second call should be no-op
      expect(engine.isRunning()).toBe(true);
      engine.stop();
      engine.dispose();
    });
  });

  describe('VisualizationEngine.resize', () => {
    it('should update renderer size', async () => {
      const engine = await createVisualizationEngine(container);
      const renderer = engine.getRenderer();

      engine.resize(1024, 768);
      expect(renderer.setSize).toHaveBeenCalledWith(1024, 768);
      engine.dispose();
    });

    it('should update camera aspect ratio', async () => {
      const engine = await createVisualizationEngine(container);
      const camera = engine.getCamera() as THREE.PerspectiveCamera;

      engine.resize(1024, 768);
      expect(camera.aspect).toBeCloseTo(1024 / 768);
      engine.dispose();
    });
  });

  describe('VisualizationEngine.dispose', () => {
    it('should stop animation loop on dispose', async () => {
      const engine = await createVisualizationEngine(container);
      engine.start();
      engine.dispose();
      expect(engine.isRunning()).toBe(false);
    });

    it('should call renderer dispose', async () => {
      const engine = await createVisualizationEngine(container);
      const renderer = engine.getRenderer();

      engine.dispose();
      expect(renderer.dispose).toHaveBeenCalled();
    });

    it('should be safe to call multiple times', async () => {
      const engine = await createVisualizationEngine(container);
      engine.dispose();
      expect(() => engine.dispose()).not.toThrow();
    });
  });

  describe('disposeVisualizationEngine', () => {
    it('should call engine.dispose()', async () => {
      const engine = await createVisualizationEngine(container);
      const disposeSpy = vi.spyOn(engine, 'dispose');

      disposeVisualizationEngine(engine);
      expect(disposeSpy).toHaveBeenCalled();
    });
  });
});
