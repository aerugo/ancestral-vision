# Phase 2: Edge Connections

**Status**: Pending
**Started**:
**Parent Plan**: [development-plan.md](../development-plan.md)

---

## Objective

Implement curved Bezier edge connections between family members with flowing energy animation using TSL materials.

---

## Invariants Enforced in This Phase

- **INV-A008**: WebGPU Imports - All TSL imports use `three/tsl` path
- **INV-A009**: Resource Disposal - Edge geometries and materials disposed on cleanup

---

## TDD Steps

### Step 2.1: Write Failing Tests for Edge Geometry (RED)

Create `src/visualization/edges/edge-geometry.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  createBezierCurvePoints,
  createEdgeGeometry,
  type EdgeData,
  type EdgeGeometryConfig,
} from './edge-geometry';

describe('edge-geometry module', () => {
  describe('createBezierCurvePoints', () => {
    it('should export createBezierCurvePoints function', () => {
      expect(createBezierCurvePoints).toBeDefined();
      expect(typeof createBezierCurvePoints).toBe('function');
    });

    it('should return array of Vector3 points', () => {
      const start = new THREE.Vector3(0, 0, 0);
      const end = new THREE.Vector3(10, 0, 0);
      const points = createBezierCurvePoints(start, end);

      expect(Array.isArray(points)).toBe(true);
      expect(points.length).toBeGreaterThan(0);
      expect(points[0]).toBeInstanceOf(THREE.Vector3);
    });

    it('should start at start point', () => {
      const start = new THREE.Vector3(0, 0, 0);
      const end = new THREE.Vector3(10, 0, 0);
      const points = createBezierCurvePoints(start, end);

      expect(points[0].x).toBeCloseTo(0);
      expect(points[0].y).toBeCloseTo(0);
      expect(points[0].z).toBeCloseTo(0);
    });

    it('should end at end point', () => {
      const start = new THREE.Vector3(0, 0, 0);
      const end = new THREE.Vector3(10, 0, 0);
      const points = createBezierCurvePoints(start, end);
      const lastPoint = points[points.length - 1];

      expect(lastPoint.x).toBeCloseTo(10);
      expect(lastPoint.y).toBeCloseTo(0);
      expect(lastPoint.z).toBeCloseTo(0);
    });

    it('should create curved path with curvature factor', () => {
      const start = new THREE.Vector3(0, 0, 0);
      const end = new THREE.Vector3(10, 0, 0);
      const points = createBezierCurvePoints(start, end, { curvature: 0.3 });
      const midIndex = Math.floor(points.length / 2);

      // Mid-point should be offset perpendicular to line
      expect(points[midIndex].y).not.toBe(0);
    });

    it('should accept configurable segment count', () => {
      const start = new THREE.Vector3(0, 0, 0);
      const end = new THREE.Vector3(10, 0, 0);
      const points20 = createBezierCurvePoints(start, end, { segments: 20 });
      const points50 = createBezierCurvePoints(start, end, { segments: 50 });

      expect(points20.length).toBe(21); // segments + 1
      expect(points50.length).toBe(51);
    });

    it('should handle zero-length edges gracefully', () => {
      const point = new THREE.Vector3(5, 5, 5);
      const points = createBezierCurvePoints(point, point.clone());

      expect(points.length).toBeGreaterThan(0);
    });
  });

  describe('createEdgeGeometry', () => {
    it('should export createEdgeGeometry function', () => {
      expect(createEdgeGeometry).toBeDefined();
      expect(typeof createEdgeGeometry).toBe('function');
    });

    it('should return BufferGeometry', () => {
      const edges: EdgeData[] = [{
        id: 'edge-1',
        sourcePosition: new THREE.Vector3(0, 0, 0),
        targetPosition: new THREE.Vector3(10, 0, 0),
        type: 'parent-child',
        strength: 1.0,
      }];
      const geometry = createEdgeGeometry(edges);

      expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
    });

    it('should create position attribute', () => {
      const edges: EdgeData[] = [{
        id: 'edge-1',
        sourcePosition: new THREE.Vector3(0, 0, 0),
        targetPosition: new THREE.Vector3(10, 0, 0),
        type: 'parent-child',
        strength: 1.0,
      }];
      const geometry = createEdgeGeometry(edges);

      expect(geometry.attributes.position).toBeDefined();
    });

    it('should create progress attribute for shader animation', () => {
      const edges: EdgeData[] = [{
        id: 'edge-1',
        sourcePosition: new THREE.Vector3(0, 0, 0),
        targetPosition: new THREE.Vector3(10, 0, 0),
        type: 'parent-child',
        strength: 1.0,
      }];
      const geometry = createEdgeGeometry(edges);

      expect(geometry.attributes.aProgress).toBeDefined();
    });

    it('should create strength attribute', () => {
      const edges: EdgeData[] = [{
        id: 'edge-1',
        sourcePosition: new THREE.Vector3(0, 0, 0),
        targetPosition: new THREE.Vector3(10, 0, 0),
        type: 'parent-child',
        strength: 0.8,
      }];
      const geometry = createEdgeGeometry(edges);

      expect(geometry.attributes.aStrength).toBeDefined();
    });

    it('should handle multiple edges', () => {
      const edges: EdgeData[] = [
        {
          id: 'edge-1',
          sourcePosition: new THREE.Vector3(0, 0, 0),
          targetPosition: new THREE.Vector3(10, 0, 0),
          type: 'parent-child',
          strength: 1.0,
        },
        {
          id: 'edge-2',
          sourcePosition: new THREE.Vector3(0, 0, 0),
          targetPosition: new THREE.Vector3(0, 10, 0),
          type: 'spouse',
          strength: 0.8,
        },
      ];
      const geometry = createEdgeGeometry(edges);

      // Should have vertices for both edges
      expect(geometry.attributes.position.count).toBeGreaterThan(40);
    });

    it('should return empty geometry for empty edges array', () => {
      const geometry = createEdgeGeometry([]);
      expect(geometry.attributes.position.count).toBe(0);
    });
  });
});
```

