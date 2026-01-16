/**
 * Custom ShaderMaterial for Constellation Nodes
 *
 * Uses direct GLSL shaders for full control over fragment output.
 * Implements the prototype's instanced node shader with Hilma af Klint mandala patterns.
 *
 * INV-A008: Custom ShaderMaterial for precise visual control
 */
import * as THREE from 'three';
import {
  instancedNodeVertexShader,
  instancedNodeFragmentShader,
} from '../shaders/node-shaders';

export interface CustomNodeMaterialConfig {
  /** Primary glow color (default: violet 0x9966cc) */
  colorPrimary?: THREE.Color;
  /** Secondary accent color (default: gold 0xd4a84b) */
  colorSecondary?: THREE.Color;
  /** Glow intensity multiplier (default: 0.8) */
  glowIntensity?: number;
  /** Light theme mode (0 = dark, 1 = light) */
  isLightTheme?: number;
}

export interface CustomNodeMaterialUniforms {
  uTime: THREE.IUniform<number>;
  uColorPrimary: THREE.IUniform<THREE.Color>;
  uColorSecondary: THREE.IUniform<THREE.Color>;
  uGlowIntensity: THREE.IUniform<number>;
  uIsLightTheme: THREE.IUniform<number>;
}

export interface CustomNodeMaterialResult {
  material: THREE.ShaderMaterial;
  uniforms: CustomNodeMaterialUniforms;
}

// Default colors from prototype
const DEFAULT_COLOR_PRIMARY = new THREE.Color(0x9966cc);  // Luminous Violet
const DEFAULT_COLOR_SECONDARY = new THREE.Color(0xd4a84b); // Sacred Gold

/**
 * Creates a custom ShaderMaterial for instanced constellation nodes
 *
 * Uses GLSL shaders directly for precise control over visual output.
 * Replicates the prototype's mandala patterns and bioluminescent effects.
 *
 * @param config - Material configuration options
 * @returns Material instance and uniform references
 */
export function createCustomNodeMaterial(
  config: CustomNodeMaterialConfig = {}
): CustomNodeMaterialResult {
  const {
    colorPrimary = DEFAULT_COLOR_PRIMARY.clone(),
    colorSecondary = DEFAULT_COLOR_SECONDARY.clone(),
    glowIntensity = 0.8,
    isLightTheme = 0,
  } = config;

  // Create uniforms object - cast to satisfy ShaderMaterial requirements
  const uniforms: CustomNodeMaterialUniforms = {
    uTime: { value: 0 },
    uColorPrimary: { value: colorPrimary },
    uColorSecondary: { value: colorSecondary },
    uGlowIntensity: { value: glowIntensity },
    uIsLightTheme: { value: isLightTheme },
  };

  // Create custom ShaderMaterial
  // Use NormalBlending for better visibility on dark backgrounds
  // AdditiveBlending can make things too dark when alpha < 1
  const material = new THREE.ShaderMaterial({
    uniforms: uniforms as unknown as Record<string, THREE.IUniform>,
    vertexShader: instancedNodeVertexShader,
    fragmentShader: instancedNodeFragmentShader,
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: true,
    blending: THREE.NormalBlending,
  });

  return { material, uniforms };
}

/**
 * Updates the time uniform for animation
 * @param uniforms - Uniform references from createCustomNodeMaterial
 * @param time - Current time in seconds
 */
export function updateCustomNodeMaterialTime(
  uniforms: CustomNodeMaterialUniforms,
  time: number
): void {
  uniforms.uTime.value = time;
}

/**
 * Updates the color uniforms
 * @param uniforms - Uniform references from createCustomNodeMaterial
 * @param primary - Primary color
 * @param secondary - Secondary color
 */
export function updateCustomNodeMaterialColors(
  uniforms: CustomNodeMaterialUniforms,
  primary?: THREE.Color,
  secondary?: THREE.Color
): void {
  if (primary) {
    uniforms.uColorPrimary.value.copy(primary);
  }
  if (secondary) {
    uniforms.uColorSecondary.value.copy(secondary);
  }
}

/**
 * Updates the theme mode
 * @param uniforms - Uniform references from createCustomNodeMaterial
 * @param isLightTheme - 0 for dark theme, 1 for light theme
 */
export function updateCustomNodeMaterialTheme(
  uniforms: CustomNodeMaterialUniforms,
  isLightTheme: boolean
): void {
  uniforms.uIsLightTheme.value = isLightTheme ? 1 : 0;
}

/**
 * Disposes of the custom node material (INV-A009)
 * @param material - Material to dispose
 */
export function disposeCustomNodeMaterial(material: THREE.ShaderMaterial): void {
  material.dispose();
}
