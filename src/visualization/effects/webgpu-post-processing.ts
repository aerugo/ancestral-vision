/**
 * TSL Post-Processing Pipeline for WebGPU
 * Bloom and vignette effects using Three.js Shading Language
 *
 * INV-A008: Use three/webgpu for classes, three/tsl for shader nodes
 * INV-A009: Resource Disposal - PostProcessing disposed on cleanup
 *
 * Phase 9.3: WebGPU-compatible post-processing that works with both
 * WebGPURenderer and WebGLRenderer (via TSL fallback)
 */
import * as THREE from 'three';
import { PostProcessing } from 'three/webgpu';
import {
  uniform,
  float,
  vec2,
  mul,
  add,
  sub,
  smoothstep,
  length,
  pass,
  output,
  screenUV,
} from 'three/tsl';

export interface TSLBloomConfig {
  enabled: boolean;
  intensity: number;
  threshold: number;
  radius: number;
}

export interface TSLVignetteConfig {
  enabled: boolean;
  darkness: number;
  offset: number;
}

export interface TSLPostProcessingConfig {
  bloom?: Partial<TSLBloomConfig>;
  vignette?: Partial<TSLVignetteConfig>;
}

interface ResolvedConfig {
  bloom: TSLBloomConfig;
  vignette: TSLVignetteConfig;
}

export interface TSLPostProcessingUniforms {
  uBloomIntensity: { value: number };
  uBloomThreshold: { value: number };
  uVignetteDarkness: { value: number };
  uVignetteOffset: { value: number };
}

export interface TSLPostProcessingResult {
  postProcessing: PostProcessing;
  config: ResolvedConfig;
  uniforms: TSLPostProcessingUniforms;
}

const DEFAULT_BLOOM: TSLBloomConfig = {
  enabled: true,
  intensity: 1.5,  // Phase 6: Significantly increased for prototype-matching ethereal halos
  threshold: 0.2,  // Phase 6: Lowered significantly to capture more glow
  radius: 0.6,
};

const DEFAULT_VIGNETTE: TSLVignetteConfig = {
  enabled: true,
  darkness: 0.4,
  offset: 0.3,
};

/**
 * Creates TSL-based post-processing pipeline for WebGPU/WebGL
 * @param renderer - Three.js renderer (WebGPU or WebGL)
 * @param scene - Scene to render
 * @param camera - Camera for rendering
 * @param config - Effect configuration
 * @returns PostProcessing instance, config, and uniforms
 */
export function createTSLPostProcessing(
  renderer: THREE.WebGLRenderer | THREE.Renderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  config: TSLPostProcessingConfig = {}
): TSLPostProcessingResult {
  const resolvedConfig: ResolvedConfig = {
    bloom: { ...DEFAULT_BLOOM, ...config.bloom },
    vignette: { ...DEFAULT_VIGNETTE, ...config.vignette },
  };

  // Create uniforms for dynamic control
  const uBloomIntensity = uniform(resolvedConfig.bloom.intensity);
  const uBloomThreshold = uniform(resolvedConfig.bloom.threshold);
  const uVignetteDarkness = uniform(resolvedConfig.vignette.darkness);
  const uVignetteOffset = uniform(resolvedConfig.vignette.offset);

  // Create post-processing instance
  const postProcessing = new PostProcessing(renderer as THREE.Renderer);

  // Scene render pass
  const scenePass = pass(scene, camera);
  let outputNode = scenePass.getTextureNode();

  // Note: Three.js TSL doesn't have a built-in bloom function
  // The bloom effect is achieved through:
  // 1. Additive blending on emissive materials (node-material.ts)
  // 2. WebGL EffectComposer bloom when using WebGLRenderer
  // For WebGPU, we rely on the additive blending for glow effect

  // Apply vignette effect if enabled
  if (resolvedConfig.vignette.enabled) {
    // TSL vignette: darken edges based on distance from center
    // center = vec2(0.5, 0.5)
    // dist = distance(uv, center)
    // vignette = smoothstep(0.8, offset, dist * (darkness + offset))
    const center = vec2(float(0.5), float(0.5));
    const dist = length(sub(screenUV, center));
    const vignetteStrength = smoothstep(
      float(0.8),
      uVignetteOffset,
      mul(dist, add(uVignetteDarkness, uVignetteOffset))
    );
    // Apply vignette by multiplying color by vignette strength
    outputNode = mul(outputNode, vignetteStrength);
  }

  // Apply output color space correction
  postProcessing.outputNode = output(outputNode);

  // Uniform references for external control
  const uniforms: TSLPostProcessingUniforms = {
    uBloomIntensity: uBloomIntensity as unknown as { value: number },
    uBloomThreshold: uBloomThreshold as unknown as { value: number },
    uVignetteDarkness: uVignetteDarkness as unknown as { value: number },
    uVignetteOffset: uVignetteOffset as unknown as { value: number },
  };

  return {
    postProcessing,
    config: resolvedConfig,
    uniforms,
  };
}

/**
 * Updates post-processing render size on window resize
 * @param postProcessing - PostProcessing instance
 * @param width - New width
 * @param height - New height
 */
export function updateTSLPostProcessingSize(
  postProcessing: PostProcessing,
  width: number,
  height: number
): void {
  postProcessing.setSize(width, height);
}

/**
 * Renders scene with TSL post-processing effects
 * @param postProcessing - PostProcessing instance
 */
export function renderWithTSLPostProcessing(postProcessing: PostProcessing): void {
  postProcessing.render();
}

/**
 * Disposes TSL post-processing resources (INV-A009)
 * @param postProcessing - PostProcessing instance to dispose
 */
export function disposeTSLPostProcessing(postProcessing: PostProcessing): void {
  postProcessing.dispose();
}
