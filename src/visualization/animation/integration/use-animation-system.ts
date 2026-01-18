/**
 * useAnimationSystem - React hook for AnimationSystem lifecycle management
 *
 * Provides a convenient way to use AnimationSystem in React components
 * with proper cleanup and stable references.
 */
import { useRef, useCallback, useEffect, useMemo } from 'react';
import { AnimationSystem } from '../core/animation-system';
import { AnimationInspector } from '../debug/animation-inspector';
import {
  ConstellationAnimationSetup,
  type ConstellationAnimationConfig,
} from './constellation-animation-setup';

/**
 * Options for useAnimationSystem hook
 */
export interface UseAnimationSystemOptions {
  /**
   * Initial material configuration to register on mount
   */
  initialConfig?: ConstellationAnimationConfig;

  /**
   * Whether to expose the animation system globally for debugging
   * @default false
   */
  exposeGlobally?: boolean;

  /**
   * Name to use when exposing globally
   * @default '__animationSystem'
   */
  globalName?: string;
}

/**
 * Return value from useAnimationSystem hook
 */
export interface UseAnimationSystemResult {
  /**
   * The AnimationSystem instance
   */
  system: AnimationSystem;

  /**
   * Setup utility for registering materials
   */
  setup: ConstellationAnimationSetup;

  /**
   * Inspector for debugging
   */
  inspector: AnimationInspector;

  /**
   * Update function to call from render loop
   */
  update: (deltaTime: number) => void;

  /**
   * Pause all animations
   */
  pause: () => void;

  /**
   * Resume all animations
   */
  resume: () => void;

  /**
   * Set global time scale
   */
  setTimeScale: (scale: number) => void;
}

/**
 * React hook for AnimationSystem lifecycle management
 *
 * Creates and manages an AnimationSystem instance with proper cleanup.
 * Provides stable references that don't change between renders.
 *
 * @example
 * ```tsx
 * function ConstellationCanvas() {
 *   const { system, setup, update } = useAnimationSystem();
 *
 *   useEffect(() => {
 *     setup.registerGhostNodes(ghostUniforms);
 *     setup.registerBiographyNodes(bioUniforms);
 *   }, [setup, ghostUniforms, bioUniforms]);
 *
 *   // In render loop:
 *   // update(deltaTime);
 * }
 * ```
 */
export function useAnimationSystem(
  options: UseAnimationSystemOptions = {}
): UseAnimationSystemResult {
  const { initialConfig, exposeGlobally = false, globalName = '__animationSystem' } = options;

  // Create stable refs for the instances
  const systemRef = useRef<AnimationSystem | null>(null);
  const setupRef = useRef<ConstellationAnimationSetup | null>(null);
  const inspectorRef = useRef<AnimationInspector | null>(null);

  // Lazily initialize the system (only once)
  if (systemRef.current === null) {
    systemRef.current = new AnimationSystem();
    setupRef.current = new ConstellationAnimationSetup(systemRef.current);
    inspectorRef.current = new AnimationInspector(systemRef.current);

    // Register initial config if provided
    if (initialConfig) {
      setupRef.current.registerAll(initialConfig);
    }
  }

  // Stable update function
  const update = useCallback((deltaTime: number) => {
    systemRef.current?.update(deltaTime);
  }, []);

  // Stable pause function
  const pause = useCallback(() => {
    systemRef.current?.pause();
  }, []);

  // Stable resume function
  const resume = useCallback(() => {
    systemRef.current?.resume();
  }, []);

  // Stable setTimeScale function
  const setTimeScale = useCallback((scale: number) => {
    systemRef.current?.setTimeScale(scale);
  }, []);

  // Handle global exposure
  useEffect(() => {
    if (exposeGlobally && inspectorRef.current) {
      inspectorRef.current.exposeGlobally(globalName);

      return () => {
        inspectorRef.current?.removeGlobalExposure(globalName);
      };
    }
  }, [exposeGlobally, globalName]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      systemRef.current?.dispose();
    };
  }, []);

  // Return stable result object
  return useMemo(
    () => ({
      system: systemRef.current!,
      setup: setupRef.current!,
      inspector: inspectorRef.current!,
      update,
      pause,
      resume,
      setTimeScale,
    }),
    [update, pause, resume, setTimeScale]
  );
}
