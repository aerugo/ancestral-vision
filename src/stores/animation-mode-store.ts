/**
 * Animation Mode Store
 *
 * Manages A/B testing between legacy animation system and new AnimationSystem.
 * Used to compare behavior and verify identical visual output.
 */
import { create } from 'zustand';

/**
 * Available animation modes for A/B testing
 */
export type AnimationMode = 'legacy' | 'animation-system';

/**
 * Human-readable labels for animation modes
 */
const MODE_LABELS: Record<AnimationMode, string> = {
  legacy: 'Legacy (Manual Updates)',
  'animation-system': 'AnimationSystem (Unified)',
};

/**
 * Animation mode store state
 */
interface AnimationModeState {
  /**
   * Current animation mode
   */
  mode: AnimationMode;

  /**
   * Set the animation mode
   */
  setMode: (mode: AnimationMode) => void;

  /**
   * Toggle between modes
   */
  toggle: () => void;

  /**
   * Check if currently in legacy mode
   */
  isLegacy: () => boolean;

  /**
   * Check if currently using AnimationSystem
   */
  isAnimationSystem: () => boolean;

  /**
   * Get human-readable label for a mode
   */
  getModeLabel: (mode: AnimationMode) => string;
}

/**
 * Animation mode store for A/B testing
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { mode, setMode, isLegacy } = useAnimationModeStore();
 *
 *   if (isLegacy()) {
 *     // Use legacy animation updates
 *   } else {
 *     // Use AnimationSystem
 *   }
 * }
 * ```
 */
export const useAnimationModeStore = create<AnimationModeState>((set, get) => ({
  mode: 'legacy',

  setMode: (mode: AnimationMode) => set({ mode }),

  toggle: () =>
    set((state) => ({
      mode: state.mode === 'legacy' ? 'animation-system' : 'legacy',
    })),

  isLegacy: () => get().mode === 'legacy',

  isAnimationSystem: () => get().mode === 'animation-system',

  getModeLabel: (mode: AnimationMode) => MODE_LABELS[mode],
}));
