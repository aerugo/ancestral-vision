# Phase 0.7: 3D Foundation

**Status**: Pending
**Started**:
**Parent Plan**: [../development-plan.md](../development-plan.md)

---

## Objective

Integrate Three.js with WebGPU renderer (WebGL fallback), create basic scene with camera controls, and render placeholder constellation.

---

## Invariants Enforced in This Phase

- **INV-A001**: WebGPURenderer must be initialized with `await renderer.init()`
- **INV-A002**: Use `renderer.setAnimationLoop()` not `requestAnimationFrame()`
- **INV-A008**: Three.js imports use `three/webgpu` and `three/tsl` paths
- **INV-A009**: Scene cleanup on component unmount (dispose geometry, materials, textures)

---

## TDD Steps

### Step 0.7.1: Write Failing Tests (RED)

Create `src/visualization/renderer.test.ts`:

**Test Cases**:

1. `it('should detect WebGPU support')` - Capability detection
2. `it('should fall back to WebGL when WebGPU unavailable')` - Fallback
3. `it('should initialize renderer asynchronously')` - Async init
4. `it('should use setAnimationLoop')` - Animation pattern

Create `src/visualization/scene.test.ts`:

**Test Cases**:

1. `it('should create scene with camera')` - Scene setup
2. `it('should add orbit controls')` - Controls
3. `it('should dispose resources on cleanup')` - Memory management

Create `src/visualization/constellation.test.ts`:

**Test Cases**:

1. `it('should render placeholder nodes')` - Basic rendering
2. `it('should position nodes in 3D space')` - Positioning
3. `it('should handle empty data')` - Edge case

```typescript
// src/visualization/renderer.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRenderer, isWebGPUSupported } from './renderer';

// Mock navigator.gpu
const mockNavigator = {
  gpu: {
    requestAdapter: vi.fn().mockResolvedValue({}),
  },
};

describe('Renderer', () => {
  beforeEach(() => {
    // Setup mock DOM
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    document.body.appendChild(canvas);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  describe('isWebGPUSupported', () => {
    it('should detect WebGPU support', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: mockNavigator,
        writable: true,
      });

      const supported = await isWebGPUSupported();
      expect(supported).toBe(true);
    });

    it('should return false when WebGPU unavailable', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
      });

      const supported = await isWebGPUSupported();
      expect(supported).toBe(false);
    });
  });

  describe('createRenderer', () => {
    it('should initialize renderer asynchronously', async () => {
      const canvas = document.querySelector('canvas')!;
      const renderer = await createRenderer(canvas);

      expect(renderer).toBeDefined();
      expect(renderer.domElement).toBe(canvas);
    });

    it('should set correct pixel ratio', async () => {
      const canvas = document.querySelector('canvas')!;
      const renderer = await createRenderer(canvas);

      // Should clamp to max 2 for performance
      expect(renderer.getPixelRatio()).toBeLessThanOrEqual(2);
    });
  });
});
```

```typescript
// src/visualization/scene.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createScene, createCamera, createControls, disposeScene } from './scene';
import * as THREE from 'three';

describe('Scene', () => {
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    document.body.appendChild(canvas);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('createScene', () => {
    it('should create scene with dark background', () => {
      const scene = createScene();

      expect(scene).toBeInstanceOf(THREE.Scene);
      expect(scene.background).toBeDefined();
    });

    it('should have cosmic color scheme', () => {
      const scene = createScene();
      const bg = scene.background as THREE.Color;

      // Should be very dark (near black)
      expect(bg.r).toBeLessThan(0.1);
      expect(bg.g).toBeLessThan(0.1);
      expect(bg.b).toBeLessThan(0.15);
    });
  });

  describe('createCamera', () => {
    it('should create perspective camera', () => {
      const camera = createCamera(800, 600);

      expect(camera).toBeInstanceOf(THREE.PerspectiveCamera);
      expect(camera.aspect).toBe(800 / 600);
    });

    it('should position camera at reasonable distance', () => {
      const camera = createCamera(800, 600);

      // Camera should be positioned to see constellation
      expect(camera.position.z).toBeGreaterThan(50);
    });
  });

  describe('createControls', () => {
    it('should create orbit controls', () => {
      const camera = createCamera(800, 600);
      const controls = createControls(camera, canvas);

      expect(controls).toBeDefined();
      expect(controls.enableDamping).toBe(true);
    });

    it('should enable zoom and pan', () => {
      const camera = createCamera(800, 600);
      const controls = createControls(camera, canvas);

      expect(controls.enableZoom).toBe(true);
      expect(controls.enablePan).toBe(true);
    });
  });

  describe('disposeScene', () => {
    it('should dispose all scene resources', () => {
      const scene = createScene();
      const geometry = new THREE.SphereGeometry(1);
      const material = new THREE.MeshBasicMaterial();
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      const disposeSpy = vi.spyOn(geometry, 'dispose');
      const materialDisposeSpy = vi.spyOn(material, 'dispose');

      disposeScene(scene);

      expect(disposeSpy).toHaveBeenCalled();
      expect(materialDisposeSpy).toHaveBeenCalled();
    });
  });
});
```

