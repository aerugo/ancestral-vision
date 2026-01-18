/**
 * PropagationAnimator - Graph-based animation wrapper
 *
 * Wraps the existing PathPulseAnimator to integrate with AnimationSystem.
 * Maintains identical behavior while using centralized time management.
 */

/**
 * Minimal interface for graph path finding
 */
export interface GraphPathFinder {
  findPath(from: string, to: string): string[] | null;
}

/**
 * Configuration for propagation animation
 */
export interface PropagationConfig {
  /** Speed of pulse propagation (edges per second) */
  pulseSpeed?: number;
  /** Duration of node glow after pulse passes */
  glowDuration?: number;
  /** Speed of breathing animation */
  breathingSpeed?: number;
}

const DEFAULT_CONFIG: Required<PropagationConfig> = {
  pulseSpeed: 2.0,
  glowDuration: 0.5,
  breathingSpeed: 1.0,
};

/**
 * PropagationAnimator - Manages graph-based pulse animations
 */
export class PropagationAnimator {
  private readonly _graph: GraphPathFinder;
  private readonly _config: Required<PropagationConfig>;

  private _path: string[] = [];
  private _pulseProgress: number = 0;
  private _isAnimating: boolean = false;
  private _isBreathing: boolean = false;
  private _breathingPhase: number = 0;

  private _nodeIntensities: Map<string, number> = new Map();
  private _edgeIntensities: Map<string, number> = new Map();

  public constructor(graph: GraphPathFinder, config: PropagationConfig = {}) {
    this._graph = graph;
    this._config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start a pulse from one node to another
   */
  public startPulse(fromNode: string, toNode: string): void {
    const path = this._graph.findPath(fromNode, toNode);

    if (!path || path.length === 0) {
      return;
    }

    this._path = path;
    this._pulseProgress = 0;
    this._isAnimating = true;
    this._isBreathing = false;
    this._nodeIntensities.clear();
    this._edgeIntensities.clear();
  }

  /**
   * Update the animation
   * @param deltaTime - Time elapsed in seconds (from TimeProvider)
   */
  public update(deltaTime: number): void {
    if (!this._isAnimating && !this._isBreathing) {
      return;
    }

    if (this._isAnimating) {
      this._updatePulse(deltaTime);
    }

    if (this._isBreathing) {
      this._updateBreathing(deltaTime);
    }
  }

  /**
   * Get intensity for a specific node
   */
  public getNodeIntensity(nodeId: string): number {
    return this._nodeIntensities.get(nodeId) ?? 0;
  }

  /**
   * Get intensity for a specific edge
   */
  public getEdgeIntensity(sourceId: string, targetId: string): number {
    const key = `${sourceId}->${targetId}`;
    return this._edgeIntensities.get(key) ?? 0;
  }

  /**
   * Get all node intensities
   */
  public getAllNodeIntensities(): Map<string, number> {
    return new Map(this._nodeIntensities);
  }

  /**
   * Whether pulse is currently animating
   */
  public isAnimating(): boolean {
    return this._isAnimating;
  }

  /**
   * Whether nodes are in breathing state
   */
  public isBreathing(): boolean {
    return this._isBreathing;
  }

  /**
   * Dispose and clean up
   */
  public dispose(): void {
    this._isAnimating = false;
    this._isBreathing = false;
    this._path = [];
    this._nodeIntensities.clear();
    this._edgeIntensities.clear();
  }

  private _updatePulse(deltaTime: number): void {
    const edgeCount = this._path.length - 1;
    if (edgeCount <= 0) {
      this._completePulse();
      return;
    }

    // Advance pulse
    this._pulseProgress += deltaTime * this._config.pulseSpeed;

    // Calculate which edge the pulse is on
    const currentEdgeIndex = Math.floor(this._pulseProgress);
    const edgeProgress = this._pulseProgress - currentEdgeIndex;

    // Update node intensities
    for (let i = 0; i < this._path.length; i++) {
      const nodeId = this._path[i];

      if (i < currentEdgeIndex) {
        // Node already passed - fade out
        const timeSincePassed = (currentEdgeIndex - i) / this._config.pulseSpeed;
        const fadeProgress = Math.min(1, timeSincePassed / this._config.glowDuration);
        this._nodeIntensities.set(nodeId, 1 - fadeProgress);
      } else if (i === currentEdgeIndex) {
        // Pulse is leaving this node
        this._nodeIntensities.set(nodeId, 1 - edgeProgress * 0.5);
      } else if (i === currentEdgeIndex + 1) {
        // Pulse is approaching this node
        this._nodeIntensities.set(nodeId, edgeProgress);
      } else {
        // Node not yet reached
        this._nodeIntensities.set(nodeId, 0);
      }
    }

    // Update edge intensities
    for (let i = 0; i < edgeCount; i++) {
      const key = `${this._path[i]}->${this._path[i + 1]}`;

      if (i < currentEdgeIndex) {
        // Edge already passed
        const timeSincePassed = (currentEdgeIndex - i) / this._config.pulseSpeed;
        const fadeProgress = Math.min(1, timeSincePassed / this._config.glowDuration);
        this._edgeIntensities.set(key, 1 - fadeProgress);
      } else if (i === currentEdgeIndex) {
        // Pulse is on this edge
        this._edgeIntensities.set(key, 1);
      } else {
        // Edge not yet reached
        this._edgeIntensities.set(key, 0);
      }
    }

    // Check for completion
    if (this._pulseProgress >= edgeCount) {
      this._completePulse();
    }
  }

  private _completePulse(): void {
    this._isAnimating = false;
    this._isBreathing = true;
    this._breathingPhase = 0;

    // Set all nodes to lit state
    for (const nodeId of this._path) {
      this._nodeIntensities.set(nodeId, 1);
    }
  }

  private _updateBreathing(deltaTime: number): void {
    this._breathingPhase += deltaTime * this._config.breathingSpeed;

    // Sinusoidal breathing effect
    const breathingIntensity = 0.7 + 0.3 * Math.sin(this._breathingPhase * Math.PI * 2);

    // Apply to all nodes in path
    for (const nodeId of this._path) {
      this._nodeIntensities.set(nodeId, breathingIntensity);
    }
  }
}