**Run tests to confirm RED**:

```bash
npx vitest src/visualization/edges/edge-geometry.test.ts
```

### Step 2.2: Implement Edge Geometry (GREEN)

Create `src/visualization/edges/edge-geometry.ts`:

```typescript
/**
 * Edge Geometry Generation
 * Creates curved Bezier paths between constellation nodes
 */
import * as THREE from 'three';

export interface EdgeData {
  /** Unique edge identifier */
  id: string;
  /** Source node position */
  sourcePosition: THREE.Vector3;
  /** Target node position */
  targetPosition: THREE.Vector3;
  /** Edge relationship type */
  type: 'parent-child' | 'spouse' | 'sibling';
  /** Edge strength (0-1) for visual intensity */
  strength: number;
}

export interface BezierConfig {
  /** Curvature factor (0-1, default: 0.3) */
  curvature?: number;
  /** Number of curve segments (default: 30) */
  segments?: number;
}

export interface EdgeGeometryConfig {
  /** Bezier curve configuration */
  bezier?: BezierConfig;
}

const DEFAULT_BEZIER_CONFIG: Required<BezierConfig> = {
  curvature: 0.3,
  segments: 30,
};

/**
 * Creates array of points along a quadratic Bezier curve
 * @param start - Start position
 * @param end - End position
 * @param config - Curve configuration
 * @returns Array of Vector3 points along curve
 */
export function createBezierCurvePoints(
  start: THREE.Vector3,
  end: THREE.Vector3,
  config: BezierConfig = {}
): THREE.Vector3[] {
  const { curvature, segments } = { ...DEFAULT_BEZIER_CONFIG, ...config };

  // Calculate midpoint and perpendicular offset
  const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const direction = new THREE.Vector3().subVectors(end, start);
  const distance = direction.length();

  // Get perpendicular vector for curve offset
  // Use cross product with up vector, fallback to different axis if parallel
  let perpendicular = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0));
  if (perpendicular.length() < 0.001) {
    perpendicular.crossVectors(direction, new THREE.Vector3(1, 0, 0));
  }
  perpendicular.normalize();

  // Control point offset perpendicular to edge direction
  const controlPoint = midpoint.clone().add(
    perpendicular.multiplyScalar(distance * curvature)
  );

  // Create quadratic Bezier curve
  const curve = new THREE.QuadraticBezierCurve3(start, controlPoint, end);
  return curve.getPoints(segments);
}

/**
 * Creates BufferGeometry for all edges with attributes for shader
 * @param edges - Array of edge data
 * @param config - Geometry configuration
 * @returns BufferGeometry with position, progress, and strength attributes
 */
export function createEdgeGeometry(
  edges: EdgeData[],
  config: EdgeGeometryConfig = {}
): THREE.BufferGeometry {
  const bezierConfig = { ...DEFAULT_BEZIER_CONFIG, ...config.bezier };
  const geometry = new THREE.BufferGeometry();

  if (edges.length === 0) {
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
    geometry.setAttribute('aProgress', new THREE.Float32BufferAttribute([], 1));
    geometry.setAttribute('aStrength', new THREE.Float32BufferAttribute([], 1));
    return geometry;
  }

  const positions: number[] = [];
  const progressValues: number[] = [];
  const strengthValues: number[] = [];

  for (const edge of edges) {
    const points = createBezierCurvePoints(
      edge.sourcePosition,
      edge.targetPosition,
      bezierConfig
    );

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      positions.push(point.x, point.y, point.z);

      // Progress along edge (0 to 1)
      const progress = i / (points.length - 1);
      progressValues.push(progress);

      // Edge strength
      strengthValues.push(edge.strength);
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aProgress', new THREE.Float32BufferAttribute(progressValues, 1));
  geometry.setAttribute('aStrength', new THREE.Float32BufferAttribute(strengthValues, 1));

  return geometry;
}

/**
 * Disposes edge geometry resources (INV-A009)
 * @param geometry - Geometry to dispose
 */
export function disposeEdgeGeometry(geometry: THREE.BufferGeometry): void {
  geometry.dispose();
}
```

