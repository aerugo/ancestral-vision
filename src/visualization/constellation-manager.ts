/**
 * Constellation Manager
 *
 * High-level manager that coordinates ghost and biography node pools.
 * Handles:
 * - Pool initialization from graph data
 * - Incremental updates via data diffing
 * - Ghost-to-biography transitions
 * - Selection and pulse state propagation
 */
import * as THREE from 'three';
import { ConstellationPool, type ConstellationNodeData } from './constellation-pool';
import type { GhostNodeMaterialUniforms } from './materials/ghost-node-material';
import type { TSLCloudMaterialUniforms } from './materials/tsl-cloud-material';
import { updateGhostNodeMaterialTime } from './materials/ghost-node-material';
import { updateTSLCloudMaterialTime } from './materials/tsl-cloud-material';
import { getRandomColorIndex } from './materials/palette';

/**
 * Person data from constellation graph
 */
export interface ConstellationPersonData {
  id: string;
  hasBiography: boolean;
  biographyWeight: number;
  position: THREE.Vector3;
  colorIndex?: number;
}

/**
 * Graph data for constellation initialization/update
 */
export interface ConstellationGraphData {
  people: ConstellationPersonData[];
}

/**
 * Transition state for ghost-to-biography animation
 */
export interface TransitionState {
  personId: string;
  progress: number;
  startPosition: THREE.Vector3;
  targetScale: number;
  colorIndex: number;
  biographyWeight: number;
}

/**
 * Changes detected between graph data updates
 */
export interface GraphChanges {
  /** People added to ghost pool */
  addedGhosts: ConstellationPersonData[];
  /** People added to biography pool */
  addedBiographies: ConstellationPersonData[];
  /** People removed from ghost pool */
  removedGhosts: string[];
  /** People removed from biography pool */
  removedBiographies: string[];
  /** People transitioned from ghost to biography */
  ghostToBiography: ConstellationPersonData[];
  /** People transitioned from biography to ghost (rare) */
  biographyToGhost: ConstellationPersonData[];
}

/**
 * ConstellationManager - Coordinates ghost and biography pools
 */
export class ConstellationManager {
  private _ghostPool: ConstellationPool | null = null;
  private _biographyPool: ConstellationPool | null = null;
  private _ghostUniforms: GhostNodeMaterialUniforms | null = null;
  private _biographyUniforms: TSLCloudMaterialUniforms | null = null;
  private _currentTransition: TransitionState | null = null;
  private _scene: THREE.Scene | null = null;

  // Track all known people for diffing
  private _knownPeople: Map<string, { hasBiography: boolean; position: THREE.Vector3 }> = new Map();

  /**
   * Initialize pools from graph data
   */
  public initialize(scene: THREE.Scene, data: ConstellationGraphData): void {
    this._scene = scene;
    this.dispose(); // Clean up any existing pools

    // Split people by biography status
    const ghostNodes: ConstellationNodeData[] = [];
    const biographyNodes: ConstellationNodeData[] = [];

    for (const person of data.people) {
      const nodeData: ConstellationNodeData = {
        id: person.id,
        position: person.position.clone(),
        biographyWeight: person.biographyWeight,
        colorIndex: person.colorIndex ?? getRandomColorIndex(),
      };

      if (person.hasBiography) {
        biographyNodes.push(nodeData);
      } else {
        ghostNodes.push(nodeData);
      }

      // Track for future diffing
      this._knownPeople.set(person.id, {
        hasBiography: person.hasBiography,
        position: person.position.clone(),
      });
    }

    // Create pools
    if (ghostNodes.length > 0) {
      const { pool, uniforms } = ConstellationPool.createGhostPool(ghostNodes);
      this._ghostPool = pool;
      this._ghostUniforms = uniforms;
      scene.add(pool.mesh);
    }

    if (biographyNodes.length > 0) {
      const { pool, uniforms } = ConstellationPool.createBiographyPool(biographyNodes);
      this._biographyPool = pool;
      this._biographyUniforms = uniforms;
      scene.add(pool.mesh);
    }
  }

