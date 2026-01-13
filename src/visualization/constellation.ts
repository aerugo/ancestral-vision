/**
 * Constellation mesh creation and management
 *
 * Creates 3D representations of people as nodes in the constellation
 */

import * as THREE from 'three';

/**
 * Placeholder person data for visualization
 */
export interface PlaceholderPerson {
  id: string;
  givenName: string;
  position: { x: number; y: number; z: number };
}

/**
 * Node appearance constants
 */
const NODE_RADIUS = 2;
const NODE_SEGMENTS = 32;
const NODE_COLOR = new THREE.Color(0x6366f1); // Indigo
const NODE_EMISSIVE = new THREE.Color(0x4f46e5);
const NODE_EMISSIVE_INTENSITY = 0.3;

/**
 * Create a constellation mesh from an array of people
 *
 * @param people - Array of people to render as nodes
 * @returns THREE.Group containing all person nodes
 */
export function createConstellationMesh(people: PlaceholderPerson[]): THREE.Group {
  const group = new THREE.Group();
  group.name = 'constellation';

  // Create shared geometry (reused for all nodes)
  const geometry = new THREE.SphereGeometry(NODE_RADIUS, NODE_SEGMENTS, NODE_SEGMENTS);

  people.forEach((person) => {
    // Create material per-node to allow individual modifications later
    const material = new THREE.MeshStandardMaterial({
      color: NODE_COLOR,
      emissive: NODE_EMISSIVE,
      emissiveIntensity: NODE_EMISSIVE_INTENSITY,
      metalness: 0.5,
      roughness: 0.5,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(person.position.x, person.position.y, person.position.z);
    mesh.userData = { id: person.id, givenName: person.givenName };
    mesh.name = `person-${person.id}`;

    group.add(mesh);
  });

  return group;
}

/**
 * Update node positions in an existing constellation
 *
 * @param group - The constellation group to update
 * @param people - Updated people data with new positions
 */
export function updateConstellation(
  group: THREE.Group,
  people: PlaceholderPerson[]
): void {
  people.forEach((person) => {
    const mesh = group.getObjectByName(`person-${person.id}`);
    if (mesh) {
      mesh.position.set(person.position.x, person.position.y, person.position.z);
    }
  });
}

/**
 * Generate placeholder people for testing/demo purposes
 *
 * Creates people arranged in a spiral pattern
 *
 * @param count - Number of placeholder people to generate
 * @returns Array of placeholder people with positions
 */
export function generatePlaceholderPeople(count: number): PlaceholderPerson[] {
  const people: PlaceholderPerson[] = [];

  for (let i = 0; i < count; i++) {
    // Arrange in a spiral pattern
    const angle = (i / count) * Math.PI * 4;
    const radius = 20 + i * 2;
    const height = (i % 5) * 10 - 20;

    people.push({
      id: `placeholder-${i}`,
      givenName: `Person ${i + 1}`,
      position: {
        x: Math.cos(angle) * radius,
        y: height,
        z: Math.sin(angle) * radius,
      },
    });
  }

  return people;
}

/**
 * Dispose constellation resources
 *
 * @param group - The constellation group to dispose
 */
export function disposeConstellation(group: THREE.Group): void {
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry?.dispose();
      if (object.material instanceof THREE.Material) {
        object.material.dispose();
      }
    }
  });
  group.clear();
}
