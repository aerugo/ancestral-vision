# Phase 8: Integration & Polish

**Status**: Pending
**Started**:
**Parent Plan**: [development-plan.md](../development-plan.md)

---

## Objective

Integrate all visual systems into a cohesive constellation visualization, optimize performance, and ensure proper cleanup and error handling.

---

## Invariants Enforced in This Phase

- **INV-A001**: WebGPURenderer Init - Ensure proper async initialization
- **INV-A002**: Animation Loop - Use setAnimationLoop for rendering
- **INV-A008**: WebGPU Imports - Verify all imports correct
- **INV-A009**: Resource Disposal - Complete cleanup on unmount

---

## TDD Steps

### Step 8.1: Write Failing Tests for Visualization Engine (RED)

Create `src/visualization/engine.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import {
  createVisualizationEngine,
  disposeVisualizationEngine,
  type VisualizationEngine,
  type VisualizationData,
  type VisualizationConfig,
} from './engine';

describe('visualization engine', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
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
      expect(engine).toHaveProperty('setTheme');
      expect(engine).toHaveProperty('dispose');
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
      expect(engine.getConfig().node.glowIntensity).toBe(2.0);
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
  });

  describe('VisualizationEngine.setTheme', () => {
    it('should switch to dark theme', async () => {
      const engine = await createVisualizationEngine(container);
      engine.setTheme('dark');
      expect(engine.getTheme()).toBe('dark');
      engine.dispose();
    });

    it('should switch to light theme', async () => {
      const engine = await createVisualizationEngine(container);
      engine.setTheme('light');
      expect(engine.getTheme()).toBe('light');
      engine.dispose();
    });

    it('should update scene background', async () => {
      const engine = await createVisualizationEngine(container);
      engine.setTheme('light');
      const scene = engine.getScene();
      expect((scene.background as THREE.Color).getHex()).toBe(0xf5ebd7);
      engine.dispose();
    });
  });

  describe('VisualizationEngine.resize', () => {
    it('should update renderer size', async () => {
      const engine = await createVisualizationEngine(container);
      const renderer = engine.getRenderer();
      const setSizeSpy = vi.spyOn(renderer, 'setSize');

      engine.resize(1024, 768);
      expect(setSizeSpy).toHaveBeenCalledWith(1024, 768);
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
    it('should stop animation loop', async () => {
      const engine = await createVisualizationEngine(container);
      engine.start();
      engine.dispose();
      expect(engine.isRunning()).toBe(false);
    });

    it('should dispose renderer', async () => {
      const engine = await createVisualizationEngine(container);
      const renderer = engine.getRenderer();
      const disposeSpy = vi.spyOn(renderer, 'dispose');

      engine.dispose();
      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should clear scene', async () => {
      const engine = await createVisualizationEngine(container);
      engine.setData({
        nodes: [{ id: 'p1', position: new THREE.Vector3(), biographyWeight: 0.5, events: [] }],
        edges: [],
      });

      const scene = engine.getScene();
      const initialChildren = scene.children.length;

      engine.dispose();
      expect(scene.children.length).toBeLessThan(initialChildren);
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
```

**Run tests to confirm RED**:

```bash
npx vitest src/visualization/engine.test.ts
```

### Step 8.2: Implement Visualization Engine (GREEN)

Create `src/visualization/engine.ts`:

```typescript
/**
 * Visualization Engine
 * Orchestrates all visual systems for constellation rendering
 */
import * as THREE from 'three';
import { createRenderer, disposeRenderer } from './renderer';
import { createScene, createCamera, createControls, disposeScene } from './scene';
import {
  createInstancedConstellation,
  updateConstellationTime,
  disposeInstancedConstellation,
  type ConstellationData,
} from './constellation';
import {
  createEdgeSystem,
  updateEdgeSystemTime,
  disposeEdgeSystem,
  type EdgeData,
} from './edges';
import {
  createBackgroundParticles,
  updateBackgroundParticlesTime,
  disposeBackgroundParticles,
} from './particles/background-particles';
import {
  createEventFireflies,
  updateEventFirefliesTime,
  disposeEventFireflies,
} from './particles/event-fireflies';
import { createSacredGeometryGrid, disposeSacredGeometryGrid } from './effects/sacred-geometry-grid';
import {
  createPostProcessing,
  updatePostProcessingSize,
  renderWithPostProcessing,
  disposePostProcessing,
} from './effects/post-processing';
import {
  createThemeManager,
  setTheme as applyTheme,
  type Theme,
} from './effects/theme-manager';
import type { NodeMaterialUniforms } from './materials/node-material';
import type { EdgeMaterialUniforms } from './materials/edge-material';

export interface NodeData {
  id: string;
  position: THREE.Vector3;
  biographyWeight: number;
  events: string[];
}

export interface EdgeConnection {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'parent-child' | 'spouse' | 'sibling';
  strength: number;
}

export interface VisualizationData {
  nodes: NodeData[];
  edges: EdgeConnection[];
}

export interface VisualizationConfig {
  node?: {
    glowIntensity?: number;
    pulseSpeed?: number;
  };
  edge?: {
    flowSpeed?: number;
    curvature?: number;
  };
  particles?: {
    count?: number;
    enabled?: boolean;
  };
  fireflies?: {
    enabled?: boolean;
  };
  grid?: {
    enabled?: boolean;
  };
  postProcessing?: {
    enabled?: boolean;
    bloom?: boolean;
    vignette?: boolean;
  };
}

export interface VisualizationEngine {
  setData: (data: VisualizationData) => void;
  start: () => void;
  stop: () => void;
  setTheme: (theme: Theme) => void;
  getTheme: () => Theme;
  resize: (width: number, height: number) => void;
  dispose: () => void;
  getRenderer: () => THREE.WebGLRenderer;
  getScene: () => THREE.Scene;
  getCamera: () => THREE.Camera;
  getConfig: () => Required<VisualizationConfig>;
  getNodeCount: () => number;
  getEdgeCount: () => number;
  isRunning: () => boolean;
}

const DEFAULT_CONFIG: Required<VisualizationConfig> = {
  node: { glowIntensity: 1.5, pulseSpeed: 2.0 },
  edge: { flowSpeed: 0.5, curvature: 0.3 },
  particles: { count: 300, enabled: true },
  fireflies: { enabled: true },
  grid: { enabled: true },
  postProcessing: { enabled: true, bloom: true, vignette: true },
};

/**
 * Creates complete visualization engine
 * @param container - DOM container for canvas
 * @param config - Engine configuration
 * @returns Visualization engine interface
 */
export async function createVisualizationEngine(
  container: HTMLElement,
  config: VisualizationConfig = {}
): Promise<VisualizationEngine> {
  const resolvedConfig: Required<VisualizationConfig> = {
    node: { ...DEFAULT_CONFIG.node, ...config.node },
    edge: { ...DEFAULT_CONFIG.edge, ...config.edge },
    particles: { ...DEFAULT_CONFIG.particles, ...config.particles },
    fireflies: { ...DEFAULT_CONFIG.fireflies, ...config.fireflies },
    grid: { ...DEFAULT_CONFIG.grid, ...config.grid },
    postProcessing: { ...DEFAULT_CONFIG.postProcessing, ...config.postProcessing },
  };

  // Initialize core Three.js
  const renderer = await createRenderer(container);
  const scene = createScene();
  const camera = createCamera(container.clientWidth / container.clientHeight);
  const controls = createControls(camera, renderer.domElement);

  // Initialize theme
  const themeManager = createThemeManager();

  // State
  let running = false;
  let animationId: number | null = null;
  let time = 0;
  let nodeCount = 0;
  let edgeCount = 0;

  // Visual system references
  let constellationMesh: THREE.InstancedMesh | null = null;
  let constellationUniforms: NodeMaterialUniforms | null = null;
  let edgeMesh: THREE.Line | null = null;
  let edgeUniforms: EdgeMaterialUniforms | null = null;
  let particlesMesh: THREE.Points | null = null;
  let particlesUniforms: { uTime: { value: number } } | null = null;
  let firefliesMesh: THREE.Points | null = null;
  let firefliesUniforms: { uTime: { value: number } } | null = null;
  let gridGroup: THREE.Group | null = null;
  let postProcessing: ReturnType<typeof createPostProcessing> | null = null;

  // Initialize static elements
  if (resolvedConfig.particles.enabled) {
    const particles = createBackgroundParticles({ count: resolvedConfig.particles.count });
    particlesMesh = particles.mesh;
    particlesUniforms = particles.uniforms;
    scene.add(particlesMesh);
  }

  if (resolvedConfig.grid.enabled) {
    gridGroup = createSacredGeometryGrid();
    scene.add(gridGroup);
  }

  if (resolvedConfig.postProcessing.enabled) {
    postProcessing = createPostProcessing(renderer, scene, camera, {
      bloom: { enabled: resolvedConfig.postProcessing.bloom },
      vignette: { enabled: resolvedConfig.postProcessing.vignette },
    });
  }

  // Animation loop
  const animate = (): void => {
    if (!running) return;

    time += 0.016; // ~60fps

    // Update time uniforms
    if (constellationUniforms) updateConstellationTime(constellationUniforms, time);
    if (edgeUniforms) updateEdgeSystemTime(edgeUniforms, time);
    if (particlesUniforms) updateBackgroundParticlesTime(particlesUniforms, time);
    if (firefliesUniforms) updateEventFirefliesTime(firefliesUniforms, time);

    controls.update();

    // Render
    if (postProcessing) {
      renderWithPostProcessing(postProcessing.composer);
    } else {
      renderer.render(scene, camera);
    }
  };

  const engine: VisualizationEngine = {
    setData: (data: VisualizationData) => {
      // Clear previous data
      if (constellationMesh) {
        scene.remove(constellationMesh);
        disposeInstancedConstellation(constellationMesh);
        constellationMesh = null;
      }
      if (edgeMesh) {
        scene.remove(edgeMesh);
        disposeEdgeSystem(edgeMesh);
        edgeMesh = null;
      }
      if (firefliesMesh) {
        scene.remove(firefliesMesh);
        disposeEventFireflies(firefliesMesh);
        firefliesMesh = null;
      }

      nodeCount = data.nodes.length;
      edgeCount = data.edges.length;

      if (nodeCount === 0) return;

      // Create node lookup
      const nodeMap = new Map<string, NodeData>();
      data.nodes.forEach((n) => nodeMap.set(n.id, n));

      // Create constellation
      const constellationData: ConstellationData = {
        positions: data.nodes.map((n) => n.position),
        biographyWeights: data.nodes.map((n) => n.biographyWeight),
        personIds: data.nodes.map((n) => n.id),
      };
      const constellation = createInstancedConstellation(constellationData, {
        baseScale: 1.0,
        scaleMultiplier: 2.5,
      });
      constellationMesh = constellation.mesh;
      constellationUniforms = constellation.uniforms;
      scene.add(constellationMesh);

      // Create edges
      if (edgeCount > 0) {
        const edgeData: EdgeData[] = data.edges.map((e) => ({
          id: e.id,
          sourcePosition: nodeMap.get(e.sourceId)?.position ?? new THREE.Vector3(),
          targetPosition: nodeMap.get(e.targetId)?.position ?? new THREE.Vector3(),
          type: e.type,
          strength: e.strength,
        }));
        const edges = createEdgeSystem({ edges: edgeData });
        edgeMesh = edges.mesh;
        edgeUniforms = edges.uniforms;
        scene.add(edgeMesh);
      }

      // Create fireflies
      if (resolvedConfig.fireflies.enabled) {
        const fireflies = createEventFireflies({
          nodePositions: data.nodes.map((n) => n.position),
          nodeBiographyWeights: data.nodes.map((n) => n.biographyWeight),
          nodeEventTypes: data.nodes.map((n) => n.events),
        });
        firefliesMesh = fireflies.mesh;
        firefliesUniforms = fireflies.uniforms;
        scene.add(firefliesMesh);
      }
    },

    start: () => {
      if (running) return;
      running = true;
      renderer.setAnimationLoop(animate);
    },

    stop: () => {
      running = false;
      renderer.setAnimationLoop(null);
    },

    setTheme: (theme: Theme) => {
      themeManager.setTheme(theme);
      applyTheme(theme, {
        scene,
        uniforms: {
          node: constellationUniforms ?? undefined,
          edge: edgeUniforms ?? undefined,
        },
        grid: gridGroup ?? undefined,
        bloomPass: postProcessing?.bloomPass,
        vignettePass: postProcessing?.vignettePass,
      });
    },

    getTheme: () => themeManager.getTheme(),

    resize: (width: number, height: number) => {
      renderer.setSize(width, height);
      (camera as THREE.PerspectiveCamera).aspect = width / height;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
      if (postProcessing) {
        updatePostProcessingSize(postProcessing.composer, width, height);
      }
    },

    dispose: () => {
      engine.stop();

      // Dispose visual systems
      if (constellationMesh) {
        scene.remove(constellationMesh);
        disposeInstancedConstellation(constellationMesh);
      }
      if (edgeMesh) {
        scene.remove(edgeMesh);
        disposeEdgeSystem(edgeMesh);
      }
      if (particlesMesh) {
        scene.remove(particlesMesh);
        disposeBackgroundParticles(particlesMesh);
      }
      if (firefliesMesh) {
        scene.remove(firefliesMesh);
        disposeEventFireflies(firefliesMesh);
      }
      if (gridGroup) {
        scene.remove(gridGroup);
        disposeSacredGeometryGrid(gridGroup);
      }
      if (postProcessing) {
        disposePostProcessing(postProcessing.composer);
      }

      // Dispose core
      disposeScene(scene);
      controls.dispose();
      disposeRenderer(renderer);
    },

    getRenderer: () => renderer,
    getScene: () => scene,
    getCamera: () => camera,
    getConfig: () => resolvedConfig,
    getNodeCount: () => nodeCount,
    getEdgeCount: () => edgeCount,
    isRunning: () => running,
  };

  return engine;
}

/**
 * Disposes visualization engine (INV-A009)
 * @param engine - Engine to dispose
 */
export function disposeVisualizationEngine(engine: VisualizationEngine): void {
  engine.dispose();
}
```

