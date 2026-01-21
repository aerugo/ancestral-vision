# Graphics Engine Reference

The Ancestral Vision graphics engine renders the constellation view - a 3D visualization of family trees as an interactive star constellation. Built on WebGPU with Three.js r171+, it provides high-performance instanced rendering with custom TSL (Three.js Shader Language) materials.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Quick Start](#quick-start)
- [Core Components](#core-components)
  - [Renderer](#renderer)
  - [Scene](#scene)
  - [ConstellationManager](#constellationmanager)
  - [Instance Pools](#instance-pools)
- [Materials](#materials)
  - [Ghost Node Material](#ghost-node-material)
  - [TSL Cloud Material](#tsl-cloud-material)
  - [Edge Material](#edge-material)
- [Selection System](#selection-system)
- [Edge System](#edge-system)
- [Particle Effects](#particle-effects)
- [Camera and Controls](#camera-and-controls)
- [Performance Optimization](#performance-optimization)
- [Lifecycle and Disposal](#lifecycle-and-disposal)
- [API Reference](#api-reference)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Render Loop                               │
│  renderer.setAnimationLoop(() => {                          │
│    animationSystem.update(deltaTime)                        │
│    constellationManager.updateTime(time)                    │
│    renderer.render(scene, camera)                           │
│  })                                                         │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Ghost Pool    │  │ Biography Pool  │  │   Edge System   │
│  (InstancePool) │  │  (InstancePool) │  │  (LineSegments) │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ GhostNodeMaterial│ │ TSLCloudMaterial │ │   EdgeMaterial  │
│   (TSL shader)  │  │   (TSL shader)  │  │   (TSL shader)  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

**Key Design Principles:**

1. **WebGPU-first**: Uses `three/webgpu` and `three/tsl` imports exclusively
2. **Instance pooling**: Game engine-style memory management with O(1) add/remove
3. **Unified time source**: All animations driven by a single TimeProvider
4. **Type-safe**: Complete TypeScript coverage with no `any` types

---

## Quick Start

```typescript
import {
  createRenderer,
  createScene,
  createCamera,
  createControls,
  ConstellationManager,
  createEdgeSystem,
} from '@/visualization';

// 1. Initialize WebGPU renderer (MUST await)
const renderer = await createRenderer(canvas);

// 2. Create scene and camera
const scene = createScene();
const camera = createCamera(width, height);
const controls = createControls(camera, canvas);

// 3. Initialize constellation with data
const manager = new ConstellationManager();
manager.initialize(scene, {
  people: [
    { id: 'person-1', name: 'Alice', x: 0, y: 0, z: 0, biographyWeight: 0.8 },
    { id: 'person-2', name: 'Bob', x: 10, y: 5, z: -3, biographyWeight: 0 },
  ],
  parentChildRelations: [{ parentId: 'person-1', childId: 'person-2' }],
  spouseRelations: [],
});

// 4. Create edges
const edges = createEdgeSystem({
  nodes: manager.getNodePositions(),
  edges: [{ sourceId: 'person-1', targetId: 'person-2', type: 'parent-child' }],
});
scene.add(edges.mesh);

// 5. Start render loop
renderer.setAnimationLoop(() => {
  const time = performance.now() / 1000;
  manager.updateTime(time);
  updateEdgeSystemTime(edges.uniforms, time);
  controls.update();
  renderer.render(scene, camera);
});
```

---

## Core Components

### Renderer

The renderer module wraps `WebGPURenderer` with proper initialization and disposal.

```typescript
import {
  createRenderer,
  isWebGPUSupported,
  disposeRenderer,
  WebGPUNotSupportedError
} from '@/visualization';
```

#### `createRenderer(canvas: HTMLCanvasElement): Promise<WebGPURendererType>`

Creates and initializes a WebGPU renderer. **Must be awaited** - this is a critical invariant (INV-A001).

```typescript
try {
  const renderer = await createRenderer(canvas);
} catch (error) {
  if (error instanceof WebGPUNotSupportedError) {
    // Show fallback UI
  }
}
```

**Configuration applied:**
- Antialias: enabled
- Pixel ratio: clamped to max 2x
- Color space: SRGB
- Tone mapping: disabled (colors controlled in shaders)

#### `isWebGPUSupported(): Promise<boolean>`

Checks WebGPU availability with a 2-second timeout.

```typescript
const supported = await isWebGPUSupported();
if (!supported) {
  showWebGPUFallback();
}
```

#### `disposeRenderer(renderer: WebGPURendererType): void`

Properly disposes renderer resources to prevent WebGPU memory leaks.

---

### Scene

The scene module creates pre-configured Three.js scenes optimized for the constellation view.

```typescript
import { createScene, createCamera, createControls, disposeScene } from '@/visualization';
```

#### `createScene(): THREE.Scene`

Creates a scene with:
- **Background**: Deep space blue-black (`#050510`)
- **Lighting**: Ambient light (0x404040, intensity 0.5) + point light (0xffffff, intensity 1)
- **Fog**: Disabled

#### `createCamera(width: number, height: number): THREE.PerspectiveCamera`

Creates a camera with:
- **FOV**: 60°
- **Near/Far**: 0.1 / 10000
- **Initial position**: (0, 30, 100)

#### `createControls(camera: Camera, domElement: HTMLElement): OrbitControls`

Creates OrbitControls with:
- **Damping**: enabled (factor: 0.05)
- **Zoom range**: 10-500 units
- **Vertical rotation**: 0 to π
- **Pan**: enabled

#### `disposeScene(scene: THREE.Scene): void`

Recursively disposes all geometries, materials, and textures in the scene.

---

### ConstellationManager

The `ConstellationManager` orchestrates ghost and biography node pools with smooth transitions.

```typescript
import { ConstellationManager } from '@/visualization';

const manager = new ConstellationManager();
```

#### Initialization

```typescript
manager.initialize(scene, {
  people: ConstellationPersonData[],
  parentChildRelations: ParentChildRelation[],
  spouseRelations: SpouseRelation[],
});
```

**ConstellationPersonData:**
```typescript
interface ConstellationPersonData {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  biographyWeight: number;  // 0 = ghost, >0 = biography
}
```

#### Incremental Updates

The manager supports efficient diffing for data updates:

```typescript
// Compute what changed
const changes = manager.computeChanges(newData);
// { added: Person[], removed: string[], updated: Person[] }

// Apply changes without full rebuild
manager.applyChanges(changes);
```

#### Ghost-to-Biography Transitions

Animate a node from ghost state to biography state:

```typescript
// Start transition
const state = manager.startTransition('person-123', biographyWeight, colorIndex);

// Update during render loop (progress: 0-1)
manager.updateTransition(progress);

// Complete when done
manager.completeTransition();
```

**Transition Phases (0-1 progress):**
| Progress | Phase | Description |
|----------|-------|-------------|
| 0-12% | Gather | Ghost visible, sphere particles fade in |
| 12-20% | Compress | Ghost fades as particles intensify |
| 20-55% | Explosion | Sphere particles dominate |
| 55-85% | Emergence | Biography node grows |
| 85-100% | Reveal | Particles fade, biography fully visible |

#### Selection State

Update node glow based on selection:

```typescript
manager.updateSelectionState(
  selectedId,        // Currently selected node
  connectedIds       // Set of connected node IDs
);
```

**Selection states:**
- `NONE` (0): Very faint glow (5% max)
- `CONNECTED` (0.5): Medium glow (60% max)
- `SELECTED` (1.0): Bright sun-like glow (100% max)

#### Pulse Animation

Update pulse intensity along paths:

```typescript
manager.updatePulseIntensity(
  new Map([
    ['person-1', 0.8],
    ['person-2', 0.4],
  ])
);
```

#### Time Updates

Update shader time uniforms each frame:

```typescript
manager.updateTime(elapsedTime);
```

---

### Instance Pools

Instance pools provide game engine-style memory management for efficient instanced rendering.

#### InstancePool (Low-Level)

```typescript
import { InstancePool } from '@/visualization';

const pool = new InstancePool(mesh, {
  initialCapacity: 100,
  capacityHeadroom: 50,
});

// Add instance - O(1)
const index = pool.addInstance('node-1', new Vector3(0, 0, 0), 1.0);

// Remove instance - O(1) via swap-and-pop
pool.removeInstance('node-1');

// Update position
pool.setPosition('node-1', new Vector3(10, 5, 0));

// Update scale
pool.setScale('node-1', 2.0);

// Track custom attributes
pool.trackAttribute('selectionState', selectionAttribute, 0.0);
pool.setAttributeValue('selectionState', 'node-1', 1.0);
```

#### ConstellationPool (High-Level)

```typescript
import { ConstellationPool } from '@/visualization';

// Create ghost pool
const { mesh, pool, uniforms } = ConstellationPool.createGhostPool(nodes, {
  initialCapacity: 500,
});

// Create biography pool
const { mesh, pool, uniforms } = ConstellationPool.createBiographyPool(nodes, {
  initialCapacity: 100,
});

// Add/remove nodes
pool.addNode({ id: 'person-1', position: new Vector3(0, 0, 0), scale: 1.0 });
pool.removeNode('person-1');

// Update selection
pool.updateSelectionState(selectedId, connectedIds);

// Update pulse intensity
pool.updatePulseIntensity(intensityMap);
```

---

## Materials

### Ghost Node Material

Semi-transparent nodes for people without biography data.

```typescript
import { createGhostNodeMaterial } from '@/visualization';

const { material, uniforms } = createGhostNodeMaterial({
  baseColor: 0x4488cc,      // Ghostly blue
  mandalaIntensity: 0.8,    // Swirling pattern
  transparency: 0.55,       // Semi-transparent
  baseGlow: 0.05,           // Very faint base glow
});

// Update time each frame
uniforms.uTime.value = elapsedTime;
```

**Visual features:**
- Swirling mandala pattern on surface
- View-dependent Fresnel glow
- Selection-based brightness modulation
- Smooth fading during transitions

**Instance attributes:**
- `aSelectionState`: Glow multiplier (0, 0.5, or 1)
- `aPulseIntensity`: Pulse animation intensity
- `aTransitionProgress`: Fade out during transition (0-1)

### TSL Cloud Material

Organic flowing cloud effect for biography nodes.

```typescript
import { createTSLCloudMaterial, TSL_CLOUD_PRESETS } from '@/visualization';

const { material, uniforms } = createTSLCloudMaterial({
  flowSpeed: 0.4,
  cloudDensity: 1.0,
  glowIntensity: 0.5,
  enablePalette: true,      // Use 5-color sci-fi palette
  enableSelectionGlow: true,
});

// Or use a preset
const { material, uniforms } = createTSLCloudMaterialWithPreset('celestial');
```

**Presets:**
- `lava`: Fiery orange/red (flow: 0.6, density: 1.2)
- `celestial`: Cosmic blue/purple (flow: 0.4, density: 0.9)
- `sacred`: Golden Klimt-inspired (flow: 0.3, density: 0.8)

**Instance attributes:**
- `aBiographyWeight`: Affects node size (1.0 + weight × 2.5)
- `aSelectionState`: Glow modulation
- `aColorIndex`: Palette color selection (0-4)
- `aPulseIntensity`: Pulse animation

### Edge Material

Animated glow material for family connection lines.

```typescript
import { createEdgeMaterial } from '@/visualization';

const { material, uniforms } = createEdgeMaterial({
  color: 0x6699cc,
  glowIntensity: 0.8,
  pulseSpeed: 1.0,
});

// Update time each frame
updateEdgeSystemTime(uniforms, elapsedTime);
```

---

## Selection System

Raycasting-based 3D click detection.

```typescript
import { ConstellationSelection, getConnectedPersonIds } from '@/visualization';

const selection = new ConstellationSelection(camera, scene, nodeIdMap);

// Handle click (normalized coordinates: -1 to 1)
const personId = selection.getIntersectedPerson(
  (event.clientX / width) * 2 - 1,
  -(event.clientY / height) * 2 + 1
);

if (personId) {
  // Get connected nodes for highlighting
  const connected = getConnectedPersonIds(
    personId,
    parentChildRelations,
    spouseRelations
  );

  manager.updateSelectionState(personId, new Set(connected));
}
```

---

## Edge System

Renders family connections as animated line segments.

```typescript
import { createEdgeSystem, updateEdgeSystemTime, disposeEdgeSystem } from '@/visualization';

const edgeSystem = createEdgeSystem({
  nodes: nodePositionMap,  // Map<string, Vector3>
  edges: [
    { sourceId: 'parent', targetId: 'child', type: 'parent-child' },
    { sourceId: 'spouse1', targetId: 'spouse2', type: 'spouse' },
  ],
});

scene.add(edgeSystem.mesh);

// Update time each frame
updateEdgeSystemTime(edgeSystem.uniforms, time);

// Update pulse intensities for path animation
updateEdgePulseIntensities(
  edgeSystem.pulseIntensityAttribute,
  edgeSystem.segmentMapping,
  intensityMap,
  personIdList
);

// Cleanup
disposeEdgeSystem(edgeSystem.mesh);
```

**Note:** Uses `LineSegments` (not `Line`) to prevent spurious connections between separate edges.

---

## Particle Effects

### Background Particles

Ambient atmosphere particles.

```typescript
import { createBackgroundParticles } from '@/visualization';

const particles = createBackgroundParticles({
  count: 1000,
  spread: 200,
  size: 0.5,
});

scene.add(particles.points);

// Update time
updateBackgroundParticlesTime(particles.uniforms, time);
```

### Event Fireflies

Glowing markers for life events.

```typescript
import { createEventFireflies, getEventColor } from '@/visualization';

const fireflies = createEventFireflies({
  events: [
    { position: new Vector3(0, 0, 0), type: 'birth' },
    { position: new Vector3(5, 2, -3), type: 'marriage' },
  ],
});

scene.add(fireflies.points);

// Update time
updateEventFirefliesTime(fireflies.uniforms, time);
```

---

## Camera and Controls

### CameraAnimator

Smooth animated camera transitions.

```typescript
import { CameraAnimator } from '@/visualization';

const animator = new CameraAnimator(camera, controls);

// Animate to focus on a node
animator.animateTo(
  new Vector3(10, 5, 30),  // Target position
  new Vector3(0, 0, 0),    // Look at point
  {
    duration: 1.0,
    easing: 'easeInOutCubic',
    onComplete: () => console.log('Camera arrived'),
  }
);

// Update each frame
animator.update(deltaTime);

// Check if animating
if (animator.isAnimating()) {
  // Disable user controls
}
```

---

## Performance Optimization

### LOD System

Adjust quality based on performance.

```typescript
import { createLODSystem } from '@/visualization';

const lod = createLODSystem({
  targetFPS: 60,
  adjustmentInterval: 1000,
});

// In render loop
lod.update(deltaTime);

// Get current level
const level = lod.getCurrentLevel(); // 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA'
```

**Parameters adjusted by LOD:**
- Geometry segments (spheres)
- Particle counts
- Effect intensities
- Bloom strength

### Performance Monitor

Track rendering metrics.

```typescript
import { createPerformanceMonitor } from '@/visualization';

const monitor = createPerformanceMonitor();

// In render loop
monitor.begin();
renderer.render(scene, camera);
monitor.end();

// Get metrics
const metrics = monitor.getMetrics();
// { fps, frameTime, triangles, drawCalls }
```

### Instance Pooling Benefits

- **Single draw call** per material type
- **O(1) add/remove** operations
- **No mesh recreation** during updates
- **Pre-allocated capacity** with headroom

---

## Lifecycle and Disposal

Proper cleanup sequence to prevent WebGPU memory leaks:

```typescript
function cleanup() {
  // 1. Stop render loop
  renderer.setAnimationLoop(null);

  // 2. Dispose animation system
  animationSystem.dispose();

  // 3. Dispose constellation manager
  manager.dispose();

  // 4. Dispose edge system
  disposeEdgeSystem(edgeSystem.mesh);

  // 5. Dispose particles
  disposeBackgroundParticles(particles);

  // 6. Dispose scene (recursive cleanup)
  disposeScene(scene);

  // 7. Dispose renderer
  disposeRenderer(renderer);
}
```

---

## API Reference

### Rendering

| Function | Description |
|----------|-------------|
| `createRenderer(canvas)` | Create WebGPU renderer (async) |
| `isWebGPUSupported()` | Check WebGPU availability (async) |
| `disposeRenderer(renderer)` | Dispose renderer resources |
| `createScene()` | Create configured scene |
| `createCamera(w, h)` | Create perspective camera |
| `createControls(camera, dom)` | Create orbit controls |
| `disposeScene(scene)` | Dispose scene recursively |

### Constellation

| Class/Function | Description |
|----------------|-------------|
| `ConstellationManager` | High-level pool orchestrator |
| `ConstellationPool` | Material-specific instance pool |
| `InstancePool` | Low-level instanced mesh pool |
| `ConstellationSelection` | 3D click detection |
| `getConnectedPersonIds()` | Find connected nodes |

### Materials

| Function | Description |
|----------|-------------|
| `createGhostNodeMaterial(config)` | Ghost node material |
| `createTSLCloudMaterial(config)` | Biography cloud material |
| `createEdgeMaterial(config)` | Edge line material |
| `createNodeMaterial(config)` | Generic node material |

### Edges

| Function | Description |
|----------|-------------|
| `createEdgeSystem(data)` | Create edge line segments |
| `updateEdgeSystemTime(uniforms, time)` | Update shader time |
| `updateEdgePulseIntensities(...)` | Update pulse animation |
| `disposeEdgeSystem(mesh)` | Dispose edge resources |

### Particles

| Function | Description |
|----------|-------------|
| `createBackgroundParticles(config)` | Background atmosphere |
| `createEventFireflies(config)` | Event markers |
| `updateBackgroundParticlesTime(...)` | Update time uniform |
| `updateEventFirefliesTime(...)` | Update time uniform |

### Camera

| Class | Description |
|-------|-------------|
| `CameraAnimator` | Smooth camera transitions |

### Performance

| Function | Description |
|----------|-------------|
| `createLODSystem(config)` | Level of detail system |
| `createPerformanceMonitor()` | FPS and metrics tracking |

---

## Invariants

These critical rules must be followed:

| ID | Invariant |
|----|-----------|
| INV-A001 | WebGPURenderer requires `await renderer.init()` |
| INV-A002 | Use `renderer.setAnimationLoop()` not `requestAnimationFrame` |
| INV-A008 | Import from `three/webgpu` and `three/tsl` |
| INV-A009 | Proper scene cleanup on unmount |

---

## See Also

- [Animation Orchestrator](./animation-orchestrator.md) - Unified animation system
- [Layout System](./layout-system.md) - Force-directed graph layout
- [TSL Shaders](./tsl-shaders.md) - WebGPU shader development
