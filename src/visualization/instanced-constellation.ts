/**
 * Instanced Constellation Rendering
 * Creates and manages instanced mesh for constellation nodes with TSL shader materials
 *
 * Note: WebGL support has been deprecated. This module only supports TSL materials
 * ('tsl' and 'tsl-cloud') which work with WebGPU.
 */
import * as THREE from 'three';
import {
  createNodeMaterial,
  updateNodeMaterialTime,
  type NodeMaterialUniforms,
} from './materials/node-material';
import {
  createTSLCloudMaterial,
  updateTSLCloudMaterialTime,
  type TSLCloudMaterialUniforms,
  type TSLCloudMaterialConfig,
} from './materials/tsl-cloud-material';
import {
  createGhostNodeMaterial,
  updateGhostNodeMaterialTime,
  type GhostNodeMaterialUniforms,
} from './materials/ghost-node-material';
import { SELECTION_STATE, getRandomColorIndex } from './materials/palette';

/** Material mode for node rendering - TSL modes only (WebGPU) */
export type MaterialMode = 'tsl' | 'tsl-cloud';

export interface ConstellationConfig {
  /** Base sphere radius (default: 2) */
  sphereRadius?: number;
  /** Sphere geometry segments (default: 32) */
  sphereSegments?: number;
  /** Base scale factor (default: 1.0) */
  baseScale?: number;
  /** Scale multiplier for biography weight (default: 2.5) */
  scaleMultiplier?: number;
  /** Enable enhanced visual effects (inner glow, SSS, mandala) for TSL mode */
  enhancedMode?: boolean;
  /** Material mode: 'tsl' for standard TSL shader or 'tsl-cloud' for cloud effect */
  materialMode?: MaterialMode;
  /** TSL cloud material configuration (used when materialMode is 'tsl-cloud') */
  tslCloudConfig?: TSLCloudMaterialConfig;
}

export interface ConstellationData {
  /** 3D positions for each node */
  positions: THREE.Vector3[];
  /** Biography weight (0-1) for each node - used for sizing */
  biographyWeights: number[];
  /** Person IDs for raycasting identification */
  personIds: string[];
  /** Optional color indices (0-4) for palette-based coloring */
  colorIndices?: number[];
}

/** Union type for material uniforms - TSL materials only */
export type ConstellationUniforms = NodeMaterialUniforms | TSLCloudMaterialUniforms | GhostNodeMaterialUniforms;

export interface InstancedConstellationResult {
  /** The instanced mesh to add to scene */
  mesh: THREE.InstancedMesh;
  /** Material uniforms for animation updates */
  uniforms: ConstellationUniforms;
  /** Biography weight attribute for per-instance updates */
  biographyWeightAttribute: THREE.InstancedBufferAttribute;
  /** Selection state attribute (0=none, 0.5=connected, 1=selected) */
  selectionStateAttribute: THREE.InstancedBufferAttribute;
  /** Color index attribute (0-4 for palette) - only for tsl-cloud mode */
  colorIndexAttribute?: THREE.InstancedBufferAttribute;
  /** Pulse intensity attribute for path pulse animation */
  pulseIntensityAttribute: THREE.InstancedBufferAttribute;
  /** Transition progress attribute for biography metamorphosis (ghost nodes only) */
  transitionProgressAttribute?: THREE.InstancedBufferAttribute;
  /** The material mode used */
  materialMode: MaterialMode;
}

const DEFAULT_CONFIG: Required<Omit<ConstellationConfig, 'tslCloudConfig'>> & Pick<ConstellationConfig, 'tslCloudConfig'> = {
  sphereRadius: 2,
  sphereSegments: 32,
  baseScale: 1.0,
  scaleMultiplier: 2.5,
  enhancedMode: true,
  materialMode: 'tsl', // TSL shader for WebGPU
  tslCloudConfig: undefined,
};

/**
 * Creates an instanced constellation mesh with TSL shader material
 * @param data - Constellation node data (positions, weights, IDs)
 * @param config - Rendering configuration
 * @returns Mesh, uniforms, and attribute references
 */
