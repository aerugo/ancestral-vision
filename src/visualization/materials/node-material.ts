/**
 * TSL Node Material for Constellation Spheres
 * Implements biography-driven scaling, pulsing, and Fresnel glow
 *
 * INV-A008: Use three/webgpu for material classes, three/tsl for shader nodes
 */
import * as THREE from "three";
import { MeshBasicNodeMaterial } from "three/webgpu";
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
  vec3,
  abs,
  atan,
  cameraPosition,
  positionWorld,
  positionLocal,
  normalWorld,
  normalLocal,
} from "three/tsl";
import { createNoiseFunction } from "../shaders/noise";

export interface NodeMaterialConfig {
  /** Primary glow color (default: violet 0x9966cc) */
  colorPrimary?: THREE.Color;
  /** Secondary accent color (default: gold 0xd4a84b) */
  colorSecondary?: THREE.Color;
  /** Glow intensity multiplier (default: 2.5) */
  glowIntensity?: number;
  /** Pulsing animation speed (default: 2.0) */
  pulseSpeed?: number;
  /** Pulsing amplitude (default: 0.05) */
  pulseAmplitude?: number;
  /** Enable enhanced visual effects (Phase 9.1) */
  enhancedMode?: boolean;
  /** Inner glow intensity (default: 2.0, requires enhancedMode) */
  innerGlowIntensity?: number;
  /** Subsurface scattering strength (default: 0.5, requires enhancedMode) */
  sssStrength?: number;
  /** Mandala pattern intensity (default: 1.0, requires enhancedMode) */
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
const DEFAULT_COLOR_PRIMARY = new THREE.Color(0x9966cc); // Luminous Violet
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
    glowIntensity = 0.7, // Match prototype glow intensity
    pulseSpeed = 2.0,
    pulseAmplitude = 0.05,
    enhancedMode = true,
    innerGlowIntensity = 1.0, // Prototype: smoothstep(0.0, 0.8, 1.0 - fresnel)
    sssStrength = 0.3, // Prototype: pow(backDot, 2.0) * 0.3
    mandalaIntensity = 1.0, // Scale for pattern visibility
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
  const biographyWeight = attribute("aBiographyWeight");

  // Pulsing animation: sin(time * speed + weight * 2pi) * amplitude * weight
  const pulsePhase = add(mul(uTime, uPulseSpeed), mul(biographyWeight, 6.28));
  const pulse = mul(mul(sin(pulsePhase), uPulseAmplitude), biographyWeight);

  // Fresnel rim glow
  const viewDir = normalize(sub(cameraPosition, positionWorld));
  const fresnel = pow(sub(float(1), max(dot(viewDir, normalWorld), 0)), 3);

  // Noise-based color variation
  const noiseFn = createNoiseFunction({ scale: 0.15, octaves: 3 });
  const noiseValue = noiseFn(add(positionWorld, mul(uTime, 0.15)));

  // Mix colors based on noise and biography weight - stronger gold presence
  // Use higher multiplier for more visible gold swirls in biography-rich nodes
  const colorMix = mul(mul(add(noiseValue, 1), 0.7), biographyWeight);
  const baseColor = mix(uColorPrimary, uColorSecondary, colorMix);

  // Glow intensity based on fresnel and biography weight
  const glowPulse = add(
    mul(mul(sin(add(mul(uTime, 3), mul(biographyWeight, 10))), 0.15), biographyWeight),
    1
  );
  const rimGlow = mul(
    mul(mul(fresnel, add(mul(biographyWeight, 2), 1)), uGlowIntensity),
    glowPulse
  );

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

    // ========== HILMA AF KLINT MANDALA PATTERNS ==========
    // Based on prototype's instancedNodeFragmentShader - uses NORMAL coordinates
    // Creates the distinctive swirling marble effect

    // UV coordinates from normal (sphere surface mapping)
    const uvX = normalLocal.x;
    const uvY = normalLocal.y;
    const r = length(vec2(uvX, uvY));
    const theta = atan(uvY, uvX);

    // --- Concentric breathing circles ---
    const circlesPhase = sub(mul(r, float(20)), mul(uTime, float(0.6)));
    const circlesRaw = mul(add(sin(circlesPhase), 1), 0.5); // Normalize to 0-1
    const circles = smoothstep(float(0.4), float(0.6), circlesRaw);

    // --- 7-fold rotational petals (sacred geometry) ---
    const petalsPhase = add(mul(theta, float(7)), mul(uTime, float(0.3)));
    const petals = smoothstep(float(0), float(0.8), sin(petalsPhase));

    // --- Golden spiral (phi-based) - key to marble swirl effect ---
    const goldenAngle = float(2.39996); // Golden angle in radians
    const spiralPhase = sub(
      mul(r, float(15)),
      add(mul(theta, goldenAngle), mul(uTime, float(0.4)))
    );
    const spiral = smoothstep(float(0.5), float(0.9), sin(spiralPhase));

    // Combine mandala patterns
    const mandalaBase = add(add(mul(circles, 0.4), mul(petals, 0.3)), mul(spiral, 0.3));
    const mandalaIntensityVal = mul(mandalaBase, uMandalaIntensity);

