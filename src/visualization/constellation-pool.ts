/**
 * Constellation Pool
 *
 * Specialized pool for constellation nodes that wraps InstancePool with
 * constellation-specific functionality. Manages either ghost or biography
 * nodes with their respective materials and attributes.
 */
import * as THREE from 'three';
import { InstancePool, type InstancePoolConfig } from './instance-pool';
import {
  createGhostNodeMaterial,
  type GhostNodeMaterialUniforms,
} from './materials/ghost-node-material';
import {
  createTSLCloudMaterial,
  type TSLCloudMaterialUniforms,
} from './materials/tsl-cloud-material';
import { SELECTION_STATE, getRandomColorIndex } from './materials/palette';

/**
 * Pool type - determines material and behavior
 */
export type ConstellationPoolType = 'ghost' | 'biography';

/**
 * Configuration for constellation pool
 */
export interface ConstellationPoolConfig extends InstancePoolConfig {
  /** Base sphere radius (default: 2) */
  sphereRadius?: number;
  /** Sphere geometry segments (default: 32 for biography, 24 for ghost) */
  sphereSegments?: number;
  /** Base scale for nodes (default: 0.7 for ghost, 1.0 for biography) */
  baseScale?: number;
  /** Scale multiplier for biography weight (biography only, default: 2.5) */
  scaleMultiplier?: number;
  /** Initial capacity (default: estimated from initial data + headroom) */
  initialCapacity?: number;
}

/**
 * Node data for adding to pool
 */
export interface ConstellationNodeData {
  id: string;
  position: THREE.Vector3;
  biographyWeight?: number;
  colorIndex?: number;
}

/**
 * Result of creating a constellation pool
 */
export interface ConstellationPoolResult {
  pool: ConstellationPool;
  uniforms: GhostNodeMaterialUniforms | TSLCloudMaterialUniforms;
}

const DEFAULT_GHOST_CONFIG = {
  sphereRadius: 2,
  sphereSegments: 24,
  baseScale: 0.7,
  headroom: 20,
};

const DEFAULT_BIOGRAPHY_CONFIG = {
  sphereRadius: 2,
  sphereSegments: 32,
  baseScale: 1.0,
  scaleMultiplier: 2.5,
  headroom: 20,
};

/**
 * ConstellationPool - Manages a pool of constellation nodes
 */
export class ConstellationPool {
  private _pool: InstancePool;
  private _type: ConstellationPoolType;
  private _uniforms: GhostNodeMaterialUniforms | TSLCloudMaterialUniforms;
  private _baseScale: number;
  private _scaleMultiplier: number;
  private _biographyWeights: Map<string, number>;
  private _colorIndices: Map<string, number>;

  private constructor(
    pool: InstancePool,
    type: ConstellationPoolType,
    uniforms: GhostNodeMaterialUniforms | TSLCloudMaterialUniforms,
    baseScale: number,
    scaleMultiplier: number
  ) {
    this._pool = pool;
    this._type = type;
    this._uniforms = uniforms;
    this._baseScale = baseScale;
    this._scaleMultiplier = scaleMultiplier;
    this._biographyWeights = new Map();
    this._colorIndices = new Map();
  }