**Run tests to confirm GREEN**:

```bash
npx vitest src/visualization/edges/edge-geometry.test.ts
```

### Step 2.3: Write Failing Tests for Edge Material (RED)

Create `src/visualization/materials/edge-material.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import {
  createEdgeMaterial,
  updateEdgeMaterialTime,
  disposeEdgeMaterial,
  type EdgeMaterialConfig,
  type EdgeMaterialUniforms,
} from './edge-material';

// Mock TSL modules
vi.mock('three/tsl', () => ({
  LineBasicNodeMaterial: vi.fn().mockImplementation(() => ({
    dispose: vi.fn(),
    colorNode: null,
    opacityNode: null,
    transparent: false,
    blending: THREE.NormalBlending,
  })),
  uniform: vi.fn((value) => ({ value, isUniform: true })),
  attribute: vi.fn((name) => ({ name, isAttribute: true })),
  float: vi.fn((v) => ({ value: v, type: 'float' })),
  vec3: vi.fn((x, y, z) => ({ x, y, z, type: 'vec3' })),
  sin: vi.fn((v) => ({ input: v, type: 'sin' })),
  fract: vi.fn((v) => ({ input: v, type: 'fract' })),
  smoothstep: vi.fn(),
  mul: vi.fn(),
  add: vi.fn(),
  sub: vi.fn(),
  mix: vi.fn(),
}));

describe('edge-material module', () => {
  describe('createEdgeMaterial', () => {
    it('should export createEdgeMaterial function', () => {
      expect(createEdgeMaterial).toBeDefined();
      expect(typeof createEdgeMaterial).toBe('function');
    });

    it('should return material and uniforms', () => {
      const result = createEdgeMaterial();
      expect(result).toHaveProperty('material');
      expect(result).toHaveProperty('uniforms');
    });

    it('should create time uniform', () => {
      const { uniforms } = createEdgeMaterial();
      expect(uniforms.uTime).toBeDefined();
      expect(uniforms.uTime.value).toBe(0);
    });

    it('should create color uniforms', () => {
      const { uniforms } = createEdgeMaterial();
      expect(uniforms.uColorPrimary).toBeDefined();
      expect(uniforms.uColorSecondary).toBeDefined();
    });

    it('should create flow speed uniform', () => {
      const { uniforms } = createEdgeMaterial();
      expect(uniforms.uFlowSpeed).toBeDefined();
    });

    it('should accept custom colors', () => {
      const config: EdgeMaterialConfig = {
        colorPrimary: new THREE.Color(0xff0000),
        colorSecondary: new THREE.Color(0x00ff00),
      };
      const { uniforms } = createEdgeMaterial(config);

      expect(uniforms.uColorPrimary.value.getHex()).toBe(0xff0000);
      expect(uniforms.uColorSecondary.value.getHex()).toBe(0x00ff00);
    });

    it('should accept custom flow speed', () => {
      const config: EdgeMaterialConfig = {
        flowSpeed: 0.8,
      };
      const { uniforms } = createEdgeMaterial(config);

      expect(uniforms.uFlowSpeed.value).toBe(0.8);
    });

    it('should set transparent to true', () => {
      const { material } = createEdgeMaterial();
      expect(material.transparent).toBe(true);
    });

    it('should use additive blending by default', () => {
      const { material } = createEdgeMaterial();
      expect(material.blending).toBe(THREE.AdditiveBlending);
    });
  });

  describe('updateEdgeMaterialTime', () => {
    it('should update time uniform', () => {
      const { uniforms } = createEdgeMaterial();
      updateEdgeMaterialTime(uniforms, 2.5);
      expect(uniforms.uTime.value).toBe(2.5);
    });
  });

  describe('disposeEdgeMaterial', () => {
    it('should call material.dispose()', () => {
      const { material } = createEdgeMaterial();
      const disposeSpy = vi.spyOn(material, 'dispose');
      disposeEdgeMaterial(material);
      expect(disposeSpy).toHaveBeenCalled();
    });
  });
});
```

