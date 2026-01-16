/**
 * Cloud Node Material for Mystical Gas Sphere Planets
 *
 * Uses volumetric cloud shaders adapted from "Protean Clouds" by nimitz.
 * Creates illuminated flowing gas textures on spherical constellation nodes.
 *
 * Features:
 * - Volumetric cloud rendering with raymarching
 * - Multi-octave turbulence for organic flow
 * - Subsurface scattering simulation
 * - Fresnel rim glow for atmospheric depth
 * - Sacred color palette integration
 * - Biography weight-driven visual intensity
 */
import * as THREE from 'three';
import {
  cloudNodeVertexShader,
  cloudNodeFragmentShader,
} from '../shaders/cloud-shaders';

export interface CloudNodeMaterialConfig {
  /** Primary cloud color (default: ethereal violet 0x7755aa) */
  colorPrimary?: THREE.Color;
  /** Secondary accent color (default: cosmic gold 0xd4a84b) */
  colorSecondary?: THREE.Color;
  /** Tertiary rim color (default: mystic teal 0x4a7d7c) */
  colorTertiary?: THREE.Color;
  /** Rim glow intensity (default: 0.8) */
  glowIntensity?: number;
  /** Cloud density multiplier (default: 1.0) */
  cloudDensity?: number;
  /** Cloud pattern scale (default: 1.0) */
  cloudScale?: number;
  /** Flow animation speed (default: 1.0) */
  flowSpeed?: number;
  /** Turbulence intensity (default: 1.0) */
  turbulence?: number;
  /** Light/illumination intensity (default: 1.0) */
  lightIntensity?: number;
  /** Light theme mode (0 = dark, 1 = light) */
  isLightTheme?: number;
}

export interface CloudNodeMaterialUniforms {
  uTime: THREE.IUniform<number>;
  uColorPrimary: THREE.IUniform<THREE.Color>;
  uColorSecondary: THREE.IUniform<THREE.Color>;
  uColorTertiary: THREE.IUniform<THREE.Color>;
  uGlowIntensity: THREE.IUniform<number>;
  uCloudDensity: THREE.IUniform<number>;
  uCloudScale: THREE.IUniform<number>;
  uFlowSpeed: THREE.IUniform<number>;
  uTurbulence: THREE.IUniform<number>;
  uLightIntensity: THREE.IUniform<number>;
  uIsLightTheme: THREE.IUniform<number>;
}

export interface CloudNodeMaterialResult {
  material: THREE.ShaderMaterial;
  uniforms: CloudNodeMaterialUniforms;
}

// Default colors for mystic gas sphere aesthetic
const DEFAULT_COLOR_PRIMARY = new THREE.Color(0x7755aa); // Ethereal Violet
const DEFAULT_COLOR_SECONDARY = new THREE.Color(0xd4a84b); // Cosmic Gold
const DEFAULT_COLOR_TERTIARY = new THREE.Color(0x4a7d7c); // Mystic Teal

/**
 * Creates a ShaderMaterial for instanced cloud nodes
 *
 * Uses GLSL shaders directly for volumetric cloud rendering.
 * Adapts the Protean Clouds algorithm for spherical node surfaces.
 *
 * @param config - Material configuration options
 * @returns Material instance and uniform references
 */
export function createCloudNodeMaterial(
  config: CloudNodeMaterialConfig = {}
): CloudNodeMaterialResult {
  const {
    colorPrimary = DEFAULT_COLOR_PRIMARY.clone(),
    colorSecondary = DEFAULT_COLOR_SECONDARY.clone(),
    colorTertiary = DEFAULT_COLOR_TERTIARY.clone(),
    glowIntensity = 0.8,
    cloudDensity = 1.0,
    cloudScale = 1.0,
    flowSpeed = 1.0,
    turbulence = 1.0,
    lightIntensity = 1.0,
    isLightTheme = 0,
  } = config;

  // Create uniforms object
  const uniforms: CloudNodeMaterialUniforms = {
    uTime: { value: 0 },
    uColorPrimary: { value: colorPrimary },
    uColorSecondary: { value: colorSecondary },
    uColorTertiary: { value: colorTertiary },
    uGlowIntensity: { value: glowIntensity },
    uCloudDensity: { value: cloudDensity },
    uCloudScale: { value: cloudScale },
    uFlowSpeed: { value: flowSpeed },
    uTurbulence: { value: turbulence },
    uLightIntensity: { value: lightIntensity },
    uIsLightTheme: { value: isLightTheme },
  };

  // Create custom ShaderMaterial
  const material = new THREE.ShaderMaterial({
    uniforms: uniforms as unknown as Record<string, THREE.IUniform>,
    vertexShader: cloudNodeVertexShader,
    fragmentShader: cloudNodeFragmentShader,
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: true,
    blending: THREE.NormalBlending,
  });

  return { material, uniforms };
}

/**
 * Updates the time uniform for animation
 * @param uniforms - Uniform references from createCloudNodeMaterial
 * @param time - Current time in seconds
 */
