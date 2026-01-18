/**
 * Biography Transition Animator
 *
 * Animates the metamorphosis of a ghost node into a biography node when
 * a biography is added. Coordinates camera zoom, ghost fade, and particle burst.
 *
 * Animation timeline:
 * - 0-30%: Camera zoom in (handled externally by CameraAnimator)
 * - 30-40%: Ghost glow intensifies
 * - 40-70%: Ghost shrinks + particle burst emanates
 * - 70-90%: Particles spiral outward, ghost fully faded
 * - 90-100%: Hold, then trigger data refresh
 */
import * as THREE from 'three';

/**
 * Easing function type
 */
type EasingFunction = (t: number) => number;

/**
 * Available easing functions
 */
const easings = {
  linear: (t: number) => t,
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInCubic: (t: number) => t * t * t,
  easeOutQuart: (t: number) => 1 - Math.pow(1 - t, 4),
} as const satisfies Record<string, EasingFunction>;

/**
 * Easing function names
 */
export type TransitionEasingName = keyof typeof easings;

/**
 * Animation phase boundaries (as fractions of total duration)
 */
interface AnimationPhases {
  /** End of camera zoom phase (start of glow intensify) */
  cameraZoomEnd: number;
  /** End of glow intensify phase (start of shrink + particles) */
  glowIntensifyEnd: number;
  /** End of shrink phase (particles still fading) */
  shrinkEnd: number;
  /** End of particle fade phase (start of hold) */
  particleFadeEnd: number;
}

const DEFAULT_PHASES: AnimationPhases = {
  cameraZoomEnd: 0.3,
  glowIntensifyEnd: 0.4,
  shrinkEnd: 0.7,
  particleFadeEnd: 0.9,
};

/**
 * Configuration for the transition animator
 */
export interface BiographyTransitionConfig {
  /** Total animation duration in seconds (default: 3.0) */
  duration?: number;
  /** Easing for overall progress (default: 'easeInOutCubic') */
  easing?: TransitionEasingName;
  /** Camera zoom distance from node (default: 15) */
  cameraZoomDistance?: number;
  /** Animation phase boundaries (default: see DEFAULT_PHASES) */
  phases?: Partial<AnimationPhases>;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<Omit<BiographyTransitionConfig, 'phases'>> & {
  phases: AnimationPhases;
} = {
  duration: 3.5, // Slightly longer to showcase the particle animation
  easing: 'easeInOutCubic',
  cameraZoomDistance: 15,
  phases: DEFAULT_PHASES,
};

/**
 * Current state of the transition animation
 */
export interface TransitionState {
  /** Overall progress 0-1 */
  progress: number;
  /** Ghost node glow intensity multiplier (1 = normal, up to ~5 at peak) */
  ghostGlowIntensity: number;
  /** Ghost node scale multiplier (1 = normal, shrinks to 0) */
  ghostScale: number;
  /** Ghost node opacity multiplier (1 = normal, fades to 0) */
  ghostOpacity: number;
  /** Particle system intensity (0 = off, 1 = peak) */
  particleIntensity: number;
  /** Particle spread radius (starts at node radius, expands) */
  particleSpread: number;
  /** Whether camera zoom phase is complete */
  cameraZoomComplete: boolean;
  /** Whether ghost should be visible */
  ghostVisible: boolean;
}

/**
 * Callbacks for animation lifecycle events
 */
export interface TransitionCallbacks {
  /** Called when camera zoom should start */
  onCameraZoomStart?: (targetPosition: THREE.Vector3, zoomDistance: number) => void;
  /** Called when camera zoom completes */
  onCameraZoomComplete?: () => void;
  /** Called when particle burst should start */
  onParticleBurstStart?: (position: THREE.Vector3) => void;
  /** Called when animation fully completes (ready for data refresh) */
  onComplete?: () => void;
}

/**
 * BiographyTransitionAnimator - Orchestrates the ghost-to-biography metamorphosis
 */
export class BiographyTransitionAnimator {
  private _config: Required<Omit<BiographyTransitionConfig, 'phases'>> & {
    phases: AnimationPhases;
  };
  private _progress: number = 1; // Start at 1 (completed state)
  private _easing: EasingFunction;
  private _personId: string | null = null;
  private _nodePosition: THREE.Vector3 = new THREE.Vector3();
  private _callbacks: TransitionCallbacks = {};
  private _hasCalledCameraZoomStart: boolean = false;
  private _hasCalledCameraZoomComplete: boolean = false;
  private _hasCalledParticleBurstStart: boolean = false;
  private _hasCalledComplete: boolean = false;

