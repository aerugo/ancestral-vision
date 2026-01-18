/**
 * ConstellationAnimationSetup - Wires AnimationSystem with constellation materials
 *
 * Provides a typed interface for registering constellation visualization
 * materials with the central AnimationSystem.
 */
import type { AnimationSystem, AnimationDebugInfo } from '../core/animation-system';
import type { ShaderUniforms } from '../types';

/**
 * Standard shader loop names for constellation materials
 */
export const SHADER_LOOP_NAMES = {
  GHOST_NODES: 'ghostNodes',
  BIOGRAPHY_NODES: 'biographyNodes',
  EDGES: 'edges',
  BACKGROUND_PARTICLES: 'backgroundParticles',
  EVENT_FIREFLIES: 'eventFireflies',
} as const;

/**
 * Configuration for bulk material registration
 */
export interface ConstellationAnimationConfig {
  ghostNodes?: ShaderUniforms;
  biographyNodes?: ShaderUniforms;
  edges?: ShaderUniforms;
  backgroundParticles?: ShaderUniforms;
  eventFireflies?: ShaderUniforms;
}

/**
 * Registration status for all constellation materials
 */
export interface RegistrationStatus {
  ghostNodes: boolean;
  biographyNodes: boolean;
  edges: boolean;
  backgroundParticles: boolean;
  eventFireflies: boolean;
}

/**
 * ConstellationAnimationSetup - Setup utility for constellation animations
 */
export class ConstellationAnimationSetup {
  private readonly _system: AnimationSystem;

  public constructor(system: AnimationSystem) {
    this._system = system;
  }

  // ============================================================================
  // Individual Registration
  // ============================================================================

  /**
   * Register ghost node material uniforms
   */
  public registerGhostNodes(uniforms: ShaderUniforms): void {
    // Unregister first to handle re-registration
    this._system.unregisterShaderLoop(SHADER_LOOP_NAMES.GHOST_NODES);
    this._system.registerShaderLoop(SHADER_LOOP_NAMES.GHOST_NODES, uniforms);
  }

  /**
   * Register biography node material uniforms
   */
  public registerBiographyNodes(uniforms: ShaderUniforms): void {
    this._system.unregisterShaderLoop(SHADER_LOOP_NAMES.BIOGRAPHY_NODES);
    this._system.registerShaderLoop(SHADER_LOOP_NAMES.BIOGRAPHY_NODES, uniforms);
  }

  /**
   * Register edge material uniforms
   */
  public registerEdges(uniforms: ShaderUniforms): void {
    this._system.unregisterShaderLoop(SHADER_LOOP_NAMES.EDGES);
    this._system.registerShaderLoop(SHADER_LOOP_NAMES.EDGES, uniforms);
  }

  /**
   * Register background particles uniforms
   */
  public registerBackgroundParticles(uniforms: ShaderUniforms): void {
    this._system.unregisterShaderLoop(SHADER_LOOP_NAMES.BACKGROUND_PARTICLES);
    this._system.registerShaderLoop(SHADER_LOOP_NAMES.BACKGROUND_PARTICLES, uniforms);
  }

  /**
   * Register event fireflies uniforms
   */
  public registerEventFireflies(uniforms: ShaderUniforms): void {
    this._system.unregisterShaderLoop(SHADER_LOOP_NAMES.EVENT_FIREFLIES);
    this._system.registerShaderLoop(SHADER_LOOP_NAMES.EVENT_FIREFLIES, uniforms);
  }

  // ============================================================================
  // Bulk Registration
  // ============================================================================

  /**
   * Register all materials from config object
   */
  public registerAll(config: ConstellationAnimationConfig): void {
    if (config.ghostNodes) {
      this.registerGhostNodes(config.ghostNodes);
    }
    if (config.biographyNodes) {
      this.registerBiographyNodes(config.biographyNodes);
    }
    if (config.edges) {
      this.registerEdges(config.edges);
    }
    if (config.backgroundParticles) {
      this.registerBackgroundParticles(config.backgroundParticles);
    }
    if (config.eventFireflies) {
      this.registerEventFireflies(config.eventFireflies);
    }
  }

  // ============================================================================
  // Unregistration
  // ============================================================================

  /**
   * Unregister ghost node material
   */
  public unregisterGhostNodes(): void {
    this._system.unregisterShaderLoop(SHADER_LOOP_NAMES.GHOST_NODES);
  }

  /**
   * Unregister biography node material
   */
  public unregisterBiographyNodes(): void {
    this._system.unregisterShaderLoop(SHADER_LOOP_NAMES.BIOGRAPHY_NODES);
  }

  /**
   * Unregister edge material
   */
  public unregisterEdges(): void {
    this._system.unregisterShaderLoop(SHADER_LOOP_NAMES.EDGES);
  }

  /**
   * Unregister background particles
   */
  public unregisterBackgroundParticles(): void {
    this._system.unregisterShaderLoop(SHADER_LOOP_NAMES.BACKGROUND_PARTICLES);
  }

  /**
   * Unregister event fireflies
   */
  public unregisterEventFireflies(): void {
    this._system.unregisterShaderLoop(SHADER_LOOP_NAMES.EVENT_FIREFLIES);
  }

  /**
   * Unregister all materials
   */
  public unregisterAll(): void {
    this.unregisterGhostNodes();
    this.unregisterBiographyNodes();
    this.unregisterEdges();
    this.unregisterBackgroundParticles();
    this.unregisterEventFireflies();
  }

  // ============================================================================
  // Query
  // ============================================================================

  /**
   * Get registration status for all materials
   */
  public getRegistrationStatus(): RegistrationStatus {
    return {
      ghostNodes: this._system.hasShaderLoop(SHADER_LOOP_NAMES.GHOST_NODES),
      biographyNodes: this._system.hasShaderLoop(SHADER_LOOP_NAMES.BIOGRAPHY_NODES),
      edges: this._system.hasShaderLoop(SHADER_LOOP_NAMES.EDGES),
      backgroundParticles: this._system.hasShaderLoop(SHADER_LOOP_NAMES.BACKGROUND_PARTICLES),
      eventFireflies: this._system.hasShaderLoop(SHADER_LOOP_NAMES.EVENT_FIREFLIES),
    };
  }

  /**
   * Get count of registered materials
   */
  public getRegisteredCount(): number {
    const status = this.getRegistrationStatus();
    return Object.values(status).filter(Boolean).length;
  }

  // ============================================================================
  // Debug
  // ============================================================================

  /**
   * Get the underlying animation system (for advanced debugging)
   */
  public getAnimationSystem(): AnimationSystem {
    return this._system;
  }

  /**
   * Get debug info from the animation system
   */
  public getDebugInfo(): AnimationDebugInfo {
    return this._system.getDebugInfo();
  }
}
