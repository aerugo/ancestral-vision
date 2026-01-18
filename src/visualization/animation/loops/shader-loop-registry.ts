/**
 * ShaderLoopRegistry - Manages all shader loop instances
 *
 * Provides centralized registration and updating of all shader animations.
 * Ensures all uTime uniforms are updated through TimeProvider.
 */
import { ShaderLoop } from './shader-loop';
import type { ShaderUniforms } from '../types';

/**
 * ShaderLoopRegistry - Central registry for shader loops
 */
export class ShaderLoopRegistry {
  private readonly _loops: Map<string, ShaderLoop> = new Map();

  /**
   * Register a shader loop
   * @param name - Unique identifier for the loop
   * @param uniforms - Shader uniforms containing uTime
   * @returns The registered ShaderLoop (or existing one if name already registered)
   */
  public register(name: string, uniforms: ShaderUniforms): ShaderLoop {
    const existing = this._loops.get(name);
    if (existing) {
      return existing;
    }

    const loop = new ShaderLoop(uniforms);
    this._loops.set(name, loop);
    return loop;
  }

  /**
   * Unregister a shader loop by name
   * @param name - The loop name to unregister
   */
  public unregister(name: string): void {
    const loop = this._loops.get(name);
    if (loop) {
      loop.dispose();
      this._loops.delete(name);
    }
  }

  /**
   * Get a registered loop by name
   * @param name - The loop name
   * @returns The ShaderLoop or undefined if not found
   */
  public get(name: string): ShaderLoop | undefined {
    return this._loops.get(name);
  }

  /**
   * Update all registered shader loops
   * @param elapsedTime - Total elapsed time from TimeProvider
   */
  public update(elapsedTime: number): void {
    for (const loop of this._loops.values()) {
      loop.update(elapsedTime);
    }
  }

  /**
   * Clear all registered loops
   */
  public clear(): void {
    for (const loop of this._loops.values()) {
      loop.dispose();
    }
    this._loops.clear();
  }

  /**
   * Get the number of registered loops
   */
  public get count(): number {
    return this._loops.size;
  }

  /**
   * Get all registered loop names
   */
  public get names(): string[] {
    return Array.from(this._loops.keys());
  }
}
