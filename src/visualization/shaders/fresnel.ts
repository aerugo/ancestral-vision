/**
 * TSL Fresnel Effect Implementation
 * Provides rim glow effects based on view angle
 */
import {
  float,
  pow,
  max,
  dot,
  normalize,
  sub,
  cameraPosition,
  positionWorld,
  normalWorld,
} from 'three/tsl';
import { type TSLNode } from './noise';

export interface FresnelConfig {
  /** Fresnel power exponent (default: 3.0, higher = sharper rim) */
  power?: number;
  /** Intensity multiplier (default: 1.0) */
  intensity?: number;
}

/**
 * Creates a TSL Fresnel node for rim glow effects
 * @param config - Fresnel configuration options
 * @returns A TSL node representing the Fresnel factor (0-1)
 */
export function createFresnelNode(config: FresnelConfig = {}): TSLNode {
  const { power = 3.0, intensity = 1.0 } = config;

  // Calculate view direction
  const viewDirection = normalize(sub(cameraPosition, positionWorld));

  // Fresnel factor: 1 - max(dot(viewDir, normal), 0)
  const dotProduct = max(dot(viewDirection, normalWorld), 0);
  const fresnel = pow(sub(float(1), dotProduct), power);

  // Apply intensity
  return fresnel.mul(intensity);
}

/**
 * Pre-configured Fresnel with prototype settings
 */
export const defaultFresnel = createFresnelNode({ power: 3.0, intensity: 1.5 });
