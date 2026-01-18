/**
 * Biography Transition Animation Definition
 *
 * Declarative definition for the ghost-to-biography metamorphosis animation.
 * This is the SINGLE SOURCE OF TRUTH for all timing in this animation.
 *
 * Timeline:
 * - 0-30%: Camera zoom (ghost appears normal)
 * - 30-40%: Glow intensify (ghost swells slightly)
 * - 40-70%: Shrink + particles (ghost shrinks rapidly)
 * - 55-85%: Reconvene (biography node emerges, overlaps with shrink)
 * - 70-90%: Particle fade (ghost fully fades out)
 * - 90-100%: Hold (animation complete)
 */
import type { AnimationDefinition } from '../types';

export const biographyTransitionDefinition: AnimationDefinition = {
  name: 'biography-transition',
  duration: 3.5,

  phases: [
    { name: 'cameraZoom', start: 0, end: 0.30 },
    { name: 'glowIntensify', start: 0.30, end: 0.40 },
    { name: 'shrink', start: 0.40, end: 0.70 },
    { name: 'reconvene', start: 0.55, end: 0.85 },
    { name: 'particleFade', start: 0.70, end: 0.90 },
    { name: 'hold', start: 0.90, end: 1.0 },
  ],

  tracks: [
    {
      name: 'ghost.scale',
      keyframes: [
        { time: 0, value: 0.7 },
        { time: 0.30, value: 0.7 },
        { time: 0.40, value: 0.77 },
        { time: 0.70, value: 0.14 },
        { time: 0.90, value: 0 },
        { time: 1.0, value: 0 },
      ],
      easing: 'easeInCubic',
    },
    {
      name: 'ghost.glow',
      keyframes: [
        { time: 0, value: 1 },
        { time: 0.30, value: 1 },
        { time: 0.40, value: 5 },
        { time: 0.70, value: 2 },
        { time: 0.90, value: 0 },
        { time: 1.0, value: 0 },
      ],
    },
    {
      name: 'ghost.transition',
      keyframes: [
        { time: 0, value: 0 },
        { time: 0.40, value: 0 },
        { time: 0.70, value: 1 },
        { time: 1.0, value: 1 },
      ],
    },
    {
      name: 'biography.scale',
      keyframes: [
        { time: 0, value: 0 },
        { time: 0.55, value: 0 },
        { time: 0.85, value: 1 },
        { time: 1.0, value: 1 },
      ],
      easing: 'easeInOutCubic',
    },
    {
      name: 'particles.intensity',
      keyframes: [
        { time: 0, value: 0 },
        { time: 0.40, value: 0 },
        { time: 0.55, value: 1 },
        { time: 0.90, value: 0 },
        { time: 1.0, value: 0 },
      ],
    },
    {
      name: 'camera.zoom',
      keyframes: [
        { time: 0, value: 0 },
        { time: 0.30, value: 1 },
        { time: 1.0, value: 1 },
      ],
      easing: 'easeInOutCubic',
    },
  ],
};