```typescript
// src/visualization/constellation.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createConstellationMesh, updateConstellation } from './constellation';
import * as THREE from 'three';

interface PlaceholderPerson {
  id: string;
  givenName: string;
  position: { x: number; y: number; z: number };
}

describe('Constellation', () => {
  describe('createConstellationMesh', () => {
    it('should render placeholder nodes', () => {
      const people: PlaceholderPerson[] = [
        { id: '1', givenName: 'John', position: { x: 0, y: 0, z: 0 } },
        { id: '2', givenName: 'Jane', position: { x: 10, y: 5, z: 0 } },
      ];

      const mesh = createConstellationMesh(people);

      expect(mesh).toBeInstanceOf(THREE.Group);
      expect(mesh.children.length).toBe(2);
    });

    it('should position nodes in 3D space', () => {
      const people: PlaceholderPerson[] = [
        { id: '1', givenName: 'John', position: { x: 5, y: 10, z: 15 } },
      ];

      const mesh = createConstellationMesh(people);
      const node = mesh.children[0];

      expect(node.position.x).toBe(5);
      expect(node.position.y).toBe(10);
      expect(node.position.z).toBe(15);
    });

    it('should handle empty data', () => {
      const mesh = createConstellationMesh([]);

      expect(mesh).toBeInstanceOf(THREE.Group);
      expect(mesh.children.length).toBe(0);
    });
  });

  describe('updateConstellation', () => {
    it('should update node positions', () => {
      const people: PlaceholderPerson[] = [
        { id: '1', givenName: 'John', position: { x: 0, y: 0, z: 0 } },
      ];

      const mesh = createConstellationMesh(people);
      const node = mesh.children[0];

      updateConstellation(mesh, [
        { id: '1', givenName: 'John', position: { x: 20, y: 20, z: 20 } },
      ]);

      expect(node.position.x).toBe(20);
    });
  });
});
```

### Step 0.7.2: Implement to Pass Tests (GREEN)

**`src/visualization/renderer.ts`**:

```typescript
// src/visualization/renderer.ts
import WebGPURenderer from 'three/webgpu';
import { WebGLRenderer } from 'three';

export async function isWebGPUSupported(): Promise<boolean> {
  try {
    if (!navigator.gpu) return false;
    const adapter = await navigator.gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

export async function createRenderer(
  canvas: HTMLCanvasElement
): Promise<WebGPURenderer | WebGLRenderer> {
  const webgpuSupported = await isWebGPUSupported();

  if (webgpuSupported) {
    console.log('Using WebGPU renderer');
    const renderer = new WebGPURenderer({
      canvas,
      antialias: true,
      alpha: false,
    });

    // WebGPU requires async initialization
    await renderer.init();

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    return renderer;
  }

  // Fallback to WebGL
  console.log('WebGPU not supported, using WebGL fallback');
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);

  return renderer;
}

export function isWebGPURenderer(
  renderer: WebGPURenderer | WebGLRenderer
): renderer is WebGPURenderer {
  return 'backend' in renderer;
}
```

**`src/visualization/scene.ts`**:

```typescript
// src/visualization/scene.ts
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Cosmic color palette
const COLORS = {
  background: new THREE.Color(0x050510), // Deep space blue-black
  ambient: new THREE.Color(0x1a1a2e),
};

export function createScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = COLORS.background;

  // Add ambient light for visibility
  const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
  scene.add(ambientLight);

  // Add point light for depth
  const pointLight = new THREE.PointLight(0xffffff, 1);
  pointLight.position.set(50, 50, 50);
  scene.add(pointLight);

  return scene;
}

export function createCamera(width: number, height: number): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(
    60, // FOV
    width / height, // Aspect ratio
    0.1, // Near plane
    10000 // Far plane
  );

  // Position camera to see initial constellation
  camera.position.set(0, 30, 100);
  camera.lookAt(0, 0, 0);

  return camera;
}

export function createControls(
  camera: THREE.Camera,
  domElement: HTMLElement
): OrbitControls {
  const controls = new OrbitControls(camera, domElement);

  // Enable smooth movement
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // Enable zoom and pan
  controls.enableZoom = true;
  controls.enablePan = true;

  // Set zoom limits
  controls.minDistance = 10;
  controls.maxDistance = 500;

  // Set rotation limits (optional - can remove for full freedom)
  controls.maxPolarAngle = Math.PI; // Allow full vertical rotation

  return controls;
}

export function disposeScene(scene: THREE.Scene): void {
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      if (object.geometry) {
        object.geometry.dispose();
      }

      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    }
  });

  scene.clear();
}
```

**`src/visualization/constellation.ts`**:

