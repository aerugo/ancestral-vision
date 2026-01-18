/**
 * Metamorphosis Particle Phase Definitions
 *
 * Declarative definition for the ghost-to-biography particle burst effect.
 * Used with PhaseAnimator to drive GPU uniforms.
 */
import type { AnimationDefinition } from '../types';

/**
 * Metamorphosis particle animation phases
 *
 * Timeline:
 * - Burst (0-15%): Particles explode outward from node
 * - Expand (15-35%): Particles continue expanding, slow down
 * - Hover (35-50%): Particles drift randomly at max radius
 * - Spiral (50-70%): Particles begin spiral pattern toward target
 * - Converge (70-85%): Particles accelerate toward target
 * - Settle (85-95%): Particles settle into final position
 * - Fade (95-100%): Particles fade out
 */
export const metamorphosisDefinition: AnimationDefinition = {
  name: 'metamorphosis-particles',
  duration: 2.5, // Total particle animation duration

  phases: [
    { name: 'burst', start: 0.0, end: 0.15 },
    { name: 'expand', start: 0.15, end: 0.35 },
    { name: 'hover', start: 0.35, end: 0.50 },
    { name: 'spiral', start: 0.50, end: 0.70 },
    { name: 'converge', start: 0.70, end: 0.85 },
    { name: 'settle', start: 0.85, end: 0.95 },
    { name: 'fade', start: 0.95, end: 1.0 },
  ],

  tracks: [
    // Particle expansion radius
    {
      name: 'radius',
      keyframes: [
        { time: 0, value: 0 },
        { time: 0.15, value: 1.0 }, // Max at burst end
        { time: 0.35, value: 1.2 }, // Slight overshoot
        { time: 0.50, value: 1.0 }, // Settle to max
        { time: 0.85, value: 0.2 }, // Converge
        { time: 1.0, value: 0 }, // At target
      ],
    },

    // Particle opacity
    {
      name: 'opacity',
      keyframes: [
        { time: 0, value: 0 },
        { time: 0.05, value: 1 }, // Quick fade in
        { time: 0.85, value: 1 }, // Hold
        { time: 1.0, value: 0 }, // Fade out
      ],
    },

    // Spiral intensity
    {
      name: 'spiralIntensity',
      keyframes: [
        { time: 0, value: 0 },
        { time: 0.50, value: 0 }, // No spiral until hover ends
        { time: 0.60, value: 0.5 },
        { time: 0.70, value: 1.0 },
        { time: 0.85, value: 0.5 },
        { time: 1.0, value: 0 },
      ],
    },

    // Random drift intensity
    {
      name: 'driftIntensity',
      keyframes: [
        { time: 0, value: 0 },
        { time: 0.15, value: 0.3 },
        { time: 0.50, value: 1.0 }, // Max during hover
        { time: 0.70, value: 0.3 },
        { time: 1.0, value: 0 },
      ],
    },
  ],
};

/**
 * Phase name to index mapping for shader uniforms
 */
export const METAMORPHOSIS_PHASE_INDEX: Record<string, number> = {
  burst: 0,
  expand: 1,
  hover: 2,
  spiral: 3,
  converge: 4,
  settle: 5,
  fade: 6,
};

/**
 * Get metamorphosis phase by progress
 */
export function getMetamorphosisPhase(progress: number): string | null {
  for (const phase of metamorphosisDefinition.phases) {
    if (progress >= phase.start && progress < phase.end) {
      return phase.name;
    }
  }
  return null;
}

/**
 * Get phase index for shader uniform
 */
export function getMetamorphosisPhaseIndex(phaseName: string): number {
  return METAMORPHOSIS_PHASE_INDEX[phaseName] ?? 0;
}
