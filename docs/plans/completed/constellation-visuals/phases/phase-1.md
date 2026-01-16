# Phase 1: Core Node Rendering

**Status**: Pending
**Started**:
**Parent Plan**: [development-plan.md](../development-plan.md)

---

## Objective

Replace basic MeshStandardMaterial spheres with instanced mesh rendering using TSL (Three.js Shading Language) materials that support biography-driven scaling, pulsing animation, and Fresnel rim glow effects.

---

## Invariants Enforced in This Phase

- **INV-A008**: WebGPU Imports - All TSL imports use `three/tsl` path
- **INV-A009**: Resource Disposal - Materials and geometries disposed on cleanup

---

## TDD Steps

### Step 1.1: Write Failing Tests for Noise Module (RED)

Create `src/visualization/shaders/noise.test.ts`:

**Test Cases**:

1. `it('should export createNoiseFunction')` - Module exports correctly
2. `it('should return a TSL node')` - Returns valid TSL node type
3. `it('should accept vec3 input')` - Function signature correct

```typescript
import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { createNoiseFunction, type NoiseFunction } from './noise';

describe('noise module', () => {
  describe('createNoiseFunction', () => {
    it('should export createNoiseFunction', () => {
      expect(createNoiseFunction).toBeDefined();
      expect(typeof createNoiseFunction).toBe('function');
    });

    it('should return a function that creates noise nodes', () => {
      const noiseFn = createNoiseFunction();
      expect(noiseFn).toBeDefined();
      expect(typeof noiseFn).toBe('function');
    });

    it('should create noise with configurable scale', () => {
      const noiseFn = createNoiseFunction({ scale: 0.1 });
      expect(noiseFn).toBeDefined();
    });

    it('should create noise with configurable octaves', () => {
      const noiseFn = createNoiseFunction({ octaves: 2 });
      expect(noiseFn).toBeDefined();
    });
  });
});
```

**Run tests to confirm RED**:

```bash
npx vitest src/visualization/shaders/noise.test.ts
```

### Step 1.2: Implement Noise Module (GREEN)

Create `src/visualization/shaders/noise.ts`:

```typescript
/**
 * TSL Simplex Noise Implementation
 * Provides procedural noise functions for shader effects
 */
import {
  float,
  vec3,
  vec4,
  floor,
  fract,
  abs,
  max,
  min,
  step,
  mix,
  dot,
  mod,
  ShaderNodeObject,
  Node,
} from 'three/tsl';

export interface NoiseConfig {
  /** Scale factor for noise coordinates (default: 1.0) */
  scale?: number;
  /** Number of noise octaves for fractal noise (default: 1) */
  octaves?: number;
  /** Persistence for octave amplitude falloff (default: 0.5) */
  persistence?: number;
}

export type NoiseFunction = (position: ShaderNodeObject<Node>) => ShaderNodeObject<Node>;

/**
 * Creates a TSL noise function with configurable parameters
 * @param config - Noise configuration options
 * @returns A function that generates noise from a vec3 position
 */
export function createNoiseFunction(config: NoiseConfig = {}): NoiseFunction {
  const { scale = 1.0, octaves = 1, persistence = 0.5 } = config;

  return (position: ShaderNodeObject<Node>): ShaderNodeObject<Node> => {
    // Simplex-like noise using TSL built-in functions
    // This is a simplified version - TSL provides noise primitives
    const scaledPos = position.mul(scale);

    let noise = float(0);
    let amplitude = float(1);
    let frequency = float(1);
    let maxValue = float(0);

    for (let i = 0; i < octaves; i++) {
      // Use position-based pseudo-random pattern
      const p = scaledPos.mul(frequency);
      const floorP = floor(p);
      const fractP = fract(p);

      // Smooth interpolation
      const u = fractP.mul(fractP).mul(float(3).sub(fractP.mul(2)));

      // Hash-like function using dot products
      const n = dot(floorP, vec3(1.0, 57.0, 113.0));
      const hash = fract(n.mul(0.1031).sin().mul(43758.5453));

      noise = noise.add(hash.mul(amplitude));
      maxValue = maxValue.add(amplitude);
      amplitude = amplitude.mul(persistence);
      frequency = frequency.mul(2);
    }

    // Normalize to [-1, 1] range
    return noise.div(maxValue).mul(2).sub(1);
  };
}

/**
 * Pre-configured noise function with default settings
 */
export const defaultNoise = createNoiseFunction({ scale: 0.1, octaves: 2 });
```