  /**
   * Compute changes between current state and new data
   */
  public computeChanges(newData: ConstellationGraphData): GraphChanges {
    const changes: GraphChanges = {
      addedGhosts: [],
      addedBiographies: [],
      removedGhosts: [],
      removedBiographies: [],
      ghostToBiography: [],
      biographyToGhost: [],
    };

    const newPeopleIds = new Set(newData.people.map((p) => p.id));

    // Check for removed people
    for (const [id, info] of this._knownPeople) {
      if (!newPeopleIds.has(id)) {
        if (info.hasBiography) {
          changes.removedBiographies.push(id);
        } else {
          changes.removedGhosts.push(id);
        }
      }
    }

    // Check for added or changed people
    for (const person of newData.people) {
      const known = this._knownPeople.get(person.id);

      if (!known) {
        // New person
        if (person.hasBiography) {
          changes.addedBiographies.push(person);
        } else {
          changes.addedGhosts.push(person);
        }
      } else if (known.hasBiography !== person.hasBiography) {
        // Biography status changed
        if (person.hasBiography) {
          changes.ghostToBiography.push(person);
        } else {
          changes.biographyToGhost.push(person);
        }
      }
    }

    return changes;
  }

  /**
   * Apply changes incrementally (without full rebuild)
   */
  public applyChanges(changes: GraphChanges): void {
    // Remove nodes
    for (const id of changes.removedGhosts) {
      this._ghostPool?.removeNode(id);
      this._knownPeople.delete(id);
    }

    for (const id of changes.removedBiographies) {
      this._biographyPool?.removeNode(id);
      this._knownPeople.delete(id);
    }

    // Add new ghost nodes
    for (const person of changes.addedGhosts) {
      this._ghostPool?.addNode({
        id: person.id,
        position: person.position,
      });
      this._knownPeople.set(person.id, {
        hasBiography: false,
        position: person.position.clone(),
      });
    }

    // Add new biography nodes
    for (const person of changes.addedBiographies) {
      this._biographyPool?.addNode({
        id: person.id,
        position: person.position,
        biographyWeight: person.biographyWeight,
        colorIndex: person.colorIndex,
      });
      this._knownPeople.set(person.id, {
        hasBiography: true,
        position: person.position.clone(),
      });
    }

    // Handle transitions (ghost to biography)
    // Note: These are applied after animation completes via completeTransition()
    // Here we just update tracking
    for (const person of changes.ghostToBiography) {
      this._knownPeople.set(person.id, {
        hasBiography: true,
        position: person.position.clone(),
      });
    }

    for (const person of changes.biographyToGhost) {
      this._knownPeople.set(person.id, {
        hasBiography: false,
        position: person.position.clone(),
      });
    }
  }

  /**
   * Start a ghost-to-biography transition animation
   * Called when user adds a biography to a ghost node
   */
  public startTransition(
    personId: string,
    biographyWeight: number = 0.1,
    colorIndex?: number
  ): TransitionState | null {
    if (!this._ghostPool || !this._biographyPool) {
      return null;
    }

    const position = this._ghostPool.getNodePosition(personId);
    if (!position) {
      console.warn(`[ConstellationManager] Person ${personId} not found in ghost pool`);
      return null;
    }

    const finalColorIndex = colorIndex ?? getRandomColorIndex();
    const targetScale = 1.0 + biographyWeight * 2.5; // baseScale + weight * multiplier

    this._currentTransition = {
      personId,
      progress: 0,
      startPosition: position,
      targetScale,
      colorIndex: finalColorIndex,
      biographyWeight,
    };

    // Add to biography pool immediately at scale 0 (invisible)
    this._biographyPool.addNode({
      id: personId,
      position: position,
      biographyWeight,
      colorIndex: finalColorIndex,
    });
    this._biographyPool.setNodeScale(personId, 0);

    return this._currentTransition;
  }

  /**
   * Update transition animation progress
   * @param progress - Animation progress 0-1
   * @returns The transition state or null if no transition active
   */
  public updateTransition(progress: number): TransitionState | null {
    if (!this._currentTransition) return null;

    this._currentTransition.progress = progress;
    const { personId, targetScale } = this._currentTransition;

    // Shrink ghost node (hide at 15% progress like before)
    if (this._ghostPool && progress <= 0.15) {
      const shrinkProgress = progress / 0.15;
      const ghostScale = 0.7 * (1 - shrinkProgress * 0.8); // 0.7 → 0.14
      this._ghostPool.setNodeScale(personId, ghostScale);
      this._ghostPool.setTransitionProgress(personId, progress * 6);
    } else if (this._ghostPool && progress > 0.15) {
      this._ghostPool.setNodeScale(personId, 0);
    }

    // Grow biography node (starts at 55% progress)
    if (this._biographyPool && progress >= 0.55) {
      const growProgress = Math.min((progress - 0.55) / 0.30, 1);
      // Ease in-out cubic
      const eased = growProgress < 0.5
        ? 4 * growProgress * growProgress * growProgress
        : 1 - Math.pow(-2 * growProgress + 2, 3) / 2;
      const scale = 0.2 * targetScale + eased * 0.8 * targetScale;
      this._biographyPool.setNodeScale(personId, scale);
    }

    return this._currentTransition;
  }

