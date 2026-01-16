/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import {
  createNodeMaterial,
  updateNodeMaterialTime,
  disposeNodeMaterial,
  type NodeMaterialConfig,
  type NodeMaterialUniforms,
} from './node-material';

// Mock Three.js TSL modules
vi.mock('three/tsl', () => {
  // Create a chainable mock node factory - must be inside the mock factory
  function createMockNode(): Record<string, unknown> {
    const node: Record<string, unknown> = {};
    const mockFn = () => createMockNode();
    node.mul = vi.fn(mockFn);
    node.add = vi.fn(mockFn);
    node.sub = vi.fn(mockFn);
    node.div = vi.fn(mockFn);
    node.clamp = vi.fn(mockFn);
    // These can be either getters or set explicitly
    let _x: unknown, _y: unknown, _z: unknown;
    Object.defineProperty(node, 'x', {
      get: () => _x ?? createMockNode(),
      set: (v) => { _x = v; },
      enumerable: true
    });
    Object.defineProperty(node, 'y', {
      get: () => _y ?? createMockNode(),
      set: (v) => { _y = v; },
      enumerable: true
    });
    Object.defineProperty(node, 'z', {
      get: () => _z ?? createMockNode(),
      set: (v) => { _z = v; },
      enumerable: true
    });
    return node;
  }

  // Use a class for the constructor mock
  class MockMeshStandardNodeMaterial {
    public dispose = vi.fn();
    public colorNode: unknown = null;
    public emissiveNode: unknown = null;
    public metalness = 0;
    public roughness = 0;
    public transparent = false;
    public opacity = 1;
  }

  return {
    MeshStandardNodeMaterial: MockMeshStandardNodeMaterial,
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
      // Set the values using the setter
      if (x !== undefined) node.x = x;
      if (y !== undefined) node.y = y;
      if (z !== undefined) node.z = z;
      node.type = 'vec3';
      return node;
    }),
    sin: vi.fn(() => createMockNode()),
    cos: vi.fn(() => createMockNode()),
    mul: vi.fn(() => createMockNode()),
    add: vi.fn(() => createMockNode()),
    sub: vi.fn(() => createMockNode()),
    pow: vi.fn(() => createMockNode()),
    max: vi.fn(() => createMockNode()),
    dot: vi.fn(() => createMockNode()),
    normalize: vi.fn(() => createMockNode()),
    mix: vi.fn(() => createMockNode()),
    floor: vi.fn(() => createMockNode()),
    fract: vi.fn(() => createMockNode()),
    smoothstep: vi.fn(() => createMockNode()),
    negate: vi.fn(() => createMockNode()),
    length: vi.fn(() => createMockNode()),
    vec2: vi.fn(() => createMockNode()),
    atan2: vi.fn(() => createMockNode()),
    atan: vi.fn(() => createMockNode()),
    abs: vi.fn(() => createMockNode()),
    clamp: vi.fn(() => createMockNode()),
    mod: vi.fn(() => createMockNode()),
    min: vi.fn(() => createMockNode()),
    step: vi.fn(() => createMockNode()),
    cameraPosition: createMockNode(),
    positionWorld: createMockNode(),
    positionLocal: createMockNode(),
    normalWorld: createMockNode(),
    normalLocal: createMockNode(),
    ShaderNodeObject: {},
    Node: {},
  };
});

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

  describe('Enhanced visual effects (Phase 9.1)', () => {
    it('should support enhanced mode config option', () => {
      const config: NodeMaterialConfig = {
        enhancedMode: true,
      };
      const result = createNodeMaterial(config);
      expect(result).toHaveProperty('material');
      expect(result).toHaveProperty('uniforms');
    });

    it('should create inner glow intensity uniform when enhanced', () => {
      const { uniforms } = createNodeMaterial({ enhancedMode: true });
      expect(uniforms.uInnerGlowIntensity).toBeDefined();
    });

    it('should create subsurface scattering strength uniform when enhanced', () => {
      const { uniforms } = createNodeMaterial({ enhancedMode: true });
      expect(uniforms.uSSSStrength).toBeDefined();
    });

    it('should create mandala pattern intensity uniform when enhanced', () => {
      const { uniforms } = createNodeMaterial({ enhancedMode: true });
      expect(uniforms.uMandalaIntensity).toBeDefined();
    });

    it('should default inner glow intensity to 1.0 (prototype-matched)', () => {
      const { uniforms } = createNodeMaterial({ enhancedMode: true });
      expect(uniforms.uInnerGlowIntensity.value).toBe(1.0);
    });

    it('should default SSS strength to 0.3 (prototype-matched)', () => {
      const { uniforms } = createNodeMaterial({ enhancedMode: true });
      expect(uniforms.uSSSStrength.value).toBe(0.3);
    });

    it('should default mandala intensity to 1.0 (prototype-matched)', () => {
      const { uniforms } = createNodeMaterial({ enhancedMode: true });
      expect(uniforms.uMandalaIntensity.value).toBe(1.0);
    });

    it('should accept custom inner glow intensity', () => {
      const { uniforms } = createNodeMaterial({
        enhancedMode: true,
        innerGlowIntensity: 1.2,
      });
      expect(uniforms.uInnerGlowIntensity.value).toBe(1.2);
    });

    it('should accept custom SSS strength', () => {
      const { uniforms } = createNodeMaterial({
        enhancedMode: true,
        sssStrength: 0.5,
      });
      expect(uniforms.uSSSStrength.value).toBe(0.5);
    });

    it('should accept custom mandala intensity', () => {
      const { uniforms } = createNodeMaterial({
        enhancedMode: true,
        mandalaIntensity: 0.6,
      });
      expect(uniforms.uMandalaIntensity.value).toBe(0.6);
    });

    it('should not create enhanced uniforms when enhancedMode is explicitly false', () => {
      const { uniforms } = createNodeMaterial({ enhancedMode: false });
      expect(uniforms.uInnerGlowIntensity).toBeUndefined();
      expect(uniforms.uSSSStrength).toBeUndefined();
      expect(uniforms.uMandalaIntensity).toBeUndefined();
    });
  });

  describe('Enhanced mode default (Phase 2 - Visual Parity)', () => {
    it('should enable enhanced mode by default', () => {
      const { uniforms } = createNodeMaterial();
      // Enhanced uniforms should be present by default
      expect(uniforms.uInnerGlowIntensity).toBeDefined();
      expect(uniforms.uSSSStrength).toBeDefined();
      expect(uniforms.uMandalaIntensity).toBeDefined();
    });

    it('should have default inner glow intensity of 1.0 when using defaults (prototype-matched)', () => {
      const { uniforms } = createNodeMaterial();
      expect(uniforms.uInnerGlowIntensity?.value).toBe(1.0);
    });

    it('should have default SSS strength of 0.3 when using defaults (prototype-matched)', () => {
      const { uniforms } = createNodeMaterial();
      expect(uniforms.uSSSStrength?.value).toBe(0.3);
    });

    it('should have default mandala intensity of 1.0 when using defaults (prototype-matched)', () => {
      const { uniforms } = createNodeMaterial();
      expect(uniforms.uMandalaIntensity?.value).toBe(1.0);
    });

    it('should allow disabling enhanced mode explicitly', () => {
      const { uniforms } = createNodeMaterial({ enhancedMode: false });
      expect(uniforms.uInnerGlowIntensity).toBeUndefined();
      expect(uniforms.uSSSStrength).toBeUndefined();
      expect(uniforms.uMandalaIntensity).toBeUndefined();
    });
  });
});
