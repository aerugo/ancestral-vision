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
  /** Biography weight (0-1) for each node */
  biographyWeights: number[];
  /** Person IDs for raycasting identification */
  personIds: string[];
}

/** Union type for material uniforms - TSL materials only */
export type ConstellationUniforms = NodeMaterialUniforms | TSLCloudMaterialUniforms;

export interface InstancedConstellationResult {
  /** The instanced mesh to add to scene */
  mesh: THREE.InstancedMesh;
  /** Material uniforms for animation updates */
  uniforms: ConstellationUniforms;
  /** Biography weight attribute for per-instance updates */
  biographyWeightAttribute: THREE.InstancedBufferAttribute;
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

  const { positions, biographyWeights, personIds } = data;
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

  // Create node index attribute for custom shader (used for color variation)
  const nodeIndexArray = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    nodeIndexArray[i] = i;
  }
  const nodeIndexAttribute = new THREE.InstancedBufferAttribute(nodeIndexArray, 1);
  geometry.setAttribute('aNodeIndex', nodeIndexAttribute);

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
 */
export function updateConstellationTime(uniforms: ConstellationUniforms, time: number): void {
  if (isTSLCloudUniforms(uniforms)) {
    updateTSLCloudMaterialTime(uniforms, time);
  } else {
    updateNodeMaterialTime(uniforms, time);
  }
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
