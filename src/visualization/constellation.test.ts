import { describe, it, expect } from 'vitest';
import {
  createConstellationMesh,
  updateConstellation,
  generatePlaceholderPeople,
  type PlaceholderPerson,
} from './constellation';
import * as THREE from 'three';

describe('Constellation', () => {
  describe('createConstellationMesh', () => {
    it('should render placeholder nodes', () => {
      const people: PlaceholderPerson[] = [
        { id: '1', givenName: 'John', position: { x: 0, y: 0, z: 0 } },
        { id: '2', givenName: 'Jane', position: { x: 10, y: 5, z: 0 } },
      ];

      const mesh = createConstellationMesh(people);

      expect(mesh).toBeInstanceOf(THREE.Group);
      expect(mesh.children.length).toBe(2);
    });

    it('should position nodes in 3D space', () => {
      const people: PlaceholderPerson[] = [
        { id: '1', givenName: 'John', position: { x: 5, y: 10, z: 15 } },
      ];

      const mesh = createConstellationMesh(people);
      const node = mesh.children[0]!;

      expect(node.position.x).toBe(5);
      expect(node.position.y).toBe(10);
      expect(node.position.z).toBe(15);
    });

    it('should handle empty data', () => {
      const mesh = createConstellationMesh([]);

      expect(mesh).toBeInstanceOf(THREE.Group);
      expect(mesh.children.length).toBe(0);
    });

    it('should create spherical nodes', () => {
      const people: PlaceholderPerson[] = [
        { id: '1', givenName: 'John', position: { x: 0, y: 0, z: 0 } },
      ];

      const mesh = createConstellationMesh(people);
      const node = mesh.children[0] as THREE.Mesh;

      expect(node).toBeInstanceOf(THREE.Mesh);
      expect(node.geometry).toBeInstanceOf(THREE.SphereGeometry);
    });

    it('should store person data in userData', () => {
      const people: PlaceholderPerson[] = [
        { id: 'person-123', givenName: 'Alice', position: { x: 0, y: 0, z: 0 } },
      ];

      const mesh = createConstellationMesh(people);
      const node = mesh.children[0]!;

      expect(node.userData.personId).toBe('person-123');
      expect(node.userData.givenName).toBe('Alice');
    });

    it('should name nodes for easy lookup', () => {
      const people: PlaceholderPerson[] = [
        { id: 'abc', givenName: 'Bob', position: { x: 0, y: 0, z: 0 } },
      ];

      const mesh = createConstellationMesh(people);
      const node = mesh.getObjectByName('person-abc');

      expect(node).toBeDefined();
    });

    it('should name the group "constellation"', () => {
      const mesh = createConstellationMesh([]);

      expect(mesh.name).toBe('constellation');
    });
  });

  describe('updateConstellation', () => {
    it('should update node positions', () => {
      const people: PlaceholderPerson[] = [
        { id: '1', givenName: 'John', position: { x: 0, y: 0, z: 0 } },
      ];

      const mesh = createConstellationMesh(people);

      updateConstellation(mesh, [
        { id: '1', givenName: 'John', position: { x: 20, y: 30, z: 40 } },
      ]);

      const node = mesh.children[0]!;
      expect(node.position.x).toBe(20);
      expect(node.position.y).toBe(30);
      expect(node.position.z).toBe(40);
    });

    it('should handle non-existent nodes gracefully', () => {
      const mesh = createConstellationMesh([]);

      // Should not throw
      expect(() => {
        updateConstellation(mesh, [
          { id: 'nonexistent', givenName: 'Ghost', position: { x: 0, y: 0, z: 0 } },
        ]);
      }).not.toThrow();
    });

    it('should update multiple nodes', () => {
      const people: PlaceholderPerson[] = [
        { id: '1', givenName: 'Alice', position: { x: 0, y: 0, z: 0 } },
        { id: '2', givenName: 'Bob', position: { x: 0, y: 0, z: 0 } },
      ];

      const mesh = createConstellationMesh(people);

      updateConstellation(mesh, [
        { id: '1', givenName: 'Alice', position: { x: 10, y: 10, z: 10 } },
        { id: '2', givenName: 'Bob', position: { x: -10, y: -10, z: -10 } },
      ]);

      const node1 = mesh.getObjectByName('person-1')!;
      const node2 = mesh.getObjectByName('person-2')!;

      expect(node1.position.x).toBe(10);
      expect(node2.position.x).toBe(-10);
    });
  });

  describe('generatePlaceholderPeople', () => {
    it('should generate specified number of people', () => {
      const people = generatePlaceholderPeople(5);

      expect(people).toHaveLength(5);
    });

    it('should generate people with unique IDs', () => {
      const people = generatePlaceholderPeople(10);
      const ids = people.map((p) => p.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(10);
    });

    it('should generate people with positions', () => {
      const people = generatePlaceholderPeople(3);

      people.forEach((person) => {
        expect(person.position).toBeDefined();
        expect(typeof person.position.x).toBe('number');
        expect(typeof person.position.y).toBe('number');
        expect(typeof person.position.z).toBe('number');
      });
    });

    it('should generate people with given names', () => {
      const people = generatePlaceholderPeople(3);

      people.forEach((person) => {
        expect(person.givenName).toBeDefined();
        expect(person.givenName.length).toBeGreaterThan(0);
      });
    });

    it('should handle zero count', () => {
      const people = generatePlaceholderPeople(0);

      expect(people).toHaveLength(0);
    });
  });
});