  /**
   * Create a new biography transition animator
   * @param config Configuration options
   */
  public constructor(config: BiographyTransitionConfig = {}) {
    this._config = {
      ...DEFAULT_CONFIG,
      ...config,
      phases: { ...DEFAULT_CONFIG.phases, ...config.phases },
    };
    this._easing = easings[this._config.easing];
  }

  /**
   * Start the transition animation
   * @param personId ID of the person receiving a biography
   * @param nodePosition Position of the ghost node in world space
   * @param callbacks Lifecycle callbacks
   */
  public start(
    personId: string,
    nodePosition: THREE.Vector3,
    callbacks: TransitionCallbacks = {}
  ): void {
    this._personId = personId;
    this._nodePosition.copy(nodePosition);
    this._callbacks = callbacks;
    this._progress = 0;
    this._hasCalledCameraZoomStart = false;
    this._hasCalledCameraZoomComplete = false;
    this._hasCalledParticleBurstStart = false;
    this._hasCalledComplete = false;

    // Immediately trigger camera zoom start
    if (this._callbacks.onCameraZoomStart) {
      this._callbacks.onCameraZoomStart(
        this._nodePosition.clone(),
        this._config.cameraZoomDistance
      );
      this._hasCalledCameraZoomStart = true;
    }

    // Immediately trigger particle burst so the vortex animation starts with camera zoom
    if (this._callbacks.onParticleBurstStart) {
      this._callbacks.onParticleBurstStart(this._nodePosition.clone());
      this._hasCalledParticleBurstStart = true;
    }
  }

  /**
   * Update the animation
   * @param deltaTime Time elapsed since last update in seconds
   */
  public update(deltaTime: number): void {
    if (this._progress >= 1 || this._personId === null) return;

    this._progress += deltaTime / this._config.duration;

    if (this._progress >= 1) {
      this._progress = 1;
    }

    const { phases } = this._config;

    // Check for phase transitions and trigger callbacks
    if (
      this._progress >= phases.cameraZoomEnd &&
      !this._hasCalledCameraZoomComplete &&
      this._callbacks.onCameraZoomComplete
    ) {
      this._hasCalledCameraZoomComplete = true;
      this._callbacks.onCameraZoomComplete();
    }

    if (
      this._progress >= phases.glowIntensifyEnd &&
      !this._hasCalledParticleBurstStart &&
      this._callbacks.onParticleBurstStart
    ) {
      this._hasCalledParticleBurstStart = true;
      this._callbacks.onParticleBurstStart(this._nodePosition.clone());
    }

    if (
      this._progress >= 1 &&
      !this._hasCalledComplete &&
      this._callbacks.onComplete
    ) {
      this._hasCalledComplete = true;
      this._callbacks.onComplete();
    }
  }

