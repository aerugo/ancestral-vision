/**
 * TSL Ghost Node Material for Nodes Without Biography
 *
 * Creates semi-transparent, ghostly blue spheres with swirling mandala patterns.
 * Used for nodes that have no biography content.
 *
 * INV-A008: Use three/webgpu for material classes, three/tsl for shader nodes
 */
import * as THREE from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
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
  length,
  vec2,
  vec3,
  abs,
  atan,
  cameraPosition,
  positionWorld,
  normalWorld,
  normalLocal,
} from 'three/tsl';
import { GHOST_COLOR, SELECTION_STATE } from './palette';

export interface GhostNodeMaterialConfig {
  /** Base color for ghost nodes (default: ghostly blue) */
  baseColor?: THREE.Color;
  /** Mandala pattern intensity (default: 0.8) */
  mandalaIntensity?: number;
  /** Transparency level (default: 0.55) */
  transparency?: number;
  /** Base glow intensity when not selected (default: 0.05 - very faint) */
  baseGlow?: number;
  /** Glow multiplier when connected to selected (default: 12.0) */
  connectedGlowMultiplier?: number;
  /** Glow multiplier when selected (default: 100.0 - sun-like brightness) */
  selectedGlowMultiplier?: number;
  /** Enable transition support for biography metamorphosis (default: true) */
  transitionEnabled?: boolean;
}

export interface GhostNodeMaterialUniforms {
  uTime: { value: number };
  uBaseColor: { value: THREE.Color };
  uMandalaIntensity: { value: number };
  uTransparency: { value: number };
  uBaseGlow: { value: number };
  uConnectedGlowMult: { value: number };
  uSelectedGlowMult: { value: number };
}

export interface GhostNodeMaterialResult {
  material: THREE.Material;
  uniforms: GhostNodeMaterialUniforms;
}

/**
 * Creates a TSL-based ghost node material with swirling mandala patterns
 * @param config - Material configuration options
 * @returns Material instance and uniform references
 */
