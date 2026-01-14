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
}

export interface EdgeMaterialUniforms {
  uTime: { value: number };
  uColorPrimary: { value: THREE.Color };
  uColorSecondary: { value: THREE.Color };
  uFlowSpeed: { value: number };
  uBaseOpacity: { value: number };
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
  } = config;

  // Create uniforms
  const uTime = uniform(0);
  const uColorPrimary = uniform(colorPrimary);
  const uColorSecondary = uniform(colorSecondary);
  const uFlowSpeed = uniform(flowSpeed);
  const uBaseOpacity = uniform(baseOpacity);

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

  // Final opacity combining all effects
  const finalOpacity = mul(mul(mul(endFade, add(mul(flowPulse, 0.5), 0.5)), shimmer), mul(strength, uBaseOpacity));

  // Create material
  const material = new LineBasicNodeMaterial();
  material.colorNode = edgeColor;
  material.opacityNode = finalOpacity;
  material.transparent = true;
  material.blending = THREE.AdditiveBlending;
  material.depthWrite = false;

  // Return material and uniforms
  const uniforms: EdgeMaterialUniforms = {
    uTime: uTime as unknown as { value: number },
    uColorPrimary: uColorPrimary as unknown as { value: THREE.Color },
    uColorSecondary: uColorSecondary as unknown as { value: THREE.Color },
    uFlowSpeed: uFlowSpeed as unknown as { value: number },
    uBaseOpacity: uBaseOpacity as unknown as { value: number },
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