  /**
   * Complete the current transition
   * Removes ghost node and finalizes biography node
   */
  public completeTransition(): void {
    if (!this._currentTransition) return;

    const { personId, targetScale } = this._currentTransition;

    // Remove from ghost pool
    this._ghostPool?.removeNode(personId);
    this._ghostPool?.resetTransitionProgress();

    // Ensure biography node is at final scale
    this._biographyPool?.setNodeScale(personId, targetScale);

    // Update tracking
    this._knownPeople.set(personId, {
      hasBiography: true,
      position: this._currentTransition.startPosition.clone(),
    });

    this._currentTransition = null;
  }

  /**
   * Cancel current transition (revert to ghost state)
   */
  public cancelTransition(): void {
    if (!this._currentTransition) return;

    const { personId } = this._currentTransition;

    // Remove from biography pool
    this._biographyPool?.removeNode(personId);

    // Restore ghost node
    this._ghostPool?.setNodeScale(personId, 0.7);
    this._ghostPool?.setTransitionProgress(personId, 0);
    this._ghostPool?.resetTransitionProgress();

    this._currentTransition = null;
  }

  /**
   * Get current transition state
   */
  public getCurrentTransition(): TransitionState | null {
    return this._currentTransition;
  }

  /**
   * Check if a transition is in progress
   */
  public isTransitioning(): boolean {
    return this._currentTransition !== null;
  }

  /**
   * Update time uniforms for both pools
   */
  public updateTime(time: number): void {
    if (this._ghostUniforms) {
      updateGhostNodeMaterialTime(this._ghostUniforms, time);
    }
    if (this._biographyUniforms) {
      updateTSLCloudMaterialTime(this._biographyUniforms, time);
    }
  }

  /**
   * Update selection state on both pools
   */
  public updateSelectionState(
    selectedId: string | null,
    connectedIds: string[]
  ): void {
    this._ghostPool?.updateSelectionState(selectedId, connectedIds);
    this._biographyPool?.updateSelectionState(selectedId, connectedIds);
  }

  /**
   * Update pulse intensity on both pools
   */
  public updatePulseIntensity(intensities: Map<string, number>): void {
    this._ghostPool?.updatePulseIntensity(intensities);
    this._biographyPool?.updatePulseIntensity(intensities);
  }

  /**
   * Get node position from either pool
   */
  public getNodePosition(personId: string): THREE.Vector3 | null {
    return (
      this._ghostPool?.getNodePosition(personId) ||
      this._biographyPool?.getNodePosition(personId) ||
      null
    );
  }

  /**
   * Check if person is in ghost pool
   */
  public isGhostNode(personId: string): boolean {
    return this._ghostPool?.hasId(personId) ?? false;
  }

  /**
   * Check if person is in biography pool
   */
  public isBiographyNode(personId: string): boolean {
    return this._biographyPool?.hasId(personId) ?? false;
  }

  /**
   * Get index in ghost pool
   */
  public getGhostIndex(personId: string): number {
    return this._ghostPool?.getIndex(personId) ?? -1;
  }

  /**
   * Get index in biography pool
   */
  public getBiographyIndex(personId: string): number {
    return this._biographyPool?.getIndex(personId) ?? -1;
  }

  /**
   * Get the ghost pool (for raycasting etc.)
   */
  public get ghostPool(): ConstellationPool | null {
    return this._ghostPool;
  }

  /**
   * Get the biography pool (for raycasting etc.)
   */
  public get biographyPool(): ConstellationPool | null {
    return this._biographyPool;
  }

  /**
   * Get ghost mesh (for raycasting)
   */
  public get ghostMesh(): THREE.InstancedMesh | null {
    return this._ghostPool?.mesh ?? null;
  }

  /**
   * Get biography mesh (for raycasting)
   */
  public get biographyMesh(): THREE.InstancedMesh | null {
    return this._biographyPool?.mesh ?? null;
  }

  /**
   * Dispose all resources
   */
  public dispose(): void {
    if (this._ghostPool) {
      if (this._scene) {
        this._scene.remove(this._ghostPool.mesh);
      }
      this._ghostPool.dispose();
      this._ghostPool = null;
      this._ghostUniforms = null;
    }

    if (this._biographyPool) {
      if (this._scene) {
        this._scene.remove(this._biographyPool.mesh);
      }
      this._biographyPool.dispose();
      this._biographyPool = null;
      this._biographyUniforms = null;
    }

    this._knownPeople.clear();
    this._currentTransition = null;
    this._scene = null;
  }
}