**Run tests to confirm GREEN**:

```bash
npx vitest src/visualization/shaders/noise.test.ts
```

### Step 1.3: Write Failing Tests for Fresnel Module (RED)

Create `src/visualization/shaders/fresnel.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createFresnelNode, type FresnelConfig } from './fresnel';

describe('fresnel module', () => {
  describe('createFresnelNode', () => {
    it('should export createFresnelNode', () => {
      expect(createFresnelNode).toBeDefined();
      expect(typeof createFresnelNode).toBe('function');
    });

    it('should return a TSL node', () => {
      const fresnelNode = createFresnelNode();
      expect(fresnelNode).toBeDefined();
    });

    it('should accept power configuration', () => {
      const fresnelNode = createFresnelNode({ power: 3.0 });
      expect(fresnelNode).toBeDefined();
    });

    it('should accept intensity configuration', () => {
      const fresnelNode = createFresnelNode({ intensity: 1.5 });
      expect(fresnelNode).toBeDefined();
    });

    it('should accept both power and intensity', () => {
      const fresnelNode = createFresnelNode({ power: 2.0, intensity: 2.0 });
      expect(fresnelNode).toBeDefined();
    });
  });
});
```

**Run tests to confirm RED**:

```bash
npx vitest src/visualization/shaders/fresnel.test.ts
```

### Step 1.4: Implement Fresnel Module (GREEN)

Create `src/visualization/shaders/fresnel.ts`:

```typescript
/**
 * TSL Fresnel Effect Implementation
 * Provides rim glow effects based on view angle
 */
import {
  float,
  pow,
  max,
  dot,
  normalize,
  sub,
  cameraPosition,
  positionWorld,
  normalWorld,
  ShaderNodeObject,
  Node,
} from 'three/tsl';

export interface FresnelConfig {
  /** Fresnel power exponent (default: 3.0, higher = sharper rim) */
  power?: number;
  /** Intensity multiplier (default: 1.0) */
  intensity?: number;
}

/**
 * Creates a TSL Fresnel node for rim glow effects
 * @param config - Fresnel configuration options
 * @returns A TSL node representing the Fresnel factor (0-1)
 */
export function createFresnelNode(config: FresnelConfig = {}): ShaderNodeObject<Node> {
  const { power = 3.0, intensity = 1.0 } = config;

  // Calculate view direction
  const viewDirection = normalize(sub(cameraPosition, positionWorld));

  // Fresnel factor: 1 - max(dot(viewDir, normal), 0)
  const dotProduct = max(dot(viewDirection, normalWorld), 0);
  const fresnel = pow(sub(float(1), dotProduct), power);

  // Apply intensity
  return fresnel.mul(intensity);
}

/**
 * Pre-configured Fresnel with prototype settings
 */
export const defaultFresnel = createFresnelNode({ power: 3.0, intensity: 1.5 });
```

**Run tests to confirm GREEN**:

```bash
npx vitest src/visualization/shaders/fresnel.test.ts
```

### Step 1.5: Write Failing Tests for Node Material (RED)

