# Phase 5: Sacred Geometry Grid

**Status**: Pending
**Started**:
**Parent Plan**: [development-plan.md](../development-plan.md)

---

## Objective

Implement sacred geometry background grid with concentric circles and radial lines to provide spatial reference for the constellation.

---

## Invariants Enforced in This Phase

- **INV-A009**: Resource Disposal - Grid geometry and material disposed on cleanup

---

## TDD Steps

### Step 5.1: Write Failing Tests for Sacred Geometry Grid (RED)

Create `src/visualization/effects/sacred-geometry-grid.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import {
  createSacredGeometryGrid,
  disposeSacredGeometryGrid,
  type SacredGeometryConfig,
} from './sacred-geometry-grid';

describe('sacred-geometry-grid module', () => {
  describe('createSacredGeometryGrid', () => {
    it('should export createSacredGeometryGrid function', () => {
      expect(createSacredGeometryGrid).toBeDefined();
      expect(typeof createSacredGeometryGrid).toBe('function');
    });

    it('should return a THREE.Group', () => {
      const grid = createSacredGeometryGrid();
      expect(grid).toBeInstanceOf(THREE.Group);
    });

    it('should contain ring meshes', () => {
      const grid = createSacredGeometryGrid();
      const rings = grid.children.filter(
        (child) => child.userData.type === 'ring'
      );
      expect(rings.length).toBeGreaterThan(0);
    });

    it('should create default 8 concentric rings', () => {
      const grid = createSacredGeometryGrid();
      const rings = grid.children.filter(
        (child) => child.userData.type === 'ring'
      );
      expect(rings.length).toBe(8);
    });

    it('should accept custom ring count', () => {
      const config: SacredGeometryConfig = { ringCount: 5 };
      const grid = createSacredGeometryGrid(config);
      const rings = grid.children.filter(
        (child) => child.userData.type === 'ring'
      );
      expect(rings.length).toBe(5);
    });

    it('should contain radial line meshes', () => {
      const grid = createSacredGeometryGrid();
      const radials = grid.children.filter(
        (child) => child.userData.type === 'radial'
      );
      expect(radials.length).toBeGreaterThan(0);
    });

    it('should create default 12 radial lines', () => {
      const grid = createSacredGeometryGrid();
      const radials = grid.children.filter(
        (child) => child.userData.type === 'radial'
      );
      expect(radials.length).toBe(12);
    });

    it('should accept custom radial count', () => {
      const config: SacredGeometryConfig = { radialCount: 8 };
      const grid = createSacredGeometryGrid(config);
      const radials = grid.children.filter(
        (child) => child.userData.type === 'radial'
      );
      expect(radials.length).toBe(8);
    });

    it('should use ring spacing for radius calculation', () => {
      const config: SacredGeometryConfig = { ringSpacing: 100 };
      const grid = createSacredGeometryGrid(config);
      // Outer ring should be at ringSpacing * ringCount
      expect(grid.userData.outerRadius).toBe(800); // 100 * 8 default rings
    });

    it('should position grid below origin', () => {
      const config: SacredGeometryConfig = { yOffset: -10 };
      const grid = createSacredGeometryGrid(config);
      expect(grid.position.y).toBe(-10);
    });

    it('should use sacred gold color by default', () => {
      const grid = createSacredGeometryGrid();
      const ring = grid.children.find((c) => c.userData.type === 'ring');
      const material = (ring as THREE.Line).material as THREE.LineBasicMaterial;
      expect(material.color.getHex()).toBe(0xd4a84b);
    });

    it('should accept custom color', () => {
      const config: SacredGeometryConfig = { color: new THREE.Color(0xff0000) };
      const grid = createSacredGeometryGrid(config);
      const ring = grid.children.find((c) => c.userData.type === 'ring');
      const material = (ring as THREE.Line).material as THREE.LineBasicMaterial;
      expect(material.color.getHex()).toBe(0xff0000);
    });

    it('should set low opacity by default', () => {
      const grid = createSacredGeometryGrid();
      const ring = grid.children.find((c) => c.userData.type === 'ring');
      const material = (ring as THREE.Line).material as THREE.LineBasicMaterial;
      expect(material.opacity).toBeLessThan(0.2);
    });
  });

  describe('disposeSacredGeometryGrid', () => {
    it('should dispose all children', () => {
      const grid = createSacredGeometryGrid();
      const disposeSpy = vi.fn();

      grid.children.forEach((child) => {
        if (child instanceof THREE.Line) {
          vi.spyOn(child.geometry, 'dispose').mockImplementation(disposeSpy);
          vi.spyOn(child.material as THREE.Material, 'dispose').mockImplementation(disposeSpy);
        }
      });

      disposeSacredGeometryGrid(grid);
      expect(disposeSpy).toHaveBeenCalled();
    });
  });
});
```

