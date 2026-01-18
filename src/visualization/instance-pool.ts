/**
 * Instance Pool
 *
 * A game engine-style pooled instance manager for Three.js InstancedMesh.
 * Pre-allocates instances with extra capacity and supports dynamic add/remove
 * without recreating the mesh.
 *
 * Key features:
 * - Pre-allocation with configurable headroom
 * - O(1) add operation (append to end)
 * - O(1) remove operation (swap with last, decrement count)
 * - Automatic buffer updates
 * - ID-to-index mapping for fast lookups
 */
import * as THREE from 'three';

/**
 * Configuration for instance pool
 */
export interface InstancePoolConfig {
  /** Extra capacity beyond initial count (default: 20) */
  headroom?: number;
  /** Maximum capacity multiplier if headroom exhausted (default: 1.5) */
  growthFactor?: number;
}

const DEFAULT_CONFIG: Required<InstancePoolConfig> = {
  headroom: 20,
  growthFactor: 1.5,
};

/**
 * Tracked per-instance attribute
 */
export interface TrackedAttribute {
  /** The buffer attribute */
  attribute: THREE.InstancedBufferAttribute;
  /** Default value for new instances */
  defaultValue: number;
  /** Components per instance (1 for float, 3 for vec3, etc.) */
  itemSize: number;
}

/**
 * InstancePool - Manages a pool of instances with dynamic add/remove
 */
export class InstancePool {
  private _mesh: THREE.InstancedMesh;
  private _capacity: number;
  private _activeCount: number;
  private _idToIndex: Map<string, number>;
  private _indexToId: string[];
  private _trackedAttributes: Map<string, TrackedAttribute>;
  private _config: Required<InstancePoolConfig>;

  // Reusable objects for matrix operations
  private readonly _matrix = new THREE.Matrix4();
  private readonly _position = new THREE.Vector3();
  private readonly _quaternion = new THREE.Quaternion();
  private readonly _scale = new THREE.Vector3();

  /**
   * Create a new instance pool
   * @param mesh - The InstancedMesh to manage (should be created with max capacity)
   * @param initialIds - Initial instance IDs in order
   * @param config - Pool configuration
   */
  public constructor(
    mesh: THREE.InstancedMesh,
    initialIds: string[],
    config: InstancePoolConfig = {}
  ) {
    this._config = { ...DEFAULT_CONFIG, ...config };
    this._mesh = mesh;
    this._capacity = mesh.count; // The mesh was created with full capacity
    this._activeCount = initialIds.length;
    this._idToIndex = new Map();
    this._indexToId = [...initialIds];
    this._trackedAttributes = new Map();

    // Build ID to index mapping
    for (let i = 0; i < initialIds.length; i++) {
      const id = initialIds[i];
      if (id) {
        this._idToIndex.set(id, i);
      }
    }

    // Set mesh.count to only render active instances
    mesh.count = this._activeCount;
  }

  /**
   * Get the managed mesh
   */
  public get mesh(): THREE.InstancedMesh {
    return this._mesh;
  }

  /**
   * Get current active instance count
   */
  public get activeCount(): number {
    return this._activeCount;
  }

  /**
   * Get total capacity
   */
  public get capacity(): number {
    return this._capacity;
  }

  /**
   * Get remaining capacity for new instances
   */
  public get availableSlots(): number {
    return this._capacity - this._activeCount;
  }

  /**
   * Check if an ID exists in the pool
   */
  public hasId(id: string): boolean {
    return this._idToIndex.has(id);
  }

  /**
   * Get the index for an ID
   * @returns Index or -1 if not found
   */
  public getIndex(id: string): number {
    return this._idToIndex.get(id) ?? -1;
  }

  /**
   * Get the ID at an index
   */
  public getId(index: number): string | undefined {
    return this._indexToId[index];
  }

  /**
   * Get all active IDs
   */
  public getActiveIds(): string[] {
    return this._indexToId.slice(0, this._activeCount);
  }