```typescript
// src/visualization/constellation.ts
import * as THREE from 'three';

interface PlaceholderPerson {
  id: string;
  givenName: string;
  position: { x: number; y: number; z: number };
}

// Node appearance
const NODE_RADIUS = 2;
const NODE_COLOR = new THREE.Color(0x6366f1); // Indigo
const NODE_EMISSIVE = new THREE.Color(0x4f46e5);

export function createConstellationMesh(people: PlaceholderPerson[]): THREE.Group {
  const group = new THREE.Group();
  group.name = 'constellation';

  const geometry = new THREE.SphereGeometry(NODE_RADIUS, 32, 32);
  const material = new THREE.MeshStandardMaterial({
    color: NODE_COLOR,
    emissive: NODE_EMISSIVE,
    emissiveIntensity: 0.3,
    metalness: 0.5,
    roughness: 0.5,
  });

  people.forEach((person) => {
    const mesh = new THREE.Mesh(geometry, material.clone());
    mesh.position.set(
      person.position.x,
      person.position.y,
      person.position.z
    );
    mesh.userData = { id: person.id, givenName: person.givenName };
    mesh.name = `person-${person.id}`;

    group.add(mesh);
  });

  return group;
}

export function updateConstellation(
  group: THREE.Group,
  people: PlaceholderPerson[]
): void {
  people.forEach((person) => {
    const mesh = group.getObjectByName(`person-${person.id}`);
    if (mesh) {
      mesh.position.set(
        person.position.x,
        person.position.y,
        person.position.z
      );
    }
  });
}

// Generate placeholder data for testing
export function generatePlaceholderPeople(count: number): PlaceholderPerson[] {
  const people: PlaceholderPerson[] = [];

  for (let i = 0; i < count; i++) {
    // Arrange in a rough spiral
    const angle = (i / count) * Math.PI * 4;
    const radius = 20 + i * 2;
    const height = (i % 5) * 10 - 20;

    people.push({
      id: `placeholder-${i}`,
      givenName: `Person ${i + 1}`,
      position: {
        x: Math.cos(angle) * radius,
        y: height,
        z: Math.sin(angle) * radius,
      },
    });
  }

  return people;
}
```

**`src/components/constellation-canvas.tsx`**:

```typescript
// src/components/constellation-canvas.tsx
'use client';

import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { createRenderer, isWebGPURenderer } from '@/visualization/renderer';
import { createScene, createCamera, createControls, disposeScene } from '@/visualization/scene';
import { createConstellationMesh, generatePlaceholderPeople } from '@/visualization/constellation';

export function ConstellationCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  const initScene = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    // Create canvas
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);

    // Get dimensions
    const width = container.clientWidth;
    const height = container.clientHeight;
    canvas.width = width;
    canvas.height = height;

    // Initialize renderer (async for WebGPU)
    const renderer = await createRenderer(canvas);
    rendererRef.current = renderer;

    // Create scene
    const scene = createScene();
    sceneRef.current = scene;

    // Create camera
    const camera = createCamera(width, height);
    cameraRef.current = camera;

    // Create controls
    const controls = createControls(camera, canvas);
    controlsRef.current = controls;

    // Add placeholder constellation
    const placeholderPeople = generatePlaceholderPeople(10);
    const constellation = createConstellationMesh(placeholderPeople);
    scene.add(constellation);

    // Animation loop - use setAnimationLoop per INV-A002
    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
    });

    // Handle resize
    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    // Return cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.setAnimationLoop(null);
      controls.dispose();
      disposeScene(scene);
      renderer.dispose();
      container.removeChild(canvas);
    };
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    initScene().then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [initScene]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      data-testid="constellation-canvas"
    />
  );
}
```

### Step 0.7.3: Refactor

1. Add node selection (raycasting)
2. Add smooth camera transitions
3. Integrate with real constellation data

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/visualization/renderer.ts` | CREATE | WebGPU/WebGL renderer |
| `src/visualization/renderer.test.ts` | CREATE | Renderer tests |
| `src/visualization/scene.ts` | CREATE | Scene, camera, controls |
| `src/visualization/scene.test.ts` | CREATE | Scene tests |
| `src/visualization/constellation.ts` | CREATE | Constellation mesh |
| `src/visualization/constellation.test.ts` | CREATE | Constellation tests |
| `src/components/constellation-canvas.tsx` | CREATE | React canvas component |

---

## Verification

```bash
# Run 3D tests
npx vitest run src/visualization

# Start dev server
npm run dev

# Check constellation renders at /constellation
open http://localhost:3000/constellation

# Verify controls work (orbit, zoom, pan)

# Check browser console for WebGPU/WebGL message

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

## Completion Criteria

- [ ] All visualization tests pass
- [ ] WebGPU renderer initializes (or falls back to WebGL)
- [ ] Placeholder constellation renders (10 nodes)
- [ ] Camera controls work (orbit, zoom, pan)
- [ ] Smooth 60fps performance
- [ ] Proper cleanup on unmount (no memory leaks)
- [ ] Type check passes
- [ ] Lint passes
- [ ] INV-A001, INV-A002, INV-A008, INV-A009 enforced by tests
