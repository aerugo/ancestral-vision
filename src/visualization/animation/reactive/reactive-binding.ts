/**
 * ReactiveBinding - State-to-visual animation binding
 *
 * Manages smooth transitions between state-driven visual values.
 * Optionally provides smooth interpolation over time.
 */
import type { ReactiveBindingConfig } from '../types';

/**
 * ReactiveBinding - Binds state to animated visual values
 */
export class ReactiveBinding<T> {
  private readonly _transform: (state: T) => number;
  private readonly _initialState: T;
  private _state: T;
  private _currentValue: number;
  private _startValue: number;
  private _targetValue: number;
  private _transitionDuration: number; // in seconds
  private _transitionProgress: number = 1; // 1 = complete

  public constructor(config: ReactiveBindingConfig<T>) {
    this._state = config.initialState;
    this._initialState = config.initialState;
    this._transform = config.transform;
    this._transitionDuration = (config.transitionDuration ?? 0) / 1000; // Convert ms to seconds
    this._currentValue = this._transform(this._state);
    this._startValue = this._currentValue;
    this._targetValue = this._currentValue;
  }

  /**
   * Get the current animated value
   */
  public getValue(): number {
    return this._currentValue;
  }

  /**
   * Get the current state
   */
  public getState(): T {
    return this._state;
  }

  /**
   * Set a new state (triggers transition if duration > 0)
   */
  public setState(state: T): void {
    this._state = state;
    this._targetValue = this._transform(state);

    if (this._transitionDuration <= 0) {
      // Immediate mode
      this._currentValue = this._targetValue;
      this._transitionProgress = 1;
    } else {
      // Start transition from current value
      this._startValue = this._currentValue;
      this._transitionProgress = 0;
    }
  }

  /**
   * Update the binding (call each frame for smooth transitions)
   * @param deltaTime - Time elapsed in seconds
   */
  public update(deltaTime: number): void {
    if (this._transitionProgress >= 1) {
      return; // Already complete
    }

    if (this._transitionDuration <= 0) {
      this._currentValue = this._targetValue;
      this._transitionProgress = 1;
      return;
    }

    // Advance transition
    this._transitionProgress += deltaTime / this._transitionDuration;
    this._transitionProgress = Math.min(1, this._transitionProgress);

    // Linear interpolation from start to target
    this._currentValue = this._startValue + (this._targetValue - this._startValue) * this._transitionProgress;

    if (this._transitionProgress >= 1) {
      this._currentValue = this._targetValue;
    }
  }

  /**
   * Whether a transition is currently in progress
   */
  public isTransitioning(): boolean {
    return this._transitionProgress < 1;
  }

  /**
   * Set the transition duration
   * @param durationMs - Duration in milliseconds
   */
  public setTransitionDuration(durationMs: number): void {
    this._transitionDuration = durationMs / 1000;
  }

  /**
   * Dispose and reset to initial value
   */
  public dispose(): void {
    this._transitionProgress = 1;
    this._currentValue = this._transform(this._initialState);
    this._targetValue = this._currentValue;
    this._startValue = this._currentValue;
  }
}
