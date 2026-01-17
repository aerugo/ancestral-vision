/**
 * Path Pulse Animator
 *
 * Animates a light pulse traveling along a path of nodes in the constellation.
 * The pulse illuminates nodes and edges as it passes through.
 */

/**
 * Easing function type
 */
type EasingFunction = (t: number) => number;

/**
 * Detailed pulse position along the path
 */
export interface PulsePosition {
  /** Which edge the pulse front is on (0 to path.length-2) */
  edgeIndex: number;
  /** Progress within the current edge (0-1) */
  edgeProgress: number;
  /** Overall path progress (0-1) */
  totalProgress: number;
  /** Source node ID of current edge */
  sourceId: string;
  /** Target node ID of current edge */
  targetId: string;
}

/**
 * Available easing functions
 */
const easings = {
  linear: (t: number) => t,
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
} as const satisfies Record<string, EasingFunction>;

/**
 * Easing function names
 */
export type PulseEasingName = keyof typeof easings;

/**
 * Configuration for the pulse animator
 */
export interface PulseAnimatorConfig {
  /** Duration per hop in seconds (default: 0.25) */
  hopDuration?: number;
  /** Minimum total animation duration in seconds (default: 0.5) */
  minDuration?: number;
  /** Maximum total animation duration in seconds (default: 3.0) */
  maxDuration?: number;
  /** Easing function for progress (default: 'easeInOutCubic') */
  easing?: PulseEasingName;
  /** How wide the pulse glow spreads (0-1, default: 0.3) */
  pulseWidth?: number;
  /** Duration of breathing effect at target in seconds (default: 1.8) */
  breathingDuration?: number;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<PulseAnimatorConfig> = {
  hopDuration: 0.25,
  minDuration: 0.5,
  maxDuration: 3.0,
  easing: 'easeInOutCubic',
  pulseWidth: 0.3,
  breathingDuration: 1.8,
};

/**
 * PathPulseAnimator - Animates a light pulse traveling through constellation nodes
 *
 * The pulse travels along a path of connected nodes, illuminating each node
 * and the edges between them as it passes. The intensity at any point fades
 * in ahead of the pulse and fades out behind it.
 */
export class PathPulseAnimator {
  private _config: Required<PulseAnimatorConfig>;
  private _path: string[] = [];
  private _progress: number = 1; // Start at 1 (completed state)
  private _duration: number = 0;
  private _easing: EasingFunction;
  private _onArrival?: () => void;
  private _onComplete?: () => void;
  private _hasArrivedCallback: boolean = false;
  private _hasCompletedCallback: boolean = false;
  private _breathingProgress: number = 1; // 0-1 breathing phase progress
  private _isBreathing: boolean = false;

  /**
   * Create a new path pulse animator
   * @param config Configuration options
   */
  public constructor(config: PulseAnimatorConfig = {}) {
    this._config = { ...DEFAULT_CONFIG, ...config };
    this._easing = easings[this._config.easing];
  }

  /**
   * Start animating a pulse along the given path
   * @param path Array of node IDs from start to end
   * @param onArrival Optional callback when pulse arrives at target (start of breathing)
   * @param onComplete Optional callback when animation fully completes (end of breathing)
   */
  public start(
    path: string[],
    onArrival?: () => void,
    onComplete?: () => void
  ): void {
    // Need at least 2 nodes for a meaningful pulse
    if (path.length < 2) {
      onArrival?.();
      onComplete?.();
      return;
    }

    this._path = [...path];
    this._onArrival = onArrival;
    this._onComplete = onComplete;
    this._hasArrivedCallback = false;
    this._hasCompletedCallback = false;
    this._progress = 0;
    this._breathingProgress = 0;
    this._isBreathing = false;

    // Calculate duration based on path length, clamped to min/max
    const hops = path.length - 1;
    const rawDuration = hops * this._config.hopDuration;
    this._duration = Math.max(
      this._config.minDuration,
      Math.min(this._config.maxDuration, rawDuration)
    );
  }

