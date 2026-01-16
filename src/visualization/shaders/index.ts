/**
 * TSL Shader Utilities
 * Re-exports all shader-related functions for constellation visualization
 *
 * Note: WebGL/GLSL shaders have been deprecated. All shaders now use TSL (WebGPU).
 */

export { createNoiseFunction, defaultNoise, type NoiseConfig, type NoiseFunction } from './noise';
export { createFresnelNode, defaultFresnel, type FresnelConfig } from './fresnel';
