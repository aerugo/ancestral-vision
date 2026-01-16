/**
 * @vitest-environment node
 */
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import {
  createEventFireflies,
  updateEventFirefliesTime,
  disposeEventFireflies,
  getEventColor,
  type EventFireflyData,
  type EventFireflyConfig,
} from './event-fireflies';

// Mock Three.js TSL modules
vi.mock('three/tsl', () => {
  // Simple mock node factory using lazy getters to avoid infinite recursion
  function createMockNode(): Record<string, unknown> {
    const mockFn = () => createMockNode();
    return {
      value: 0,
      mul: vi.fn(mockFn),
      add: vi.fn(mockFn),
      sub: vi.fn(mockFn),
      div: vi.fn(mockFn),
      // Use getters to lazily create child nodes only when accessed
      get x() { return createMockNode(); },
      get y() { return createMockNode(); },
      get z() { return createMockNode(); },
      get w() { return createMockNode(); },
    };
  }

  class MockPointsNodeMaterial {
    public dispose = vi.fn();
    public colorNode: unknown = null;
    public sizeNode: unknown = null;
    public positionNode: unknown = null;
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
      return node;
    }),
    attribute: vi.fn(() => createMockNode()),
    float: vi.fn(() => createMockNode()),
    vec3: vi.fn(() => createMockNode()),
    sin: vi.fn(() => createMockNode()),
    cos: vi.fn(() => createMockNode()),
    mul: vi.fn(() => createMockNode()),
    add: vi.fn(() => createMockNode()),
    sub: vi.fn(() => createMockNode()),
    pow: vi.fn(() => createMockNode()),
    positionLocal: createMockNode(),
  };
});

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

      const posLow = meshLow.geometry.attributes.position;
      const posHigh = meshHigh.geometry.attributes.position;
      expect(posLow).toBeDefined();
      expect(posHigh).toBeDefined();
      expect(posHigh!.count).toBeGreaterThan(posLow!.count);
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

      const positions = mesh.geometry.attributes.position;
      expect(positions).toBeDefined();
      expect(positions!.count).toBeGreaterThan(10);
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

      const positions = mesh.geometry.attributes.position;
      expect(positions).toBeDefined();
      expect(positions!.count).toBe(0);
    });

    it('should create color attribute with event colors', () => {
      const data: EventFireflyData = {
        nodePositions: [new THREE.Vector3(0, 0, 0)],
        nodeBiographyWeights: [0.5],
        nodeEventTypes: [['birth']],
      };
      const { mesh } = createEventFireflies(data);

      expect(mesh.geometry.attributes.color).toBeDefined();
    });

    it('should store node center values correctly', () => {
      const data: EventFireflyData = {
        nodePositions: [new THREE.Vector3(10, 20, 30)],
        nodeBiographyWeights: [0.5],
        nodeEventTypes: [['birth']],
      };
      const { mesh } = createEventFireflies(data);

      const nodeCenters = mesh.geometry.attributes.aNodeCenter;
      expect(nodeCenters).toBeDefined();
      expect(nodeCenters!.getX(0)).toBe(10);
      expect(nodeCenters!.getY(0)).toBe(20);
      expect(nodeCenters!.getZ(0)).toBe(30);
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

    it('should handle multiple time updates', () => {
      const data: EventFireflyData = {
        nodePositions: [new THREE.Vector3(0, 0, 0)],
        nodeBiographyWeights: [0.5],
        nodeEventTypes: [['birth']],
      };
      const { uniforms } = createEventFireflies(data);

      updateEventFirefliesTime(uniforms, 1.0);
      expect(uniforms.uTime.value).toBe(1.0);
      updateEventFirefliesTime(uniforms, 7.5);
      expect(uniforms.uTime.value).toBe(7.5);
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

  describe('Enhanced visual effects (Phase 9.4)', () => {
    const baseData: EventFireflyData = {
      nodePositions: [new THREE.Vector3(0, 0, 0)],
      nodeBiographyWeights: [0.5],
      nodeEventTypes: [['birth']],
    };

    it('should enable enhanced mode by default', () => {
      const { uniforms } = createEventFireflies(baseData);
      // Enhanced mode enabled by default means divine spark uniform should be present
      expect(uniforms.uDivineSparkIntensity).toBeDefined();
    });

    it('should have default divine spark intensity of 0.8 when using defaults', () => {
      const { uniforms } = createEventFireflies(baseData);
      expect(uniforms.uDivineSparkIntensity?.value).toBe(0.8);
    });

    it('should accept custom divine spark intensity', () => {
      const config: EventFireflyConfig = {
        divineSparkIntensity: 1.0,
      };
      const { uniforms } = createEventFireflies(baseData, config);
      expect(uniforms.uDivineSparkIntensity?.value).toBe(1.0);
    });

    it('should allow disabling enhanced mode explicitly', () => {
      const config: EventFireflyConfig = { enhancedMode: false };
      const { uniforms } = createEventFireflies(baseData, config);
      expect(uniforms.uDivineSparkIntensity).toBeUndefined();
    });
  });
});
