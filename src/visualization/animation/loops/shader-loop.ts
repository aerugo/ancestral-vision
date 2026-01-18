/**
 * ShaderLoop - Wrapper for continuous shader animations
 *
 * Manages a shader's uTime uniform with optional frequency and phase modifiers.
 * Integrates with TimeProvider for centralized time control.
 */
import type { ShaderUniforms } from '../types';

/**
 * ShaderLoop - Drives a shader's uTime uniform
 */
export class ShaderLoop {
  private readonly _uniforms: ShaderUniforms;
  private _frequencyMultiplier: number = 1.0;
  private _phaseOffset: number = 0;

  /**
   * Create a new ShaderLoop for the given uniforms
   * @param uniforms - Shader uniforms containing uTime
   */
  public constructor(uniforms: ShaderUniforms) {
    this._uniforms = uniforms;
  }

  /**
   * Update the shader's uTime uniform
   * @param elapsedTime - Total elapsed time from TimeProvider
   */
  public update(elapsedTime: number): void {
    const modifiedTime = elapsedTime * this._frequencyMultiplier + this._phaseOffset;
    this._uniforms.uTime.value = modifiedTime;
  }

  /**
   * Set frequency multiplier (speed up or slow down the animation)
   * @param multiplier - 2.0 = double speed, 0.5 = half speed
   */
  public setFrequencyMultiplier(multiplier: number): void {
    this._frequencyMultiplier = multiplier;
  }

  /**
   * Get current frequency multiplier
   */
  public getFrequencyMultiplier(): number {
    return this._frequencyMultiplier;
  }

  /**
   * Set phase offset (shift the animation timing)
   * @param offset - Time offset in seconds
   */
  public setPhaseOffset(offset: number): void {
    this._phaseOffset = offset;
  }

  /**
   * Get current phase offset
   */
  public getPhaseOffset(): number {
    return this._phaseOffset;
  }

  /**
   * Dispose of the shader loop
   */
  public dispose(): void {
    // Currently no resources to clean up, but here for future use
  }
}