**Run tests to confirm RED**:

```bash
npx vitest src/visualization/materials/edge-material.test.ts
```

### Step 2.4: Implement Edge Material (GREEN)

Create `src/visualization/materials/edge-material.ts`:

```typescript
/**
 * TSL Edge Material for Connection Lines
 * Implements flowing energy animation along edges
 */
import * as THREE from 'three';
import {
  LineBasicNodeMaterial,
  uniform,
  attribute,
  float,
  vec3,
  sin,
  fract,
  smoothstep,
  mul,
  add,
  sub,
  mix,
} from 'three/tsl';

export interface EdgeMaterialConfig {
  /** Primary edge color (default: sacred gold) */
  colorPrimary?: THREE.Color;
  /** Secondary edge color (default: ancient copper) */
  colorSecondary?: THREE.Color;
  /** Flow animation speed (default: 0.5) */
  flowSpeed?: number;
  /** Base opacity (default: 0.7) */
  baseOpacity?: number;
}

export interface EdgeMaterialUniforms {
  uTime: { value: number };
  uColorPrimary: { value: THREE.Color };
  uColorSecondary: { value: THREE.Color };
  uFlowSpeed: { value: number };
  uBaseOpacity: { value: number };
}

export interface EdgeMaterialResult {
  material: THREE.Material;
  uniforms: EdgeMaterialUniforms;
}

// Default colors from prototype (Klimt-inspired)
const DEFAULT_COLOR_PRIMARY = new THREE.Color(0xd4a84b);   // Sacred Gold
const DEFAULT_COLOR_SECONDARY = new THREE.Color(0xb87333); // Ancient Copper

/**
 * Creates a TSL-based edge material with flowing animation
 * @param config - Material configuration options
 * @returns Material instance and uniform references
 */
export function createEdgeMaterial(config: EdgeMaterialConfig = {}): EdgeMaterialResult {
  const {
    colorPrimary = DEFAULT_COLOR_PRIMARY.clone(),
    colorSecondary = DEFAULT_COLOR_SECONDARY.clone(),
    flowSpeed = 0.5,
    baseOpacity = 0.7,
  } = config;

  // Create uniforms
  const uTime = uniform(0);
  const uColorPrimary = uniform(colorPrimary);
  const uColorSecondary = uniform(colorSecondary);
  const uFlowSpeed = uniform(flowSpeed);
  const uBaseOpacity = uniform(baseOpacity);

  // Vertex attributes
  const progress = attribute('aProgress');
  const strength = attribute('aStrength');

  // Flowing energy animation: fract(progress * 3 - time * speed)
  const flow = fract(sub(mul(progress, 3), mul(uTime, uFlowSpeed)));
  const flowPulse = mul(smoothstep(float(0), float(0.3), flow), smoothstep(float(1), float(0.7), flow));

  // End fade: smooth transparency at endpoints
  const endFade = mul(smoothstep(float(0), float(0.1), progress), smoothstep(float(1), float(0.9), progress));

  // Gold shimmer
  const shimmer = add(mul(sin(add(mul(uTime, 5), mul(progress, 30))), 0.15), 0.85);

  // Color mixing along edge
  const edgeColor = mix(uColorPrimary, uColorSecondary, mul(progress, 0.3));

  // Final opacity combining all effects
  const finalOpacity = mul(mul(mul(endFade, add(mul(flowPulse, 0.5), 0.5)), shimmer), mul(strength, uBaseOpacity));

  // Create material
  const material = new LineBasicNodeMaterial();
  material.colorNode = edgeColor;
  material.opacityNode = finalOpacity;
  material.transparent = true;
  material.blending = THREE.AdditiveBlending;
  material.depthWrite = false;

  // Return material and uniforms
  const uniforms: EdgeMaterialUniforms = {
    uTime: uTime as unknown as { value: number },
    uColorPrimary: uColorPrimary as unknown as { value: THREE.Color },
    uColorSecondary: uColorSecondary as unknown as { value: THREE.Color },
    uFlowSpeed: uFlowSpeed as unknown as { value: number },
    uBaseOpacity: uBaseOpacity as unknown as { value: number },
  };

  return { material, uniforms };
}

/**
 * Updates the time uniform for edge animation
 * @param uniforms - Uniform references from createEdgeMaterial
 * @param time - Current time in seconds
 */
export function updateEdgeMaterialTime(uniforms: EdgeMaterialUniforms, time: number): void {
  uniforms.uTime.value = time;
}

/**
 * Disposes of the edge material (INV-A009)
 * @param material - Material to dispose
 */
export function disposeEdgeMaterial(material: THREE.Material): void {
  material.dispose();
}
```

