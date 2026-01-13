/**
 * Camera Animator
 *
 * Provides smooth camera animation with various easing functions.
 * Used for animating the camera to focus on selected people in the constellation.
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
} as const satisfies Record<string, EasingFunction>;

/**
 * Easing function names
 */
type EasingName = keyof typeof easings;

/**
 * Animation options
 */
interface AnimationOptions {
  /** Animation duration in seconds (default: 1) */
  duration?: number;
  /** Easing function name (default: 'easeInOutCubic') */
  easing?: EasingName;
  /** Callback when animation completes */
  onComplete?: () => void;
}

/**
 * CameraAnimator - Smooth camera animation with easing
 *
 * Animates a Three.js camera from its current position to a target position
 * while keeping it looking at a specified point.
 */
export class CameraAnimator {
  private _camera: THREE.Camera;
  private _startPosition: THREE.Vector3 = new THREE.Vector3();
  private _targetPosition: THREE.Vector3 = new THREE.Vector3();
  private _lookAtTarget: THREE.Vector3 = new THREE.Vector3();
  private _progress: number = 1; // Start at 1 (completed state)
  private _duration: number = 1;
  private _easing: EasingFunction = easings['easeInOutCubic']!;
  private _onComplete?: () => void;
  private _hasCompletedCallback: boolean = false;

  /**
   * Create a new camera animator
   * @param camera The camera to animate
   */
  public constructor(camera: THREE.Camera) {
    this._camera = camera;
  }

  /**
   * Start animating to a target position
   * @param position Target position for the camera
   * @param lookAt Point the camera should look at
   * @param options Animation options
   */
  public animateTo(
    position: THREE.Vector3,
    lookAt: THREE.Vector3,
    options: AnimationOptions = {}
  ): void {
    this._startPosition.copy(this._camera.position);
    this._targetPosition.copy(position);
    this._lookAtTarget.copy(lookAt);
    this._progress = 0;
    this._duration = options.duration ?? 1;
    const easingKey = options.easing ?? 'easeInOutCubic';
    this._easing = easings[easingKey] ?? easings['easeInOutCubic'];
    this._onComplete = options.onComplete;
    this._hasCompletedCallback = false;
  }

  /**
   * Update the animation
   * @param deltaTime Time elapsed since last update in seconds
   */
  public update(deltaTime: number): void {
    if (this._progress >= 1) return;

    this._progress += deltaTime / this._duration;

    if (this._progress >= 1) {
      this._progress = 1;
      this._camera.position.copy(this._targetPosition);
      this._camera.lookAt(this._lookAtTarget);

      // Call onComplete only once
      if (!this._hasCompletedCallback && this._onComplete) {
        this._hasCompletedCallback = true;
        this._onComplete();
      }
    } else {
      const t = this._easing(this._progress);
      this._camera.position.lerpVectors(this._startPosition, this._targetPosition, t);
      this._camera.lookAt(this._lookAtTarget);
    }
  }

  /**
   * Check if an animation is currently in progress
   * @returns true if animating, false otherwise
   */
  public isAnimating(): boolean {
    return this._progress < 1;
  }

  /**
   * Stop the current animation immediately
   */
  public stop(): void {
    this._progress = 1;
  }
}
