/**
 * Animation System Integration
 *
 * Provides integration utilities for wiring the AnimationSystem
 * with existing constellation visualization components.
 */

// Re-export from core for convenience
export { AnimationSystem } from '../core/animation-system';
export type { AnimationDebugInfo } from '../core/animation-system';
export { AnimationInspector } from '../debug/animation-inspector';

// Integration utilities
export {
  ConstellationAnimationSetup,
  SHADER_LOOP_NAMES,
} from './constellation-animation-setup';
export type {
  ConstellationAnimationConfig,
  RegistrationStatus,
} from './constellation-animation-setup';

// React hook
export { useAnimationSystem } from './use-animation-system';
export type {
  UseAnimationSystemOptions,
  UseAnimationSystemResult,
} from './use-animation-system';
