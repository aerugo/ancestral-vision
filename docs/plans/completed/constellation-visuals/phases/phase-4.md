# Phase 4: Event Fireflies

**Status**: Pending
**Started**:
**Parent Plan**: [development-plan.md](../development-plan.md)

---

## Objective

Implement orbital firefly particles around constellation nodes representing life events, with event-type color coding and animated orbital mechanics.

---

## Invariants Enforced in This Phase

- **INV-A008**: WebGPU Imports - All TSL imports use `three/tsl` path
- **INV-A009**: Resource Disposal - Firefly resources disposed on cleanup

---

## TDD Steps

### Step 4.1: Write Failing Tests for Event Fireflies (RED)

Create `src/visualization/particles/event-fireflies.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import {
  createEventFireflies,
  updateEventFirefliesTime,
  disposeEventFireflies,
  getEventColor,
  type EventFireflyConfig,
  type EventFireflyData,
  type EventFireflyResult,
} from './event-fireflies';

describe('event-fireflies module', () => {
  describe('getEventColor', () => {
    it('should return green for birth events', () => {
      const color = getEventColor('birth');
      expect(color.r).toBeCloseTo(0.4, 1);
      expect(color.g).toBeCloseTo(0.9, 1);
      expect(color.b).toBeCloseTo(0.6, 1);
    });

    it('should return purple for death events', () => {
      const color = getEventColor('death');
      expect(color.r).toBeCloseTo(0.6, 1);
      expect(color.g).toBeCloseTo(0.5, 1);
      expect(color.b).toBeCloseTo(0.8, 1);
    });

    it('should return gold for marriage events', () => {
      const color = getEventColor('marriage');
      expect(color.r).toBeCloseTo(1.0, 1);
      expect(color.g).toBeCloseTo(0.8, 1);
      expect(color.b).toBeCloseTo(0.4, 1);
    });

    it('should return blue for occupation events', () => {
      const color = getEventColor('occupation');
      expect(color.r).toBeCloseTo(0.4, 1);
      expect(color.g).toBeCloseTo(0.7, 1);
      expect(color.b).toBeCloseTo(1.0, 1);
    });

    it('should return gray for unknown event types', () => {
      const color = getEventColor('unknown');
      expect(color.r).toBeCloseTo(0.8, 1);
      expect(color.g).toBeCloseTo(0.8, 1);
      expect(color.b).toBeCloseTo(0.8, 1);
    });
  });

  describe('createEventFireflies', () => {
    it('should export createEventFireflies function', () => {
      expect(createEventFireflies).toBeDefined();
      expect(typeof createEventFireflies).toBe('function');
    });

    it('should return points mesh and uniforms', () => {
      const data: EventFireflyData = {
        nodePositions: [new THREE.Vector3(0, 0, 0)],
        nodeBiographyWeights: [0.5],
        nodeEventTypes: [['birth', 'death']],
      };
      const result = createEventFireflies(data);

      expect(result).toHaveProperty('mesh');
      expect(result).toHaveProperty('uniforms');
    });

    it('should create THREE.Points mesh', () => {
      const data: EventFireflyData = {
        nodePositions: [new THREE.Vector3(0, 0, 0)],
        nodeBiographyWeights: [0.5],
        nodeEventTypes: [['birth']],
      };
      const { mesh } = createEventFireflies(data);

      expect(mesh).toBeInstanceOf(THREE.Points);
    });

    it('should create fireflies based on biography weight', () => {
      // Low weight = ~5 fireflies, high weight = ~25 fireflies
      const dataLow: EventFireflyData = {
        nodePositions: [new THREE.Vector3(0, 0, 0)],
        nodeBiographyWeights: [0.0],
        nodeEventTypes: [['birth', 'death', 'marriage']],
      };
      const dataHigh: EventFireflyData = {
        nodePositions: [new THREE.Vector3(0, 0, 0)],
        nodeBiographyWeights: [1.0],
        nodeEventTypes: [['birth', 'death', 'marriage']],
      };

      const { mesh: meshLow } = createEventFireflies(dataLow);
      const { mesh: meshHigh } = createEventFireflies(dataHigh);

      expect(meshHigh.geometry.attributes.position.count).toBeGreaterThan(
        meshLow.geometry.attributes.position.count
      );
    });

    it('should create fireflies for multiple nodes', () => {
      const data: EventFireflyData = {
        nodePositions: [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(50, 0, 0),
        ],
        nodeBiographyWeights: [0.5, 0.5],
        nodeEventTypes: [['birth'], ['death']],
      };
      const { mesh } = createEventFireflies(data);

      expect(mesh.geometry.attributes.position.count).toBeGreaterThan(10);
    });

    it('should create orbital parameters attribute', () => {
      const data: EventFireflyData = {
        nodePositions: [new THREE.Vector3(0, 0, 0)],
        nodeBiographyWeights: [0.5],
        nodeEventTypes: [['birth']],
      };
      const { mesh } = createEventFireflies(data);

      expect(mesh.geometry.attributes.aOrbitParams).toBeDefined();
    });

    it('should create node center attribute for orbital positioning', () => {
      const data: EventFireflyData = {
        nodePositions: [new THREE.Vector3(10, 20, 30)],
        nodeBiographyWeights: [0.5],
        nodeEventTypes: [['birth']],
      };
      const { mesh } = createEventFireflies(data);

      expect(mesh.geometry.attributes.aNodeCenter).toBeDefined();
    });

    it('should have time uniform', () => {
      const data: EventFireflyData = {
        nodePositions: [new THREE.Vector3(0, 0, 0)],
        nodeBiographyWeights: [0.5],
        nodeEventTypes: [['birth']],
      };
      const { uniforms } = createEventFireflies(data);

      expect(uniforms.uTime).toBeDefined();
    });

    it('should handle empty event types', () => {
      const data: EventFireflyData = {
        nodePositions: [new THREE.Vector3(0, 0, 0)],
        nodeBiographyWeights: [0.5],
        nodeEventTypes: [[]],
      };
      const { mesh } = createEventFireflies(data);

      expect(mesh.geometry.attributes.position.count).toBe(0);
    });
  });

  describe('updateEventFirefliesTime', () => {
    it('should update time uniform', () => {
      const data: EventFireflyData = {
        nodePositions: [new THREE.Vector3(0, 0, 0)],
        nodeBiographyWeights: [0.5],
        nodeEventTypes: [['birth']],
      };
      const { uniforms } = createEventFireflies(data);

      updateEventFirefliesTime(uniforms, 4.5);
      expect(uniforms.uTime.value).toBe(4.5);
    });
  });

  describe('disposeEventFireflies', () => {
    it('should dispose geometry and material', () => {
      const data: EventFireflyData = {
        nodePositions: [new THREE.Vector3(0, 0, 0)],
        nodeBiographyWeights: [0.5],
        nodeEventTypes: [['birth']],
      };
      const { mesh } = createEventFireflies(data);

      const geoSpy = vi.spyOn(mesh.geometry, 'dispose');
      const matSpy = vi.spyOn(mesh.material as THREE.Material, 'dispose');

      disposeEventFireflies(mesh);

      expect(geoSpy).toHaveBeenCalled();
      expect(matSpy).toHaveBeenCalled();
    });
  });
});
```