Create `src/visualization/materials/node-material.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import {
  createNodeMaterial,
  updateNodeMaterialTime,
  disposeNodeMaterial,
  type NodeMaterialConfig,
  type NodeMaterialUniforms,
} from './node-material';

// Mock Three.js TSL modules
vi.mock('three/tsl', () => ({
  MeshStandardNodeMaterial: vi.fn().mockImplementation(() => ({
    dispose: vi.fn(),
    colorNode: null,
    emissiveNode: null,
  })),
  uniform: vi.fn((value) => ({ value, isUniform: true })),
  attribute: vi.fn((name) => ({ name, isAttribute: true })),
  float: vi.fn((v) => ({ value: v, type: 'float' })),
  vec3: vi.fn((x, y, z) => ({ x, y, z, type: 'vec3' })),
  sin: vi.fn((v) => ({ input: v, type: 'sin' })),
  mul: vi.fn(),
  add: vi.fn(),
  sub: vi.fn(),
  pow: vi.fn(),
  max: vi.fn(),
  dot: vi.fn(),
  normalize: vi.fn(),
  mix: vi.fn(),
  cameraPosition: { type: 'cameraPosition' },
  positionWorld: { type: 'positionWorld' },
  normalWorld: { type: 'normalWorld' },
}));

describe('node-material module', () => {
  describe('createNodeMaterial', () => {
    it('should export createNodeMaterial function', () => {
      expect(createNodeMaterial).toBeDefined();
      expect(typeof createNodeMaterial).toBe('function');
    });

    it('should return material and uniforms', () => {
      const result = createNodeMaterial();
      expect(result).toHaveProperty('material');
      expect(result).toHaveProperty('uniforms');
    });

    it('should create uniforms for time', () => {
      const { uniforms } = createNodeMaterial();
      expect(uniforms.uTime).toBeDefined();
      expect(uniforms.uTime.value).toBe(0);
    });

    it('should create uniforms for primary color', () => {
      const { uniforms } = createNodeMaterial();
      expect(uniforms.uColorPrimary).toBeDefined();
    });

    it('should create uniforms for secondary color', () => {
      const { uniforms } = createNodeMaterial();
      expect(uniforms.uColorSecondary).toBeDefined();
    });

    it('should create uniforms for glow intensity', () => {
      const { uniforms } = createNodeMaterial();
      expect(uniforms.uGlowIntensity).toBeDefined();
    });

    it('should accept custom config for colors', () => {
      const config: NodeMaterialConfig = {
        colorPrimary: new THREE.Color(0xff0000),
        colorSecondary: new THREE.Color(0x00ff00),
      };
      const { uniforms } = createNodeMaterial(config);
      expect(uniforms.uColorPrimary.value.getHex()).toBe(0xff0000);
      expect(uniforms.uColorSecondary.value.getHex()).toBe(0x00ff00);
    });

    it('should accept custom glow intensity', () => {
      const config: NodeMaterialConfig = {
        glowIntensity: 2.5,
      };
      const { uniforms } = createNodeMaterial(config);
      expect(uniforms.uGlowIntensity.value).toBe(2.5);
    });
  });

  describe('updateNodeMaterialTime', () => {
    it('should export updateNodeMaterialTime function', () => {
      expect(updateNodeMaterialTime).toBeDefined();
      expect(typeof updateNodeMaterialTime).toBe('function');
    });

    it('should update time uniform', () => {
      const { uniforms } = createNodeMaterial();
      updateNodeMaterialTime(uniforms, 1.5);
      expect(uniforms.uTime.value).toBe(1.5);
    });

    it('should accumulate time correctly', () => {
      const { uniforms } = createNodeMaterial();
      updateNodeMaterialTime(uniforms, 0.5);
      updateNodeMaterialTime(uniforms, 1.0);
      expect(uniforms.uTime.value).toBe(1.0);
    });
  });

  describe('disposeNodeMaterial', () => {
    it('should export disposeNodeMaterial function', () => {
      expect(disposeNodeMaterial).toBeDefined();
      expect(typeof disposeNodeMaterial).toBe('function');
    });

    it('should call material.dispose()', () => {
      const { material } = createNodeMaterial();
      const disposeSpy = vi.spyOn(material, 'dispose');
      disposeNodeMaterial(material);
      expect(disposeSpy).toHaveBeenCalled();
    });
  });
});
```

