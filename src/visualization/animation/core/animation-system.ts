/**
 * AnimationSystem - Central animation coordinator
 *
 * Provides a single entry point for all animation timing and control.
 * Coordinates TimeProvider, ShaderLoops, Transitions, Propagation, etc.
 */
import { TimeProvider } from './time-provider';
import { ShaderLoopRegistry } from '../loops/shader-loop-registry';
import type { ShaderUniforms } from '../types';

/**
 * Debug information for animation system
 */
export interface AnimationDebugInfo {
  elapsedTime: number;
  deltaTime: number;
  isPaused: boolean;
  timeScale: number;
  shaderLoopCount: number;
  shaderLoopNames: string[];
}

/**
 * AnimationSystem - Central coordinator for all animations
 */
export class AnimationSystem {
  private readonly _timeProvider: TimeProvider;
  private readonly _shaderLoops: ShaderLoopRegistry;

  public constructor() {
    this._timeProvider = new TimeProvider();
    this._shaderLoops = new ShaderLoopRegistry();

    // Set default max delta time to prevent catch-up after sleep
    this._timeProvider.setMaxDeltaTime(0.1); // 100ms max
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Update all animations
   * @param rawDeltaTime - Raw delta time in seconds from render loop
   */
  public update(rawDeltaTime: number): void {
    // Update time provider
    this._timeProvider.update(rawDeltaTime);

    // Update shader loops with elapsed time
    this._shaderLoops.update(this._timeProvider.getElapsedTime());
  }

  /**
   * Dispose all animation resources
   */
  public dispose(): void {
    this._shaderLoops.clear();
    this._timeProvider.reset();
  }

  // ============================================================================
  // Time Control
  // ============================================================================

  /**
   * Pause all animations
   */
  public pause(): void {
    this._timeProvider.pause();
  }

  /**
   * Resume all animations
   */
  public resume(): void {
    this._timeProvider.resume();
  }

  /**
   * Check if animations are paused
   */
  public isPaused(): boolean {
    return this._timeProvider.isPaused();
  }

  /**
   * Set global time scale
   * @param scale - 0.5 = half speed, 2.0 = double speed
   */
  public setTimeScale(scale: number): void {
    this._timeProvider.setTimeScale(scale);
  }

  /**
   * Get current time scale
   */
  public getTimeScale(): number {
    return this._timeProvider.getTimeScale();
  }

  /**
   * Get total elapsed time
   */
  public getElapsedTime(): number {
    return this._timeProvider.getElapsedTime();
  }

  /**
   * Get delta time from last update
   */
  public getDeltaTime(): number {
    return this._timeProvider.getDeltaTime();
  }

  // ============================================================================
  // Shader Loop Registration
  // ============================================================================

  /**
   * Register a shader's uTime uniform for automatic updates
   * @param name - Unique identifier for the loop
   * @param uniforms - Shader uniforms containing uTime
   */
  public registerShaderLoop(name: string, uniforms: ShaderUniforms): void {
    this._shaderLoops.register(name, uniforms);
  }

  /**
   * Unregister a shader loop
   * @param name - The loop name to unregister
   */
  public unregisterShaderLoop(name: string): void {
    this._shaderLoops.unregister(name);
  }

  /**
   * Check if a shader loop is registered
   */
  public hasShaderLoop(name: string): boolean {
    return this._shaderLoops.get(name) !== undefined;
  }

  // ============================================================================
  // Query
  // ============================================================================

  /**
   * Check if any animation is currently active
   */
  public isAnyAnimating(): boolean {
    // Currently only shader loops are tracked
    // Add checks for transitions, propagation, etc. when integrated
    return false;
  }

  /**
   * Get debug information about the animation system
   */
  public getDebugInfo(): AnimationDebugInfo {
    return {
      elapsedTime: this._timeProvider.getElapsedTime(),
      deltaTime: this._timeProvider.getDeltaTime(),
      isPaused: this._timeProvider.isPaused(),
      timeScale: this._timeProvider.getTimeScale(),
      shaderLoopCount: this._shaderLoops.count,
      shaderLoopNames: this._shaderLoops.names,
    };
  }
}
