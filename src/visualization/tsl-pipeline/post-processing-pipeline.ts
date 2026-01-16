/**
 * TSL Post-Processing Pipeline for WebGPU/WebGL
 *
 * Phase 1 & 3: WebGPU Graphics Engine
 *
 * INV-A008: Use three/webgpu for classes, three/tsl for shader nodes
 * INV-A009: Resource Disposal - PostProcessing disposed on cleanup
 * INV-A012: TSL Bloom Import - Import from three/addons/tsl/display/BloomNode.js
 * INV-A013: PostProcessing Unified - Works with both WebGPU and WebGL renderers
 * INV-A014: Effect Composition - Compose via node addition
 */
import * as THREE from 'three';
import { PostProcessing } from 'three/webgpu';
import {
  pass,
  screenUV,
  smoothstep,
  length,
  sub,
  vec2,
  mul,
  float,
  uniform,
} from 'three/tsl';
// INV-A012: Correct bloom import from addons
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
// Phase 3: Enhanced effects
import { dof } from 'three/addons/tsl/display/DepthOfFieldNode.js';
import { chromaticAberration } from 'three/addons/tsl/display/ChromaticAberrationNode.js';
import { film } from 'three/addons/tsl/display/FilmNode.js';

/**
 * Bloom effect configuration
 */
export interface BloomConfig {
  enabled: boolean;
  strength: number;
  radius: number;
  threshold: number;
}

/**
 * Vignette effect configuration
 */
export interface VignetteConfig {
  enabled: boolean;
  darkness: number;
  offset: number;
}

/**
 * Phase 3: Depth of Field effect configuration
 */
export interface DepthOfFieldConfig {
  enabled: boolean;
  focusDistance: number;  // Distance to focus plane in world units
  focalLength: number;    // Depth of field range in world units
  bokehScale: number;     // Artistic bokeh size multiplier
}

/**
 * Phase 3: Chromatic Aberration effect configuration
 */
export interface ChromaticAberrationConfig {
  enabled: boolean;
  strength: number;       // Aberration strength (0.0 - 0.1 typical)
  center: { x: number; y: number };  // Effect center in UV space
  scale: number;          // Radial scale factor
}

/**
 * Phase 3: Film Grain effect configuration
 */
export interface FilmGrainConfig {
  enabled: boolean;
  intensity: number;      // Grain intensity (0.0 - 1.0)
}

/**
 * Post-processing pipeline configuration
 */
export interface PostProcessingPipelineConfig {
  bloom: BloomConfig;
  vignette: VignetteConfig;
  // Phase 3: Optional enhanced effects
  dof?: DepthOfFieldConfig;
  chromaticAberration?: ChromaticAberrationConfig;
  filmGrain?: FilmGrainConfig;
}

/**
 * Runtime-controllable uniforms for post-processing effects
 */
export interface PostProcessingPipelineUniforms {
  // Phase 1 uniforms
  bloomStrength: { value: number };
  bloomRadius: { value: number };
  bloomThreshold: { value: number };
  vignetteDarkness: { value: number };
  vignetteOffset: { value: number };
  // Phase 3 uniforms (optional)
  dofFocusDistance?: { value: number };
  dofFocalLength?: { value: number };
  dofBokehScale?: { value: number };
  caStrength?: { value: number };
  filmIntensity?: { value: number };
}

/**
 * Result of creating a post-processing pipeline
 */
export interface PostProcessingPipelineResult {
  postProcessing: PostProcessing;
  config: PostProcessingPipelineConfig;
  uniforms: PostProcessingPipelineUniforms;
  bloomNode: ReturnType<typeof bloom> | null;
  // Phase 3: Additional effect nodes
  dofNode: ReturnType<typeof dof> | null;
  chromaticAberrationNode: ReturnType<typeof chromaticAberration> | null;
  filmGrainNode: ReturnType<typeof film> | null;
}

/**
 * Default bloom configuration matching prototype visual style
 * Prototype uses intensity: 0.6 with postprocessing library for luminous halos
 */
const DEFAULT_BLOOM: BloomConfig = {
  enabled: true,
  strength: 0.4,    // Reduced for pattern preservation
  radius: 0.4,      // Medium radius for soft glow spread
  threshold: 0.4,   // Raised to preserve internal patterns
};

/**
 * Default vignette configuration
 */
const DEFAULT_VIGNETTE: VignetteConfig = {
  enabled: true,
  darkness: 0.4,
  offset: 0.3,
};

