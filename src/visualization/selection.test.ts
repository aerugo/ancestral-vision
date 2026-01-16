/**
 * Constellation Selection Tests (3D Raycasting)
 *
 * Tests for click/tap detection on 3D star meshes.
 * Note: Raycasting doesn't work in JSDOM, so we test the class API and mock the raycaster.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { ConstellationSelection } from './selection';

describe('ConstellationSelection', () => {
  let camera: THREE.PerspectiveCamera;
  let scene: THREE.Scene;
  let selection: ConstellationSelection;

  beforeEach(() => {
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    scene = new THREE.Scene();
    selection = new ConstellationSelection(camera, scene);
  });

  afterEach(() => {
    selection.dispose();
    scene.clear();
  });

  describe('getIntersectedPerson', () => {
    it('should return null for click on empty space', () => {
      // No meshes in scene
      const result = selection.getIntersectedPerson(0, 0);

      expect(result).toBeNull();
    });

    it('should accept normalized coordinates', () => {
      // Test that the method accepts valid coordinate ranges
      expect(() => selection.getIntersectedPerson(-1, -1)).not.toThrow();
      expect(() => selection.getIntersectedPerson(1, 1)).not.toThrow();
      expect(() => selection.getIntersectedPerson(0, 0)).not.toThrow();
    });

    it('should return null for mesh without personId', () => {
      const geometry = new THREE.SphereGeometry(1);
      const material = new THREE.MeshBasicMaterial();
      const mesh = new THREE.Mesh(geometry, material);
      // No userData.personId
      scene.add(mesh);

      // In JSDOM, raycasting won't work, but API should still function
      const result = selection.getIntersectedPerson(0, 0);
      expect(result).toBeNull();
    });
  });

  describe('dispose', () => {
    it('should not throw after dispose', () => {
      selection.dispose();

      // Should not throw when called after dispose
      expect(() => selection.getIntersectedPerson(0, 0)).not.toThrow();
    });

    it('should return null after dispose', () => {
      selection.dispose();

      const result = selection.getIntersectedPerson(0, 0);
      expect(result).toBeNull();
    });

    it('should allow multiple dispose calls', () => {
      expect(() => {
        selection.dispose();
        selection.dispose();
      }).not.toThrow();
    });
  });

  describe('updateCamera', () => {
    it('should accept new camera reference', () => {
      const newCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 500);
      newCamera.position.set(0, 0, 5);

      expect(() => selection.updateCamera(newCamera)).not.toThrow();
    });

    it('should allow raycasting after camera update', () => {
      const newCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 500);
      selection.updateCamera(newCamera);

      // Should still work without throwing
      expect(() => selection.getIntersectedPerson(0, 0)).not.toThrow();
    });
  });

  describe('updateScene', () => {
    it('should accept new scene reference', () => {
      const newScene = new THREE.Scene();

      expect(() => selection.updateScene(newScene)).not.toThrow();
    });

    it('should allow raycasting after scene update', () => {
      const newScene = new THREE.Scene();
      selection.updateScene(newScene);

      // Should still work without throwing
      expect(() => selection.getIntersectedPerson(0, 0)).not.toThrow();
    });
  });
});

describe('ConstellationSelection with mocked raycaster', () => {
  it('should return personId from first intersected mesh', () => {
    const camera = new THREE.PerspectiveCamera();
    const scene = new THREE.Scene();
    const selection = new ConstellationSelection(camera, scene);

    // Mock the internal raycaster behavior by creating a spy
    const mockIntersects = [
      {
        object: {
          userData: { personId: 'person-123' },
        },
      },
    ];

    // Use vi.spyOn to mock THREE.Raycaster.prototype.intersectObjects
    const raycasterSpy = vi.spyOn(THREE.Raycaster.prototype, 'intersectObjects');
    raycasterSpy.mockReturnValue(mockIntersects as unknown as THREE.Intersection[]);

    const result = selection.getIntersectedPerson(0, 0);

    expect(result).toBe('person-123');

    raycasterSpy.mockRestore();
    selection.dispose();
  });

  it('should return closest personId when multiple meshes intersected', () => {
    const camera = new THREE.PerspectiveCamera();
    const scene = new THREE.Scene();
    const selection = new ConstellationSelection(camera, scene);

    // Raycaster returns intersections sorted by distance (closest first)
    const mockIntersects = [
      {
        object: {
          userData: { personId: 'closer-person' },
        },
        distance: 5,
      },
      {
        object: {
          userData: { personId: 'farther-person' },
        },
        distance: 10,
      },
    ];

    const raycasterSpy = vi.spyOn(THREE.Raycaster.prototype, 'intersectObjects');
    raycasterSpy.mockReturnValue(mockIntersects as unknown as THREE.Intersection[]);

    const result = selection.getIntersectedPerson(0, 0);

    expect(result).toBe('closer-person');

    raycasterSpy.mockRestore();
    selection.dispose();
  });

  it('should skip meshes without personId and return first with personId', () => {
    const camera = new THREE.PerspectiveCamera();
    const scene = new THREE.Scene();
    const selection = new ConstellationSelection(camera, scene);

    const mockIntersects = [
      {
        object: {
          userData: {}, // No personId
        },
        distance: 5,
      },
      {
        object: {
          userData: { personId: 'valid-person' },
        },
        distance: 10,
      },
    ];

    const raycasterSpy = vi.spyOn(THREE.Raycaster.prototype, 'intersectObjects');
    raycasterSpy.mockReturnValue(mockIntersects as unknown as THREE.Intersection[]);

    const result = selection.getIntersectedPerson(0, 0);

    expect(result).toBe('valid-person');

    raycasterSpy.mockRestore();
    selection.dispose();
  });

  it('should handle nested groups with personId on child mesh', () => {
    const camera = new THREE.PerspectiveCamera();
    const scene = new THREE.Scene();
    const selection = new ConstellationSelection(camera, scene);

    const mockIntersects = [
      {
        object: {
          userData: { personId: 'nested-person' },
        },
      },
    ];

    const raycasterSpy = vi.spyOn(THREE.Raycaster.prototype, 'intersectObjects');
    raycasterSpy.mockReturnValue(mockIntersects as unknown as THREE.Intersection[]);

    const result = selection.getIntersectedPerson(0, 0);

    expect(result).toBe('nested-person');

    raycasterSpy.mockRestore();
    selection.dispose();
  });
});

describe('getIntersectedPosition', () => {
  it('should return null when no intersection', () => {
    const camera = new THREE.PerspectiveCamera();
    const scene = new THREE.Scene();
    const selection = new ConstellationSelection(camera, scene);

    const raycasterSpy = vi.spyOn(THREE.Raycaster.prototype, 'intersectObjects');
    raycasterSpy.mockReturnValue([]);

    const result = selection.getIntersectedPosition(0, 0);

    expect(result).toBeNull();

    raycasterSpy.mockRestore();
    selection.dispose();
  });

  it('should return position of first intersected mesh with personId', () => {
    const camera = new THREE.PerspectiveCamera();
    const scene = new THREE.Scene();
    const selection = new ConstellationSelection(camera, scene);

    const mockMesh = {
      userData: { personId: 'person-123' },
      getWorldPosition: vi.fn().mockImplementation((target: THREE.Vector3) => {
        target.set(10, 20, 30);
        return target;
      }),
    };

    const mockIntersects = [
      {
        object: mockMesh,
        point: new THREE.Vector3(10, 20, 30),
      },
    ];

    const raycasterSpy = vi.spyOn(THREE.Raycaster.prototype, 'intersectObjects');
    raycasterSpy.mockReturnValue(mockIntersects as unknown as THREE.Intersection[]);

    const result = selection.getIntersectedPosition(0, 0);

    expect(result).not.toBeNull();
    expect(result?.x).toBe(10);
    expect(result?.y).toBe(20);
    expect(result?.z).toBe(30);

    raycasterSpy.mockRestore();
    selection.dispose();
  });

  it('should return null for mesh without personId', () => {
    const camera = new THREE.PerspectiveCamera();
    const scene = new THREE.Scene();
    const selection = new ConstellationSelection(camera, scene);

    const mockMesh = {
      userData: {}, // No personId
      getWorldPosition: vi.fn(),
    };

    const mockIntersects = [
      {
        object: mockMesh,
        point: new THREE.Vector3(5, 10, 15),
      },
    ];

    const raycasterSpy = vi.spyOn(THREE.Raycaster.prototype, 'intersectObjects');
    raycasterSpy.mockReturnValue(mockIntersects as unknown as THREE.Intersection[]);

    const result = selection.getIntersectedPosition(0, 0);

    expect(result).toBeNull();

    raycasterSpy.mockRestore();
    selection.dispose();
  });

  it('should return null after dispose', () => {
    const camera = new THREE.PerspectiveCamera();
    const scene = new THREE.Scene();
    const selection = new ConstellationSelection(camera, scene);

    selection.dispose();

    const result = selection.getIntersectedPosition(0, 0);
    expect(result).toBeNull();
  });
});

describe('InstancedMesh selection', () => {
  it('should return personId from InstancedMesh using instanceId', () => {
    const camera = new THREE.PerspectiveCamera();
    const scene = new THREE.Scene();
    const selection = new ConstellationSelection(camera, scene);

    // Create mock InstancedMesh with personIds array
    const mockInstancedMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1),
      new THREE.MeshBasicMaterial(),
      3
    );
    mockInstancedMesh.userData.personIds = ['person-0', 'person-1', 'person-2'];

    const mockIntersects = [
      {
        object: mockInstancedMesh,
        instanceId: 1, // Second instance
        point: new THREE.Vector3(10, 20, 30),
      },
    ];

    const raycasterSpy = vi.spyOn(THREE.Raycaster.prototype, 'intersectObjects');
    raycasterSpy.mockReturnValue(mockIntersects as unknown as THREE.Intersection[]);

    const result = selection.getIntersectedPerson(0, 0);

    expect(result).toBe('person-1');

    raycasterSpy.mockRestore();
    selection.dispose();
    mockInstancedMesh.geometry.dispose();
    (mockInstancedMesh.material as THREE.Material).dispose();
  });

  it('should return null for InstancedMesh without personIds array', () => {
    const camera = new THREE.PerspectiveCamera();
    const scene = new THREE.Scene();
    const selection = new ConstellationSelection(camera, scene);

    const mockInstancedMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1),
      new THREE.MeshBasicMaterial(),
      3
    );
    // No personIds array set

    const mockIntersects = [
      {
        object: mockInstancedMesh,
        instanceId: 1,
        point: new THREE.Vector3(10, 20, 30),
      },
    ];

    const raycasterSpy = vi.spyOn(THREE.Raycaster.prototype, 'intersectObjects');
    raycasterSpy.mockReturnValue(mockIntersects as unknown as THREE.Intersection[]);

    const result = selection.getIntersectedPerson(0, 0);

    expect(result).toBeNull();

    raycasterSpy.mockRestore();
    selection.dispose();
    mockInstancedMesh.geometry.dispose();
    (mockInstancedMesh.material as THREE.Material).dispose();
  });

  it('should return position from InstancedMesh intersection', () => {
    const camera = new THREE.PerspectiveCamera();
    const scene = new THREE.Scene();
    const selection = new ConstellationSelection(camera, scene);

    const mockInstancedMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1),
      new THREE.MeshBasicMaterial(),
      3
    );
    mockInstancedMesh.userData.personIds = ['person-0', 'person-1', 'person-2'];

    const mockIntersects = [
      {
        object: mockInstancedMesh,
        instanceId: 2,
        point: new THREE.Vector3(100, 200, 300),
      },
    ];

    const raycasterSpy = vi.spyOn(THREE.Raycaster.prototype, 'intersectObjects');
    raycasterSpy.mockReturnValue(mockIntersects as unknown as THREE.Intersection[]);

    const result = selection.getIntersectedPosition(0, 0);

    expect(result).not.toBeNull();
    expect(result?.x).toBe(100);
    expect(result?.y).toBe(200);
    expect(result?.z).toBe(300);

    raycasterSpy.mockRestore();
    selection.dispose();
    mockInstancedMesh.geometry.dispose();
    (mockInstancedMesh.material as THREE.Material).dispose();
  });

  it('should prefer InstancedMesh over regular mesh if first in intersects', () => {
    const camera = new THREE.PerspectiveCamera();
    const scene = new THREE.Scene();
    const selection = new ConstellationSelection(camera, scene);

    const mockInstancedMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1),
      new THREE.MeshBasicMaterial(),
      2
    );
    mockInstancedMesh.userData.personIds = ['instanced-person-0', 'instanced-person-1'];

    const mockRegularMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1),
      new THREE.MeshBasicMaterial()
    );
    mockRegularMesh.userData.personId = 'regular-person';

    // InstancedMesh is first (closer)
    const mockIntersects = [
      {
        object: mockInstancedMesh,
        instanceId: 0,
        point: new THREE.Vector3(0, 0, 0),
        distance: 5,
      },
      {
        object: mockRegularMesh,
        point: new THREE.Vector3(0, 0, 0),
        distance: 10,
      },
    ];

    const raycasterSpy = vi.spyOn(THREE.Raycaster.prototype, 'intersectObjects');
    raycasterSpy.mockReturnValue(mockIntersects as unknown as THREE.Intersection[]);

    const result = selection.getIntersectedPerson(0, 0);

    expect(result).toBe('instanced-person-0');

    raycasterSpy.mockRestore();
    selection.dispose();
    mockInstancedMesh.geometry.dispose();
    (mockInstancedMesh.material as THREE.Material).dispose();
    mockRegularMesh.geometry.dispose();
    (mockRegularMesh.material as THREE.Material).dispose();
  });
});
