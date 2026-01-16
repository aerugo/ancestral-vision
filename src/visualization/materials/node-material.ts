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
  cos,
  mul,
  add,
  sub,
  pow,
  max,
  dot,
  normalize,
  mix,
  smoothstep,
  negate,
  length,
  vec2,
  atan2,
  cameraPosition,
  positionWorld,
  positionLocal,
  normalWorld,
  normalLocal,
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
  /** Enable enhanced visual effects (Phase 9.1) */
  enhancedMode?: boolean;
  /** Inner glow intensity (default: 0.8, requires enhancedMode) */
  innerGlowIntensity?: number;
  /** Subsurface scattering strength (default: 0.3, requires enhancedMode) */
  sssStrength?: number;
  /** Mandala pattern intensity (default: 0.3, requires enhancedMode) */
  mandalaIntensity?: number;
}

export interface NodeMaterialUniforms {
  uTime: { value: number };
  uColorPrimary: { value: THREE.Color };
  uColorSecondary: { value: THREE.Color };
  uGlowIntensity: { value: number };
  uPulseSpeed: { value: number };
  uPulseAmplitude: { value: number };
  /** Enhanced mode uniforms (only present when enhancedMode=true) */
  uInnerGlowIntensity?: { value: number };
  uSSSStrength?: { value: number };
  uMandalaIntensity?: { value: number };
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
    enhancedMode = true, // Phase 2: Enable enhanced visual effects by default
    innerGlowIntensity = 0.8,
    sssStrength = 0.3,
    mandalaIntensity = 0.4, // Phase 6: Tuned to prototype value
  } = config;

  // Create base uniforms
  const uTime = uniform(0);
  const uColorPrimary = uniform(colorPrimary);
  const uColorSecondary = uniform(colorSecondary);
  const uGlowIntensity = uniform(glowIntensity);
  const uPulseSpeed = uniform(pulseSpeed);
  const uPulseAmplitude = uniform(pulseAmplitude);

  // Create enhanced mode uniforms (only when enabled)
  const uInnerGlowIntensity = enhancedMode ? uniform(innerGlowIntensity) : null;
  const uSSSStrength = enhancedMode ? uniform(sssStrength) : null;
  const uMandalaIntensity = enhancedMode ? uniform(mandalaIntensity) : null;

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

  // Enhanced visual effects (Phase 9.1)
  let enhancedColorContrib = float(0);
  let enhancedEmissiveContrib = float(0);

  if (enhancedMode && uInnerGlowIntensity && uSSSStrength && uMandalaIntensity) {
    // Inner glow: inverse fresnel for soft internal brightness
    // smoothstep(0.0, 0.8, 1.0 - fresnel) creates glow from center
    const innerGlow = smoothstep(float(0), float(0.8), sub(float(1), fresnel));
    const innerGlowEffect = mul(innerGlow, uInnerGlowIntensity);

    // Subsurface scattering: backlit effect
    // pow(max(dot(viewDir, -normal), 0.0), 2.0) simulates light passing through
    const backDot = max(dot(viewDir, negate(normalWorld)), float(0));
    const sss = mul(pow(backDot, float(2)), uSSSStrength);

    // Mandala pattern: concentric rings based on local normal
    // sin(ringDist * 15.0 - time * 0.8) creates animated rings
    const ringDist = length(vec2(normalLocal.x, normalLocal.y));
    const rings = mul(
      add(mul(sin(sub(mul(ringDist, float(15)), mul(uTime, float(0.8)))), float(0.5)), float(0.5)),
      uMandalaIntensity
    );

    // Golden spiral pattern overlay
    // sin(angle * 6.0 + ringDist * 25.0 - time * 0.5) creates rotating spiral
    const angle = atan2(normalLocal.y, normalLocal.x);
    const spiral = mul(
      smoothstep(
        float(0.6),
        float(0.8),
        sin(add(mul(angle, float(6)), sub(mul(ringDist, float(25)), mul(uTime, float(0.5)))))
      ),
      mul(uMandalaIntensity, float(0.5))
    );

    // Combine enhanced effects
    enhancedColorContrib = mul(add(rings, spiral), biographyWeight);
    enhancedEmissiveContrib = mul(add(innerGlowEffect, sss), biographyWeight);
  }

  // Create material
  const material = new MeshStandardNodeMaterial();

  // Apply color with optional enhanced patterns
  const finalColor = enhancedMode
    ? add(baseColor, mul(baseColor, enhancedColorContrib))
    : baseColor;
  material.colorNode = finalColor;

  // Apply emissive with optional enhanced glow
  const baseEmissive = mul(baseColor, mul(rimGlow, float(1.5)));
  const finalEmissive = enhancedMode
    ? add(baseEmissive, mul(baseColor, enhancedEmissiveContrib))
    : baseEmissive;
  material.emissiveNode = finalEmissive;
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
    // Add enhanced uniforms only when enabled
    ...(enhancedMode && uInnerGlowIntensity && {
      uInnerGlowIntensity: uInnerGlowIntensity as unknown as { value: number },
    }),
    ...(enhancedMode && uSSSStrength && {
      uSSSStrength: uSSSStrength as unknown as { value: number },
    }),
    ...(enhancedMode && uMandalaIntensity && {
      uMandalaIntensity: uMandalaIntensity as unknown as { value: number },
    }),
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
