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
 * Reverse transition state for biography-to-ghost animation
 */
export interface ReverseTransitionState {
  personId: string;
  progress: number;
  startPosition: THREE.Vector3;
  startScale: number;
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
  private _currentReverseTransition: ReverseTransitionState | null = null;
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

    // Handle transitions (biography to ghost)
    // This happens immediately (no animation for removing biography)
    for (const person of changes.biographyToGhost) {
      // Remove from biography pool
      this._biographyPool?.removeNode(person.id);

      // Add to ghost pool
      this._ghostPool?.addNode({
        id: person.id,
        position: person.position,
      });

      // Update tracking
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
   * Timing aligned with metamorphosis particles and sphere dissolution:
   * - 0-12%: Gather phase - ghost normal, sphere particles fade in over it
   * - 12-18%: Compress phase - ghost starts fading as sphere particles intensify
   * - 18-20%: Ghost fully fades out just before explosion
   * - 20%: Explosion moment - sphere particles explode (ghost already invisible)
   * - 55-85%: Biography node emerges as particles reconvene
   * - 88-100%: Reveal phase - particles fade, biography node takes over
   *
   * @param progress - Animation progress 0-1
   * @returns The transition state or null if no transition active
   */
  public updateTransition(progress: number): TransitionState | null {
    if (!this._currentTransition) return null;

    this._currentTransition.progress = progress;
    const { personId, targetScale } = this._currentTransition;

    // Ghost node phases - fade out BEFORE explosion so sphere particles take over
    if (this._ghostPool) {
      const baseScale = 0.7;

      if (progress < 0.12) {
        // Gather phase (0-12%): Ghost at normal scale while sphere particles fade in
        this._ghostPool.setNodeScale(personId, baseScale);
        this._ghostPool.setTransitionProgress(personId, 0);
      } else if (progress < 0.20) {
        // Compress phase (12-20%): Ghost rapidly fades out as sphere particles intensify
        // This creates the "dissolve" effect - sphere particles become visible as ghost fades
        const fadeProgress = (progress - 0.12) / 0.08; // 0 to 1 over 12-20%
        const eased = fadeProgress * fadeProgress; // easeInQuad for smooth fade
        const ghostScale = baseScale * (1 - eased);
        this._ghostPool.setNodeScale(personId, ghostScale);
        this._ghostPool.setTransitionProgress(personId, fadeProgress);
      } else {
        // After 20%: Ghost is invisible, explosion happens
        this._ghostPool.setNodeScale(personId, 0);
        this._ghostPool.setTransitionProgress(personId, 1);
      }
    }

    // Biography node: emerge during 55-85% (as particles reconvene)
    // This creates seamless handoff - biography appears as particles converge
    if (this._biographyPool) {
      if (progress >= 0.55 && progress < 0.85) {
        const growProgress = (progress - 0.55) / 0.30;
        // Ease in-out cubic for smooth emergence
        const eased = growProgress < 0.5
          ? 4 * growProgress * growProgress * growProgress
          : 1 - Math.pow(-2 * growProgress + 2, 3) / 2;
        // Start at 0, grow to full target scale
        const scale = eased * targetScale;
        this._biographyPool.setNodeScale(personId, scale);
      } else if (progress >= 0.85) {
        // Full scale from 85% onward
        this._biographyPool.setNodeScale(personId, targetScale);
      }
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
   * Start a biography-to-ghost reverse transition animation
   * Called when user removes a biography from a node
   */
  public startReverseTransition(personId: string): ReverseTransitionState | null {
    if (!this._ghostPool || !this._biographyPool) {
      return null;
    }

    const position = this._biographyPool.getNodePosition(personId);
    if (!position) {
      console.warn(`[ConstellationManager] Person ${personId} not found in biography pool`);
      return null;
    }

    // Get current scale of the biography node
    const startScale = this._biographyPool.getNodeScale(personId) ?? 1.0;

    this._currentReverseTransition = {
      personId,
      progress: 0,
      startPosition: position.clone(),
      startScale,
    };

    // Add to ghost pool immediately at scale 0 (invisible)
    this._ghostPool.addNode({
      id: personId,
      position: position,
    });
    this._ghostPool.setNodeScale(personId, 0);

    return this._currentReverseTransition;
  }

  /**
   * Update reverse transition animation progress
   * Simple compression and crossfade (no particles):
   * - 0-60%: Biography compresses smoothly
   * - 20-80%: Ghost fades in (overlapping crossfade)
   * - 80-100%: Ghost at final scale
   *
   * @param progress - Animation progress 0-1
   * @returns The reverse transition state or null if no transition active
   */
  public updateReverseTransition(progress: number): ReverseTransitionState | null {
    if (!this._currentReverseTransition) return null;

    this._currentReverseTransition.progress = progress;
    const { personId, startScale } = this._currentReverseTransition;

    // Biography node: smooth compression over 0-60%
    if (this._biographyPool) {
      if (progress < 0.60) {
        // Smooth compression with easeInQuad
        const compressProgress = progress / 0.60;
        const eased = compressProgress * compressProgress;
        const biographyScale = startScale * (1 - eased);
        this._biographyPool.setNodeScale(personId, biographyScale);
      } else {
        // Fully compressed
        this._biographyPool.setNodeScale(personId, 0);
      }
    }

    // Ghost node: fade in during 20-80% (overlapping crossfade)
    if (this._ghostPool) {
      const ghostTargetScale = 0.7;

      if (progress >= 0.20 && progress < 0.80) {
        const growProgress = (progress - 0.20) / 0.60;
        // Ease out cubic for smooth emergence
        const eased = 1 - Math.pow(1 - growProgress, 3);
        const scale = eased * ghostTargetScale;
        this._ghostPool.setNodeScale(personId, scale);
      } else if (progress >= 0.80) {
        // Full scale from 80% onward
        this._ghostPool.setNodeScale(personId, ghostTargetScale);
      }
    }

    return this._currentReverseTransition;
  }

  /**
   * Complete the current reverse transition
   * Removes biography node and finalizes ghost node
   */
  public completeReverseTransition(): void {
    if (!this._currentReverseTransition) return;

    const { personId, startPosition } = this._currentReverseTransition;

    // Remove from biography pool
    this._biographyPool?.removeNode(personId);

    // Ensure ghost node is at final scale
    this._ghostPool?.setNodeScale(personId, 0.7);
    this._ghostPool?.setTransitionProgress(personId, 0);

    // Update tracking
    this._knownPeople.set(personId, {
      hasBiography: false,
      position: startPosition.clone(),
    });

    this._currentReverseTransition = null;
  }

  /**
   * Cancel current reverse transition (revert to biography state)
   */
  public cancelReverseTransition(): void {
    if (!this._currentReverseTransition) return;

    const { personId, startScale } = this._currentReverseTransition;

    // Remove from ghost pool
    this._ghostPool?.removeNode(personId);

    // Restore biography node
    this._biographyPool?.setNodeScale(personId, startScale);

    this._currentReverseTransition = null;
  }

  /**
   * Get current transition state
   */
  public getCurrentTransition(): TransitionState | null {
    return this._currentTransition;
  }

  /**
   * Get current reverse transition state
   */
  public getCurrentReverseTransition(): ReverseTransitionState | null {
    return this._currentReverseTransition;
  }

  /**
   * Check if a transition is in progress
   */
  public isTransitioning(): boolean {
    return this._currentTransition !== null || this._currentReverseTransition !== null;
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
   * Check if the constellation has been initialized
   * Used to decide between full initialization vs incremental updates
   */
  public isInitialized(): boolean {
    return this._ghostPool !== null || this._biographyPool !== null;
  }

  /**
   * Update constellation with new data using incremental changes
   * Preserves existing nodes (important for smooth transition handoff)
   */
  public update(data: ConstellationGraphData): void {
    if (!this.isInitialized()) {
      console.warn('[ConstellationManager] Cannot update before initialization');
      return;
    }

    const changes = this.computeChanges(data);
    this.applyChanges(changes);
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