export function createInstancedConstellation(
  data: ConstellationData,
  config: ConstellationConfig = {}
): InstancedConstellationResult {
  const {
    sphereRadius,
    sphereSegments,
    baseScale,
    scaleMultiplier,
    enhancedMode,
    materialMode,
    tslCloudConfig,
  } = { ...DEFAULT_CONFIG, ...config };

  const { positions, biographyWeights, personIds, colorIndices } = data;
  const count = positions.length;

  // Create geometry
  const geometry = new THREE.SphereGeometry(sphereRadius, sphereSegments, sphereSegments);

  // Create biography weight instanced attribute
  const biographyWeightArray = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    biographyWeightArray[i] = biographyWeights[i] ?? 0;
  }
  const biographyWeightAttribute = new THREE.InstancedBufferAttribute(biographyWeightArray, 1);
  geometry.setAttribute('aBiographyWeight', biographyWeightAttribute);

  // Create selection state instanced attribute (0=none, 0.5=connected, 1=selected)
  const selectionStateArray = new Float32Array(count);
  selectionStateArray.fill(SELECTION_STATE.NONE);
  const selectionStateAttribute = new THREE.InstancedBufferAttribute(selectionStateArray, 1);
  geometry.setAttribute('aSelectionState', selectionStateAttribute);

  // Create color index attribute for palette-based coloring
  let colorIndexAttribute: THREE.InstancedBufferAttribute | undefined;
  if (materialMode === 'tsl-cloud' || colorIndices) {
    const colorIndexArray = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      colorIndexArray[i] = colorIndices?.[i] ?? getRandomColorIndex();
    }
    colorIndexAttribute = new THREE.InstancedBufferAttribute(colorIndexArray, 1);
    geometry.setAttribute('aColorIndex', colorIndexAttribute);
  }

  // Create node index attribute for custom shader (used for color variation)
  const nodeIndexArray = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    nodeIndexArray[i] = i;
  }
  const nodeIndexAttribute = new THREE.InstancedBufferAttribute(nodeIndexArray, 1);
  geometry.setAttribute('aNodeIndex', nodeIndexAttribute);

  // Create pulse intensity instanced attribute for path pulse animation
  const pulseIntensityArray = new Float32Array(count);
  pulseIntensityArray.fill(0);
  const pulseIntensityAttribute = new THREE.InstancedBufferAttribute(pulseIntensityArray, 1);
  geometry.setAttribute('aPulseIntensity', pulseIntensityAttribute);

  // Create material based on mode (TSL only)
  let material: THREE.Material;
  let uniforms: ConstellationUniforms;

  if (materialMode === 'tsl-cloud') {
    // Use TSL cloud shader for flowing gas sphere effect
    const result = createTSLCloudMaterial(tslCloudConfig);
    material = result.material;
    uniforms = result.uniforms;
  } else {
    // Use standard TSL material (default)
    const result = createNodeMaterial({ enhancedMode });
    material = result.material;
    uniforms = result.uniforms;
  }

  // Create instanced mesh
  const mesh = new THREE.InstancedMesh(geometry, material, count);

  // Set instance matrices with position and scale
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    const nodePosition = positions[i];
    const weight = biographyWeights[i] ?? 0;

    if (nodePosition) {
      position.copy(nodePosition);
    } else {
      position.set(0, 0, 0);
    }
    quaternion.identity();

    // Scale based on biography weight: baseScale + weight * multiplier
    const nodeScale = baseScale + weight * scaleMultiplier;
    scale.set(nodeScale, nodeScale, nodeScale);

    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(i, matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;

  // Store person IDs for raycasting
  mesh.userData.personIds = personIds;

  return {
    mesh,
    uniforms,
    biographyWeightAttribute,
    selectionStateAttribute,
    colorIndexAttribute,
    pulseIntensityAttribute,
    materialMode,
  };
}

/**
 * Type guard to check if uniforms are from TSL cloud shader material
 */
function isTSLCloudUniforms(uniforms: ConstellationUniforms): uniforms is TSLCloudMaterialUniforms {
  return 'uFlowSpeed' in uniforms && 'uGlowIntensity' in uniforms;
}

/**
 * Updates the time uniform for constellation animation
 * @param uniforms - Material uniforms from createInstancedConstellation
 * @param time - Current time in seconds
 * @deprecated Use updateAnyConstellationTime for all uniform types
 */
export function updateConstellationTime(uniforms: ConstellationUniforms, time: number): void {
  if (isTSLCloudUniforms(uniforms)) {
    updateTSLCloudMaterialTime(uniforms, time);
  } else if (isGhostNodeUniforms(uniforms)) {
    updateGhostNodeMaterialTime(uniforms, time);
  } else {
    updateNodeMaterialTime(uniforms, time);
  }
}

/**
 * Type guard to check if uniforms are from ghost node material
 * Used by updateConstellationTime and updateAnyConstellationTime
 */
function isGhostNodeUniforms(uniforms: ConstellationUniforms): uniforms is GhostNodeMaterialUniforms {
  return 'uBaseColor' in uniforms && 'uMandalaIntensity' in uniforms;
}

