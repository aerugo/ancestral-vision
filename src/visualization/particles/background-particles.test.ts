/**
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import {
  createBackgroundParticles,
  updateBackgroundParticlesTime,
  disposeBackgroundParticles,
  type BackgroundParticleConfig,
} from './background-particles';

// Mock Three.js TSL modules
vi.mock('three/tsl', () => {
  function createMockNode(): Record<string, unknown> {
    const node: Record<string, unknown> = {};
    const mockFn = () => createMockNode();
    node.mul = vi.fn(mockFn);
    node.add = vi.fn(mockFn);
    node.sub = vi.fn(mockFn);
    node.div = vi.fn(mockFn);
    node.negate = vi.fn(mockFn);
    node.z = { negate: vi.fn(mockFn) };
    return node;
  }

  class MockPointsNodeMaterial {
    public dispose = vi.fn();
    public colorNode: unknown = null;
    public sizeNode: unknown = null;
    public transparent = false;
    public opacity = 1;
    public blending = THREE.NormalBlending;
    public depthWrite = true;
  }

  return {
    PointsNodeMaterial: MockPointsNodeMaterial,
    uniform: vi.fn((value) => {
      const node = createMockNode();
      node.value = value;
      node.isUniform = true;
      return node;
    }),
    attribute: vi.fn((name) => {
      const node = createMockNode();
      node.name = name;
      node.isAttribute = true;
      return node;
    }),
    float: vi.fn((v) => {
      const node = createMockNode();
      node.value = v;
      node.type = 'float';
      node.div = vi.fn(() => createMockNode());
      return node;
    }),
    vec3: vi.fn((x, y, z) => {
      const node = createMockNode();
      node.x = x;
      node.y = y;
      node.z = z;
      node.type = 'vec3';
      return node;
    }),
    sin: vi.fn(() => createMockNode()),
    cos: vi.fn(() => createMockNode()),
    mul: vi.fn(() => createMockNode()),
    add: vi.fn(() => createMockNode()),
    sub: vi.fn(() => createMockNode()),
    pow: vi.fn(() => createMockNode()),
    smoothstep: vi.fn(() => createMockNode()),
    positionLocal: {
      z: { negate: vi.fn(() => createMockNode()) },
    },
  };
});

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
      const positions = mesh.geometry.attributes.position;
      expect(positions).toBeDefined();
      expect(positions!.count).toBe(300);
    });

    it('should accept custom particle count', () => {
      const config: BackgroundParticleConfig = { count: 500 };
      const { mesh } = createBackgroundParticles(config);
      const positions = mesh.geometry.attributes.position;
      expect(positions).toBeDefined();
      expect(positions!.count).toBe(500);
    });

    it('should create particles in spherical shell', () => {
      const config: BackgroundParticleConfig = {
        count: 100,
        innerRadius: 100,
        outerRadius: 500,
      };
      const { mesh } = createBackgroundParticles(config);
      const positions = mesh.geometry.attributes.position;
      expect(positions).toBeDefined();

      for (let i = 0; i < positions!.count; i++) {
        const x = positions!.getX(i);
        const y = positions!.getY(i);
        const z = positions!.getZ(i);
        const distance = Math.sqrt(x * x + y * y + z * z);

        // Allow 10% tolerance for floating point
        expect(distance).toBeGreaterThanOrEqual(config.innerRadius! * 0.9);
        expect(distance).toBeLessThanOrEqual(config.outerRadius! * 1.1);
      }
    });

    it('should create phase attribute for animation offset', () => {
      const { mesh } = createBackgroundParticles();
      expect(mesh.geometry.attributes.aPhase).toBeDefined();
    });

    it('should create phase values between 0 and 2*PI', () => {
      const { mesh } = createBackgroundParticles();
      const phases = mesh.geometry.attributes.aPhase;
      expect(phases).toBeDefined();

      for (let i = 0; i < phases!.count; i++) {
        const phase = phases!.getX(i);
        expect(phase).toBeGreaterThanOrEqual(0);
        expect(phase).toBeLessThanOrEqual(Math.PI * 2);
      }
    });

    it('should create color attribute', () => {
      const { mesh } = createBackgroundParticles();
      expect(mesh.geometry.attributes.color).toBeDefined();
    });

    it('should create RGB color values', () => {
      const { mesh } = createBackgroundParticles();
      const colors = mesh.geometry.attributes.color;
      expect(colors).toBeDefined();

      expect(colors!.itemSize).toBe(3);
      for (let i = 0; i < colors!.count; i++) {
        const r = colors!.getX(i);
        const g = colors!.getY(i);
        const b = colors!.getZ(i);
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThanOrEqual(1);
        expect(g).toBeGreaterThanOrEqual(0);
        expect(g).toBeLessThanOrEqual(1);
        expect(b).toBeGreaterThanOrEqual(0);
        expect(b).toBeLessThanOrEqual(1);
      }
    });

    it('should have time uniform', () => {
      const { uniforms } = createBackgroundParticles();
      expect(uniforms.uTime).toBeDefined();
      expect(uniforms.uTime.value).toBe(0);
    });

    it('should have point size uniform', () => {
      const { uniforms } = createBackgroundParticles();
      expect(uniforms.uPointSize).toBeDefined();
      expect(uniforms.uPointSize.value).toBe(4); // default
    });

    it('should accept custom point size', () => {
      const config: BackgroundParticleConfig = { pointSize: 8 };
      const { uniforms } = createBackgroundParticles(config);
      expect(uniforms.uPointSize.value).toBe(8);
    });
  });

  describe('updateBackgroundParticlesTime', () => {
    it('should update time uniform', () => {
      const { uniforms } = createBackgroundParticles();
      updateBackgroundParticlesTime(uniforms, 2.5);
      expect(uniforms.uTime.value).toBe(2.5);
    });

    it('should handle multiple time updates', () => {
      const { uniforms } = createBackgroundParticles();
      updateBackgroundParticlesTime(uniforms, 1.0);
      expect(uniforms.uTime.value).toBe(1.0);
      updateBackgroundParticlesTime(uniforms, 5.5);
      expect(uniforms.uTime.value).toBe(5.5);
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

  describe('Enhanced visual effects (Phase 9.4)', () => {
    it('should support enhanced mode config option', () => {
      const config: BackgroundParticleConfig = { enhancedMode: true };
      const result = createBackgroundParticles(config);
      expect(result).toHaveProperty('mesh');
    });

    it('should create divine spark intensity uniform when enhanced', () => {
      const { uniforms } = createBackgroundParticles({ enhancedMode: true });
      expect(uniforms.uDivineSparkIntensity).toBeDefined();
    });

    it('should use default divine spark intensity of 0.6 when enhanced', () => {
      const { uniforms } = createBackgroundParticles({ enhancedMode: true });
      expect(uniforms.uDivineSparkIntensity?.value).toBe(0.6);
    });

    it('should accept custom divine spark intensity', () => {
      const config: BackgroundParticleConfig = {
        enhancedMode: true,
        divineSparkIntensity: 0.9,
      };
      const { uniforms } = createBackgroundParticles(config);
      expect(uniforms.uDivineSparkIntensity?.value).toBe(0.9);
    });

    it('should not create enhanced uniforms when enhancedMode is false', () => {
      const { uniforms } = createBackgroundParticles({ enhancedMode: false });
      expect(uniforms.uDivineSparkIntensity).toBeUndefined();
    });
  });
});