**Run tests to confirm RED**:

```bash
npx vitest src/visualization/materials/node-material.test.ts
```

### Step 1.6: Implement Node Material (GREEN)

Create `src/visualization/materials/node-material.ts`:

```typescript
/**
 * TSL Node Material for Constellation Spheres
 * Implements biography-driven scaling, pulsing, and Fresnel glow
 */
import * as THREE from 'three';
import {
  MeshStandardNodeMaterial,
  uniform,
  attribute,
  float,
  vec3,
  sin,
  mul,
  add,
  sub,
  pow,
  max,
  dot,
  normalize,
  mix,
  cameraPosition,
  positionWorld,
  normalWorld,
  ShaderNodeObject,
  Node,
} from 'three/tsl';
import { createNoiseFunction } from '../shaders/noise';
import { createFresnelNode } from '../shaders/fresnel';

export interface NodeMaterialConfig {
  /** Primary glow color (default: violet 0x9966cc) */
  colorPrimary?: THREE.Color;
  /** Secondary accent color (default: gold 0xd4a84b) */
  colorSecondary?: THREE.Color;
  /** Glow intensity multiplier (default: 1.5) */
  glowIntensity?: number;
  /** Pulsing animation speed (default: 2.0) */
  pulseSpeed?: number;
  /** Pulsing amplitude (default: 0.05) */
  pulseAmplitude?: number;
}

export interface NodeMaterialUniforms {
  uTime: { value: number };
  uColorPrimary: { value: THREE.Color };
  uColorSecondary: { value: THREE.Color };
  uGlowIntensity: { value: number };
  uPulseSpeed: { value: number };
  uPulseAmplitude: { value: number };
}

export interface NodeMaterialResult {
  material: THREE.Material;
  uniforms: NodeMaterialUniforms;
}

// Default colors from prototype
const DEFAULT_COLOR_PRIMARY = new THREE.Color(0x9966cc);  // Luminous Violet
const DEFAULT_COLOR_SECONDARY = new THREE.Color(0xd4a84b); // Sacred Gold

/**
 * Creates a TSL-based node material with all visual effects
 * @param config - Material configuration options
 * @returns Material instance and uniform references
 */
export function createNodeMaterial(config: NodeMaterialConfig = {}): NodeMaterialResult {
  const {
    colorPrimary = DEFAULT_COLOR_PRIMARY.clone(),
    colorSecondary = DEFAULT_COLOR_SECONDARY.clone(),
    glowIntensity = 1.5,
    pulseSpeed = 2.0,
    pulseAmplitude = 0.05,
  } = config;

  // Create uniforms
  const uTime = uniform(0);
  const uColorPrimary = uniform(colorPrimary);
  const uColorSecondary = uniform(colorSecondary);
  const uGlowIntensity = uniform(glowIntensity);
  const uPulseSpeed = uniform(pulseSpeed);
  const uPulseAmplitude = uniform(pulseAmplitude);

  // Instance attribute for biography weight (set per-instance)
  const biographyWeight = attribute('aBiographyWeight');

  // Pulsing animation: sin(time * speed + weight * 2π) * amplitude * weight
  const pulsePhase = mul(uTime, uPulseSpeed).add(mul(biographyWeight, 6.28));
  const pulse = mul(mul(sin(pulsePhase), uPulseAmplitude), biographyWeight);

  // Fresnel rim glow
  const viewDir = normalize(sub(cameraPosition, positionWorld));
  const fresnel = pow(sub(float(1), max(dot(viewDir, normalWorld), 0)), 3);

  // Noise-based color variation
  const noiseFn = createNoiseFunction({ scale: 0.1, octaves: 2 });
  const noiseValue = noiseFn(positionWorld.add(mul(uTime, 0.2)));

  // Mix colors based on noise and biography weight
  const colorMix = mul(noiseValue.add(1).mul(0.5), biographyWeight);
  const baseColor = mix(uColorPrimary, uColorSecondary, colorMix);

  // Glow intensity based on fresnel and biography weight
  const glowPulse = sin(mul(uTime, 3).add(mul(biographyWeight, 10))).mul(0.15).mul(biographyWeight).add(1);
  const rimGlow = mul(mul(mul(fresnel, add(mul(biographyWeight, 2), 1)), uGlowIntensity), glowPulse);

  // Create material
  const material = new MeshStandardNodeMaterial();
  material.colorNode = baseColor;
  material.emissiveNode = mul(baseColor, mul(rimGlow, 1.5));
  material.metalness = 0.3;
  material.roughness = 0.7;
  material.transparent = true;
  material.opacity = 0.9;

  // Return material and uniforms for external control
  const uniforms: NodeMaterialUniforms = {
    uTime: uTime as unknown as { value: number },
    uColorPrimary: uColorPrimary as unknown as { value: THREE.Color },
    uColorSecondary: uColorSecondary as unknown as { value: THREE.Color },
    uGlowIntensity: uGlowIntensity as unknown as { value: number },
    uPulseSpeed: uPulseSpeed as unknown as { value: number },
    uPulseAmplitude: uPulseAmplitude as unknown as { value: number },
  };

  return { material, uniforms };
}

/**
 * Updates the time uniform for animation
 * @param uniforms - Uniform references from createNodeMaterial
 * @param time - Current time in seconds
 */
export function updateNodeMaterialTime(uniforms: NodeMaterialUniforms, time: number): void {
  uniforms.uTime.value = time;
}

/**
 * Disposes of the node material (INV-A009)
 * @param material - Material to dispose
 */
export function disposeNodeMaterial(material: THREE.Material): void {
  material.dispose();
}
```

