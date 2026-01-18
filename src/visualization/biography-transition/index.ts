/**
 * Biography Transition Module
 *
 * Exports for the ghost-to-biography metamorphosis animation system.
 */

export {
  BiographyTransitionAnimator,
  type BiographyTransitionConfig,
  type TransitionState,
  type TransitionCallbacks,
  type TransitionEasingName,
} from './biography-transition-animator';

export {
  createMetamorphosisParticles,
  updateMetamorphosisParticles,
  setMetamorphosisParticleOrigin,
  setMetamorphosisTargetColor,
  setMetamorphosisTargetRadius,
  disposeMetamorphosisParticles,
  type MetamorphosisParticleConfig,
  type MetamorphosisParticleUniforms,
  type MetamorphosisParticleResult,
} from './metamorphosis-particles';
