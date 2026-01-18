/**
 * Easing Functions
 *
 * Standard Robert Penner easing equations for animation interpolation.
 */
import type { EasingName } from '../types';

/**
 * Easing function type
 */
export type EasingFunction = (t: number) => number;

/**
 * Collection of easing functions
 */
export const easings: Record<EasingName, EasingFunction> = {
  linear: (t) => t,

  easeInCubic: (t) => t * t * t,

  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),

  easeInOutCubic: (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,

  easeInQuart: (t) => t * t * t * t,

  easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),
};

/**
 * Get an easing function by name
 */
export function getEasing(name: EasingName): EasingFunction {
  return easings[name];
}