**Run tests to confirm GREEN**:

```bash
npx vitest src/visualization/materials/node-material.test.ts
```

### Step 1.7: Write Failing Tests for Instanced Constellation (RED)

Create `src/visualization/constellation.test.ts` (update existing):

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import {
  createInstancedConstellation,
  updateConstellationTime,
  updateInstanceBiographyWeight,
  disposeInstancedConstellation,
  type ConstellationConfig,
  type ConstellationData,
  type InstancedConstellationResult,
} from './constellation';

describe('instanced constellation', () => {
  describe('createInstancedConstellation', () => {
    it('should export createInstancedConstellation function', () => {
      expect(createInstancedConstellation).toBeDefined();
      expect(typeof createInstancedConstellation).toBe('function');
    });

    it('should return mesh, material uniforms, and attribute references', () => {
      const data: ConstellationData = {
        positions: [new THREE.Vector3(0, 0, 0)],
        biographyWeights: [0.5],
        personIds: ['person-1'],
      };
      const result = createInstancedConstellation(data);

      expect(result).toHaveProperty('mesh');
      expect(result).toHaveProperty('uniforms');
      expect(result).toHaveProperty('biographyWeightAttribute');
    });

    it('should create InstancedMesh with correct count', () => {
      const data: ConstellationData = {
        positions: [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(10, 0, 0),
          new THREE.Vector3(20, 0, 0),
        ],
        biographyWeights: [0.5, 0.8, 0.2],
        personIds: ['p1', 'p2', 'p3'],
      };
      const { mesh } = createInstancedConstellation(data);

      expect(mesh).toBeInstanceOf(THREE.InstancedMesh);
      expect(mesh.count).toBe(3);
    });

    it('should set instance matrices from positions', () => {
      const data: ConstellationData = {
        positions: [new THREE.Vector3(5, 10, 15)],
        biographyWeights: [0.5],
        personIds: ['p1'],
      };
      const { mesh } = createInstancedConstellation(data);

      const matrix = new THREE.Matrix4();
      mesh.getMatrixAt(0, matrix);
      const position = new THREE.Vector3();
      position.setFromMatrixPosition(matrix);

      expect(position.x).toBeCloseTo(5);
      expect(position.y).toBeCloseTo(10);
      expect(position.z).toBeCloseTo(15);
    });

    it('should apply biography weight scaling to instance matrices', () => {
      const data: ConstellationData = {
        positions: [new THREE.Vector3(0, 0, 0)],
        biographyWeights: [1.0], // Max weight = scale 1 + 1.0 * 2.5 = 3.5
        personIds: ['p1'],
      };
      const config: ConstellationConfig = {
        baseScale: 1.0,
        scaleMultiplier: 2.5,
      };
      const { mesh } = createInstancedConstellation(data, config);

      const matrix = new THREE.Matrix4();
      mesh.getMatrixAt(0, matrix);
      const scale = new THREE.Vector3();
      matrix.decompose(new THREE.Vector3(), new THREE.Quaternion(), scale);

      expect(scale.x).toBeCloseTo(3.5);
      expect(scale.y).toBeCloseTo(3.5);
      expect(scale.z).toBeCloseTo(3.5);
    });

    it('should store personId in mesh userData', () => {
      const data: ConstellationData = {
        positions: [new THREE.Vector3(0, 0, 0)],
        biographyWeights: [0.5],
        personIds: ['person-123'],
      };
      const { mesh } = createInstancedConstellation(data);

      expect(mesh.userData.personIds).toContain('person-123');
    });

    it('should create biography weight instanced attribute', () => {
      const data: ConstellationData = {
        positions: [new THREE.Vector3(0, 0, 0)],
        biographyWeights: [0.75],
        personIds: ['p1'],
      };
      const { biographyWeightAttribute } = createInstancedConstellation(data);

      expect(biographyWeightAttribute).toBeDefined();
      expect(biographyWeightAttribute.array[0]).toBeCloseTo(0.75);
    });
  });

  describe('updateConstellationTime', () => {
    it('should update material time uniform', () => {
      const data: ConstellationData = {
        positions: [new THREE.Vector3(0, 0, 0)],
        biographyWeights: [0.5],
        personIds: ['p1'],
      };
      const { uniforms } = createInstancedConstellation(data);

      updateConstellationTime(uniforms, 2.5);
      expect(uniforms.uTime.value).toBe(2.5);
    });
  });

  describe('updateInstanceBiographyWeight', () => {
    it('should update biography weight for specific instance', () => {
      const data: ConstellationData = {
        positions: [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(10, 0, 0),
        ],
        biographyWeights: [0.5, 0.5],
        personIds: ['p1', 'p2'],
      };
      const { biographyWeightAttribute } = createInstancedConstellation(data);

      updateInstanceBiographyWeight(biographyWeightAttribute, 1, 0.9);
      expect(biographyWeightAttribute.array[1]).toBeCloseTo(0.9);
    });

    it('should mark attribute for update', () => {
      const data: ConstellationData = {
        positions: [new THREE.Vector3(0, 0, 0)],
        biographyWeights: [0.5],
        personIds: ['p1'],
      };
      const { biographyWeightAttribute } = createInstancedConstellation(data);

      biographyWeightAttribute.needsUpdate = false;
      updateInstanceBiographyWeight(biographyWeightAttribute, 0, 0.8);
      expect(biographyWeightAttribute.needsUpdate).toBe(true);
    });
  });

  describe('disposeInstancedConstellation', () => {
    it('should dispose mesh geometry', () => {
      const data: ConstellationData = {
        positions: [new THREE.Vector3(0, 0, 0)],
        biographyWeights: [0.5],
        personIds: ['p1'],
      };
      const { mesh } = createInstancedConstellation(data);
      const geometryDisposeSpy = vi.spyOn(mesh.geometry, 'dispose');

      disposeInstancedConstellation(mesh);
      expect(geometryDisposeSpy).toHaveBeenCalled();
    });

    it('should dispose mesh material', () => {
      const data: ConstellationData = {
        positions: [new THREE.Vector3(0, 0, 0)],
        biographyWeights: [0.5],
        personIds: ['p1'],
      };
      const { mesh } = createInstancedConstellation(data);
      const materialDisposeSpy = vi.spyOn(mesh.material as THREE.Material, 'dispose');

      disposeInstancedConstellation(mesh);
      expect(materialDisposeSpy).toHaveBeenCalled();
    });
  });
});
```

**Run tests to confirm RED**:

```bash
npx vitest src/visualization/constellation.test.ts
```

### Step 1.8: Implement Instanced Constellation (GREEN)

Update `src/visualization/constellation.ts`:

```typescript
/**
 * Instanced Constellation Rendering
 * Creates and manages instanced mesh for constellation nodes
 */