/**
 * Creates a TSL-based post-processing pipeline with bloom, vignette, and optional
 * enhanced effects (DOF, chromatic aberration, film grain).
 *
 * This function creates a unified post-processing pipeline that works with both
 * WebGPU and WebGL renderers (INV-A013). The bloom effect is imported from the
 * correct path (INV-A012) and effects are composed via node addition (INV-A014).
 *
 * Effect composition order: Bloom -> DOF -> Chromatic Aberration -> Film Grain -> Vignette
 *
 * @param renderer - Three.js renderer (WebGPU or WebGL)
 * @param scene - Scene to render
 * @param camera - Camera for rendering
 * @param config - Optional effect configuration
 * @returns PostProcessing instance, config, uniforms, and effect nodes
 *
 * @example
 * ```typescript
 * const result = createPostProcessingPipeline(renderer, scene, camera, {
 *   bloom: { enabled: true, strength: 1.5, radius: 0.6, threshold: 0.2 },
 *   vignette: { enabled: true, darkness: 0.4, offset: 0.3 },
 *   dof: { enabled: true, focusDistance: 10, focalLength: 5, bokehScale: 2 },
 *   chromaticAberration: { enabled: true, strength: 0.02, center: { x: 0.5, y: 0.5 }, scale: 1 },
 *   filmGrain: { enabled: true, intensity: 0.3 },
 * });
 *
 * // In render loop:
 * renderWithPostProcessing(result);
 *
 * // Update effects at runtime:
 * result.uniforms.bloomStrength.value = 2.0;
 * result.uniforms.filmIntensity.value = 0.5;
 *
 * // On cleanup:
 * disposePostProcessingPipeline(result);
 * ```
 */
export function createPostProcessingPipeline(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  config: Partial<PostProcessingPipelineConfig> = {}
): PostProcessingPipelineResult {
  // Merge with defaults
  const resolvedConfig: PostProcessingPipelineConfig = {
    bloom: { ...DEFAULT_BLOOM, ...config.bloom },
    vignette: { ...DEFAULT_VIGNETTE, ...config.vignette },
    dof: config.dof,
    chromaticAberration: config.chromaticAberration,
    filmGrain: config.filmGrain,
  };

  // Create uniforms for runtime control - Phase 1
  const uBloomStrength = uniform(resolvedConfig.bloom.strength);
  const uBloomRadius = uniform(resolvedConfig.bloom.radius);
  const uBloomThreshold = uniform(resolvedConfig.bloom.threshold);
  const uVignetteDarkness = uniform(resolvedConfig.vignette.darkness);
  const uVignetteOffset = uniform(resolvedConfig.vignette.offset);

  // Create uniforms for Phase 3 effects
  const uDofFocusDistance = resolvedConfig.dof?.enabled
    ? uniform(resolvedConfig.dof.focusDistance)
    : null;
  const uDofFocalLength = resolvedConfig.dof?.enabled
    ? uniform(resolvedConfig.dof.focalLength)
    : null;
  const uDofBokehScale = resolvedConfig.dof?.enabled
    ? uniform(resolvedConfig.dof.bokehScale)
    : null;
  const uCaStrength = resolvedConfig.chromaticAberration?.enabled
    ? uniform(resolvedConfig.chromaticAberration.strength)
    : null;
  const uFilmIntensity = resolvedConfig.filmGrain?.enabled
    ? uniform(resolvedConfig.filmGrain.intensity)
    : null;

  // Create post-processing instance (INV-A013: works with both renderers)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const postProcessing = new PostProcessing(renderer as any);

  // Scene render pass
  const scenePass = pass(scene, camera);
  const scenePassColor = scenePass.getTextureNode('output');
  const scenePassDepth = scenePass.getTextureNode('depth');

  // Start with scene color - use any to avoid complex TSL type issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let outputNode: any = scenePassColor;
  let bloomNode: ReturnType<typeof bloom> | null = null;
  let dofNode: ReturnType<typeof dof> | null = null;
  let chromaticAberrationNode: ReturnType<typeof chromaticAberration> | null = null;
  let filmGrainNode: ReturnType<typeof film> | null = null;

  // ============================================================
  // Effect Composition Order: Bloom -> DOF -> CA -> Film -> Vignette
  // ============================================================

  // 1. Bloom effect (INV-A012: correct import, INV-A014: compose via addition)
  if (resolvedConfig.bloom.enabled) {
    bloomNode = bloom(
      scenePassColor,
      uBloomStrength.value,
      uBloomRadius.value,
      uBloomThreshold.value
    );

    // Store uniform references on the bloom node for runtime updates
    if (bloomNode) {
      bloomNode.strength = uBloomStrength;
      bloomNode.radius = uBloomRadius;
      bloomNode.threshold = uBloomThreshold;
    }

    // INV-A014: Compose via addition
    outputNode = scenePassColor.add(bloomNode);
  }

  // 2. DOF effect (Phase 3)
  if (resolvedConfig.dof?.enabled && uDofFocusDistance && uDofFocalLength && uDofBokehScale) {
    dofNode = dof(
      outputNode,
      scenePassDepth,
      uDofFocusDistance,
      uDofFocalLength,
      uDofBokehScale
    );
    outputNode = dofNode;
  }

  // 3. Chromatic Aberration effect (Phase 3)
  if (resolvedConfig.chromaticAberration?.enabled && uCaStrength) {
    const caCenter = vec2(
      float(resolvedConfig.chromaticAberration.center.x),
      float(resolvedConfig.chromaticAberration.center.y)
    );
    const caScale = float(resolvedConfig.chromaticAberration.scale);

    chromaticAberrationNode = chromaticAberration(
      outputNode,
      uCaStrength,
      caCenter,
      caScale
    );
    outputNode = chromaticAberrationNode;
  }

  // 4. Film Grain effect (Phase 3)
  if (resolvedConfig.filmGrain?.enabled && uFilmIntensity) {
    filmGrainNode = film(outputNode, uFilmIntensity);
    outputNode = filmGrainNode;
  }

  // 5. Vignette effect (applied last)
  if (resolvedConfig.vignette.enabled) {
    const center = vec2(float(0.5), float(0.5));
    const dist = length(sub(screenUV, center));
    const vignetteStrength = smoothstep(
      float(0.8),
      uVignetteOffset,
      mul(dist, mul(uVignetteDarkness, float(2.0)))
    );

    outputNode = mul(outputNode, vignetteStrength);
  }

  // Set the final output node
  postProcessing.outputNode = outputNode as typeof postProcessing.outputNode;

  // Create uniform references for external control
  const uniforms: PostProcessingPipelineUniforms = {
    bloomStrength: uBloomStrength as unknown as { value: number },
    bloomRadius: uBloomRadius as unknown as { value: number },
    bloomThreshold: uBloomThreshold as unknown as { value: number },
    vignetteDarkness: uVignetteDarkness as unknown as { value: number },
    vignetteOffset: uVignetteOffset as unknown as { value: number },
    // Phase 3 uniforms (only included when enabled)
    ...(uDofFocusDistance && {
      dofFocusDistance: uDofFocusDistance as unknown as { value: number },
    }),
    ...(uDofFocalLength && {
      dofFocalLength: uDofFocalLength as unknown as { value: number },
    }),
    ...(uDofBokehScale && {
      dofBokehScale: uDofBokehScale as unknown as { value: number },
    }),
    ...(uCaStrength && {
      caStrength: uCaStrength as unknown as { value: number },
    }),
    ...(uFilmIntensity && {
      filmIntensity: uFilmIntensity as unknown as { value: number },
    }),
  };

  return {
    postProcessing,
    config: resolvedConfig,
    uniforms,
    bloomNode,
    dofNode,
    chromaticAberrationNode,
    filmGrainNode,
  };
}