  /**
   * Update the animation
   * @param deltaTime Time elapsed since last update in seconds
   */
  public update(deltaTime: number): void {
    if (this._path.length < 2) return;

    // Breathing phase
    if (this._isBreathing) {
      if (this._breathingProgress >= 1) return;

      this._breathingProgress += deltaTime / this._config.breathingDuration;

      if (this._breathingProgress >= 1) {
        this._breathingProgress = 1;

        // Call onComplete only once after breathing finishes
        if (!this._hasCompletedCallback && this._onComplete) {
          this._hasCompletedCallback = true;
          this._onComplete();
        }
      }
      return;
    }

    // Travel phase
    if (this._progress >= 1) return;

    this._progress += deltaTime / this._duration;

    if (this._progress >= 1) {
      this._progress = 1;

      // Call onArrival when pulse reaches target
      if (!this._hasArrivedCallback && this._onArrival) {
        this._hasArrivedCallback = true;
        this._onArrival();
      }

      // Transition to breathing phase (or complete if breathing disabled)
      if (this._config.breathingDuration <= 0) {
        // No breathing - complete immediately
        if (!this._hasCompletedCallback && this._onComplete) {
          this._hasCompletedCallback = true;
          this._onComplete();
        }
      } else {
        this._isBreathing = true;
        this._breathingProgress = 0;
      }
    }
  }

  /**
   * Cancel the current animation
   */
  public cancel(): void {
    this._progress = 1;
    this._path = [];
    this._isBreathing = false;
    this._breathingProgress = 1;
    this._hasArrivedCallback = false;
    this._hasCompletedCallback = false;
  }

  /**
   * Check if an animation is currently in progress
   * @returns true if animating, false otherwise
   */
  public isAnimating(): boolean {
    if (this._path.length < 2) return false;
    // Still traveling
    if (this._progress < 1) return true;
    // Breathing phase (only if breathing is enabled)
    if (this._config.breathingDuration > 0 && this._isBreathing && this._breathingProgress < 1) {
      return true;
    }
    return false;
  }

  /**
   * Check if currently in breathing phase (pulse has arrived at target)
   * @returns true if in breathing phase
   */
  public isBreathing(): boolean {
    return this._isBreathing && this._breathingProgress < 1;
  }

  /**
   * Get the breathing intensity (organic fade in/out) for target node.
   * Creates a single relaxed breath: brighten → pause → slowly dim.
   *
   * The curve is:
   * - Phase 1 (0-25%): Ease in from 0.5 to 1.0 (breathe in / brighten)
   * - Phase 2 (25-40%): Hold at 1.0 (pause at peak)
   * - Phase 3 (40-100%): Ease out from 1.0 to 0 (breathe out / slowly dim)
   *
   * @returns Intensity 0-1 with smooth organic single breath
   */
  public getBreathingIntensity(): number {
    if (!this._isBreathing || this._breathingProgress >= 1) return 0;

    const t = this._breathingProgress;

    // Phase boundaries
    const breatheInEnd = 0.25;
    const pauseEnd = 0.4;

    if (t < breatheInEnd) {
      // Phase 1: Breathe in - ease from 0.5 to 1.0
      const phaseT = t / breatheInEnd;
      // Ease out cubic for smooth arrival at peak
      const eased = 1 - Math.pow(1 - phaseT, 3);
      return 0.5 + 0.5 * eased;
    } else if (t < pauseEnd) {
      // Phase 2: Hold at peak
      return 1.0;
    } else {
      // Phase 3: Breathe out - ease from 1.0 to 0
      const phaseT = (t - pauseEnd) / (1 - pauseEnd);
      // Ease in-out cubic for smooth, relaxed exhale
      const eased =
        phaseT < 0.5
          ? 4 * phaseT * phaseT * phaseT
          : 1 - Math.pow(-2 * phaseT + 2, 3) / 2;
      return 1.0 - eased;
    }
  }

  /**
   * Get the current path being animated
   * @returns Array of node IDs or empty array if not animating
   */
  public getPath(): string[] {
    return [...this._path];
  }

  /**
   * Get the target node ID (last node in path)
   * @returns Target node ID or null if no path
   */
  public getTargetNodeId(): string | null {
    if (this._path.length === 0) return null;
    return this._path[this._path.length - 1]!;
  }

