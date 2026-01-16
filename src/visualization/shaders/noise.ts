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
 * Hash function for noise generation
 * Returns pseudo-random value in [0, 1] for a given vec3
 */
function hash3(p: TSLNode): TSLNode {
  const n = dot(p, vec3(1.0, 57.0, 113.0));
  return fract(sin(n.mul(43758.5453)).add(0.5));
}

/**
 * 3D Value noise with smooth interpolation
 * Produces smooth, continuous noise values
 */
function valueNoise3D(p: TSLNode): TSLNode {
  const floorP = floor(p);
  const fractP = fract(p);

  // Smooth interpolation curve (smoothstep-like: 3t^2 - 2t^3)
  const u = fractP.mul(fractP).mul(float(3).sub(fractP.mul(2)));

  // Hash values at 8 corners of the unit cube
  const n000 = hash3(floorP.add(vec3(0, 0, 0)));
  const n100 = hash3(floorP.add(vec3(1, 0, 0)));
  const n010 = hash3(floorP.add(vec3(0, 1, 0)));
  const n110 = hash3(floorP.add(vec3(1, 1, 0)));
  const n001 = hash3(floorP.add(vec3(0, 0, 1)));
  const n101 = hash3(floorP.add(vec3(1, 0, 1)));
  const n011 = hash3(floorP.add(vec3(0, 1, 1)));
  const n111 = hash3(floorP.add(vec3(1, 1, 1)));

  // Trilinear interpolation
  const nx00 = n000.add(n100.sub(n000).mul(u.x));
  const nx10 = n010.add(n110.sub(n010).mul(u.x));
  const nx01 = n001.add(n101.sub(n001).mul(u.x));
  const nx11 = n011.add(n111.sub(n011).mul(u.x));

  const nxy0 = nx00.add(nx10.sub(nx00).mul(u.y));
  const nxy1 = nx01.add(nx11.sub(nx01).mul(u.y));

  return nxy0.add(nxy1.sub(nxy0).mul(u.z));
}

/**
 * Creates a TSL noise function with configurable parameters
 * Uses smooth value noise with fractal octaves
 * @param config - Noise configuration options
 * @returns A function that generates noise from a vec3 position
 */
export function createNoiseFunction(config: NoiseConfig = {}): NoiseFunction {
  const { scale = 1.0, octaves = 1, persistence = 0.5 } = config;

  return (position: TSLNode): TSLNode => {
    const scaledPos = position.mul(scale);

    let noise: TSLNode = float(0);
    let amplitude = 1.0;
    let frequency = 1.0;
    let maxValue = 0.0;

    for (let i = 0; i < octaves; i++) {
      // Get smooth noise value at this frequency
      const p = scaledPos.mul(frequency);
      const n = valueNoise3D(p);

      noise = noise.add(n.mul(amplitude));
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }

    // Normalize to [-1, 1] range
    return noise.div(maxValue).mul(2).sub(1);
  };
}

/**
 * Pre-configured noise function with default settings
 */
export const defaultNoise = createNoiseFunction({ scale: 0.1, octaves: 2 });