import * as THREE from 'three';
import {
  createNodeMaterial,
  updateNodeMaterialTime,
  disposeNodeMaterial,
  type NodeMaterialUniforms,
} from './materials/node-material';

export interface ConstellationConfig {
  /** Base sphere radius (default: 2) */
  sphereRadius?: number;
  /** Sphere geometry segments (default: 32) */
  sphereSegments?: number;
  /** Base scale factor (default: 1.0) */
  baseScale?: number;
  /** Scale multiplier for biography weight (default: 2.5) */
  scaleMultiplier?: number;
}

export interface ConstellationData {
  /** 3D positions for each node */
  positions: THREE.Vector3[];
  /** Biography weight (0-1) for each node */
  biographyWeights: number[];
  /** Person IDs for raycasting identification */
  personIds: string[];
}

export interface InstancedConstellationResult {
  /** The instanced mesh to add to scene */
  mesh: THREE.InstancedMesh;
  /** Material uniforms for animation updates */
  uniforms: NodeMaterialUniforms;
  /** Biography weight attribute for per-instance updates */
  biographyWeightAttribute: THREE.InstancedBufferAttribute;
}

const DEFAULT_CONFIG: Required<ConstellationConfig> = {
  sphereRadius: 2,
  sphereSegments: 32,
  baseScale: 1.0,
  scaleMultiplier: 2.5,
};

