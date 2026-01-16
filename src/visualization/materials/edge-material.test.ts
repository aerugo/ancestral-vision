/**
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import {
  createEdgeMaterial,
  updateEdgeMaterialTime,
  disposeEdgeMaterial,
  type EdgeMaterialConfig,
} from './edge-material';

// Mock Three.js TSL modules
vi.mock('three/tsl', () => {
  function createMockNode(): Record<string, unknown> {
    const node: Record<string, unknown> = {};
    const mockFn = () => createMockNode();
    node.mul = vi.fn(mockFn);
    node.add = vi.fn(mockFn);
    node.sub = vi.fn(mockFn);
    node.div = vi.fn(mockFn);
    return node;
  }

  class MockLineBasicNodeMaterial {
    public dispose = vi.fn();
    public colorNode: unknown = null;
    public opacityNode: unknown = null;
    public transparent = false;
    public blending = THREE.NormalBlending;
    public depthWrite = true;
  }

  return {
    LineBasicNodeMaterial: MockLineBasicNodeMaterial,
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
    fract: vi.fn(() => createMockNode()),
    smoothstep: vi.fn(() => createMockNode()),
    mul: vi.fn(() => createMockNode()),
    add: vi.fn(() => createMockNode()),
    sub: vi.fn(() => createMockNode()),
    mix: vi.fn(() => createMockNode()),
  };
});

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

    it('should use normal blending by default (fog fix)', () => {
      const { material } = createEdgeMaterial();
      expect(material.blending).toBe(THREE.NormalBlending);
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

  describe('Enhanced edge material visual effects (Phase 9.2)', () => {
    it('should enable enhanced mode by default', () => {
      const { uniforms } = createEdgeMaterial();
      // Enhanced mode enabled by default means enhanced uniforms should be present
      expect(uniforms.uPrayerBeadIntensity).toBeDefined();
      expect(uniforms.uByzantineIntensity).toBeDefined();
    });

    it('should have default prayer bead intensity of 0.6 when using defaults (Phase 6 tuned)', () => {
      const { uniforms } = createEdgeMaterial();
      expect(uniforms.uPrayerBeadIntensity?.value).toBe(0.6);
    });

    it('should have default byzantine intensity of 0.3 when using defaults (Phase 6 tuned)', () => {
      const { uniforms } = createEdgeMaterial();
      expect(uniforms.uByzantineIntensity?.value).toBe(0.3);
    });

    it('should accept custom prayer bead intensity', () => {
      const config: EdgeMaterialConfig = {
        prayerBeadIntensity: 0.6,
      };
      const { uniforms } = createEdgeMaterial(config);
      expect(uniforms.uPrayerBeadIntensity?.value).toBe(0.6);
    });

    it('should accept custom byzantine intensity', () => {
      const config: EdgeMaterialConfig = {
        byzantineIntensity: 0.3,
      };
      const { uniforms } = createEdgeMaterial(config);
      expect(uniforms.uByzantineIntensity?.value).toBe(0.3);
    });

    it('should allow disabling enhanced mode explicitly', () => {
      const { uniforms } = createEdgeMaterial({ enhancedMode: false });
      expect(uniforms.uPrayerBeadIntensity).toBeUndefined();
      expect(uniforms.uByzantineIntensity).toBeUndefined();
    });
  });
});
