/**
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import {
  createInstancedConstellation,
  updateConstellationTime,
  updateInstanceBiographyWeight,
  disposeInstancedConstellation,
  type ConstellationConfig,
  type ConstellationData,
  type InstancedConstellationResult,
} from './instanced-constellation';

// Mock Three.js WebGPU modules
vi.mock('three/webgpu', () => {
  class MockMeshBasicNodeMaterial {
    public dispose = vi.fn();
    public colorNode: unknown = null;
    public transparent = false;
    public side = 0;
    public depthWrite = true;
  }

  return {
    MeshBasicNodeMaterial: MockMeshBasicNodeMaterial,
  };
});

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
    vec4: vi.fn((x, y, z, w) => {
      const node = createMockNode();
      node.x = x;
      node.y = y;
      node.z = z;
      node.w = w;
      node.type = 'vec4';
      return node;
    }),
    wgslFn: vi.fn((code: string) => {
      // Returns a function that when called with inputs, returns a mock node
      return vi.fn((_inputs: Record<string, unknown>) => createMockNode());
    }),
    Fn: vi.fn((fn: () => unknown) => {
      // Execute the function and return a mock node
      return createMockNode();
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
    clamp: vi.fn(() => createMockNode()),
    floor: vi.fn(() => createMockNode()),
    fract: vi.fn(() => createMockNode()),
    smoothstep: vi.fn(() => createMockNode()),
    negate: vi.fn(() => createMockNode()),
    length: vi.fn(() => createMockNode()),
    vec2: vi.fn(() => createMockNode()),
    atan2: vi.fn(() => createMockNode()),
    cameraPosition: createMockNode(),
    positionWorld: createMockNode(),
    normalWorld: createMockNode(),
    positionLocal: createMockNode(),
    normalLocal: createMockNode(),
    modelWorldMatrix: createMockNode(),
    ShaderNodeObject: {},
    Node: {},
  };
});

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

      // Access version property that needsUpdate increments
      biographyWeightAttribute.version = 0;
      const initialVersion = (biographyWeightAttribute as unknown as { version: number }).version;

      updateInstanceBiographyWeight(biographyWeightAttribute, 0, 0.8);

      // needsUpdate is a setter that increments version, so check version changed
      const newVersion = (biographyWeightAttribute as unknown as { version: number }).version;
      expect(newVersion).toBeGreaterThan(initialVersion);
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
