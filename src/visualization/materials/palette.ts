/**
 * Color Palette for Constellation Nodes
 * Defines the sci-fi themed color palette for biography nodes
 * and the ghost color for nodes without biography.
 */
import * as THREE from 'three';

/**
 * Muted/organic sci-fi color palette for biography nodes.
 * Each node is randomly assigned one of these colors.
 */
export const SCIFI_PALETTE = [
  new THREE.Color(0x2a7b7b), // Deep Teal
  new THREE.Color(0xc48b8b), // Dusty Rose
  new THREE.Color(0x3d4f7c), // Midnight Navy
  new THREE.Color(0xb8963e), // Antique Gold
  new THREE.Color(0x8b7bb5), // Soft Lavender
] as const;

/** Number of colors in the palette */
export const PALETTE_SIZE = SCIFI_PALETTE.length;

/**
 * Ghostly blue color for nodes without biography.
 * Semi-transparent with swirling mandala effect.
 */
export const GHOST_COLOR = new THREE.Color(0x4488cc);

/**
 * Sacred Gold color for pulse glow and metamorphosis effects.
 * Matches the edge illumination and transformation highlights.
 * RGB: (0.83, 0.66, 0.29) = #D4A84A
 */
export const SACRED_GOLD = new THREE.Color(0xd4a84a);

/**
 * Selection state values for instance attribute.
 * Used in shaders to determine glow intensity.
 */
export const SELECTION_STATE = {
  /** Node is not selected and not connected to selected */
  NONE: 0,
  /** Node is directly connected to the selected node */
  CONNECTED: 0.5,
  /** Node is currently selected */
  SELECTED: 1,
} as const;

export type SelectionStateValue = (typeof SELECTION_STATE)[keyof typeof SELECTION_STATE];

/**
 * Gets a random color index for the palette.
 * @returns Random index 0-4
 */
export function getRandomColorIndex(): number {
  return Math.floor(Math.random() * PALETTE_SIZE);
}

/**
 * Gets a color from the palette by index.
 * @param index - Palette index (0-4), wraps if out of range
 * @returns THREE.Color from the palette
 */
export function getPaletteColor(index: number): THREE.Color {
  const color = SCIFI_PALETTE[index % PALETTE_SIZE];
  // Safety: PALETTE_SIZE equals SCIFI_PALETTE.length, so modulo always produces valid index
  return (color ?? SCIFI_PALETTE[0]!).clone();
}
