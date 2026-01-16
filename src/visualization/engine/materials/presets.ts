/**
 * Material Presets
 *
 * Pre-defined material configurations for different visual styles.
 * Includes lava/fire, celestial/nebula, and sacred/golden presets.
 *
 * These presets are designed to work with FlowingMaterial for animated
 * tri-planar textured surfaces.
 */
import {
  createFlowingMaterial,
  type FlowingMaterial,
  type FlowingMaterialConfig,
} from './flowing-material';
import type { TextureManager } from '../textures/texture-manager';

/**
 * Material preset definition
 */
export interface MaterialPreset extends FlowingMaterialConfig {
  baseColor: [number, number, number];
  emissive: [number, number, number];
  emissiveStrength: number;
  flowSpeed: number;
  flowScale: number;
  turbulence: number;
  baseTexture: string;
}

/**
 * Names of available presets
 */
export type MaterialPresetName = 'lava' | 'celestial' | 'sacred';

/**
 * Pre-defined material presets
 */
export const MATERIAL_PRESETS: Record<MaterialPresetName, MaterialPreset> = {
  /**
   * Lava/Fire preset - hot, glowing, dynamic
   * Inspired by webgpu-metaballs fiery effect
   */
  lava: {
    baseColor: [0.9, 0.3, 0.1],
    emissive: [1.0, 0.4, 0.0],
    emissiveStrength: 2.0,
    flowSpeed: 0.5,
    flowScale: 0.3,
    turbulence: 2.0,
    triplanarBlend: 4.0,
    metallic: 0.0,
    roughness: 0.6,
    baseTexture: 'lava',
  },

  /**
   * Celestial/Nebula preset - cool, ethereal, slow
   * Cosmic energy with deep blues and purples
   */
  celestial: {
    baseColor: [0.3, 0.4, 0.8],
    emissive: [0.5, 0.6, 1.0],
    emissiveStrength: 1.5,
    flowSpeed: 0.3,
    flowScale: 0.4,
    turbulence: 1.5,
    triplanarBlend: 3.0,
    metallic: 0.1,
    roughness: 0.4,
    baseTexture: 'nebula',
  },

  /**
   * Sacred/Golden preset - warm gold, subtle, elegant
   * Inspired by Klimt and Hilma af Klint
   */
  sacred: {
    baseColor: [0.85, 0.7, 0.3],
    emissive: [0.9, 0.8, 0.4],
    emissiveStrength: 1.0,
    flowSpeed: 0.2,
    flowScale: 0.5,
    turbulence: 1.0,
    triplanarBlend: 5.0,
    metallic: 0.5,
    roughness: 0.3,
    baseTexture: 'gold-pattern',
  },
};

/**
 * Get array of all preset names
 */
export function getPresetNames(): MaterialPresetName[] {
  return Object.keys(MATERIAL_PRESETS) as MaterialPresetName[];
}

/**
 * Get a preset by name
 *
 * @param name - Name of the preset
 * @returns The preset or undefined if not found
 */
export function getPreset(name: MaterialPresetName): MaterialPreset | undefined {
  return MATERIAL_PRESETS[name];
}

/**
 * Simple seeded random for reproducibility
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

/**
 * Get a random preset
 *
 * @param seed - Optional seed for reproducibility
 * @returns Object with preset name and preset data
 */
export function getRandomPreset(seed?: number): {
  name: MaterialPresetName;
  preset: MaterialPreset;
} {
  const names = getPresetNames();
  const randomValue = seed !== undefined ? seededRandom(seed) : Math.random();
  const index = Math.floor(randomValue * names.length);
  const name = names[index];

  return {
    name,
    preset: MATERIAL_PRESETS[name],
  };
}

/**
 * Create a FlowingMaterial configured with a preset
 *
 * @param device - GPU device
 * @param textureManager - Texture manager
 * @param presetName - Name of the preset to use
 * @returns Configured FlowingMaterial
 */
export function createMaterialFromPreset(
  device: GPUDevice,
  textureManager: TextureManager,
  presetName: MaterialPresetName
): FlowingMaterial {
  const preset = MATERIAL_PRESETS[presetName];
  if (!preset) {
    throw new Error(`Unknown preset: ${presetName}`);
  }

  const material = createFlowingMaterial(device, textureManager);
  material.configure(preset);

  return material;
}

