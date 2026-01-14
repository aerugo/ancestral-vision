/**
 * TSL Simplex Noise Implementation
 * Provides procedural noise functions for shader effects
 */
import {
  float,
  vec3,
  floor,
  fract,
  dot,
  sin,
} from 'three/tsl';

export interface NoiseConfig {
  /** Scale factor for noise coordinates (default: 1.0) */
  scale?: number;
  /** Number of noise octaves for fractal noise (default: 1) */
  octaves?: number;
  /** Persistence for octave amplitude falloff (default: 0.5) */
  persistence?: number;
}

// TSL node type - using unknown for flexibility with TSL's complex type system
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TSLNode = any;

export type NoiseFunction = (position: TSLNode) => TSLNode;

/**
 * Creates a TSL noise function with configurable parameters
 * @param config - Noise configuration options
 * @returns A function that generates noise from a vec3 position
 */
export function createNoiseFunction(config: NoiseConfig = {}): NoiseFunction {
  const { scale = 1.0, octaves = 1, persistence = 0.5 } = config;

  return (position: TSLNode): TSLNode => {
    // Simplex-like noise using TSL built-in functions
    // This is a simplified version using position-based pseudo-random pattern
    const scaledPos = position.mul(scale);

    let noise: TSLNode = float(0);
    let amplitude: TSLNode = float(1);
    let frequency: TSLNode = float(1);
    let maxValue: TSLNode = float(0);

    for (let i = 0; i < octaves; i++) {
      // Use position-based pseudo-random pattern
      const p = scaledPos.mul(frequency);
      const floorP = floor(p);
      const fractP = fract(p);

      // Smooth interpolation (unused but kept for potential enhancement)
      // const u = fractP.mul(fractP).mul(float(3).sub(fractP.mul(2)));

      // Hash-like function using dot products
      const n = dot(floorP, vec3(1.0, 57.0, 113.0));
      const hash = fract(sin(n.mul(0.1031)).mul(43758.5453));

      noise = noise.add(hash.mul(amplitude));
      maxValue = maxValue.add(amplitude);
      amplitude = amplitude.mul(persistence);
      frequency = frequency.mul(2);
    }

    // Normalize to [-1, 1] range
    return noise.div(maxValue).mul(2).sub(1);
  };
}

/**
 * Pre-configured noise function with default settings
 */
export const defaultNoise = createNoiseFunction({ scale: 0.1, octaves: 2 });
