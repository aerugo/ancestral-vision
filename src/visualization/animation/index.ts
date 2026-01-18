/**
 * Animation System
 *
 * Unified animation management for the constellation visualization.
 * Provides centralized control for all animation types.
 */

// Types
export type {
  AnimationDefinition,
  AnimationEvent,
  AnimationEventHandler,
  PhaseDefinition,
  TrackDefinition,
  Keyframe,
  EasingName,
  Unsubscribe,
  ShaderUniforms,
  ReactiveBindingConfig,
} from './types';

// Core
export { AnimationSystem } from './core/animation-system';
export type { AnimationDebugInfo } from './core/animation-system';
export { TimeProvider } from './core/time-provider';
export { AnimationEventBus } from './core/event-bus';
export { easings, getEasing, type EasingFunction } from './core/easing';

// Shader Loops
export { ShaderLoop, ShaderLoopRegistry } from './loops';

// Transitions
export { AnimationTimeline, AnimationTrack, Transition } from './transitions';
export type { PhaseEnterCallback, PhaseExitCallback } from './transitions';

// Propagation
export { PropagationAnimator } from './propagation';
export type { PropagationConfig, GraphPathFinder } from './propagation';

// Reactive
export { ReactiveBinding, InstanceAttributeManager } from './reactive';

// Phases
export { PhaseAnimator } from './phases';
export type { PhaseAnimatorCallbacks } from './phases';
export {
  metamorphosisDefinition,
  getMetamorphosisPhase,
  getMetamorphosisPhaseIndex,
} from './phases';

// Definitions
export { biographyTransitionDefinition } from './definitions';

// Debug
export { AnimationInspector } from './debug/animation-inspector';

// Integration
export {
  ConstellationAnimationSetup,
  SHADER_LOOP_NAMES,
  useAnimationSystem,
} from './integration';
export type {
  ConstellationAnimationConfig,
  RegistrationStatus,
  UseAnimationSystemOptions,
  UseAnimationSystemResult,
} from './integration';