  /**
   * Get the pulse intensity for a specific node
   * Intensity is 0-1 based on how close the pulse front is to this node.
   * During breathing phase, returns breathing intensity for target node.
   *
   * @param nodeId Node ID to check
   * @returns Intensity value 0-1, or 0 if node not in path
   */
  public getNodePulseIntensity(nodeId: string): number {
    if (!this.isAnimating()) return 0;

    const nodeIndex = this._path.indexOf(nodeId);
    if (nodeIndex === -1) return 0;

    // During breathing phase, only target node glows
    if (this._isBreathing) {
      const isTargetNode = nodeIndex === this._path.length - 1;
      return isTargetNode ? this.getBreathingIntensity() : 0;
    }

    // Travel phase - normal pulse calculation
    // Apply easing to progress
    const easedProgress = this._easing(this._progress);

    // Convert progress (0-1) to position along path (0 to path.length-1)
    const pathPosition = easedProgress * (this._path.length - 1);

    // Node should only glow AFTER the pulse has reached it
    // The pulse reaches a node when pathPosition >= nodeIndex
    // This ensures light only reaches a planet after traversing the edge to it
    if (pathPosition < nodeIndex) return 0;

    // Calculate distance from pulse front to this node (only trailing behind pulse)
    const distance = pathPosition - nodeIndex;

    // Calculate intensity based on distance and pulse width
    // Intensity is 1 at the pulse front, fading to 0 at pulseWidth distance
    const pulseWidthNodes = this._config.pulseWidth * (this._path.length - 1);
    const normalizedDistance = distance / Math.max(pulseWidthNodes, 0.1);

    // Smooth falloff using cosine
    if (normalizedDistance > 1) return 0;
    return Math.cos(normalizedDistance * Math.PI * 0.5);
  }

  /**
   * Get the pulse intensity for an edge between two nodes
   * The edge must connect adjacent nodes in the path.
   *
   * @param sourceId First node ID
   * @param targetId Second node ID
   * @returns Intensity value 0-1, or 0 if edge not in path
   */
  public getEdgePulseIntensity(sourceId: string, targetId: string): number {
    if (!this.isAnimating()) return 0;

    // No edge glow during breathing phase
    if (this._isBreathing) return 0;

    const sourceIndex = this._path.indexOf(sourceId);
    const targetIndex = this._path.indexOf(targetId);

    // Both nodes must be in path
    if (sourceIndex === -1 || targetIndex === -1) return 0;

    // Nodes must be adjacent in the path
    if (Math.abs(sourceIndex - targetIndex) !== 1) return 0;

    // Apply easing to progress
    const easedProgress = this._easing(this._progress);

    // Convert progress (0-1) to position along path (0 to path.length-1)
    const pathPosition = easedProgress * (this._path.length - 1);

    // Edge midpoint position
    const edgeMidpoint = (sourceIndex + targetIndex) / 2;

    // Calculate distance from pulse front to edge midpoint
    const distance = Math.abs(pathPosition - edgeMidpoint);

    // Calculate intensity based on distance and pulse width
    const pulseWidthNodes = this._config.pulseWidth * (this._path.length - 1);
    const normalizedDistance = distance / Math.max(pulseWidthNodes, 0.1);

    // Smooth falloff using cosine
    if (normalizedDistance > 1) return 0;
    return Math.cos(normalizedDistance * Math.PI * 0.5);
  }

  /**
   * Get all node intensities as a Map
   * Useful for batch updates to visualization
   *
   * @returns Map of nodeId -> intensity for nodes with non-zero intensity
   */
  public getAllNodeIntensities(): Map<string, number> {
    const intensities = new Map<string, number>();
    if (!this.isAnimating()) return intensities;

    for (const nodeId of this._path) {
      const intensity = this.getNodePulseIntensity(nodeId);
      if (intensity > 0) {
        intensities.set(nodeId, intensity);
      }
    }
    return intensities;
  }