/**
 * Creates an instanced constellation mesh with TSL material
 * @param data - Constellation node data (positions, weights, IDs)
 * @param config - Rendering configuration
 * @returns Mesh, uniforms, and attribute references
 */
export function createInstancedConstellation(
  data: ConstellationData,
  config: ConstellationConfig = {}
): InstancedConstellationResult {
  const {
    sphereRadius,
    sphereSegments,
    baseScale,
    scaleMultiplier,
  } = { ...DEFAULT_CONFIG, ...config };

  const { positions, biographyWeights, personIds } = data;
  const count = positions.length;

  // Create geometry
  const geometry = new THREE.SphereGeometry(sphereRadius, sphereSegments, sphereSegments);

  // Create biography weight instanced attribute
  const biographyWeightArray = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    biographyWeightArray[i] = biographyWeights[i];
  }
  const biographyWeightAttribute = new THREE.InstancedBufferAttribute(biographyWeightArray, 1);
  geometry.setAttribute('aBiographyWeight', biographyWeightAttribute);

  // Create material
  const { material, uniforms } = createNodeMaterial();

  // Create instanced mesh
  const mesh = new THREE.InstancedMesh(geometry, material, count);

  // Set instance matrices with position and scale
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    position.copy(positions[i]);
    quaternion.identity();

    // Scale based on biography weight: baseScale + weight * multiplier
    const nodeScale = baseScale + biographyWeights[i] * scaleMultiplier;
    scale.set(nodeScale, nodeScale, nodeScale);

    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(i, matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;

  // Store person IDs for raycasting
  mesh.userData.personIds = personIds;

  return {
    mesh,
    uniforms,
    biographyWeightAttribute,
  };
}

/**
 * Updates the time uniform for constellation animation
 * @param uniforms - Material uniforms from createInstancedConstellation
 * @param time - Current time in seconds
 */