  /**
   * Track an attribute for automatic updates during add/remove/swap
   */
  public trackAttribute(
    name: string,
    attribute: THREE.InstancedBufferAttribute,
    defaultValue: number = 0
  ): void {
    this._trackedAttributes.set(name, {
      attribute,
      defaultValue,
      itemSize: attribute.itemSize,
    });
  }

  /**
   * Get a tracked attribute by name
   */
  public getAttribute(name: string): THREE.InstancedBufferAttribute | undefined {
    return this._trackedAttributes.get(name)?.attribute;
  }

  /**
   * Add a new instance to the pool
   * @param id - Unique identifier for this instance
   * @param position - World position
   * @param scale - Uniform scale (default: 1)
   * @returns Index of the new instance, or -1 if pool is full
   */
  public addInstance(
    id: string,
    position: THREE.Vector3,
    scale: number = 1
  ): number {
    // Check if already exists
    if (this._idToIndex.has(id)) {
      console.warn(`[InstancePool] Instance ${id} already exists`);
      return this._idToIndex.get(id)!;
    }

    // Check capacity
    if (this._activeCount >= this._capacity) {
      console.warn(`[InstancePool] Pool is full (capacity: ${this._capacity})`);
      return -1;
    }

    const index = this._activeCount;

    // Set matrix
    this._position.copy(position);
    this._quaternion.identity();
    this._scale.set(scale, scale, scale);
    this._matrix.compose(this._position, this._quaternion, this._scale);
    this._mesh.setMatrixAt(index, this._matrix);
    this._mesh.instanceMatrix.needsUpdate = true;

    // Set default values for tracked attributes
    for (const [, tracked] of this._trackedAttributes) {
      const arr = tracked.attribute.array as Float32Array;
      const baseIdx = index * tracked.itemSize;
      for (let c = 0; c < tracked.itemSize; c++) {
        arr[baseIdx + c] = tracked.defaultValue;
      }
      tracked.attribute.needsUpdate = true;
    }

    // Update mappings
    this._idToIndex.set(id, index);
    this._indexToId[index] = id;
    this._activeCount++;
    this._mesh.count = this._activeCount;

    return index;
  }

  /**
   * Remove an instance from the pool using swap-and-pop
   * @param id - ID of instance to remove
   * @returns true if removed, false if not found
   */
  public removeInstance(id: string): boolean {
    const index = this._idToIndex.get(id);
    if (index === undefined) {
      return false;
    }

    const lastIndex = this._activeCount - 1;

    // If not the last instance, swap with last
    if (index !== lastIndex) {
      const lastId = this._indexToId[lastIndex];
      if (lastId === undefined) {
        console.error('[InstancePool] Last index has no ID');
        return false;
      }

      // Copy last instance's matrix to this slot
      this._mesh.getMatrixAt(lastIndex, this._matrix);
      this._mesh.setMatrixAt(index, this._matrix);

      // Copy last instance's attribute values to this slot
      for (const [, tracked] of this._trackedAttributes) {
        const arr = tracked.attribute.array as Float32Array;
        const srcBase = lastIndex * tracked.itemSize;
        const dstBase = index * tracked.itemSize;
        for (let c = 0; c < tracked.itemSize; c++) {
          arr[dstBase + c] = arr[srcBase + c]!;
        }
        tracked.attribute.needsUpdate = true;
      }

      // Update mappings for swapped instance
      this._idToIndex.set(lastId, index);
      this._indexToId[index] = lastId;
    }

    // Remove the instance
    this._idToIndex.delete(id);
    this._indexToId.length = lastIndex; // Truncate array
    this._activeCount--;
    this._mesh.count = this._activeCount;
    this._mesh.instanceMatrix.needsUpdate = true;

    return true;
  }

  /**
   * Update instance position
   */
  public setPosition(id: string, position: THREE.Vector3): boolean {
    const index = this._idToIndex.get(id);
    if (index === undefined) return false;

    this._mesh.getMatrixAt(index, this._matrix);
    this._matrix.decompose(this._position, this._quaternion, this._scale);
    this._position.copy(position);
    this._matrix.compose(this._position, this._quaternion, this._scale);
    this._mesh.setMatrixAt(index, this._matrix);
    this._mesh.instanceMatrix.needsUpdate = true;

    return true;
  }