  /**
   * Get all edge intensities as a Map
   * Useful for batch updates to visualization
   *
   * @returns Map of "sourceId-targetId" -> intensity for edges with non-zero intensity
   */
  public getAllEdgeIntensities(): Map<string, number> {
    const intensities = new Map<string, number>();
    if (!this.isAnimating()) return intensities;

    // Iterate adjacent pairs in the path
    for (let i = 0; i < this._path.length - 1; i++) {
      const sourceId = this._path[i]!;
      const targetId = this._path[i + 1]!;
      const intensity = this.getEdgePulseIntensity(sourceId, targetId);
      if (intensity > 0) {
        // Use sorted key for consistent lookup
        const key = [sourceId, targetId].sort().join('-');
        intensities.set(key, intensity);
      }
    }
    return intensities;
  }

  /**
   * Get detailed pulse position for smooth edge rendering.
   * Returns which edge the pulse is on and progress within that edge.
   *
   * @returns PulsePosition or null if not animating or in breathing phase
   */
  public getPulsePosition(): PulsePosition | null {
    if (!this.isAnimating()) return null;
    // No pulse position during breathing - pulse is at target
    if (this._isBreathing) return null;

    // Apply easing to progress
    const easedProgress = this._easing(this._progress);

    // Convert progress (0-1) to position along edges (0 to numEdges)
    const numEdges = this._path.length - 1;
    const edgePosition = easedProgress * numEdges;

    // Which edge are we on?
    const edgeIndex = Math.min(Math.floor(edgePosition), numEdges - 1);

    // Progress within that edge (0-1)
    const edgeProgress = edgePosition - edgeIndex;

    const sourceId = this._path[edgeIndex]!;
    const targetId = this._path[edgeIndex + 1]!;

    return {
      edgeIndex,
      edgeProgress,
      totalProgress: easedProgress,
      sourceId,
      targetId,
    };
  }

  /**
   * Get detailed edge intensity info for smooth per-vertex rendering.
   * Returns the pulse position relative to each edge in the path.
   *
   * @param pulseWidth Width of pulse glow in edge units (default: uses config)
   * @returns Array of { sortedKey, edgeIndex, pulseDistanceFromEdge, reversed }
   */
  public getEdgePulseDetails(
    pulseWidth?: number
  ): Array<{
    sortedKey: string;
    sourceId: string;
    targetId: string;
    edgeIndex: number;
    /** How far the pulse front is from this edge's start (-1 to numEdges+1 range) */
    pulseProgressRelativeToEdge: number;
    /** True if path traverses this edge in reverse direction from geometry */
    reversed: boolean;
  }> {
    const details: Array<{
      sortedKey: string;
      sourceId: string;
      targetId: string;
      edgeIndex: number;
      pulseProgressRelativeToEdge: number;
      reversed: boolean;
    }> = [];

    if (!this.isAnimating()) return details;

    const position = this.getPulsePosition();
    if (!position) return details;

    const numEdges = this._path.length - 1;
    const width = pulseWidth ?? this._config.pulseWidth;

    // The pulse position in edge units (0 to numEdges)
    const pulseEdgePosition = position.edgeIndex + position.edgeProgress;

    // For each edge in the path
    for (let i = 0; i < numEdges; i++) {
      const sourceId = this._path[i]!;
      const targetId = this._path[i + 1]!;
      const sorted = [sourceId, targetId].sort();
      const sortedKey = sorted.join('-');

      // Check if path direction is reversed from geometry direction
      // Geometry uses sorted order, so if sourceId !== sorted[0], we're reversed
      const reversed = sourceId !== sorted[0];

      // How far is the pulse from this edge's midpoint?
      // We express this as pulse position relative to edge i
      // (pulseEdgePosition - i) gives how many edges ahead the pulse is
      const pulseProgressRelativeToEdge = pulseEdgePosition - i;

      // Only include edges within the pulse width range
      // Pulse affects from (pulsePosition - width) to (pulsePosition + width)
      if (
        pulseProgressRelativeToEdge >= -width &&
        pulseProgressRelativeToEdge <= 1 + width
      ) {
        details.push({
          sortedKey,
          sourceId,
          targetId,
          edgeIndex: i,
          pulseProgressRelativeToEdge,
          reversed,
        });
      }
    }

    return details;
  }
}