export function updateConstellationTime(uniforms: NodeMaterialUniforms, time: number): void {
  updateNodeMaterialTime(uniforms, time);
}

/**
 * Updates biography weight for a specific instance
 * @param attribute - Biography weight attribute from createInstancedConstellation
 * @param index - Instance index
 * @param weight - New biography weight (0-1)
 */
export function updateInstanceBiographyWeight(
  attribute: THREE.InstancedBufferAttribute,
  index: number,
  weight: number
): void {
  attribute.array[index] = weight;
  attribute.needsUpdate = true;
}

/**
 * Disposes instanced constellation resources (INV-A009)
 * @param mesh - Instanced mesh to dispose
 */
export function disposeInstancedConstellation(mesh: THREE.InstancedMesh): void {
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
npx vitest src/visualization/constellation.test.ts
```

### Step 1.9: Refactor

While keeping tests green:

- [ ] Ensure complete type annotations (no implicit `any`)
- [ ] Add JSDoc comments for public APIs
- [ ] Use `private _` prefix for private members (N/A - functional approach)
- [ ] Use explicit `public` for public methods (N/A - functional approach)
- [ ] Extract helper functions if needed
- [ ] Optimize for readability
- [ ] Check for code duplication

**Run full verification**:

```bash
npx vitest src/visualization/
npx tsc --noEmit
npm run lint
```

---

## Implementation Details

### Data Structures

```typescript
// From src/types/visualization.ts (to be created)
export interface GraphNode {
  id: string;
  position: THREE.Vector3;
  biographyWeight: number;
  personId: string;
  generation: number;
}

export interface VisualizationConfig {
  node: NodeMaterialConfig;
  constellation: ConstellationConfig;
}
```

### Edge Cases to Handle

- Empty data array: Return null or throw descriptive error
- Biography weight out of range: Clamp to [0, 1]
- Invalid position values (NaN, Infinity): Default to origin

### Error Handling

- Missing Three.js WebGPU support: Fall back to standard material
- TSL compilation errors: Log warning and use fallback

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/visualization/shaders/noise.ts` | CREATE | TSL simplex noise function |
| `src/visualization/shaders/noise.test.ts` | CREATE | Noise module tests |
| `src/visualization/shaders/fresnel.ts` | CREATE | TSL Fresnel effect |
| `src/visualization/shaders/fresnel.test.ts` | CREATE | Fresnel module tests |
| `src/visualization/shaders/index.ts` | CREATE | Shader exports |
| `src/visualization/materials/node-material.ts` | CREATE | Node sphere material |
| `src/visualization/materials/node-material.test.ts` | CREATE | Node material tests |
| `src/visualization/materials/index.ts` | CREATE | Material exports |
| `src/visualization/constellation.ts` | MODIFY | Use instanced mesh with TSL |
| `src/visualization/constellation.test.ts` | MODIFY | Add instanced mesh tests |
| `src/types/visualization.ts` | CREATE | Visualization type definitions |

---

## Verification

```bash
# Run phase-specific tests
npx vitest src/visualization/shaders/
npx vitest src/visualization/materials/
npx vitest src/visualization/constellation.test.ts

# Run all tests
npm test

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Check for any types (should be empty)
grep -r "any" src/visualization/shaders/ src/visualization/materials/ --include="*.ts" | grep -v "test" | grep -v "node_modules"
```

---

## Completion Criteria

- [ ] All test cases pass (noise, fresnel, node-material, constellation)
- [ ] Type check passes (`npx tsc --noEmit`)
- [ ] Lint passes (`npm run lint`)
- [ ] No `any` types introduced
- [ ] JSDoc comments on all public functions
- [ ] Nodes visually pulse in browser
- [ ] Nodes scale based on biography weight
- [ ] Fresnel rim glow visible on node edges
- [ ] INV-A008 verified (correct imports)
- [ ] INV-A009 verified (disposal tests pass)
- [ ] Work notes updated

---

## Notes

*To be filled during implementation*

---

*Template version: 1.0*
