/**
 * Post-Processing Pipeline
 * Bloom, vignette, and antialiasing effects
 *
 * INV-A001: WebGPURenderer Init - Ensure post-processing works after renderer init
 * INV-A009: Resource Disposal - Effect composer and passes disposed on cleanup
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export interface BloomConfig {
  enabled: boolean;
  intensity: number;
  threshold: number;
  radius: number;
}

export interface VignetteConfig {
  enabled: boolean;
  darkness: number;
  offset: number;
}

export interface PostProcessingConfig {
  bloom?: Partial<BloomConfig>;
  vignette?: Partial<VignetteConfig>;
}

interface ResolvedConfig {
  bloom: BloomConfig;
  vignette: VignetteConfig;
}

export interface PostProcessingResult {
  composer: EffectComposer;
  config: ResolvedConfig;
  bloomPass?: UnrealBloomPass;
  vignettePass?: ShaderPass;
}

const DEFAULT_BLOOM: BloomConfig = {
  enabled: true,
  intensity: 0.6,
  threshold: 0.8, // Phase 6: Tuned to prototype value
  radius: 0.5,
};

const DEFAULT_VIGNETTE: VignetteConfig = {
  enabled: true,
  darkness: 0.4,
  offset: 0.3,
};

/**
 * Custom vignette shader
 * Darkens edges of the screen for cinematic effect
 */
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    darkness: { value: 0.4 },
    offset: { value: 0.3 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float darkness;
    uniform float offset;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec2 center = vec2(0.5);
      float dist = distance(vUv, center);
      float vignette = smoothstep(0.8, offset, dist * (darkness + offset));
      color.rgb *= vignette;
      gl_FragColor = color;
    }
  `,
};

/**
 * Creates post-processing pipeline with bloom and vignette effects
 * @param renderer - Three.js renderer (WebGL or WebGPU)
 * @param scene - Scene to render
 * @param camera - Camera for rendering
 * @param config - Effect configuration
 * @returns Composer and effect references
 */
export function createPostProcessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  config: PostProcessingConfig = {}
): PostProcessingResult {
  const resolvedConfig: ResolvedConfig = {
    bloom: { ...DEFAULT_BLOOM, ...config.bloom },
    vignette: { ...DEFAULT_VIGNETTE, ...config.vignette },
  };

  // Get renderer size
  const size = new THREE.Vector2();
  renderer.getSize(size);

  // Create composer
  const composer = new EffectComposer(renderer);

  // Render pass (scene to buffer)
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  let bloomPass: UnrealBloomPass | undefined;
  let vignettePass: ShaderPass | undefined;

  // Bloom pass - creates glow on bright elements
  if (resolvedConfig.bloom.enabled) {
    bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.x, size.y),
      resolvedConfig.bloom.intensity,
      resolvedConfig.bloom.radius,
      resolvedConfig.bloom.threshold
    );
    composer.addPass(bloomPass);
  }

  // Vignette pass - darkens screen edges
  if (resolvedConfig.vignette.enabled) {
    vignettePass = new ShaderPass(VignetteShader);
    vignettePass.uniforms.darkness.value = resolvedConfig.vignette.darkness;
    vignettePass.uniforms.offset.value = resolvedConfig.vignette.offset;
    composer.addPass(vignettePass);
  }

  // Output pass (color space correction)
  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  return {
    composer,
    config: resolvedConfig,
    bloomPass,
    vignettePass,
  };
}

/**
 * Updates post-processing render size on window resize
 * @param composer - Effect composer
 * @param width - New width
 * @param height - New height
 */
export function updatePostProcessingSize(
  composer: EffectComposer,
  width: number,
  height: number
): void {
  composer.setSize(width, height);
}

/**
 * Renders scene with post-processing effects
 * @param composer - Effect composer
 */
export function renderWithPostProcessing(composer: EffectComposer): void {
  composer.render();
}

/**
 * Disposes post-processing resources (INV-A009)
 * @param composer - Effect composer to dispose
 */
export function disposePostProcessing(composer: EffectComposer): void {
  composer.dispose();
}