**Run tests to confirm GREEN**:

```bash
npx vitest src/visualization/engine.test.ts
```

### Step 8.3: Update Exports and Integration

Update `src/visualization/index.ts`:

```typescript
/**
 * Visualization Module Exports
 */

// Engine
export {
  createVisualizationEngine,
  disposeVisualizationEngine,
  type VisualizationEngine,
  type VisualizationData,
  type VisualizationConfig,
  type NodeData,
  type EdgeConnection,
} from './engine';

// Theme
export {
  type Theme,
  getDarkThemeColors,
  getLightThemeColors,
} from './effects/theme-manager';

// Re-export for advanced usage
export * from './renderer';
export * from './scene';
export * from './constellation';
export * from './edges';
export * from './particles/background-particles';
export * from './particles/event-fireflies';
export * from './effects/sacred-geometry-grid';
export * from './effects/post-processing';
export * from './effects/theme-manager';
```

### Step 8.4: Refactor

- [ ] Optimize animation loop performance
- [ ] Add performance monitoring
- [ ] Add error boundaries for WebGPU failures
- [ ] Profile with 500+ nodes

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/visualization/engine.ts` | CREATE | Main orchestration |
| `src/visualization/engine.test.ts` | CREATE | Integration tests |
| `src/visualization/index.ts` | MODIFY | Update exports |
| `src/components/constellation-canvas.tsx` | MODIFY | Use new engine |

---

## Verification

```bash
# Run all visualization tests
npx vitest src/visualization/

# Run integration tests
npx vitest src/visualization/engine.test.ts

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Visual comparison test
npm run dev
# Navigate to constellation view, compare with prototype
```

---

## Completion Criteria

- [ ] All test cases pass (unit + integration)
- [ ] Visual parity with prototype (side-by-side comparison)
- [ ] 60fps with 500 nodes (Chrome DevTools Performance)
- [ ] No memory leaks (Chrome DevTools Memory)
- [ ] WebGL fallback works correctly
- [ ] All INV-A invariants verified
- [ ] Documentation updated
- [ ] Work notes finalized

---

*Template version: 1.0*