/**
 * Updates post-processing render size on window resize.
 *
 * Note: PostProcessing class doesn't have a setSize method - it uses the
 * renderer's current size. The renderer should be resized first, then
 * BloomNode and DOF will automatically update their internal render targets.
 *
 * @param result - PostProcessing pipeline result
 * @param width - New width in pixels (for effect node size update)
 * @param height - New height in pixels (for effect node size update)
 */
export function updatePostProcessingSize(
  result: PostProcessingPipelineResult,
  width: number,
  height: number
): void {
  // BloomNode handles its own size updates via setSize
  if (result.bloomNode && 'setSize' in result.bloomNode) {
    (result.bloomNode as { setSize: (w: number, h: number) => void }).setSize(width, height);
  }
  // DOF node also has setSize
  if (result.dofNode && 'setSize' in result.dofNode) {
    (result.dofNode as { setSize: (w: number, h: number) => void }).setSize(width, height);
  }
}

/**
 * Renders the scene with post-processing effects.
 *
 * @param result - PostProcessing pipeline result
 */
export function renderWithPostProcessing(result: PostProcessingPipelineResult): void {
  result.postProcessing.render();
}

/**
 * Disposes all post-processing resources (INV-A009).
 *
 * Must be called when the post-processing pipeline is no longer needed
 * to prevent memory leaks.
 *
 * @param result - PostProcessing pipeline result to dispose
 */
export function disposePostProcessingPipeline(result: PostProcessingPipelineResult): void {
  // Dispose the main post-processing instance
  result.postProcessing.dispose();

  // Dispose all effect nodes if present
  if (result.bloomNode) {
    result.bloomNode.dispose();
  }
  if (result.dofNode) {
    result.dofNode.dispose();
  }
  if (result.chromaticAberrationNode) {
    result.chromaticAberrationNode.dispose();
  }
  if (result.filmGrainNode) {
    result.filmGrainNode.dispose();
  }
}