**Run tests to confirm GREEN**:

```bash
npx vitest src/visualization/materials/edge-material.test.ts
```

### Step 2.5: Write Failing Tests for Edge System (RED)

Create `src/visualization/edges/index.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import {
  createEdgeSystem,
  updateEdgeSystemTime,
  disposeEdgeSystem,
  type EdgeSystemData,
  type EdgeSystemResult,
} from './index';

describe('edge system', () => {
  describe('createEdgeSystem', () => {
    it('should export createEdgeSystem function', () => {
      expect(createEdgeSystem).toBeDefined();
      expect(typeof createEdgeSystem).toBe('function');
    });

    it('should return line mesh and uniforms', () => {
      const data: EdgeSystemData = {
        edges: [{
          id: 'e1',
          sourcePosition: new THREE.Vector3(0, 0, 0),
          targetPosition: new THREE.Vector3(10, 0, 0),
          type: 'parent-child',
          strength: 1.0,
        }],
      };
      const result = createEdgeSystem(data);

      expect(result).toHaveProperty('mesh');
      expect(result).toHaveProperty('uniforms');
    });

    it('should create Line mesh', () => {
      const data: EdgeSystemData = {
        edges: [{
          id: 'e1',
          sourcePosition: new THREE.Vector3(0, 0, 0),
          targetPosition: new THREE.Vector3(10, 0, 0),
          type: 'parent-child',
          strength: 1.0,
        }],
      };
      const { mesh } = createEdgeSystem(data);

      expect(mesh).toBeInstanceOf(THREE.Line);
    });

    it('should handle empty edges array', () => {
      const data: EdgeSystemData = { edges: [] };
      const { mesh } = createEdgeSystem(data);

      expect(mesh.geometry.attributes.position.count).toBe(0);
    });

    it('should create multiple edge segments', () => {
      const data: EdgeSystemData = {
        edges: [
          {
            id: 'e1',
            sourcePosition: new THREE.Vector3(0, 0, 0),
            targetPosition: new THREE.Vector3(10, 0, 0),
            type: 'parent-child',
            strength: 1.0,
          },
          {
            id: 'e2',
            sourcePosition: new THREE.Vector3(0, 0, 0),
            targetPosition: new THREE.Vector3(0, 10, 0),
            type: 'spouse',
            strength: 0.8,
          },
        ],
      };
      const { mesh } = createEdgeSystem(data);

      expect(mesh.geometry.attributes.position.count).toBeGreaterThan(60);
    });
  });

  describe('updateEdgeSystemTime', () => {
    it('should update material time', () => {
      const data: EdgeSystemData = {
        edges: [{
          id: 'e1',
          sourcePosition: new THREE.Vector3(0, 0, 0),
          targetPosition: new THREE.Vector3(10, 0, 0),
          type: 'parent-child',
          strength: 1.0,
        }],
      };
      const { uniforms } = createEdgeSystem(data);

      updateEdgeSystemTime(uniforms, 3.5);
      expect(uniforms.uTime.value).toBe(3.5);
    });
  });

  describe('disposeEdgeSystem', () => {
    it('should dispose geometry and material', () => {
      const data: EdgeSystemData = {
        edges: [{
          id: 'e1',
          sourcePosition: new THREE.Vector3(0, 0, 0),
          targetPosition: new THREE.Vector3(10, 0, 0),
          type: 'parent-child',
          strength: 1.0,
        }],
      };
      const { mesh } = createEdgeSystem(data);

      const geoSpy = vi.spyOn(mesh.geometry, 'dispose');
      const matSpy = vi.spyOn(mesh.material as THREE.Material, 'dispose');

      disposeEdgeSystem(mesh);

      expect(geoSpy).toHaveBeenCalled();
      expect(matSpy).toHaveBeenCalled();
    });
  });
});
```