/**
 * Updates biography weight for a specific instance
 * @param attribute - Biography weight attribute from createInstancedConstellation
 * @param index - Instance index
 * @param weight - New biography weight (0-1)
 */
export function updateInstanceBiographyWeight(
  attribute: THREE.InstancedBufferAttribute,
  index: number,
  weight: number
): void {
  attribute.array[index] = weight;
  attribute.needsUpdate = true;
}

/**
 * Updates selection state for all instances based on selected and connected nodes.
 * This drives the glow intensity in the shader:
 * - NONE (0): Very faint glow
 * - CONNECTED (0.5): Medium glow
 * - SELECTED (1): Bright glow
 *
 * @param attribute - Selection state attribute from createInstancedConstellation
 * @param selectedIndex - Index of the selected instance (null if none selected)
 * @param connectedIndices - Indices of instances connected to the selected one
 */
export function updateSelectionState(
  attribute: THREE.InstancedBufferAttribute,
  selectedIndex: number | null,
  connectedIndices: number[]
): void {
  const array = attribute.array as Float32Array;

  // Reset all to none
  array.fill(SELECTION_STATE.NONE);

  // Set connected instances to medium glow
  for (const idx of connectedIndices) {
    if (idx >= 0 && idx < array.length) {
      array[idx] = SELECTION_STATE.CONNECTED;
    }
  }

  // Set selected instance to bright glow (overwrites if also in connected)
  if (selectedIndex !== null && selectedIndex >= 0 && selectedIndex < array.length) {
    array[selectedIndex] = SELECTION_STATE.SELECTED;
  }

  attribute.needsUpdate = true;
}

/**
 * Disposes instanced constellation resources (INV-A009)
 * @param mesh - Instanced mesh to dispose
 */
export function disposeInstancedConstellation(mesh: THREE.InstancedMesh): void {
  mesh.geometry.dispose();

  if (Array.isArray(mesh.material)) {
    mesh.material.forEach((m) => m.dispose());
  } else {
    mesh.material.dispose();
  }
}

// ============================================================================
// GHOST CONSTELLATION (nodes without biography)
// ============================================================================

export interface GhostConstellationConfig {
  /** Base sphere radius (default: 2) */
  sphereRadius?: number;
  /** Sphere geometry segments (default: 24 - lower for performance) */
  sphereSegments?: number;
  /** Fixed scale for ghost nodes (default: 0.7) */
  scale?: number;
}

const DEFAULT_GHOST_CONFIG: Required<GhostConstellationConfig> = {
  sphereRadius: 2,
  sphereSegments: 24,
  scale: 0.7,
};

/**
 * Creates an instanced constellation for ghost nodes (nodes without biography).
 * Uses the ghost node material with semi-transparent blue mandala effect.
 *
 * @param data - Constellation node data
 * @param config - Ghost constellation configuration
 * @returns Mesh, uniforms, and attribute references
 */
