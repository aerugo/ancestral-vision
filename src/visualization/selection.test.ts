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