  /**
   * Get the current transition state
   * @returns Current animation state with all interpolated values
   */
  public getState(): TransitionState {
    const { phases } = this._config;
    const p = this._progress;

    // Default state (animation complete or not started)
    if (p >= 1 || this._personId === null) {
      return {
        progress: 1,
        ghostGlowIntensity: 0,
        ghostScale: 0,
        ghostOpacity: 0,
        particleIntensity: 0,
        particleSpread: 10,
        cameraZoomComplete: true,
        ghostVisible: false,
      };
    }

    // Phase 1: Camera zoom (0 to cameraZoomEnd)
    // Ghost appears normal during this phase
    if (p < phases.cameraZoomEnd) {
      return {
        progress: p,
        ghostGlowIntensity: 1,
        ghostScale: 1,
        ghostOpacity: 1,
        particleIntensity: 0,
        particleSpread: 0,
        cameraZoomComplete: false,
        ghostVisible: true,
      };
    }

    // Phase 2: Glow intensify (cameraZoomEnd to glowIntensifyEnd)
    // Ghost glows brighter, preparing for transformation
    if (p < phases.glowIntensifyEnd) {
      const phaseProgress =
        (p - phases.cameraZoomEnd) / (phases.glowIntensifyEnd - phases.cameraZoomEnd);
      const eased = easings.easeOutCubic(phaseProgress);

      return {
        progress: p,
        // Glow ramps up from 1 to 5 (dramatic intensification)
        ghostGlowIntensity: 1 + eased * 4,
        ghostScale: 1 + eased * 0.1, // Slight swell
        ghostOpacity: 1,
        particleIntensity: 0,
        particleSpread: 0,
        cameraZoomComplete: true,
        ghostVisible: true,
      };
    }

    // Phase 3: Shrink + particles (glowIntensifyEnd to shrinkEnd)
    // Ghost shrinks rapidly while particles burst out
    if (p < phases.shrinkEnd) {
      const phaseProgress =
        (p - phases.glowIntensifyEnd) / (phases.shrinkEnd - phases.glowIntensifyEnd);
      const eased = easings.easeInCubic(phaseProgress);

      return {
        progress: p,
        // Glow fades from 5 to 2
        ghostGlowIntensity: 5 - eased * 3,
        // Scale shrinks from 1.1 to 0.2
        ghostScale: 1.1 - eased * 0.9,
        // Opacity starts fading
        ghostOpacity: 1 - eased * 0.5,
        // Particles ramp up to peak
        particleIntensity: eased,
        // Particles spread outward
        particleSpread: eased * 5,
        cameraZoomComplete: true,
        ghostVisible: true,
      };
    }

    // Phase 4: Particle fade (shrinkEnd to particleFadeEnd)
    // Ghost is mostly gone, particles spread and fade
    if (p < phases.particleFadeEnd) {
      const phaseProgress =
        (p - phases.shrinkEnd) / (phases.particleFadeEnd - phases.shrinkEnd);
      const eased = easings.easeOutQuart(phaseProgress);

      return {
        progress: p,
        // Glow fades to 0
        ghostGlowIntensity: 2 * (1 - eased),
        // Scale shrinks to 0
        ghostScale: 0.2 * (1 - eased),
        // Opacity fades to 0
        ghostOpacity: 0.5 * (1 - eased),
        // Particles fade out
        particleIntensity: 1 - eased,
        // Particles continue spreading
        particleSpread: 5 + eased * 5,
        cameraZoomComplete: true,
        ghostVisible: phaseProgress < 0.8, // Hide ghost near end
      };
    }

    // Phase 5: Hold (particleFadeEnd to 1.0)
    // Everything settled, waiting for data refresh
    return {
      progress: p,
      ghostGlowIntensity: 0,
      ghostScale: 0,
      ghostOpacity: 0,
      particleIntensity: 0,
      particleSpread: 10,
      cameraZoomComplete: true,
      ghostVisible: false,
    };
  }

  /**
   * Check if an animation is currently in progress
   */
  public isAnimating(): boolean {
    return this._progress < 1 && this._personId !== null;
  }

  /**
   * Get the person ID being animated
   */
  public getPersonId(): string | null {
    return this._personId;
  }

  /**
   * Get the node position being animated
   */
  public getNodePosition(): THREE.Vector3 {
    return this._nodePosition.clone();
  }

  /**
   * Cancel the current animation
   */
  public cancel(): void {
    this._progress = 1;
    this._personId = null;
    this._callbacks = {};
    this._hasCalledCameraZoomStart = false;
    this._hasCalledCameraZoomComplete = false;
    this._hasCalledParticleBurstStart = false;
    this._hasCalledComplete = false;
  }

  /**
   * Get the current raw progress (0-1)
   */
  public getProgress(): number {
    return this._progress;
  }
}
