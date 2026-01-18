/**
 * PhaseAnimator - Multi-phase animation coordinator
 *
 * Manages complex animations with multiple sequential/overlapping phases.
 * Designed for particle effects and other multi-stage GPU animations.
 */
import type { AnimationDefinition, PhaseDefinition } from '../types';

/**
 * Callbacks for phase events
 */
export interface PhaseAnimatorCallbacks {
  onPhaseEnter?: (phase: string, progress: number) => void;
  onPhaseExit?: (phase: string, progress: number) => void;
  onPhaseProgress?: (phase: string, progress: number, phaseProgress: number) => void;
  onComplete?: () => void;
}

/**
 * PhaseAnimator - Coordinates multi-phase animations
 */
export class PhaseAnimator {
  private readonly _definition: AnimationDefinition;
  private readonly _callbacks: PhaseAnimatorCallbacks;

  private _progress: number = 0;
  private _isAnimating: boolean = false;
  private _isComplete: boolean = false;
  private _activePhases: Set<string> = new Set();

  public constructor(definition: AnimationDefinition, callbacks: PhaseAnimatorCallbacks = {}) {
    this._definition = definition;
    this._callbacks = callbacks;
  }

  /**
   * Start the animation
   */
  public start(): void {
    this._progress = 0;
    this._isAnimating = true;
    this._isComplete = false;
    this._activePhases.clear();
  }

  /**
   * Update the animation
   * @param deltaTime - Time elapsed in seconds
   */
  public update(deltaTime: number): void {
    if (!this._isAnimating) {
      return;
    }

    const previousProgress = this._progress;
    this._progress = Math.min(1, this._progress + deltaTime / this._definition.duration);

    this._detectPhaseTransitions(previousProgress, this._progress);
    this._emitPhaseProgress();

    if (this._progress >= 1) {
      this._isAnimating = false;
      this._isComplete = true;
      this._callbacks.onComplete?.();
    }
  }

  /**
   * Get overall animation progress (0-1)
   */
  public get progress(): number {
    return this._progress;
  }

  /**
   * Whether animation is currently running
   */
  public isAnimating(): boolean {
    return this._isAnimating;
  }

  /**
   * Whether animation has completed
   */
  public isComplete(): boolean {
    return this._isComplete;
  }

  /**
   * Get the name of the current primary phase
   */
  public getCurrentPhase(): string | null {
    if (!this._isAnimating && !this._isComplete) {
      return null;
    }

    for (const phase of this._definition.phases) {
      if (this._isInPhase(phase, this._progress)) {
        return phase.name;
      }
    }

    return null;
  }

  /**
   * Get progress within a specific phase (0-1)
   */
  public getPhaseProgress(phaseName: string): number | null {
    const phase = this._definition.phases.find((p) => p.name === phaseName);
    if (!phase || !this._isInPhase(phase, this._progress)) {
      return null;
    }

    const phaseRange = phase.end - phase.start;
    if (phaseRange <= 0) return 1;

    return (this._progress - phase.start) / phaseRange;
  }

  /**
   * Get all currently active phases
   */
  public getActivePhases(): string[] {
    return Array.from(this._activePhases);
  }

  /**
   * Cancel the animation
   */
  public cancel(): void {
    this._isAnimating = false;
  }

  /**
   * Dispose and clean up
   */
  public dispose(): void {
    this._isAnimating = false;
    this._isComplete = false;
    this._activePhases.clear();
    this._progress = 0;
  }

  private _isInPhase(phase: PhaseDefinition, progress: number): boolean {
    return progress >= phase.start && progress < phase.end;
  }

  private _detectPhaseTransitions(prevProgress: number, currProgress: number): void {
    for (const phase of this._definition.phases) {
      const wasInPhase = this._isInPhase(phase, prevProgress);
      const isInPhase = this._isInPhase(phase, currProgress);
      const wasActive = this._activePhases.has(phase.name);

      // Check if we crossed into the phase (or started at 0 inside it)
      if (!wasActive && (isInPhase || wasInPhase)) {
        this._activePhases.add(phase.name);
        this._callbacks.onPhaseEnter?.(phase.name, currProgress);
      }

      // Check if we crossed out of the phase
      if (this._activePhases.has(phase.name) && !isInPhase) {
        this._activePhases.delete(phase.name);
        this._callbacks.onPhaseExit?.(phase.name, currProgress);
      }
    }
  }

  private _emitPhaseProgress(): void {
    for (const phaseName of this._activePhases) {
      const phaseProgress = this.getPhaseProgress(phaseName);
      if (phaseProgress !== null) {
        this._callbacks.onPhaseProgress?.(phaseName, this._progress, phaseProgress);
      }
    }
  }
}