  /**
   * Create a ghost constellation pool
   */
  public static createGhostPool(
    initialNodes: ConstellationNodeData[],
    config: ConstellationPoolConfig = {}
  ): ConstellationPoolResult {
    const {
      sphereRadius = DEFAULT_GHOST_CONFIG.sphereRadius,
      sphereSegments = DEFAULT_GHOST_CONFIG.sphereSegments,
      baseScale = DEFAULT_GHOST_CONFIG.baseScale,
      headroom = DEFAULT_GHOST_CONFIG.headroom,
    } = config;

    const capacity = config.initialCapacity ?? initialNodes.length + headroom;
    const geometry = new THREE.SphereGeometry(sphereRadius, sphereSegments, sphereSegments);

    // Create attributes with full capacity
    const selectionStateAttr = new THREE.InstancedBufferAttribute(
      new Float32Array(capacity),
      1
    );
    selectionStateAttr.array.fill(SELECTION_STATE.NONE);
    geometry.setAttribute('aSelectionState', selectionStateAttr);

    const pulseIntensityAttr = new THREE.InstancedBufferAttribute(
      new Float32Array(capacity),
      1
    );
    geometry.setAttribute('aPulseIntensity', pulseIntensityAttr);

    const transitionProgressAttr = new THREE.InstancedBufferAttribute(
      new Float32Array(capacity),
      1
    );
    geometry.setAttribute('aTransitionProgress', transitionProgressAttr);

    const biographyWeightAttr = new THREE.InstancedBufferAttribute(
      new Float32Array(capacity),
      1
    );
    geometry.setAttribute('aBiographyWeight', biographyWeightAttr);

    // Create material
    const { material, uniforms } = createGhostNodeMaterial({ transitionEnabled: true });

    // Create mesh with full capacity
    const mesh = new THREE.InstancedMesh(geometry, material, capacity);
    mesh.count = 0; // Will be set by pool

    // Set initial instance matrices
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3(baseScale, baseScale, baseScale);

    for (let i = 0; i < initialNodes.length; i++) {
      const node = initialNodes[i]!;
      position.copy(node.position);
      quaternion.identity();
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;

    // Store person IDs
    mesh.userData.personIds = initialNodes.map((n) => n.id);

    // Create pool
    const pool = new InstancePool(
      mesh,
      initialNodes.map((n) => n.id),
      { headroom }
    );

    // Track attributes
    pool.trackAttribute('selectionState', selectionStateAttr, SELECTION_STATE.NONE);
    pool.trackAttribute('pulseIntensity', pulseIntensityAttr, 0);
    pool.trackAttribute('transitionProgress', transitionProgressAttr, 0);
    pool.trackAttribute('biographyWeight', biographyWeightAttr, 0);

    const constellationPool = new ConstellationPool(
      pool,
      'ghost',
      uniforms,
      baseScale,
      0 // Ghost nodes don't use scale multiplier
    );

    return { pool: constellationPool, uniforms };
  }

  /**
   * Create a biography constellation pool
   */
  public static createBiographyPool(
    initialNodes: ConstellationNodeData[],
    config: ConstellationPoolConfig = {}
  ): ConstellationPoolResult {
    const {
      sphereRadius = DEFAULT_BIOGRAPHY_CONFIG.sphereRadius,
      sphereSegments = DEFAULT_BIOGRAPHY_CONFIG.sphereSegments,
      baseScale = DEFAULT_BIOGRAPHY_CONFIG.baseScale,
      scaleMultiplier = DEFAULT_BIOGRAPHY_CONFIG.scaleMultiplier,
      headroom = DEFAULT_BIOGRAPHY_CONFIG.headroom,
    } = config;

    const capacity = config.initialCapacity ?? initialNodes.length + headroom;
    const geometry = new THREE.SphereGeometry(sphereRadius, sphereSegments, sphereSegments);

    // Create attributes with full capacity
    const biographyWeightAttr = new THREE.InstancedBufferAttribute(
      new Float32Array(capacity),
      1
    );
    geometry.setAttribute('aBiographyWeight', biographyWeightAttr);

    const selectionStateAttr = new THREE.InstancedBufferAttribute(
      new Float32Array(capacity),
      1
    );
    selectionStateAttr.array.fill(SELECTION_STATE.NONE);
    geometry.setAttribute('aSelectionState', selectionStateAttr);

    const colorIndexAttr = new THREE.InstancedBufferAttribute(
      new Float32Array(capacity),
      1
    );
    geometry.setAttribute('aColorIndex', colorIndexAttr);

    const pulseIntensityAttr = new THREE.InstancedBufferAttribute(
      new Float32Array(capacity),
      1
    );
    geometry.setAttribute('aPulseIntensity', pulseIntensityAttr);

    // Create material
    const { material, uniforms } = createTSLCloudMaterial({
      flowSpeed: 0.4,
      cloudDensity: 1.0,
      usePaletteColors: true,
      selectionGlowEnabled: true,
      baseGlowIntensity: 0.1,
      selectedGlowMultiplier: 40.0,
      connectedGlowMultiplier: 6.0,
    });

    // Create mesh with full capacity
    const mesh = new THREE.InstancedMesh(geometry, material, capacity);
    mesh.count = 0; // Will be set by pool

    // Set initial instance matrices and attributes
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    const biographyWeightArray = biographyWeightAttr.array as Float32Array;
    const colorIndexArray = colorIndexAttr.array as Float32Array;

    for (let i = 0; i < initialNodes.length; i++) {
      const node = initialNodes[i]!;
      const weight = node.biographyWeight ?? 0;
      const nodeScale = baseScale + weight * scaleMultiplier;

      position.copy(node.position);
      quaternion.identity();
      scale.set(nodeScale, nodeScale, nodeScale);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(i, matrix);

      biographyWeightArray[i] = weight;
      colorIndexArray[i] = node.colorIndex ?? getRandomColorIndex();
    }
    mesh.instanceMatrix.needsUpdate = true;
    biographyWeightAttr.needsUpdate = true;
    colorIndexAttr.needsUpdate = true;

    // Store person IDs
    mesh.userData.personIds = initialNodes.map((n) => n.id);

    // Create pool
    const pool = new InstancePool(
      mesh,
      initialNodes.map((n) => n.id),
      { headroom }
    );

    // Track attributes
    pool.trackAttribute('biographyWeight', biographyWeightAttr, 0);
    pool.trackAttribute('selectionState', selectionStateAttr, SELECTION_STATE.NONE);
    pool.trackAttribute('colorIndex', colorIndexAttr, 0);
    pool.trackAttribute('pulseIntensity', pulseIntensityAttr, 0);

    const constellationPool = new ConstellationPool(
      pool,
      'biography',
      uniforms,
      baseScale,
      scaleMultiplier
    );

    // Store weights and colors for reference
    for (const node of initialNodes) {
      constellationPool._biographyWeights.set(node.id, node.biographyWeight ?? 0);
      constellationPool._colorIndices.set(node.id, node.colorIndex ?? getRandomColorIndex());
    }

    return { pool: constellationPool, uniforms };
  }

  /**
   * Get the underlying InstancePool
   */
  public get instancePool(): InstancePool {
    return this._pool;
  }

  /**
   * Get the mesh
   */
  public get mesh(): THREE.InstancedMesh {
    return this._pool.mesh;
  }

  /**
   * Get the uniforms
   */
  public get uniforms(): GhostNodeMaterialUniforms | TSLCloudMaterialUniforms {
    return this._uniforms;
  }

  /**
   * Get pool type
   */
  public get type(): ConstellationPoolType {
    return this._type;
  }

  /**
   * Get active count
   */
  public get activeCount(): number {
    return this._pool.activeCount;
  }

  /**
   * Check if ID exists in pool
   */
  public hasId(id: string): boolean {
    return this._pool.hasId(id);
  }

  /**
   * Get index for ID
   */
  public getIndex(id: string): number {
    return this._pool.getIndex(id);
  }

  /**
   * Get all active IDs
   */
  public getActiveIds(): string[] {
    return this._pool.getActiveIds();
  }

  /**
   * Add a node to the pool
   */
  public addNode(data: ConstellationNodeData): number {
    const weight = data.biographyWeight ?? 0;
    const scale = this._type === 'biography'
      ? this._baseScale + weight * this._scaleMultiplier
      : this._baseScale;

    const index = this._pool.addInstance(data.id, data.position, scale);
    if (index < 0) return -1;

    if (this._type === 'biography') {
      // Set biography-specific attributes
      this._pool.setAttributeValueByIndex('biographyWeight', index, weight);
      const colorIndex = data.colorIndex ?? getRandomColorIndex();
      this._pool.setAttributeValueByIndex('colorIndex', index, colorIndex);
      this._biographyWeights.set(data.id, weight);
      this._colorIndices.set(data.id, colorIndex);
    }

    // Update personIds in userData
    this._pool.mesh.userData.personIds = this._pool.getActiveIds();

    return index;
  }

  /**
   * Remove a node from the pool
   */
  public removeNode(id: string): boolean {
    const result = this._pool.removeInstance(id);
    if (result) {
      this._biographyWeights.delete(id);
      this._colorIndices.delete(id);
      // Update personIds in userData
      this._pool.mesh.userData.personIds = this._pool.getActiveIds();
    }
    return result;
  }

  /**
   * Get node position
   */
  public getNodePosition(id: string): THREE.Vector3 | null {
    return this._pool.getPosition(id);
  }

  /**
   * Set node scale (for animations)
   */
  public setNodeScale(id: string, scale: number): boolean {
    return this._pool.setScale(id, scale);
  }

  /**
   * Set node scale by index (for animation loops)
   */
  public setNodeScaleByIndex(index: number, scale: number): void {
    this._pool.setScaleByIndex(index, scale);
  }

  /**
   * Update selection state for all nodes
   */
  public updateSelectionState(
    selectedId: string | null,
    connectedIds: string[]
  ): void {
    // Reset all
    this._pool.resetAttribute('selectionState');

    // Set connected
    for (const id of connectedIds) {
      this._pool.setAttributeValue('selectionState', id, SELECTION_STATE.CONNECTED);
    }

    // Set selected (overwrites if also in connected)
    if (selectedId) {
      this._pool.setAttributeValue('selectionState', selectedId, SELECTION_STATE.SELECTED);
    }
  }

  /**
   * Update pulse intensity for nodes
   */
  public updatePulseIntensity(intensities: Map<string, number>): void {
    this._pool.resetAttribute('pulseIntensity');
    for (const [id, intensity] of intensities) {
      if (intensity > 0) {
        this._pool.setAttributeValue('pulseIntensity', id, intensity);
      }
    }
  }

  /**
   * Set transition progress for a ghost node
   */
  public setTransitionProgress(id: string, progress: number): boolean {
    if (this._type !== 'ghost') return false;
    return this._pool.setAttributeValue('transitionProgress', id, progress);
  }

  /**
   * Reset all transition progress values
   */
  public resetTransitionProgress(): void {
    if (this._type !== 'ghost') return;
    this._pool.resetAttribute('transitionProgress');
  }

  /**
   * Dispose of pool resources
   */
  public dispose(): void {
    this._pool.dispose();
    this._biographyWeights.clear();
    this._colorIndices.clear();
  }
}