**Run tests to confirm RED**:

```bash
npx vitest src/visualization/edges/index.test.ts
```

### Step 2.6: Implement Edge System (GREEN)

Create `src/visualization/edges/index.ts`:

```typescript
/**
 * Edge System - Manages family connection rendering
 */
import * as THREE from 'three';
import {
  createEdgeGeometry,
  disposeEdgeGeometry,
  type EdgeData,
  type EdgeGeometryConfig,
} from './edge-geometry';
import {
  createEdgeMaterial,
  updateEdgeMaterialTime,
  disposeEdgeMaterial,
  type EdgeMaterialConfig,
  type EdgeMaterialUniforms,
} from '../materials/edge-material';

export type { EdgeData, EdgeGeometryConfig } from './edge-geometry';
export type { EdgeMaterialConfig, EdgeMaterialUniforms } from '../materials/edge-material';

export interface EdgeSystemData {
  edges: EdgeData[];
}

export interface EdgeSystemConfig {
  geometry?: EdgeGeometryConfig;
  material?: EdgeMaterialConfig;
}

export interface EdgeSystemResult {
  mesh: THREE.Line;
  uniforms: EdgeMaterialUniforms;
}

/**
 * Creates complete edge rendering system
 * @param data - Edge connection data
 * @param config - System configuration
 * @returns Line mesh and uniform references
 */
export function createEdgeSystem(
  data: EdgeSystemData,
  config: EdgeSystemConfig = {}
): EdgeSystemResult {
  const geometry = createEdgeGeometry(data.edges, config.geometry);
  const { material, uniforms } = createEdgeMaterial(config.material);

  const mesh = new THREE.Line(geometry, material);
  mesh.frustumCulled = false; // Edges span large areas

  return { mesh, uniforms };
}

/**
 * Updates edge system animation time
 * @param uniforms - Uniform references from createEdgeSystem
 * @param time - Current time in seconds
 */
export function updateEdgeSystemTime(uniforms: EdgeMaterialUniforms, time: number): void {
  updateEdgeMaterialTime(uniforms, time);
}

/**
 * Disposes edge system resources (INV-A009)
 * @param mesh - Line mesh to dispose
 */
export function disposeEdgeSystem(mesh: THREE.Line): void {
  disposeEdgeGeometry(mesh.geometry);
  if (Array.isArray(mesh.material)) {
    mesh.material.forEach((m) => disposeEdgeMaterial(m));
  } else {
    disposeEdgeMaterial(mesh.material);
  }
}
```

**Run tests to confirm GREEN**:

```bash
npx vitest src/visualization/edges/
```

### Step 2.7: Refactor

While keeping tests green:

- [ ] Ensure complete type annotations (no implicit `any`)
- [ ] Add JSDoc comments for public APIs
- [ ] Extract helper functions if needed
- [ ] Optimize for readability
- [ ] Check for code duplication between geometry and material modules

**Run full verification**:

```bash
npx vitest src/visualization/edges/
npx vitest src/visualization/materials/edge-material.test.ts
npx tsc --noEmit
npm run lint
```

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/visualization/edges/edge-geometry.ts` | CREATE | Bezier curve generation |
| `src/visualization/edges/edge-geometry.test.ts` | CREATE | Geometry tests |
| `src/visualization/materials/edge-material.ts` | CREATE | TSL edge material |
| `src/visualization/materials/edge-material.test.ts` | CREATE | Material tests |
| `src/visualization/edges/index.ts` | CREATE | Edge system orchestration |
| `src/visualization/edges/index.test.ts` | CREATE | System integration tests |

---

## Verification

```bash
# Run phase-specific tests
npx vitest src/visualization/edges/
npx vitest src/visualization/materials/edge-material.test.ts

# Run all tests
npm test

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

## Completion Criteria

- [ ] All test cases pass
- [ ] Type check passes (`npx tsc --noEmit`)
- [ ] Lint passes (`npm run lint`)
- [ ] No `any` types introduced
- [ ] Edges render as smooth Bezier curves
- [ ] Energy flows along edges (animated)
- [ ] Edges fade at endpoints
- [ ] INV-A008 verified (correct imports)
- [ ] INV-A009 verified (disposal tests pass)
- [ ] Work notes updated

---

*Template version: 1.0*