    // --- Ring pattern overlay (prototype lines 493-495) ---
    const ringDist = r;
    const ringsPhase = sub(mul(ringDist, float(15)), mul(uTime, float(0.8)));
    const ringsRaw = mul(add(sin(ringsPhase), 1), 0.5);
    const ringPattern = mul(
      smoothstep(float(0.3), float(0.6), ringsRaw),
      mul(biographyWeight, float(0.3))
    );

    // --- Sacred geometry spiral overlay (prototype lines 498-500) ---
    const spiralAngle = theta;
    const spiralOverlayPhase = add(
      mul(spiralAngle, float(6)),
      sub(mul(ringDist, float(25)), mul(uTime, float(0.5)))
    );
    const spiralPattern = mul(
      smoothstep(float(0.6), float(0.8), sin(spiralOverlayPhase)),
      mul(biographyWeight, float(0.25))
    );

    // --- Haeckel radiolarian hexagonal structure (prototype lines 502-505) ---
    const hexBase = abs(cos(mul(theta, float(3))));
    const hexMask = mul(
      smoothstep(float(0.2), float(0.5), ringDist),
      smoothstep(float(0.7), float(0.4), ringDist)
    );
    const hexPattern = mul(mul(hexBase, hexMask), mul(biographyWeight, float(0.15)));

    // --- Bioluminescent spots from noise (prototype lines 512-513) ---
    const spotNoise = createNoiseFunction({ scale: 0.3, octaves: 2 });
    const spotValue = spotNoise(sub(positionWorld, mul(uTime, float(0.15))));
    const bioSpots = mul(
      smoothstep(float(0.6), float(0.8), spotValue),
      mul(biographyWeight, float(0.4))
    );

    // Combine all patterns
    const totalPattern = add(add(add(mandalaIntensityVal, ringPattern), spiralPattern), hexPattern);
    enhancedColorContrib = mul(add(totalPattern, bioSpots), biographyWeight);
    enhancedEmissiveContrib = mul(
      add(add(innerGlowEffect, sss), mul(bioSpots, float(0.5))),
      biographyWeight
    );
  }

  // Create material - use MeshBasicNodeMaterial so it doesn't require scene lighting
  const material = new MeshBasicNodeMaterial();

  // Sacred geometry colors (prototype lines 483-486)
  const sacredGold = vec3(0.83, 0.66, 0.29);
  const etherealRose = vec3(0.79, 0.55, 0.55);
  const mysticTeal = vec3(0.29, 0.49, 0.44);

  // Inner glow: smoothstep(0.0, 0.8, 1.0 - fresnel) - bright at center
  const innerGlow = smoothstep(float(0), float(0.8), sub(float(1), fresnel));

  // Start with base color scaled by inner glow - good brightness for visible nodes
  let finalColor = mul(mul(baseColor, innerGlow), float(0.6));

  // Add sacred geometry pattern colors
  if (enhancedMode) {
    finalColor = add(finalColor, mul(sacredGold, mul(enhancedColorContrib, float(0.15))));
    finalColor = add(finalColor, mul(etherealRose, mul(enhancedColorContrib, float(0.12))));
    finalColor = add(finalColor, mul(mysticTeal, mul(enhancedColorContrib, float(0.08))));
  }

  // For MeshBasicNodeMaterial, add rim glow for visual interest
  const baseEmissive = mul(baseColor, mul(rimGlow, float(0.2)));
  let finalEmissive = baseEmissive;
  if (enhancedMode) {
    finalEmissive = add(
      finalEmissive,
      mul(uColorSecondary, mul(enhancedEmissiveContrib, float(0.08)))
    );
    finalEmissive = add(finalEmissive, mul(sacredGold, mul(enhancedEmissiveContrib, float(0.1))));
  }

  // Combine and clamp - allow brighter colors since we fixed the edge fog
  const combinedColor = add(finalColor, finalEmissive);
  const clampedColor = combinedColor.clamp(vec3(float(0)), vec3(float(0.85)));
  material.colorNode = clampedColor;
  material.transparent = true;
  material.opacity = 0.9;
  // Use normal blending to preserve patterns, emissive provides the glow
  material.blending = THREE.NormalBlending;

  // Return material and uniforms for external control
  const uniforms: NodeMaterialUniforms = {
    uTime: uTime as unknown as { value: number },
    uColorPrimary: uColorPrimary as unknown as { value: THREE.Color },
    uColorSecondary: uColorSecondary as unknown as { value: THREE.Color },
    uGlowIntensity: uGlowIntensity as unknown as { value: number },
    uPulseSpeed: uPulseSpeed as unknown as { value: number },
    uPulseAmplitude: uPulseAmplitude as unknown as { value: number },
    // Add enhanced uniforms only when enabled
    ...(enhancedMode &&
      uInnerGlowIntensity && {
        uInnerGlowIntensity: uInnerGlowIntensity as unknown as { value: number },
      }),
    ...(enhancedMode &&
      uSSSStrength && {
        uSSSStrength: uSSSStrength as unknown as { value: number },
      }),
    ...(enhancedMode &&
      uMandalaIntensity && {
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
