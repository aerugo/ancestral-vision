/**
 * Animation System Types
 *
 * Shared types for the unified animation system.
 */

// ============================================================================
// Easing
// ============================================================================

/**
 * Easing function names
 */
export type EasingName =
  | 'linear'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeInQuart'
  | 'easeOutQuart';

// ============================================================================
// Animation Definitions
// ============================================================================

/**
 * A keyframe in an animation track
 */
export interface Keyframe {
  /** Normalized time (0-1) */
  time: number;
  /** Value at this keyframe (scalar or array) */
  value: number | number[];
}

/**
 * An animation track that interpolates values over time
 */
export interface TrackDefinition {
  /** Track name for identification */
  name: string;
  /** Keyframes defining the animation curve */
  keyframes: Keyframe[];
  /** Easing function (default: linear) */
  easing?: EasingName;
}

/**
 * A phase within an animation timeline
 */
export interface PhaseDefinition {
  /** Phase name for event emission */
  name: string;
  /** Start time (0-1 normalized) */
  start: number;
  /** End time (0-1 normalized) */
  end: number;
}

/**
 * Complete animation definition
 */
export interface AnimationDefinition {
  /** Animation name for identification */
  name: string;
  /** Total duration in seconds */
  duration: number;
  /** Phases for event emission */
  phases: PhaseDefinition[];
  /** Tracks for value interpolation */
  tracks: TrackDefinition[];
}

// ============================================================================
// Events
// ============================================================================

/**
 * Animation events emitted during playback
 */
export type AnimationEvent =
  | { type: 'animation:start'; animationName: string }
  | { type: 'animation:complete' }
  | { type: 'animation:cancel' }
  | { type: 'phase:enter'; phase: string; progress: number }
  | { type: 'phase:progress'; phase: string; progress: number; phaseProgress: number }
  | { type: 'phase:exit'; phase: string; progress: number }
  | { type: 'track:update'; track: string; value: number | number[] };

/**
 * Event handler function type
 */
export type AnimationEventHandler = (event: AnimationEvent) => void;

/**
 * Unsubscribe function returned by subscribe
 */
export type Unsubscribe = () => void;

// ============================================================================
// Shader Loop
// ============================================================================

/**
 * Shader uniforms that include a time uniform
 *
 * Note: This type only requires uTime without an index signature,
 * making it compatible with specific material uniform types like
 * EdgeMaterialUniforms, BackgroundParticleUniforms, etc.
 */
export interface ShaderUniforms {
  uTime: { value: number };
}

// ============================================================================
// Reactive Binding
// ============================================================================

/**
 * Configuration for a reactive binding
 */
export interface ReactiveBindingConfig<T> {
  /** Initial state value */
  initialState: T;
  /** Transform state to animation value */
  transform: (state: T) => number;
  /** Optional transition duration in ms */
  transitionDuration?: number;
}