  /**
   * Update instance scale
   */
  public setScale(id: string, scale: number): boolean {
    const index = this._idToIndex.get(id);
    if (index === undefined) return false;

    this._mesh.getMatrixAt(index, this._matrix);
    this._matrix.decompose(this._position, this._quaternion, this._scale);
    this._scale.set(scale, scale, scale);
    this._matrix.compose(this._position, this._quaternion, this._scale);
    this._mesh.setMatrixAt(index, this._matrix);
    this._mesh.instanceMatrix.needsUpdate = true;

    return true;
  }

  /**
   * Update instance scale by index (for animation loops)
   */
  public setScaleByIndex(index: number, scale: number): void {
    if (index < 0 || index >= this._activeCount) return;

    this._mesh.getMatrixAt(index, this._matrix);
    this._matrix.decompose(this._position, this._quaternion, this._scale);
    this._scale.set(scale, scale, scale);
    this._matrix.compose(this._position, this._quaternion, this._scale);
    this._mesh.setMatrixAt(index, this._matrix);
    this._mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Get instance position
   */
  public getPosition(id: string): THREE.Vector3 | null {
    const index = this._idToIndex.get(id);
    if (index === undefined) return null;

    this._mesh.getMatrixAt(index, this._matrix);
    this._matrix.decompose(this._position, this._quaternion, this._scale);
    return this._position.clone();
  }

  /**
   * Get instance position by index
   */
  public getPositionByIndex(index: number): THREE.Vector3 | null {
    if (index < 0 || index >= this._activeCount) return null;

    this._mesh.getMatrixAt(index, this._matrix);
    this._matrix.decompose(this._position, this._quaternion, this._scale);
    return this._position.clone();
  }

  /**
   * Get instance scale (returns the x component, assuming uniform scale)
   */
  public getScale(id: string): number | null {
    const index = this._idToIndex.get(id);
    if (index === undefined) return null;

    this._mesh.getMatrixAt(index, this._matrix);
    this._matrix.decompose(this._position, this._quaternion, this._scale);
    return this._scale.x;
  }

  /**
   * Set a single-component attribute value for an instance
   */
  public setAttributeValue(
    attributeName: string,
    id: string,
    value: number
  ): boolean {
    const tracked = this._trackedAttributes.get(attributeName);
    const index = this._idToIndex.get(id);
    if (!tracked || index === undefined) return false;

    const arr = tracked.attribute.array as Float32Array;
    arr[index * tracked.itemSize] = value;
    tracked.attribute.needsUpdate = true;
    return true;
  }

  /**
   * Set attribute value by index (for animation loops)
   */
  public setAttributeValueByIndex(
    attributeName: string,
    index: number,
    value: number
  ): void {
    const tracked = this._trackedAttributes.get(attributeName);
    if (!tracked || index < 0 || index >= this._activeCount) return;

    const arr = tracked.attribute.array as Float32Array;
    arr[index * tracked.itemSize] = value;
    tracked.attribute.needsUpdate = true;
  }

  /**
   * Reset all values of an attribute to its default
   */
  public resetAttribute(attributeName: string): void {
    const tracked = this._trackedAttributes.get(attributeName);
    if (!tracked) return;

    const arr = tracked.attribute.array as Float32Array;
    arr.fill(tracked.defaultValue);
    tracked.attribute.needsUpdate = true;
  }

  /**
   * Dispose of pool resources
   */
  public dispose(): void {
    this._mesh.geometry.dispose();
    if (Array.isArray(this._mesh.material)) {
      this._mesh.material.forEach((m) => m.dispose());
    } else {
      this._mesh.material.dispose();
    }
    this._idToIndex.clear();
    this._indexToId.length = 0;
    this._trackedAttributes.clear();
  }
}