export function createGhostConstellation(
  data: Omit<ConstellationData, 'colorIndices'>,
  config: GhostConstellationConfig = {}
): InstancedConstellationResult {
  const { sphereRadius, sphereSegments, scale } = { ...DEFAULT_GHOST_CONFIG, ...config };
  const { positions, biographyWeights, personIds } = data;
  const count = positions.length;

  // Create geometry
  const geometry = new THREE.SphereGeometry(sphereRadius, sphereSegments, sphereSegments);

  // Create biography weight instanced attribute (kept for compatibility, all zeros for ghost)
  const biographyWeightArray = new Float32Array(count);
  biographyWeightArray.fill(0);
  const biographyWeightAttribute = new THREE.InstancedBufferAttribute(biographyWeightArray, 1);
  geometry.setAttribute('aBiographyWeight', biographyWeightAttribute);

  // Create selection state instanced attribute
  const selectionStateArray = new Float32Array(count);
  selectionStateArray.fill(SELECTION_STATE.NONE);
  const selectionStateAttribute = new THREE.InstancedBufferAttribute(selectionStateArray, 1);
  geometry.setAttribute('aSelectionState', selectionStateAttribute);

  // Create pulse intensity instanced attribute for path pulse animation
  const pulseIntensityArray = new Float32Array(count);
  pulseIntensityArray.fill(0);
  const pulseIntensityAttribute = new THREE.InstancedBufferAttribute(pulseIntensityArray, 1);
  geometry.setAttribute('aPulseIntensity', pulseIntensityAttribute);

  // Create transition progress attribute for biography metamorphosis animation
  const transitionProgressArray = new Float32Array(count);
  transitionProgressArray.fill(0);
  const transitionProgressAttribute = new THREE.InstancedBufferAttribute(transitionProgressArray, 1);
  geometry.setAttribute('aTransitionProgress', transitionProgressAttribute);

  // Create ghost node material (with transition support enabled)
  const result = createGhostNodeMaterial({ transitionEnabled: true });
  const material = result.material;
  const uniforms = result.uniforms;

  // Create instanced mesh
  const mesh = new THREE.InstancedMesh(geometry, material, count);

  // Set instance matrices with position and fixed scale
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scaleVec = new THREE.Vector3(scale, scale, scale);

  for (let i = 0; i < count; i++) {
    const nodePosition = positions[i];

    if (nodePosition) {
      position.copy(nodePosition);
    } else {
      position.set(0, 0, 0);
    }
    quaternion.identity();

    matrix.compose(position, quaternion, scaleVec);
    mesh.setMatrixAt(i, matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;
  mesh.userData.personIds = personIds;

  return {
    mesh,
    uniforms,
    biographyWeightAttribute,
    selectionStateAttribute,
    colorIndexAttribute: undefined,
    pulseIntensityAttribute,
    transitionProgressAttribute,
    materialMode: 'tsl', // Ghost uses a variant of TSL material
  };
}

// ============================================================================
// BIOGRAPHY CONSTELLATION (nodes with biography)
// ============================================================================

export interface BiographyConstellationConfig {
  /** Base sphere radius (default: 2) */
  sphereRadius?: number;
  /** Sphere geometry segments (default: 32) */
  sphereSegments?: number;
  /** Base scale factor (default: 1.0) */
  baseScale?: number;
  /** Scale multiplier for biography weight (default: 2.5) */
  scaleMultiplier?: number;
  /** Flow animation speed (default: 0.4) */
  flowSpeed?: number;
  /** Cloud density multiplier (default: 1.0) */
  cloudDensity?: number;
}

const DEFAULT_BIOGRAPHY_CONFIG: Required<BiographyConstellationConfig> = {
  sphereRadius: 2,
  sphereSegments: 32,
  baseScale: 1.0,
  scaleMultiplier: 2.5,
  flowSpeed: 0.4,
  cloudDensity: 1.0,
};

/**
 * Creates an instanced constellation for biography nodes.
 * Uses the TSL cloud material with palette colors and selection glow.
 *
 * @param data - Constellation node data (must include colorIndices)
 * @param config - Biography constellation configuration
 * @returns Mesh, uniforms, and attribute references
 */
export function createBiographyConstellation(
  data: ConstellationData,
  config: BiographyConstellationConfig = {}
): InstancedConstellationResult {
  const {
    sphereRadius,
    sphereSegments,
    baseScale,
    scaleMultiplier,
    flowSpeed,
    cloudDensity,
  } = { ...DEFAULT_BIOGRAPHY_CONFIG, ...config };

  const { positions, biographyWeights, personIds, colorIndices } = data;
  const count = positions.length;

  // Create geometry
  const geometry = new THREE.SphereGeometry(sphereRadius, sphereSegments, sphereSegments);

  // Create biography weight instanced attribute
  const biographyWeightArray = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    biographyWeightArray[i] = biographyWeights[i] ?? 0;
  }
  const biographyWeightAttribute = new THREE.InstancedBufferAttribute(biographyWeightArray, 1);
  geometry.setAttribute('aBiographyWeight', biographyWeightAttribute);

  // Create selection state instanced attribute
  const selectionStateArray = new Float32Array(count);
  selectionStateArray.fill(SELECTION_STATE.NONE);
  const selectionStateAttribute = new THREE.InstancedBufferAttribute(selectionStateArray, 1);
  geometry.setAttribute('aSelectionState', selectionStateAttribute);

  // Create color index attribute for palette-based coloring
  const colorIndexArray = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    colorIndexArray[i] = colorIndices?.[i] ?? getRandomColorIndex();
  }
  const colorIndexAttribute = new THREE.InstancedBufferAttribute(colorIndexArray, 1);
  geometry.setAttribute('aColorIndex', colorIndexAttribute);

  // Create pulse intensity instanced attribute for path pulse animation
  const pulseIntensityArray = new Float32Array(count);
  pulseIntensityArray.fill(0);
  const pulseIntensityAttribute = new THREE.InstancedBufferAttribute(pulseIntensityArray, 1);
  geometry.setAttribute('aPulseIntensity', pulseIntensityAttribute);

  // Create TSL cloud material with palette colors and selection glow enabled
  // Base glow is very faint (0.1), selected node blazes like a sun
  const result = createTSLCloudMaterial({
    flowSpeed,
    cloudDensity,
    usePaletteColors: true,
    selectionGlowEnabled: true,
    baseGlowIntensity: 0.1,
    selectedGlowMultiplier: 40.0, // Sun-like brightness for selected node
    connectedGlowMultiplier: 6.0,
  });
  const material = result.material;
  const uniforms = result.uniforms;

  // Create instanced mesh
  const mesh = new THREE.InstancedMesh(geometry, material, count);

  // Set instance matrices with position and biography-based scale
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    const nodePosition = positions[i];
    const weight = biographyWeights[i] ?? 0;

    if (nodePosition) {
      position.copy(nodePosition);
    } else {
      position.set(0, 0, 0);
    }
    quaternion.identity();

    // Scale based on biography weight
    const nodeScale = baseScale + weight * scaleMultiplier;
    scale.set(nodeScale, nodeScale, nodeScale);

    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(i, matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;
  mesh.userData.personIds = personIds;

  return {
    mesh,
    uniforms,
    biographyWeightAttribute,
    selectionStateAttribute,
    colorIndexAttribute,
    pulseIntensityAttribute,
    materialMode: 'tsl-cloud',
  };
}

/**
 * Update pulse intensity for specific instances based on animator state
 * @param attribute - Pulse intensity attribute
 * @param personIds - Array of person IDs corresponding to instance indices
 * @param intensities - Map of personId to intensity from PathPulseAnimator
 */
export function updateNodePulseIntensity(
  attribute: THREE.InstancedBufferAttribute,
  personIds: string[],
  intensities: Map<string, number>
): void {
  const array = attribute.array as Float32Array;

  // Reset all to zero
  array.fill(0);

  // Set intensities for nodes in the pulse path
  for (const [personId, intensity] of intensities) {
    const index = personIds.indexOf(personId);
    if (index >= 0 && index < array.length && intensity > 0) {
      array[index] = intensity;
    }
  }

  attribute.needsUpdate = true;
}

/**
 * Update transition progress for a specific ghost node during biography metamorphosis.
 * This drives the fade/glow effect in the ghost-node-material.
 *
 * @param attribute - Transition progress attribute from ghost constellation
 * @param index - Instance index of the node being transformed
 * @param progress - Animation progress 0-1 (from BiographyTransitionAnimator)
 */
export function updateGhostTransitionProgress(
  attribute: THREE.InstancedBufferAttribute,
  index: number,
  progress: number
): void {
  if (index >= 0 && index < attribute.array.length) {
    attribute.array[index] = progress;
    attribute.needsUpdate = true;
  }
}

/**
 * Reset all transition progress values to 0.
 * Call after metamorphosis animation completes and data refreshes.
 *
 * @param attribute - Transition progress attribute from ghost constellation
 */
export function resetGhostTransitionProgress(
  attribute: THREE.InstancedBufferAttribute
): void {
  (attribute.array as Float32Array).fill(0);
  attribute.needsUpdate = true;
}

/**
 * Update the scale of a specific instance in an instanced mesh.
 * Used for shrinking ghost nodes during metamorphosis.
 *
 * @param mesh - The instanced mesh
 * @param index - Instance index
 * @param scale - New uniform scale value (1 = normal, 0 = invisible)
 */
export function updateInstanceScale(
  mesh: THREE.InstancedMesh,
  index: number,
  scale: number
): void {
  const matrix = new THREE.Matrix4();
  mesh.getMatrixAt(index, matrix);

  // Decompose to get position
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const currentScale = new THREE.Vector3();
  matrix.decompose(position, quaternion, currentScale);

  // Recompose with new scale
  const newScale = new THREE.Vector3(scale, scale, scale);
  matrix.compose(position, quaternion, newScale);
  mesh.setMatrixAt(index, matrix);
  mesh.instanceMatrix.needsUpdate = true;
}

/**
 * Updates the time uniform for any constellation type
 * Handles TSL, TSL-cloud, and ghost material uniforms
 */
export function updateAnyConstellationTime(uniforms: ConstellationUniforms, time: number): void {
  if (isTSLCloudUniforms(uniforms)) {
    updateTSLCloudMaterialTime(uniforms, time);
  } else if (isGhostNodeUniforms(uniforms)) {
    updateGhostNodeMaterialTime(uniforms, time);
  } else {
    updateNodeMaterialTime(uniforms, time);
  }
}