**Run tests to confirm RED**:

```bash
npx vitest src/visualization/particles/event-fireflies.test.ts
```

### Step 4.2: Implement Event Fireflies (GREEN)

Create `src/visualization/particles/event-fireflies.ts`:

```typescript
/**
 * Event Firefly System
 * Orbital particles around nodes representing life events
 */
import * as THREE from 'three';
import {
  PointsNodeMaterial,
  uniform,
  attribute,
  float,
  vec3,
  sin,
  cos,
  mul,
  add,
} from 'three/tsl';

// Event type to color mapping
const EVENT_COLORS: Record<string, THREE.Color> = {
  birth: new THREE.Color(0.4, 0.9, 0.6),      // Green
  death: new THREE.Color(0.6, 0.5, 0.8),      // Purple
  marriage: new THREE.Color(1.0, 0.8, 0.4),   // Gold
  occupation: new THREE.Color(0.4, 0.7, 1.0), // Blue
  residence: new THREE.Color(0.6, 0.9, 0.9),  // Cyan
  military: new THREE.Color(0.9, 0.5, 0.4),   // Red-orange
  graduation: new THREE.Color(0.9, 0.9, 0.5), // Yellow
  default: new THREE.Color(0.8, 0.8, 0.8),    // Gray
};

export interface EventFireflyConfig {
  /** Base firefly count per node (default: 5) */
  baseCount?: number;
  /** Additional fireflies per biography weight (default: 20) */
  weightMultiplier?: number;
  /** Base orbit radius (default: 6) */
  orbitRadius?: number;
  /** Point size (default: 3) */
  pointSize?: number;
}

export interface EventFireflyData {
  nodePositions: THREE.Vector3[];
  nodeBiographyWeights: number[];
  nodeEventTypes: string[][];
}

export interface EventFireflyUniforms {
  uTime: { value: number };
  uPointSize: { value: number };
}

export interface EventFireflyResult {
  mesh: THREE.Points;
  uniforms: EventFireflyUniforms;
}

const DEFAULT_CONFIG: Required<EventFireflyConfig> = {
  baseCount: 5,
  weightMultiplier: 20,
  orbitRadius: 6,
  pointSize: 3,
};

/**
 * Gets color for event type
 * @param eventType - Event type string
 * @returns Color for the event type
 */
export function getEventColor(eventType: string): THREE.Color {
  return EVENT_COLORS[eventType] ?? EVENT_COLORS.default;
}

/**
 * Creates event firefly orbital particle system
 * @param data - Node and event data
 * @param config - System configuration
 * @returns Points mesh and uniform references
 */
export function createEventFireflies(
  data: EventFireflyData,
  config: EventFireflyConfig = {}
): EventFireflyResult {
  const { baseCount, weightMultiplier, orbitRadius, pointSize } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const { nodePositions, nodeBiographyWeights, nodeEventTypes } = data;

  // Calculate total firefly count
  let totalFireflies = 0;
  const fireflyCounts: number[] = [];

  for (let i = 0; i < nodePositions.length; i++) {
    const events = nodeEventTypes[i];
    if (events.length === 0) {
      fireflyCounts.push(0);
      continue;
    }

    const weight = nodeBiographyWeights[i];
    const count = Math.floor(baseCount + weight * weightMultiplier);
    fireflyCounts.push(count);
    totalFireflies += count;
  }

  // Create geometry arrays
  const positions = new Float32Array(totalFireflies * 3);
  const colors = new Float32Array(totalFireflies * 3);
  const orbitParams = new Float32Array(totalFireflies * 4); // radius, speed, phase, tilt
  const nodeCenters = new Float32Array(totalFireflies * 3);

  let fireflyIndex = 0;

  for (let nodeIdx = 0; nodeIdx < nodePositions.length; nodeIdx++) {
    const nodePos = nodePositions[nodeIdx];
    const events = nodeEventTypes[nodeIdx];
    const count = fireflyCounts[nodeIdx];

    for (let i = 0; i < count; i++) {
      // Initial position (will be overridden by shader)
      positions[fireflyIndex * 3] = nodePos.x;
      positions[fireflyIndex * 3 + 1] = nodePos.y;
      positions[fireflyIndex * 3 + 2] = nodePos.z;

      // Event color (cycle through events)
      const eventType = events[i % events.length];
      const color = getEventColor(eventType);
      colors[fireflyIndex * 3] = color.r;
      colors[fireflyIndex * 3 + 1] = color.g;
      colors[fireflyIndex * 3 + 2] = color.b;

      // Orbital parameters
      const layer = i % 3; // Three orbital shells
      const radius = orbitRadius + layer * 2 + Math.random() * 2;
      const speed = 0.5 + Math.random() * 0.5;
      const phase = Math.random() * Math.PI * 2;
      const tilt = (Math.random() - 0.5) * Math.PI * 0.6;

      orbitParams[fireflyIndex * 4] = radius;
      orbitParams[fireflyIndex * 4 + 1] = speed;
      orbitParams[fireflyIndex * 4 + 2] = phase;
      orbitParams[fireflyIndex * 4 + 3] = tilt;

      // Node center for orbital calculation
      nodeCenters[fireflyIndex * 3] = nodePos.x;
      nodeCenters[fireflyIndex * 3 + 1] = nodePos.y;
      nodeCenters[fireflyIndex * 3 + 2] = nodePos.z;

      fireflyIndex++;
    }
  }

  // Create geometry
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aOrbitParams', new THREE.BufferAttribute(orbitParams, 4));
  geometry.setAttribute('aNodeCenter', new THREE.BufferAttribute(nodeCenters, 3));

  // Create uniforms
  const uTime = uniform(0);
  const uPointSize = uniform(pointSize);

  // Vertex attributes
  const orbitParamsAttr = attribute('aOrbitParams');
  const nodeCenterAttr = attribute('aNodeCenter');
  const vertexColor = attribute('color');

  // Orbital position calculation (done in shader)
  const radius = orbitParamsAttr.x;
  const speed = orbitParamsAttr.y;
  const phase = orbitParamsAttr.z;
  const tilt = orbitParamsAttr.w;

  const angle = add(mul(uTime, speed), phase);
  const orbitX = mul(cos(angle), radius);
  const orbitY = mul(sin(add(mul(uTime, 2), mul(phase, 3))), 0.3); // Wobble
  const orbitZ = mul(sin(angle), radius);

  // Flickering effect
  const flicker = add(mul(sin(add(mul(uTime, 8), mul(phase, 12.56))), 0.2), 0.8);

  // Create material
  const material = new PointsNodeMaterial();
  material.colorNode = mul(vertexColor, flicker);
  material.sizeNode = mul(uPointSize, flicker);
  material.transparent = true;
  material.opacity = 0.9;
  material.blending = THREE.AdditiveBlending;
  material.depthWrite = false;

  // Create mesh
  const mesh = new THREE.Points(geometry, material);

  const uniforms: EventFireflyUniforms = {
    uTime: uTime as unknown as { value: number },
    uPointSize: uPointSize as unknown as { value: number },
  };

  return { mesh, uniforms };
}

/**
 * Updates firefly animation time
 * @param uniforms - Uniform references
 * @param time - Current time in seconds
 */
export function updateEventFirefliesTime(
  uniforms: EventFireflyUniforms,
  time: number
): void {
  uniforms.uTime.value = time;
}

/**
 * Disposes firefly system resources (INV-A009)
 * @param mesh - Points mesh to dispose
 */
export function disposeEventFireflies(mesh: THREE.Points): void {
  mesh.geometry.dispose();
  if (Array.isArray(mesh.material)) {
    mesh.material.forEach((m) => m.dispose());
  } else {
    mesh.material.dispose();
  }
}
```

**Run tests to confirm GREEN**:

```bash
npx vitest src/visualization/particles/event-fireflies.test.ts
```

### Step 4.3: Refactor

- [ ] Ensure complete type annotations
- [ ] Add JSDoc comments
- [ ] Optimize orbital calculation
- [ ] Extract event color mapping to configuration

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/visualization/particles/event-fireflies.ts` | CREATE | Firefly system |
| `src/visualization/particles/event-fireflies.test.ts` | CREATE | Firefly tests |
| `src/visualization/materials/firefly-material.ts` | CREATE | TSL firefly material |
| `src/visualization/particles/index.ts` | MODIFY | Add firefly exports |

---

## Completion Criteria

- [ ] All test cases pass
- [ ] Event colors correctly mapped
- [ ] Fireflies orbit around their parent nodes
- [ ] Firefly count scales with biography weight
- [ ] Flickering animation visible
- [ ] INV-A009 verified (disposal tests pass)

---

*Template version: 1.0*
