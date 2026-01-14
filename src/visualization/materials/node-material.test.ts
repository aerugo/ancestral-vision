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
      node.x = x;
      node.y = y;
      node.z = z;
      node.type = 'vec3';
      return node;
    }),
    sin: vi.fn(() => createMockNode()),
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
    cameraPosition: createMockNode(),
    positionWorld: createMockNode(),
    normalWorld: createMockNode(),
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
});
