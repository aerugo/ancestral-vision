/**
 * GraphicsEngine - Unified rendering engine for Ancestral Vision
 *
 * Phase 4: Graphics Engine Class
 *
 * Invariants:
 * - INV-A001: WebGPURenderer Init - Must `await renderer.init()` before use
 * - INV-A002: Animation Loop - Use `setAnimationLoop()` not `requestAnimationFrame()`
 * - INV-A008: WebGPU Imports - Use `three/webgpu` and `three/tsl` import paths
 * - INV-A009: Resource Disposal - Dispose all resources on cleanup
 */
import * as THREE from 'three';
import { createRenderer } from './renderer';
import {
  createPostProcessingPipeline,
  disposePostProcessingPipeline,
  updatePostProcessingSize,
  renderWithPostProcessing,
  type BloomConfig,
  type VignetteConfig,
  type DepthOfFieldConfig,
  type ChromaticAberrationConfig,
  type FilmGrainConfig,
  type PostProcessingPipelineConfig,
  type PostProcessingPipelineResult,
  type PostProcessingPipelineUniforms,
} from './tsl-pipeline/post-processing-pipeline';
import {
  PerformancePreset,
  applyPerformanceConfig,
  type PerformanceConfig,
} from './tsl-pipeline/performance-config';

/**
 * GraphicsEngine configuration options
 */
export interface GraphicsEngineConfig {
  /** Enable antialiasing (default: true) */
  antialias?: boolean;
  /** Pixel ratio limit (default: 2) */
  pixelRatio?: number;
  /** Scene background color (default: 0x0a0612) */
  backgroundColor?: number;
  /** Camera field of view in degrees (default: 60) */
  fov?: number;
  /** Camera near plane (default: 0.1) */
  near?: number;
  /** Camera far plane (default: 2000) */
  far?: number;
  /** Initial camera Z position (default: 100) */
  cameraZ?: number;

  // Performance options (Phase 5)
  /** Performance preset (default: HIGH) */
  performancePreset?: PerformancePreset;
  /** Custom performance config overrides */
  performanceConfig?: Partial<PerformanceConfig>;

  // Post-processing options (from Phase 1-3)
  bloom?: BloomConfig;
  vignette?: VignetteConfig;
  dof?: DepthOfFieldConfig;
  chromaticAberration?: ChromaticAberrationConfig;
  filmGrain?: FilmGrainConfig;
}

/**
 * Result of creating a GraphicsEngine
 */
export interface GraphicsEngineResult {
  engine: GraphicsEngine;
  uniforms: PostProcessingPipelineUniforms;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<Omit<GraphicsEngineConfig, 'bloom' | 'vignette' | 'dof' | 'chromaticAberration' | 'filmGrain' | 'performancePreset' | 'performanceConfig'>> = {
  antialias: true,
  pixelRatio: 2,
  backgroundColor: 0x0a0612,
  fov: 60,
  near: 0.1,
  far: 2000,
  cameraZ: 100,
};

/**
 * GraphicsEngine class encapsulating all rendering functionality
 *
 * Provides:
 * - Unified renderer (WebGPU with WebGL fallback)
 * - TSL post-processing pipeline from Phases 1-3
 * - Clean lifecycle management (init, start, stop, dispose)
 * - Runtime effect control via uniforms
 */
export class GraphicsEngine {
  /** The Three.js renderer (WebGPU or WebGL) */
  public readonly renderer: THREE.WebGLRenderer;

  /** The main scene */
  public readonly scene: THREE.Scene;

  /** The perspective camera */
  public readonly camera: THREE.PerspectiveCamera;

  /** Post-processing pipeline result */
  private readonly _postProcessingResult: PostProcessingPipelineResult;

  /** Running state */
  private _running = false;

  /** Disposed state */
  private _disposed = false;

  /**
   * Creates a new GraphicsEngine instance
   *
   * Use the factory function `createGraphicsEngine` instead of calling this directly.
   *
   * @param renderer - The renderer instance
   * @param scene - The scene instance
   * @param camera - The camera instance
   * @param postProcessingResult - The post-processing pipeline result
   */
  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    postProcessingResult: PostProcessingPipelineResult
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this._postProcessingResult = postProcessingResult;
  }

  /**
   * Starts the animation loop (INV-A002)
   *
   * Uses setAnimationLoop for proper WebGPU/WebGL compatibility.
   */
  public start(): void {
    if (this._disposed || this._running) return;

    this._running = true;
    this.renderer.setAnimationLoop(() => {
      this._animate();
    });
  }

