/**
 * Particle Systems
 * Re-exports all particle-related functions for constellation visualization
 */

export {
  createBackgroundParticles,
  updateBackgroundParticlesTime,
  disposeBackgroundParticles,
  type BackgroundParticleConfig,
  type BackgroundParticleUniforms,
  type BackgroundParticleResult,
} from './background-particles';

export {
  createEventFireflies,
  updateEventFirefliesTime,
  disposeEventFireflies,
  getEventColor,
  type EventFireflyConfig,
  type EventFireflyData,
  type EventFireflyUniforms,
  type EventFireflyResult,
} from './event-fireflies';
