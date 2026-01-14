/**
 * TSL Node Material for Constellation Spheres
 * Implements biography-driven scaling, pulsing, and Fresnel glow
 *
 * INV-A008: Use three/webgpu for material classes, three/tsl for shader nodes
 */
import * as THREE from 'three';
import { MeshStandardNodeMaterial } from 'three/webgpu';
import {
  uniform,
  attribute,
  float,
  sin,
  mul,
  add,
  sub,
  pow,
  max,
  dot,
  normalize,
  mix,
  cameraPosition,
  positionWorld,
  normalWorld,
} from 'three/tsl';
import { createNoiseFunction } from '../shaders/noise';

export interface NodeMaterialConfig {
  /** Primary glow color (default: violet 0x9966cc) */
  colorPrimary?: THREE.Color;
  /** Secondary accent color (default: gold 0xd4a84b) */
  colorSecondary?: THREE.Color;
  /** Glow intensity multiplier (default: 1.5) */
  glowIntensity?: number;
  /** Pulsing animation speed (default: 2.0) */
  pulseSpeed?: number;
  /** Pulsing amplitude (default: 0.05) */
  pulseAmplitude?: number;
}

export interface NodeMaterialUniforms {
  uTime: { value: number };
  uColorPrimary: { value: THREE.Color };
  uColorSecondary: { value: THREE.Color };
  uGlowIntensity: { value: number };
  uPulseSpeed: { value: number };
  uPulseAmplitude: { value: number };
}

export interface NodeMaterialResult {
  material: THREE.Material;
  uniforms: NodeMaterialUniforms;
}

// Default colors from prototype
const DEFAULT_COLOR_PRIMARY = new THREE.Color(0x9966cc);  // Luminous Violet
const DEFAULT_COLOR_SECONDARY = new THREE.Color(0xd4a84b); // Sacred Gold

/**
 * Creates a TSL-based node material with all visual effects
 * @param config - Material configuration options
 * @returns Material instance and uniform references
 */
export function createNodeMaterial(config: NodeMaterialConfig = {}): NodeMaterialResult {
  const {
    colorPrimary = DEFAULT_COLOR_PRIMARY.clone(),
    colorSecondary = DEFAULT_COLOR_SECONDARY.clone(),
    glowIntensity = 1.5,
    pulseSpeed = 2.0,
    pulseAmplitude = 0.05,
  } = config;

  // Create uniforms
  const uTime = uniform(0);
  const uColorPrimary = uniform(colorPrimary);
  const uColorSecondary = uniform(colorSecondary);
  const uGlowIntensity = uniform(glowIntensity);
  const uPulseSpeed = uniform(pulseSpeed);
  const uPulseAmplitude = uniform(pulseAmplitude);

  // Instance attribute for biography weight (set per-instance)
  const biographyWeight = attribute('aBiographyWeight');

  // Pulsing animation: sin(time * speed + weight * 2pi) * amplitude * weight
  const pulsePhase = add(mul(uTime, uPulseSpeed), mul(biographyWeight, 6.28));
  const pulse = mul(mul(sin(pulsePhase), uPulseAmplitude), biographyWeight);

  // Fresnel rim glow
  const viewDir = normalize(sub(cameraPosition, positionWorld));
  const fresnel = pow(sub(float(1), max(dot(viewDir, normalWorld), 0)), 3);

  // Noise-based color variation
  const noiseFn = createNoiseFunction({ scale: 0.1, octaves: 2 });
  const noiseValue = noiseFn(add(positionWorld, mul(uTime, 0.2)));

  // Mix colors based on noise and biography weight
  const colorMix = mul(mul(add(noiseValue, 1), 0.5), biographyWeight);
  const baseColor = mix(uColorPrimary, uColorSecondary, colorMix);

  // Glow intensity based on fresnel and biography weight
  const glowPulse = add(mul(mul(sin(add(mul(uTime, 3), mul(biographyWeight, 10))), 0.15), biographyWeight), 1);
  const rimGlow = mul(mul(mul(fresnel, add(mul(biographyWeight, 2), 1)), uGlowIntensity), glowPulse);

  // Create material
  const material = new MeshStandardNodeMaterial();
  material.colorNode = baseColor;
  material.emissiveNode = mul(baseColor, mul(rimGlow, 1.5));
  material.metalness = 0.3;
  material.roughness = 0.7;
  material.transparent = true;
  material.opacity = 0.9;

  // Return material and uniforms for external control
  const uniforms: NodeMaterialUniforms = {
    uTime: uTime as unknown as { value: number },
    uColorPrimary: uColorPrimary as unknown as { value: THREE.Color },
    uColorSecondary: uColorSecondary as unknown as { value: THREE.Color },
    uGlowIntensity: uGlowIntensity as unknown as { value: number },
    uPulseSpeed: uPulseSpeed as unknown as { value: number },
    uPulseAmplitude: uPulseAmplitude as unknown as { value: number },
  };

  return { material, uniforms };
}

/**
 * Updates the time uniform for animation
 * @param uniforms - Uniform references from createNodeMaterial
 * @param time - Current time in seconds
 */
export function updateNodeMaterialTime(uniforms: NodeMaterialUniforms, time: number): void {
  uniforms.uTime.value = time;
}

/**
 * Disposes of the node material (INV-A009)
 * @param material - Material to dispose
 */
export function disposeNodeMaterial(material: THREE.Material): void {
  material.dispose();
}