  /**
   * Stops the animation loop
   */
  public stop(): void {
    if (!this._running) return;

    this._running = false;
    this.renderer.setAnimationLoop(null);
  }

  /**
   * Resizes the renderer and updates camera/post-processing
   *
   * @param width - New width in pixels
   * @param height - New height in pixels
   */
  public resize(width: number, height: number): void {
    if (this._disposed) return;

    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    updatePostProcessingSize(this._postProcessingResult, width, height);
  }

  /**
   * Disposes all resources (INV-A009)
   *
   * Must be called when the engine is no longer needed to prevent memory leaks.
   */
  public dispose(): void {
    if (this._disposed) return;

    this._disposed = true;
    this.stop();

    disposePostProcessingPipeline(this._postProcessingResult);
    this.renderer.dispose();
  }

  /**
   * Returns whether the engine is currently running
   */
  public isRunning(): boolean {
    return this._running;
  }

  /**
   * Returns whether the engine has been disposed
   */
  public isDisposed(): boolean {
    return this._disposed;
  }

  /**
   * Returns the post-processing pipeline result for advanced access
   */
  public getPostProcessingResult(): PostProcessingPipelineResult {
    return this._postProcessingResult;
  }

  /**
   * Internal animation frame handler
   */
  private _animate(): void {
    if (!this._running || this._disposed) return;

    renderWithPostProcessing(this._postProcessingResult);
  }
}

/**
 * Creates a GraphicsEngine instance
 *
 * This is an async factory function that handles:
 * - Renderer creation (with WebGPU init if supported)
 * - Scene and camera setup
 * - Post-processing pipeline initialization
 *
 * @param container - DOM element to render into
 * @param config - Optional configuration
 * @returns Promise resolving to engine and uniforms
 *
 * @example
 * ```typescript
 * const { engine, uniforms } = await createGraphicsEngine(container, {
 *   bloom: { enabled: true, strength: 1.5, radius: 0.6, threshold: 0.2 },
 *   vignette: { enabled: true, darkness: 0.4, offset: 0.3 },
 * });
 *
 * engine.start();
 *
 * // Adjust effects at runtime
 * uniforms.bloomStrength.value = 2.0;
 *
 * // Cleanup
 * engine.dispose();
 * ```
 */
export async function createGraphicsEngine(
  container: HTMLElement,
  config: GraphicsEngineConfig = {}
): Promise<GraphicsEngineResult> {
  // Merge with defaults
  const resolvedConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  // Create canvas element
  const canvas = document.createElement('canvas');
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  container.appendChild(canvas);

  // Create renderer (async for WebGPU init - INV-A001)
  const renderer = await createRenderer(canvas);

  // Create scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(resolvedConfig.backgroundColor);

  // Create camera
  const aspect = container.clientWidth / container.clientHeight;
  const camera = new THREE.PerspectiveCamera(
    resolvedConfig.fov,
    aspect,
    resolvedConfig.near,
    resolvedConfig.far
  );
  camera.position.set(0, 0, resolvedConfig.cameraZ);

  // Build post-processing config from engine config
  let postProcessingConfig: Partial<PostProcessingPipelineConfig> = {};

  if (config.bloom) {
    postProcessingConfig.bloom = config.bloom;
  }
  if (config.vignette) {
    postProcessingConfig.vignette = config.vignette;
  }
  if (config.dof) {
    postProcessingConfig.dof = config.dof;
  }
  if (config.chromaticAberration) {
    postProcessingConfig.chromaticAberration = config.chromaticAberration;
  }
  if (config.filmGrain) {
    postProcessingConfig.filmGrain = config.filmGrain;
  }

  // Apply performance configuration (Phase 5)
  // Default to HIGH preset if not specified
  const preset = config.performancePreset ?? PerformancePreset.HIGH;
  postProcessingConfig = applyPerformanceConfig(
    preset,
    postProcessingConfig,
    config.performanceConfig
  );

  // Create post-processing pipeline (from Phases 1-3)
  const postProcessingResult = createPostProcessingPipeline(
    renderer,
    scene,
    camera,
    postProcessingConfig
  );

  // Create engine instance
  const engine = new GraphicsEngine(
    renderer,
    scene,
    camera,
    postProcessingResult
  );

  return {
    engine,
    uniforms: postProcessingResult.uniforms,
  };
}
