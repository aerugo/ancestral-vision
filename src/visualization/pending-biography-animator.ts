/**
 * Pending Biography Animator
 *
 * Creates attention-drawing pulse animation for nodes during biography generation
 * and when waiting for user acceptance. Uses different intensities and frequencies
 * for each state:
 * - Generating: subtle, slow pulse to indicate activity
 * - Pending: intense, faster pulse to draw attention for acceptance
 */

import type { BiographyPulseSnapshot } from './pending-biography-events';

export interface BiographyPulseConfig {
  /** Pulse cycle duration in seconds */
  pulseDuration: number;
  /** Minimum pulse intensity (0-1) */
  minIntensity: number;
  /** Maximum pulse intensity (0-1) */
  maxIntensity: number;
}

export interface PendingBiographyAnimatorConfig {
  /** Configuration for generating state (subtle pulse) */
  generating?: Partial<BiographyPulseConfig>;
  /** Configuration for pending state (intense pulse) */
  pending?: Partial<BiographyPulseConfig>;
}

const DEFAULT_GENERATING_CONFIG: BiographyPulseConfig = {
  pulseDuration: 3.0,    // Slow, calm breathing
  minIntensity: 0.05,    // Very subtle minimum
  maxIntensity: 0.35,    // Moderate maximum
};

const DEFAULT_PENDING_CONFIG: BiographyPulseConfig = {
  pulseDuration: 1.2,    // Faster, more urgent
  minIntensity: 0.2,     // Higher minimum
  maxIntensity: 0.85,    // Strong maximum
};

/**
 * PendingBiographyAnimator
 *
 * Manages pulsing animation for nodes during biography generation and
 * when pending user acceptance. Produces smooth breathing pulse intensities
 * with different parameters for each state.
 */
export class PendingBiographyAnimator {
  private _generatingIds: Set<string> = new Set();
  private _pendingIds: Set<string> = new Set();
  private _elapsedTime: number = 0;
  private _generatingConfig: BiographyPulseConfig;
  private _pendingConfig: BiographyPulseConfig;

  public constructor(config: PendingBiographyAnimatorConfig = {}) {
    this._generatingConfig = {
      ...DEFAULT_GENERATING_CONFIG,
      ...config.generating,
    };
    this._pendingConfig = {
      ...DEFAULT_PENDING_CONFIG,
      ...config.pending,
    };
  }

  /**
   * Update the node states from a snapshot
   * Called when state changes via event emitter
   */
  public setStates(snapshot: BiographyPulseSnapshot): void {
    this._generatingIds = new Set(snapshot.generating);
    this._pendingIds = new Set(snapshot.pending);
  }

  /**
   * Legacy method for backwards compatibility
   * @deprecated Use setStates instead
   */
  public setPendingNodes(nodeIds: Set<string>): void {
    this._pendingIds = new Set(nodeIds);
  }

  /**
   * Check if there are any animating nodes
   */
  public isAnimating(): boolean {
    return this._generatingIds.size > 0 || this._pendingIds.size > 0;
  }

  /**
   * Update animation state
   * @param deltaTime Time since last update in seconds
   */
  public update(deltaTime: number): void {
    if (!this.isAnimating()) return;
    this._elapsedTime += deltaTime;
  }

  /**
   * Calculate pulse intensity for a given config
   */
  private _calculateIntensity(config: BiographyPulseConfig): number {
    const phase = (this._elapsedTime % config.pulseDuration) / config.pulseDuration;
    // Use sin wave: 0 → 1 → 0 over the cycle
    const sineValue = Math.sin(phase * Math.PI * 2);
    // Map from [-1, 1] to [minIntensity, maxIntensity]
    const normalized = (sineValue + 1) / 2;
    return config.minIntensity + normalized * (config.maxIntensity - config.minIntensity);
  }

  /**
   * Get pulse intensities for all animating nodes
   * Generating nodes get subtle pulse, pending nodes get intense pulse
   * @returns Map of node ID to intensity (0-1)
   */
  public getIntensities(): Map<string, number> {
    const intensities = new Map<string, number>();
    if (!this.isAnimating()) return intensities;

    // Calculate intensities for each state
    const generatingIntensity = this._calculateIntensity(this._generatingConfig);
    const pendingIntensity = this._calculateIntensity(this._pendingConfig);

    // Apply generating intensity
    for (const nodeId of this._generatingIds) {
      intensities.set(nodeId, generatingIntensity);
    }

    // Apply pending intensity (overwrites if somehow in both states)
    for (const nodeId of this._pendingIds) {
      intensities.set(nodeId, pendingIntensity);
    }

    return intensities;
  }

  /**
   * Reset the animator state
   */
  public reset(): void {
    this._generatingIds.clear();
    this._pendingIds.clear();
    this._elapsedTime = 0;
  }
}
