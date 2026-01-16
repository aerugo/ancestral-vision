/**
 * TSL Edge Material for Connection Lines
 * Implements flowing energy animation along edges
 *
 * INV-A008: Use three/webgpu for material classes, three/tsl for shader nodes
 */
import * as THREE from 'three';
import { LineBasicNodeMaterial } from 'three/webgpu';
import {
  uniform,
  attribute,
  float,
  sin,
  fract,
  smoothstep,
  mul,
  add,
  sub,
  mix,
} from 'three/tsl';

export interface EdgeMaterialConfig {
  /** Primary edge color (default: sacred gold) */
  colorPrimary?: THREE.Color;
  /** Secondary edge color (default: ancient copper) */
  colorSecondary?: THREE.Color;
  /** Flow animation speed (default: 0.5) */
  flowSpeed?: number;
  /** Base opacity (default: 0.7) */
  baseOpacity?: number;
  /** Enable enhanced visual effects (Phase 9.2) */
  enhancedMode?: boolean;
  /** Prayer bead intensity (default: 0.4, requires enhancedMode) */
  prayerBeadIntensity?: number;
  /** Byzantine pattern intensity (default: 0.2, requires enhancedMode) */
  byzantineIntensity?: number;
}

export interface EdgeMaterialUniforms {
  uTime: { value: number };
  uColorPrimary: { value: THREE.Color };
  uColorSecondary: { value: THREE.Color };
  uFlowSpeed: { value: number };
  uBaseOpacity: { value: number };
  /** Enhanced mode uniforms (only present when enhancedMode=true) */
  uPrayerBeadIntensity?: { value: number };
  uByzantineIntensity?: { value: number };
}

export interface EdgeMaterialResult {
  material: THREE.Material;
  uniforms: EdgeMaterialUniforms;
}

// Default colors from prototype (Klimt-inspired)
const DEFAULT_COLOR_PRIMARY = new THREE.Color(0xd4a84b);   // Sacred Gold
const DEFAULT_COLOR_SECONDARY = new THREE.Color(0xb87333); // Ancient Copper

/**
 * Creates a TSL-based edge material with flowing animation
 * @param config - Material configuration options
 * @returns Material instance and uniform references
 */
export function createEdgeMaterial(config: EdgeMaterialConfig = {}): EdgeMaterialResult {
  const {
    colorPrimary = DEFAULT_COLOR_PRIMARY.clone(),
    colorSecondary = DEFAULT_COLOR_SECONDARY.clone(),
    flowSpeed = 0.5,
    baseOpacity = 0.7,
    enhancedMode = true,  // Phase 3: Enable enhanced effects by default
    prayerBeadIntensity = 0.6, // Phase 6: Tuned to prototype value
    byzantineIntensity = 0.3,  // Phase 6: Tuned to prototype value
  } = config;

  // Create base uniforms
  const uTime = uniform(0);
  const uColorPrimary = uniform(colorPrimary);
  const uColorSecondary = uniform(colorSecondary);
  const uFlowSpeed = uniform(flowSpeed);
  const uBaseOpacity = uniform(baseOpacity);

  // Create enhanced mode uniforms (only when enabled)
  const uPrayerBeadIntensity = enhancedMode ? uniform(prayerBeadIntensity) : null;
  const uByzantineIntensity = enhancedMode ? uniform(byzantineIntensity) : null;

  // Vertex attributes
  const progress = attribute('aProgress');
  const strength = attribute('aStrength');

  // Flowing energy animation: fract(progress * 3 - time * speed)
  const flow = fract(sub(mul(progress, 3), mul(uTime, uFlowSpeed)));
  const flowPulse = mul(smoothstep(float(0), float(0.3), flow), smoothstep(float(1), float(0.7), flow));

  // End fade: smooth transparency at endpoints
  const endFade = mul(smoothstep(float(0), float(0.1), progress), smoothstep(float(1), float(0.9), progress));

  // Gold shimmer
  const shimmer = add(mul(sin(add(mul(uTime, 5), mul(progress, 30))), 0.15), 0.85);

  // Color mixing along edge
  const edgeColor = mix(uColorPrimary, uColorSecondary, mul(progress, 0.3));

  // Enhanced visual effects (Phase 9.2)
  let enhancedOpacityContrib = float(0);

  if (enhancedMode && uPrayerBeadIntensity && uByzantineIntensity) {
    // Prayer bead energy nodes: discrete glowing beads along edge
    // nodePos = fract(progress * 8.0 - time * 0.4) creates 8 beads
    const beadPos = fract(sub(mul(progress, float(8)), mul(uTime, float(0.4))));
    // smoothstep to create soft bead shapes
    const beadShape = mul(
      smoothstep(float(0.4), float(0.5), beadPos),
      smoothstep(float(0.6), float(0.5), beadPos)
    );
    const prayerBeads = mul(beadShape, uPrayerBeadIntensity);

    // Byzantine pattern: interlocking wave pattern
    // sin(progress * 40.0) * sin(time * 2.0 + progress * 15.0)
    const byzantine = mul(
      mul(
        sin(mul(progress, float(40))),
        sin(add(mul(uTime, float(2)), mul(progress, float(15))))
      ),
      uByzantineIntensity
    );

    // Combine enhanced effects
    enhancedOpacityContrib = add(prayerBeads, mul(add(byzantine, float(1)), float(0.5)));
  }

  // Final opacity combining all effects
  const baseOpacityCalc = mul(mul(mul(endFade, add(mul(flowPulse, 0.5), 0.5)), shimmer), mul(strength, uBaseOpacity));
  const finalOpacity = enhancedMode
    ? add(baseOpacityCalc, mul(enhancedOpacityContrib, endFade))
    : baseOpacityCalc;

  // Create material
  const material = new LineBasicNodeMaterial();
  material.colorNode = edgeColor;
  material.opacityNode = finalOpacity;
  material.transparent = true;
  // Use NormalBlending instead of AdditiveBlending to eliminate the glowing fog
  material.blending = THREE.NormalBlending;
  material.depthWrite = false;

  // Return material and uniforms
  const uniforms: EdgeMaterialUniforms = {
    uTime: uTime as unknown as { value: number },
    uColorPrimary: uColorPrimary as unknown as { value: THREE.Color },
    uColorSecondary: uColorSecondary as unknown as { value: THREE.Color },
    uFlowSpeed: uFlowSpeed as unknown as { value: number },
    uBaseOpacity: uBaseOpacity as unknown as { value: number },
    // Add enhanced uniforms only when enabled
    ...(enhancedMode && uPrayerBeadIntensity && {
      uPrayerBeadIntensity: uPrayerBeadIntensity as unknown as { value: number },
    }),
    ...(enhancedMode && uByzantineIntensity && {
      uByzantineIntensity: uByzantineIntensity as unknown as { value: number },
    }),
  };

  return { material, uniforms };
}

/**
 * Updates the time uniform for edge animation
 * @param uniforms - Uniform references from createEdgeMaterial
 * @param time - Current time in seconds
 */
export function updateEdgeMaterialTime(uniforms: EdgeMaterialUniforms, time: number): void {
  uniforms.uTime.value = time;
}

/**
 * Disposes of the edge material (INV-A009)
 * @param material - Material to dispose
 */
export function disposeEdgeMaterial(material: THREE.Material): void {
  material.dispose();
}
