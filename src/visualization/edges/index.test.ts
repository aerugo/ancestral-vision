/**
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import {
  createEdgeSystem,
  updateEdgeSystemTime,
  disposeEdgeSystem,
  type EdgeSystemData,
} from './index';

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

    it('should create LineSegments mesh', () => {
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

      expect(mesh).toBeInstanceOf(THREE.LineSegments);
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
            type: 'parent-child',
            strength: 0.8,
          },
        ],
      };
      const { mesh } = createEdgeSystem(data);

      // With LineSegments format: 2 edges × 30 segments × 2 positions = 120 positions
      expect(mesh.geometry.attributes.position.count).toBeGreaterThan(100);
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