**Run tests to confirm RED**:

```bash
npx vitest src/visualization/effects/sacred-geometry-grid.test.ts
```

### Step 5.2: Implement Sacred Geometry Grid (GREEN)

Create `src/visualization/effects/sacred-geometry-grid.ts`:

```typescript
/**
 * Sacred Geometry Grid
 * Mandala-style background grid with concentric rings and radial lines
 */
import * as THREE from 'three';

export interface SacredGeometryConfig {
  /** Number of concentric rings (default: 8) */
  ringCount?: number;
  /** Spacing between rings (default: 50) */
  ringSpacing?: number;
  /** Segments per ring (default: 64 + ring * 8) */
  ringSegments?: number;
  /** Number of radial lines (default: 12) */
  radialCount?: number;
  /** Grid color (default: sacred gold 0xd4a84b) */
  color?: THREE.Color;
  /** Grid opacity (default: 0.08) */
  opacity?: number;
  /** Y offset below origin (default: -5) */
  yOffset?: number;
}

const DEFAULT_CONFIG: Required<SacredGeometryConfig> = {
  ringCount: 8,
  ringSpacing: 50,
  ringSegments: 64,
  radialCount: 12,
  color: new THREE.Color(0xd4a84b),
  opacity: 0.08,
  yOffset: -5,
};

/**
 * Creates sacred geometry grid group
 * @param config - Grid configuration
 * @returns Group containing ring and radial line meshes
 */
export function createSacredGeometryGrid(
  config: SacredGeometryConfig = {}
): THREE.Group {
  const {
    ringCount,
    ringSpacing,
    ringSegments,
    radialCount,
    color,
    opacity,
    yOffset,
  } = { ...DEFAULT_CONFIG, ...config };

  const group = new THREE.Group();
  group.position.y = yOffset;

  const outerRadius = ringSpacing * ringCount;
  group.userData.outerRadius = outerRadius;

  // Shared material for all grid elements
  const material = new THREE.LineBasicMaterial({
    color: color.clone(),
    opacity,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  // Create concentric rings
  for (let i = 1; i <= ringCount; i++) {
    const radius = ringSpacing * i;
    const segments = ringSegments + i * 8; // More segments for outer rings

    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];

    for (let j = 0; j <= segments; j++) {
      const angle = (j / segments) * Math.PI * 2;
      positions.push(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      );
    }

    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    );

    const ring = new THREE.Line(geometry, material.clone());
    ring.userData.type = 'ring';
    ring.userData.index = i;
    group.add(ring);
  }

  // Create radial lines
  for (let i = 0; i < radialCount; i++) {
    const angle = (i / radialCount) * Math.PI * 2;

    const geometry = new THREE.BufferGeometry();
    const positions = [
      0, 0, 0,
      Math.cos(angle) * outerRadius, 0, Math.sin(angle) * outerRadius,
    ];

    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    );

    const radial = new THREE.Line(geometry, material.clone());
    radial.userData.type = 'radial';
    radial.userData.index = i;
    group.add(radial);
  }

  return group;
}

/**
 * Disposes sacred geometry grid resources (INV-A009)
 * @param group - Grid group to dispose
 */
export function disposeSacredGeometryGrid(group: THREE.Group): void {
  group.children.forEach((child) => {
    if (child instanceof THREE.Line) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
  group.clear();
}
```

**Run tests to confirm GREEN**:

```bash
npx vitest src/visualization/effects/sacred-geometry-grid.test.ts
```

### Step 5.3: Refactor

- [ ] Extract material creation to shared function
- [ ] Add LOD for distant viewing
- [ ] Optimize buffer allocations

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/visualization/effects/sacred-geometry-grid.ts` | CREATE | Grid generation |
| `src/visualization/effects/sacred-geometry-grid.test.ts` | CREATE | Grid tests |
| `src/visualization/effects/index.ts` | CREATE | Effect exports |

---

## Completion Criteria

- [ ] All test cases pass
- [ ] 8 concentric rings visible
- [ ] 12 radial lines visible
- [ ] Grid positioned below constellation
- [ ] Correct sacred gold color and low opacity
- [ ] INV-A009 verified (disposal tests pass)

---

*Template version: 1.0*
