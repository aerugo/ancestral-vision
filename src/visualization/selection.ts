/**
 * Constellation Selection (3D Raycasting)
 *
 * Handles click/tap detection on 3D star meshes using Three.js raycasting.
 */
import * as THREE from 'three';

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
      const personId = intersect.object.userData.personId as string | undefined;
      if (personId) {
        return personId;
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