export function updateCloudNodeMaterialTime(
  uniforms: CloudNodeMaterialUniforms,
  time: number
): void {
  uniforms.uTime.value = time;
}

/**
 * Updates the color uniforms
 * @param uniforms - Uniform references from createCloudNodeMaterial
 * @param primary - Primary color
 * @param secondary - Secondary color
 * @param tertiary - Tertiary color
 */
export function updateCloudNodeMaterialColors(
  uniforms: CloudNodeMaterialUniforms,
  primary?: THREE.Color,
  secondary?: THREE.Color,
  tertiary?: THREE.Color
): void {
  if (primary) {
    uniforms.uColorPrimary.value.copy(primary);
  }
  if (secondary) {
    uniforms.uColorSecondary.value.copy(secondary);
  }
  if (tertiary) {
    uniforms.uColorTertiary.value.copy(tertiary);
  }
}

/**
 * Updates the theme mode
 * @param uniforms - Uniform references from createCloudNodeMaterial
 * @param isLightTheme - true for light theme, false for dark theme
 */
export function updateCloudNodeMaterialTheme(
  uniforms: CloudNodeMaterialUniforms,
  isLightTheme: boolean
): void {
  uniforms.uIsLightTheme.value = isLightTheme ? 1 : 0;
}

/**
 * Updates cloud visual parameters
 * @param uniforms - Uniform references from createCloudNodeMaterial
 * @param params - Cloud parameters to update
 */
export function updateCloudNodeMaterialParams(
  uniforms: CloudNodeMaterialUniforms,
  params: {
    cloudDensity?: number;
    cloudScale?: number;
    flowSpeed?: number;
    turbulence?: number;
    lightIntensity?: number;
    glowIntensity?: number;
  }
): void {
  if (params.cloudDensity !== undefined) {
    uniforms.uCloudDensity.value = params.cloudDensity;
  }
  if (params.cloudScale !== undefined) {
    uniforms.uCloudScale.value = params.cloudScale;
  }
  if (params.flowSpeed !== undefined) {
    uniforms.uFlowSpeed.value = params.flowSpeed;
  }
  if (params.turbulence !== undefined) {
    uniforms.uTurbulence.value = params.turbulence;
  }
  if (params.lightIntensity !== undefined) {
    uniforms.uLightIntensity.value = params.lightIntensity;
  }
  if (params.glowIntensity !== undefined) {
    uniforms.uGlowIntensity.value = params.glowIntensity;
  }
}

/**
 * Disposes of the cloud node material (INV-A009)
 * @param material - Material to dispose
 */
export function disposeCloudNodeMaterial(material: THREE.ShaderMaterial): void {
  material.dispose();
}

/**
 * Cloud preset configurations for different visual styles
 */
export const CLOUD_PRESETS = {
  /** Default mystical gas giant appearance */
  default: {
    cloudDensity: 1.0,
    cloudScale: 1.0,
    flowSpeed: 1.0,
    turbulence: 1.0,
    lightIntensity: 1.0,
    glowIntensity: 0.8,
  },

  /** Slow, ethereal nebula clouds */
  nebula: {
    cloudDensity: 0.7,
    cloudScale: 1.5,
    flowSpeed: 0.5,
    turbulence: 0.8,
    lightIntensity: 0.9,
    glowIntensity: 1.2,
  },

  /** Fast, turbulent storm system */
  storm: {
    cloudDensity: 1.3,
    cloudScale: 0.8,
    flowSpeed: 2.0,
    turbulence: 1.5,
    lightIntensity: 1.2,
    glowIntensity: 0.6,
  },

  /** Soft, dreamy atmosphere */
  dream: {
    cloudDensity: 0.5,
    cloudScale: 2.0,
    flowSpeed: 0.3,
    turbulence: 0.5,
    lightIntensity: 0.8,
    glowIntensity: 1.5,
  },

  /** Dense, Jupiter-like gas giant */
  gasGiant: {
    cloudDensity: 1.5,
    cloudScale: 0.6,
    flowSpeed: 0.8,
    turbulence: 1.2,
    lightIntensity: 1.1,
    glowIntensity: 0.5,
  },

  /** Bright, sun-like corona */
  solar: {
    cloudDensity: 0.8,
    cloudScale: 1.2,
    flowSpeed: 1.5,
    turbulence: 1.0,
    lightIntensity: 1.5,
    glowIntensity: 2.0,
  },
} as const;

export type CloudPreset = keyof typeof CLOUD_PRESETS;

/**
 * Creates a cloud node material with a preset configuration
 * @param preset - Preset name
 * @param config - Additional configuration to override preset values
 * @returns Material instance and uniform references
 */
export function createCloudNodeMaterialWithPreset(
  preset: CloudPreset,
  config: Partial<CloudNodeMaterialConfig> = {}
): CloudNodeMaterialResult {
  const presetConfig = CLOUD_PRESETS[preset];
  return createCloudNodeMaterial({
    ...presetConfig,
    ...config,
  });
}
