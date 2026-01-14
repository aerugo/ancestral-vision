# Phase 3: Background Particles

**Status**: Pending
**Started**:
**Parent Plan**: [development-plan.md](../development-plan.md)

---

## Objective

Implement atmospheric background particle system with Haeckel-inspired organic shapes using TSL point sprites.

---

## Invariants Enforced in This Phase

- **INV-A008**: WebGPU Imports - All TSL imports use `three/tsl` path
- **INV-A009**: Resource Disposal - Particle geometries and materials disposed on cleanup

---

## TDD Steps

### Step 3.1: Write Failing Tests for Background Particles (RED)

Create `src/visualization/particles/background-particles.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import {
  createBackgroundParticles,
  updateBackgroundParticlesTime,
  disposeBackgroundParticles,
  type BackgroundParticleConfig,
  type BackgroundParticleResult,
} from './background-particles';

describe('background-particles module', () => {
  describe('createBackgroundParticles', () => {
    it('should export createBackgroundParticles function', () => {
      expect(createBackgroundParticles).toBeDefined();
      expect(typeof createBackgroundParticles).toBe('function');
    });

    it('should return points mesh and uniforms', () => {
      const result = createBackgroundParticles();
      expect(result).toHaveProperty('mesh');
      expect(result).toHaveProperty('uniforms');
    });

    it('should create THREE.Points mesh', () => {
      const { mesh } = createBackgroundParticles();
      expect(mesh).toBeInstanceOf(THREE.Points);
    });

    it('should create default particle count (300)', () => {
      const { mesh } = createBackgroundParticles();
      expect(mesh.geometry.attributes.position.count).toBe(300);
    });

    it('should accept custom particle count', () => {
      const config: BackgroundParticleConfig = { count: 500 };
      const { mesh } = createBackgroundParticles(config);
      expect(mesh.geometry.attributes.position.count).toBe(500);
    });

    it('should create particles in spherical shell', () => {
      const config: BackgroundParticleConfig = {
        innerRadius: 100,
        outerRadius: 500,
      };
      const { mesh } = createBackgroundParticles(config);
      const positions = mesh.geometry.attributes.position;

      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);
        const distance = Math.sqrt(x * x + y * y + z * z);

        expect(distance).toBeGreaterThanOrEqual(config.innerRadius! * 0.9);
        expect(distance).toBeLessThanOrEqual(config.outerRadius! * 1.1);
      }
    });

    it('should create phase attribute for animation offset', () => {
      const { mesh } = createBackgroundParticles();
      expect(mesh.geometry.attributes.aPhase).toBeDefined();
    });

    it('should create color attribute', () => {
      const { mesh } = createBackgroundParticles();
      expect(mesh.geometry.attributes.color).toBeDefined();
    });

    it('should have time uniform', () => {
      const { uniforms } = createBackgroundParticles();
      expect(uniforms.uTime).toBeDefined();
      expect(uniforms.uTime.value).toBe(0);
    });
  });

  describe('updateBackgroundParticlesTime', () => {
    it('should update time uniform', () => {
      const { uniforms } = createBackgroundParticles();
      updateBackgroundParticlesTime(uniforms, 2.5);
      expect(uniforms.uTime.value).toBe(2.5);
    });
  });

  describe('disposeBackgroundParticles', () => {
    it('should dispose geometry and material', () => {
      const { mesh } = createBackgroundParticles();
      const geoSpy = vi.spyOn(mesh.geometry, 'dispose');
      const matSpy = vi.spyOn(mesh.material as THREE.Material, 'dispose');

      disposeBackgroundParticles(mesh);

      expect(geoSpy).toHaveBeenCalled();
      expect(matSpy).toHaveBeenCalled();
    });
  });
});
```

**Run tests to confirm RED**:

```bash
npx vitest src/visualization/particles/background-particles.test.ts
```

### Step 3.2: Implement Background Particles (GREEN)

Create `src/visualization/particles/background-particles.ts`:

```typescript
/**
 * Background Particle System
 * Creates atmospheric Haeckel-inspired particles in spherical shell
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
  smoothstep,
  positionLocal,
} from 'three/tsl';

export interface BackgroundParticleConfig {
  /** Number of particles (default: 300) */
  count?: number;
  /** Inner shell radius (default: 100) */
  innerRadius?: number;
  /** Outer shell radius (default: 500) */
  outerRadius?: number;
  /** Base point size (default: 4) */
  pointSize?: number;
}

export interface BackgroundParticleUniforms {
  uTime: { value: number };
  uPointSize: { value: number };
}

export interface BackgroundParticleResult {
  mesh: THREE.Points;
  uniforms: BackgroundParticleUniforms;
}

const DEFAULT_CONFIG: Required<BackgroundParticleConfig> = {
  count: 300,
  innerRadius: 100,
  outerRadius: 500,
  pointSize: 4,
};

/**
 * Creates background particle system with organic shapes
 * @param config - Particle system configuration
 * @returns Points mesh and uniform references
 */
export function createBackgroundParticles(
  config: BackgroundParticleConfig = {}
): BackgroundParticleResult {
  const { count, innerRadius, outerRadius, pointSize } = { ...DEFAULT_CONFIG, ...config };

  // Create geometry
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const colors = new Float32Array(count * 3);

  // Color palette: violet, gold, rose
  const colorPalette = [
    new THREE.Color().setHSL(0.79, 0.6, 0.55),  // Violet
    new THREE.Color().setHSL(0.12, 0.6, 0.55),  // Gold
    new THREE.Color().setHSL(0.97, 0.6, 0.55),  // Rose
  ];

  for (let i = 0; i < count; i++) {
    // Spherical shell distribution
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = innerRadius + Math.random() * (outerRadius - innerRadius);

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);

    // Random phase for animation offset
    phases[i] = Math.random() * Math.PI * 2;

    // Random color from palette
    const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  // Create uniforms
  const uTime = uniform(0);
  const uPointSize = uniform(pointSize);

  // Vertex attributes
  const phase = attribute('aPhase');
  const vertexColor = attribute('color');

  // Animated position oscillation
  const oscillation = vec3(
    mul(sin(add(uTime, phase)), 2),
    mul(cos(add(mul(uTime, 0.7), mul(phase, 1.3))), 1.5),
    mul(sin(add(mul(uTime, 0.5), mul(phase, 0.7))), 2)
  );

  // Hexagonal shape in fragment (Haeckel radiolarian)
  // Point size with distance attenuation
  const sizeAttenuation = float(300).div(positionLocal.z.negate());
  const finalSize = mul(uPointSize, sizeAttenuation);

  // Pulsing glow
  const glow = add(mul(sin(add(mul(uTime, 2), phase)), 0.2), 0.8);

  // Create material
  const material = new PointsNodeMaterial();
  material.colorNode = mul(vertexColor, glow);
  material.sizeNode = finalSize;
  material.transparent = true;
  material.opacity = 0.6;
  material.blending = THREE.AdditiveBlending;
  material.depthWrite = false;

  // Create mesh
  const mesh = new THREE.Points(geometry, material);

  const uniforms: BackgroundParticleUniforms = {
    uTime: uTime as unknown as { value: number },
    uPointSize: uPointSize as unknown as { value: number },
  };

  return { mesh, uniforms };
}

/**
 * Updates particle animation time
 * @param uniforms - Uniform references
 * @param time - Current time in seconds
 */
export function updateBackgroundParticlesTime(
  uniforms: BackgroundParticleUniforms,
  time: number
): void {
  uniforms.uTime.value = time;
}

/**
 * Disposes particle system resources (INV-A009)
 * @param mesh - Points mesh to dispose
 */
export function disposeBackgroundParticles(mesh: THREE.Points): void {
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
npx vitest src/visualization/particles/background-particles.test.ts
```

### Step 3.3: Refactor

- [ ] Ensure complete type annotations
- [ ] Add JSDoc comments
- [ ] Optimize particle distribution algorithm
- [ ] Extract color palette to configuration

**Run full verification**:

```bash
npx vitest src/visualization/particles/
npx tsc --noEmit
npm run lint
```

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/visualization/particles/background-particles.ts` | CREATE | Particle system |
| `src/visualization/particles/background-particles.test.ts` | CREATE | Particle tests |
| `src/visualization/materials/particle-material.ts` | CREATE | TSL particle material |
| `src/visualization/particles/index.ts` | CREATE | Particle exports |

---

## Completion Criteria

- [ ] All test cases pass
- [ ] Type check passes
- [ ] Lint passes
- [ ] Particles visible in spherical shell around scene
- [ ] Particles have organic/hexagonal appearance
- [ ] Particles animate (oscillate, pulse)
- [ ] Particles use correct color palette
- [ ] INV-A009 verified (disposal tests pass)

---

*Template version: 1.0*
