/**
 * Constellation Selection (3D Raycasting)
 *
 * Handles click/tap detection on 3D star meshes using Three.js raycasting.
 * Also provides utilities for finding connected nodes in the family graph.
 */
import * as THREE from 'three';

/**
 * Relationship types for finding connected nodes
 */
export interface ParentChildRelation {
  parentId: string;
  childId: string;
}

export interface SpouseRelation {
  person1Id: string;
  person2Id: string;
}

/**
 * Gets all person IDs that are directly connected to the given person.
 * Direct connections include: parents, children, and spouses.
 *
 * @param personId - The ID of the person to find connections for
 * @param parentChildRelations - Array of parent-child relationships
 * @param spouseRelations - Array of spouse relationships
 * @returns Array of connected person IDs (excluding the input personId)
 */
export function getConnectedPersonIds(
  personId: string,
  parentChildRelations: ParentChildRelation[],
  spouseRelations: SpouseRelation[]
): string[] {
  const connected = new Set<string>();

  // Find parents and children
  for (const rel of parentChildRelations) {
    if (rel.parentId === personId) {
      connected.add(rel.childId);
    }
    if (rel.childId === personId) {
      connected.add(rel.parentId);
    }
  }

  // Find spouses
  for (const rel of spouseRelations) {
    if (rel.person1Id === personId) {
      connected.add(rel.person2Id);
    }
    if (rel.person2Id === personId) {
      connected.add(rel.person1Id);
    }
  }

  return Array.from(connected);
}

/**
 * ConstellationSelection - Handles 3D selection via raycasting
 *
 * Detects clicks on star meshes and returns the associated person ID.
 */
export class ConstellationSelection {
  private _raycaster: THREE.Raycaster | null;
  private _camera: THREE.Camera;
  private _scene: THREE.Scene;
  private _isDisposed: boolean = false;

  /**
   * Create a new constellation selection handler
   * @param camera The camera to use for raycasting
   * @param scene The scene containing star meshes
   */
  public constructor(camera: THREE.Camera, scene: THREE.Scene) {
    this._camera = camera;
    this._scene = scene;
    this._raycaster = new THREE.Raycaster();
  }

  /**
   * Get the person ID at the given screen coordinates
   * @param normalizedX X coordinate in normalized device coordinates (-1 to 1)
   * @param normalizedY Y coordinate in normalized device coordinates (-1 to 1)
   * @returns The person ID if a star was clicked, null otherwise
   */
  public getIntersectedPerson(normalizedX: number, normalizedY: number): string | null {
    if (this._isDisposed || !this._raycaster) {
      return null;
    }

    const pointer = new THREE.Vector2(normalizedX, normalizedY);
    this._raycaster.setFromCamera(pointer, this._camera);

    const intersects = this._raycaster.intersectObjects(this._scene.children, true);

    for (const intersect of intersects) {
      // Handle InstancedMesh - use instanceId to look up personId from array
      if (
        intersect.object instanceof THREE.InstancedMesh &&
        intersect.instanceId !== undefined
      ) {
        const personIds = intersect.object.userData.personIds as string[] | undefined;
        const personId = personIds?.[intersect.instanceId];
        if (personId) {
          return personId;
        }
      }

      // Handle regular mesh - check userData.personId directly
      const personId = intersect.object.userData.personId as string | undefined;
      if (personId) {
        return personId;
      }
    }

    return null;
  }

  /**
   * Get the world position of the intersected mesh at the given screen coordinates
   * @param normalizedX X coordinate in normalized device coordinates (-1 to 1)
   * @param normalizedY Y coordinate in normalized device coordinates (-1 to 1)
   * @returns The world position {x, y, z} if a star was clicked, null otherwise
   */
  public getIntersectedPosition(
    normalizedX: number,
    normalizedY: number
  ): { x: number; y: number; z: number } | null {
    if (this._isDisposed || !this._raycaster) {
      return null;
    }

    const pointer = new THREE.Vector2(normalizedX, normalizedY);
    this._raycaster.setFromCamera(pointer, this._camera);

    const intersects = this._raycaster.intersectObjects(this._scene.children, true);

    for (const intersect of intersects) {
      // Handle InstancedMesh - use instanceId to check if valid instance
      if (
        intersect.object instanceof THREE.InstancedMesh &&
        intersect.instanceId !== undefined
      ) {
        const personIds = intersect.object.userData.personIds as string[] | undefined;
        if (personIds && personIds[intersect.instanceId]) {
          // Return the intersection point in world coordinates
          return {
            x: intersect.point.x,
            y: intersect.point.y,
            z: intersect.point.z,
          };
        }
      }

      // Handle regular mesh - check userData.personId directly
      const personId = intersect.object.userData.personId as string | undefined;
      if (personId) {
        // Return the intersection point in world coordinates
        return {
          x: intersect.point.x,
          y: intersect.point.y,
          z: intersect.point.z,
        };
      }
    }

    return null;
  }

  /**
   * Update the camera reference
   * @param camera The new camera to use
   */
  public updateCamera(camera: THREE.Camera): void {
    this._camera = camera;
  }

  /**
   * Update the scene reference
   * @param scene The new scene to use
   */
  public updateScene(scene: THREE.Scene): void {
    this._scene = scene;
  }

  /**
   * Clean up resources (INV-A009: Scene Cleanup on Unmount)
   */
  public dispose(): void {
    this._isDisposed = true;
    this._raycaster = null;
  }
}
