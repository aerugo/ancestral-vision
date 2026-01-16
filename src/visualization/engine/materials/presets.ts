/**
 * Visual Style Presets for Mystical Sphere Materials
 *
 * Three distinct visual styles inspired by:
 * - Lava: webgpu-metaballs fiery effect
 * - Celestial: Nebula/cosmic energy
 * - Sacred: Klimt/Hilma af Klint golden patterns
 */

import * as THREE from 'three';

export type MysticalPreset = 'lava' | 'celestial' | 'sacred';

export interface MysticalPresetConfig {
  /** Primary color */
  colorPrimary: THREE.Color;
  /** Secondary accent color */
  colorSecondary: THREE.Color;
  /** Highlight color for shimmer/glow */
  colorHighlight: THREE.Color;
  /** Flow animation speed multiplier */
  flowSpeed: number;
  /** Cloud/pattern density */
  cloudDensity: number;
  /** Glow/emissive intensity */
  glowIntensity: number;
  /** Description for UI */
  description: string;
}

/**
 * Lava preset - fiery, molten appearance like webgpu-metaballs
 *
 * Deep reds and oranges with bright yellow/white hotspots
 */
export const LAVA_PRESET: MysticalPresetConfig = {
  colorPrimary: new THREE.Color(0xff4500), // Orange-red
  colorSecondary: new THREE.Color(0x8b0000), // Dark red
  colorHighlight: new THREE.Color(0xffff00), // Bright yellow
  flowSpeed: 0.6,
  cloudDensity: 1.2,
  glowIntensity: 1.5,
  description: 'Molten lava with flowing fire patterns',
};

/**
 * Celestial preset - cosmic nebula appearance
 *
 * Deep blues and purples with cyan/white highlights
 */
export const CELESTIAL_PRESET: MysticalPresetConfig = {
  colorPrimary: new THREE.Color(0x4169e1), // Royal blue
  colorSecondary: new THREE.Color(0x2d1b69), // Deep purple
  colorHighlight: new THREE.Color(0x00ffff), // Cyan
  flowSpeed: 0.4,
  cloudDensity: 0.9,
  glowIntensity: 1.2,
  description: 'Cosmic nebula with ethereal glow',
};

/**
 * Sacred preset - Klimt/Hilma af Klint inspired golden patterns
 *
 * Rich golds and ambers with warm highlights
 */
export const SACRED_PRESET: MysticalPresetConfig = {
  colorPrimary: new THREE.Color(0xd4a84b), // Rich gold
  colorSecondary: new THREE.Color(0x8b6914), // Deep amber
  colorHighlight: new THREE.Color(0xffd700), // Gold
  flowSpeed: 0.3,
  cloudDensity: 1.0,
  glowIntensity: 1.0,
  description: 'Sacred geometry with golden patterns',
};

/**
 * All presets indexed by name
 */
export const MYSTICAL_PRESETS: Record<MysticalPreset, MysticalPresetConfig> = {
  lava: LAVA_PRESET,
  celestial: CELESTIAL_PRESET,
  sacred: SACRED_PRESET,
};

/**
 * Get a preset by name
 */
export function getMysticalPreset(name: MysticalPreset): MysticalPresetConfig {
  return MYSTICAL_PRESETS[name];
}

/**
 * Get a random preset
 */
export function getRandomMysticalPreset(): MysticalPreset {
  const presets: MysticalPreset[] = ['lava', 'celestial', 'sacred'];
  return presets[Math.floor(Math.random() * presets.length)];
}

/**
 * Assign presets to a list of nodes, distributing evenly with some randomness
 *
 * @param count - Number of nodes
 * @param seed - Optional seed for reproducible randomness
 * @returns Array of preset names for each node
 */
export function assignMysticalPresets(count: number, seed?: number): MysticalPreset[] {
  const presets: MysticalPreset[] = ['lava', 'celestial', 'sacred'];
  const result: MysticalPreset[] = [];

  // Simple seeded random (for reproducibility if needed)
  let randomState = seed ?? Math.random() * 10000;
  const seededRandom = () => {
    randomState = (randomState * 1103515245 + 12345) % 2147483648;
    return randomState / 2147483648;
  };

  for (let i = 0; i < count; i++) {
    // Use seeded random to pick a preset
    const index = Math.floor(seededRandom() * presets.length);
    result.push(presets[index]);
  }

  return result;
}

/**
 * Group nodes by their assigned preset
 *
 * @param presets - Array of preset assignments
 * @returns Map of preset name to array of node indices
 */
export function groupByPreset(presets: MysticalPreset[]): Map<MysticalPreset, number[]> {
  const groups = new Map<MysticalPreset, number[]>();

  for (const preset of ['lava', 'celestial', 'sacred'] as MysticalPreset[]) {
    groups.set(preset, []);
  }

  presets.forEach((preset, index) => {
    groups.get(preset)!.push(index);
  });

  return groups;
}