export function createGhostNodeMaterial(
  config: GhostNodeMaterialConfig = {}
): GhostNodeMaterialResult {
  const {
    baseColor = GHOST_COLOR.clone(),
    mandalaIntensity = 0.8,
    transparency = 0.55,
    baseGlow = 0.05, // Very faint for non-selected nodes
    connectedGlowMultiplier = 12.0, // 0.05 * 12.0 = 0.6
    selectedGlowMultiplier = 100.0, // 0.05 * 100.0 = 5.0 (sun-like brightness)
    transitionEnabled = true,
  } = config;

  // Create uniforms
  const uTime = uniform(0);
  const uBaseColor = uniform(baseColor);
  const uMandalaIntensity = uniform(mandalaIntensity);
  const uTransparency = uniform(transparency);
  const uBaseGlow = uniform(baseGlow);
  const uConnectedGlowMult = uniform(connectedGlowMultiplier);
  const uSelectedGlowMult = uniform(selectedGlowMultiplier);

  // Instance attributes
  const selectionState = attribute('aSelectionState');
  const pulseIntensity = attribute('aPulseIntensity');
  // Transition progress for biography metamorphosis (0 = normal, 1 = fully faded)
  const transitionProgress = transitionEnabled ? attribute('aTransitionProgress') : float(0);

  // Calculate glow multiplier based on selection state
  // selectionState: 0 = none, 0.5 = connected, 1 = selected
  // Interpolate: none->1x, connected->connectedMult, selected->selectedMult
  const glowMult = mix(
    float(1.0),
    mix(uConnectedGlowMult, uSelectedGlowMult, mul(selectionState, 2).sub(1).clamp(0, 1)),
    selectionState.mul(2).clamp(0, 1)
  );

  // Fresnel rim glow
  const viewDir = normalize(sub(cameraPosition, positionWorld));
  const fresnel = pow(sub(float(1), max(dot(viewDir, normalWorld), 0)), 3);

  // ========== SWIRLING MANDALA PATTERNS ==========
  // UV coordinates from normal (sphere surface mapping)
  const uvX = normalLocal.x;
  const uvY = normalLocal.y;
  const r = length(vec2(uvX, uvY));
  const theta = atan(uvY, uvX);

  // --- Concentric breathing circles ---
  const circlesPhase = sub(mul(r, float(15)), mul(uTime, float(0.4)));
  const circlesRaw = mul(add(sin(circlesPhase), 1), 0.5);
  const circles = smoothstep(float(0.35), float(0.65), circlesRaw);

  // --- 7-fold rotational petals (sacred geometry) ---
  const petalsPhase = add(mul(theta, float(7)), mul(uTime, float(0.2)));
  const petals = smoothstep(float(0), float(0.8), sin(petalsPhase));

  // --- Golden spiral (phi-based) - key to swirl effect ---
  const goldenAngle = float(2.39996);
  const spiralPhase = sub(
    mul(r, float(12)),
    add(mul(theta, goldenAngle), mul(uTime, float(0.3)))
  );
  const spiral = smoothstep(float(0.4), float(0.9), sin(spiralPhase));

  // --- Secondary swirl for ethereal effect ---
  const swirl2Phase = add(
    mul(theta, float(3)),
    sub(mul(r, float(8)), mul(uTime, float(0.25)))
  );
  const swirl2 = mul(
    smoothstep(float(0.5), float(0.8), sin(swirl2Phase)),
    float(0.3)
  );

  // Combine mandala patterns
  const mandalaBase = add(
    add(mul(circles, 0.35), mul(petals, 0.25)),
    add(mul(spiral, 0.25), swirl2)
  );
  const mandalaPattern = mul(mandalaBase, uMandalaIntensity);

  // Inner glow: bright at center, fades at edges
  const innerGlow = smoothstep(float(0), float(0.8), sub(float(1), fresnel));

  // Create material
  const material = new MeshBasicNodeMaterial();

  // Lighter accent color for pattern highlights
  const accentColor = vec3(0.4, 0.6, 0.85); // Lighter blue

  // Base color with mandala pattern modulation
  let finalColor = mul(uBaseColor, mul(innerGlow, float(0.5)));

  // Add mandala pattern highlights
  finalColor = add(finalColor, mul(accentColor, mul(mandalaPattern, float(0.3))));

  // Selection-based glow
  const effectiveGlow = mul(uBaseGlow, glowMult);

  // Transition glow boost: intensify glow during metamorphosis (0→5x boost, peaks at 0.4 progress)
  // Creates a "charging up" effect before the node transforms
  const transitionGlowBoost = transitionEnabled
    ? add(float(1), mul(mul(transitionProgress, sub(float(1), transitionProgress)), float(20)))
    : float(1);

  // Rim glow for selection highlighting (boosted by transition)
  const rimGlow = mul(mul(mul(fresnel, effectiveGlow), float(2.5)), transitionGlowBoost);
  finalColor = add(finalColor, mul(uBaseColor, rimGlow));

  // Add selection highlight color shift (brighter when selected)
  const selectionHighlight = mul(
    vec3(0.5, 0.7, 1.0), // Bright blue-white
    mul(selectionState, mul(fresnel, float(0.4)))
  );
  finalColor = add(finalColor, selectionHighlight);

  // Pulse glow: Sacred Gold when pulse is passing through (matches edge illumination)
  const pulseGlowColor = vec3(0.83, 0.66, 0.29); // Sacred Gold
  const pulseGlow = mul(
    pulseGlowColor,
    mul(pulseIntensity, mul(add(fresnel, float(0.3)), float(3.0)))
  );
  finalColor = add(finalColor, pulseGlow);

  // Transition color shift: shift toward Sacred Gold during metamorphosis
  // Creates the "transformation glow" as ghost becomes biography node
  if (transitionEnabled) {
    const transitionColor = vec3(0.83, 0.66, 0.29); // Sacred Gold
    const transitionGlow = mul(
      transitionColor,
      mul(transitionProgress, mul(transitionGlowBoost, float(0.5)))
    );
    finalColor = add(finalColor, transitionGlow);
  }

  // Clamp to prevent oversaturation
  const clampedColor = finalColor.clamp(vec3(float(0)), vec3(float(0.9)));
  material.colorNode = clampedColor;

  // Semi-transparent for ghostly effect
  // Opacity reduced during transition (fade out effect)
  material.transparent = true;
  material.blending = THREE.NormalBlending;
  material.depthWrite = false; // Better transparency rendering

  // Opacity node: base transparency reduced by transition progress
  // transitionProgress 0→1 reduces opacity to 0
  if (transitionEnabled) {
    material.opacityNode = mul(float(transparency), sub(float(1), transitionProgress));
  } else {
    material.opacity = transparency;
  }

  const uniforms: GhostNodeMaterialUniforms = {
    uTime: uTime as unknown as { value: number },
    uBaseColor: uBaseColor as unknown as { value: THREE.Color },
    uMandalaIntensity: uMandalaIntensity as unknown as { value: number },
    uTransparency: uTransparency as unknown as { value: number },
    uBaseGlow: uBaseGlow as unknown as { value: number },
    uConnectedGlowMult: uConnectedGlowMult as unknown as { value: number },
    uSelectedGlowMult: uSelectedGlowMult as unknown as { value: number },
  };

  return { material, uniforms };
}

/**
 * Updates the time uniform for animation
 * @param uniforms - Uniform references from createGhostNodeMaterial
 * @param time - Current time in seconds
 */
export function updateGhostNodeMaterialTime(
  uniforms: GhostNodeMaterialUniforms,
  time: number
): void {
  uniforms.uTime.value = time;
}

/**
 * Disposes of the ghost node material (INV-A009)
 * @param material - Material to dispose
 */
export function disposeGhostNodeMaterial(material: THREE.Material): void {
  material.dispose();
}