/**
 * Apply a preset to an existing material
 *
 * @param material - The material to configure
 * @param presetName - Name of the preset to apply
 */
export function applyPresetToMaterial(
  material: FlowingMaterial,
  presetName: MaterialPresetName
): void {
  const preset = MATERIAL_PRESETS[presetName];
  if (!preset) {
    throw new Error(`Unknown preset: ${presetName}`);
  }

  material.configure(preset);
}

// ============================================================================
// Legacy API (backward compatibility with existing code)
// ============================================================================

import * as THREE from 'three';

/**
 * @deprecated Use MaterialPresetName instead
 */
export type MysticalPreset = MaterialPresetName;

/**
 * @deprecated Use MaterialPreset instead
 */
export interface MysticalPresetConfig {
  colorPrimary: THREE.Color;
  colorSecondary: THREE.Color;
  colorHighlight: THREE.Color;
  flowSpeed: number;
  cloudDensity: number;
  glowIntensity: number;
  description: string;
}

/**
 * Convert new preset to legacy format
 */
function toLegacyPreset(preset: MaterialPreset, description: string): MysticalPresetConfig {
  return {
    colorPrimary: new THREE.Color(preset.baseColor[0], preset.baseColor[1], preset.baseColor[2]),
    colorSecondary: new THREE.Color(
      preset.baseColor[0] * 0.5,
      preset.baseColor[1] * 0.5,
      preset.baseColor[2] * 0.5
    ),
    colorHighlight: new THREE.Color(preset.emissive[0], preset.emissive[1], preset.emissive[2]),
    flowSpeed: preset.flowSpeed,
    cloudDensity: preset.turbulence,
    glowIntensity: preset.emissiveStrength,
    description,
  };
}

/** @deprecated */
export const LAVA_PRESET: MysticalPresetConfig = toLegacyPreset(
  MATERIAL_PRESETS.lava,
  'Molten lava with flowing fire patterns'
);

/** @deprecated */
export const CELESTIAL_PRESET: MysticalPresetConfig = toLegacyPreset(
  MATERIAL_PRESETS.celestial,
  'Cosmic nebula with ethereal glow'
);

/** @deprecated */
export const SACRED_PRESET: MysticalPresetConfig = toLegacyPreset(
  MATERIAL_PRESETS.sacred,
  'Sacred geometry with golden patterns'
);

/** @deprecated Use MATERIAL_PRESETS instead */
export const MYSTICAL_PRESETS: Record<MysticalPreset, MysticalPresetConfig> = {
  lava: LAVA_PRESET,
  celestial: CELESTIAL_PRESET,
  sacred: SACRED_PRESET,
};

/** @deprecated Use getPreset instead */
export function getMysticalPreset(name: MysticalPreset): MysticalPresetConfig {
  return MYSTICAL_PRESETS[name];
}

/** @deprecated Use getRandomPreset instead */
export function getRandomMysticalPreset(): MysticalPreset {
  return getRandomPreset().name;
}

/**
 * Assign presets to a list of nodes
 * @deprecated Use getRandomPreset with seeds instead
 */
export function assignMysticalPresets(count: number, seed?: number): MysticalPreset[] {
  const presets = getPresetNames();
  const result: MysticalPreset[] = [];

  let randomState = seed ?? Math.random() * 10000;
  const seededRandomFn = () => {
    randomState = (randomState * 1103515245 + 12345) % 2147483648;
    return randomState / 2147483648;
  };

  for (let i = 0; i < count; i++) {
    const index = Math.floor(seededRandomFn() * presets.length);
    result.push(presets[index]);
  }

  return result;
}

/**
 * Group nodes by preset
 * @deprecated
 */
export function groupByPreset(presets: MysticalPreset[]): Map<MysticalPreset, number[]> {
  const groups = new Map<MysticalPreset, number[]>();

  for (const preset of getPresetNames()) {
    groups.set(preset, []);
  }

  presets.forEach((preset, index) => {
    groups.get(preset)!.push(index);
  });

  return groups;
}
