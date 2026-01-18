/**
 * Tests for animation mode store (A/B testing between legacy and AnimationSystem)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useAnimationModeStore, type AnimationMode } from './animation-mode-store';

describe('useAnimationModeStore', () => {
  beforeEach(() => {
    // Reset store to default state
    useAnimationModeStore.setState({ mode: 'legacy' });
  });

  describe('initial state', () => {
    it('should default to legacy mode', () => {
      const { mode } = useAnimationModeStore.getState();
      expect(mode).toBe('legacy');
    });
  });

  describe('setMode', () => {
    it('should switch to animation-system mode', () => {
      const { setMode } = useAnimationModeStore.getState();

      setMode('animation-system');

      expect(useAnimationModeStore.getState().mode).toBe('animation-system');
    });

    it('should switch back to legacy mode', () => {
      const { setMode } = useAnimationModeStore.getState();

      setMode('animation-system');
      setMode('legacy');

      expect(useAnimationModeStore.getState().mode).toBe('legacy');
    });
  });

  describe('isLegacy', () => {
    it('should return true when in legacy mode', () => {
      const { isLegacy } = useAnimationModeStore.getState();
      expect(isLegacy()).toBe(true);
    });

    it('should return false when in animation-system mode', () => {
      useAnimationModeStore.setState({ mode: 'animation-system' });
      const { isLegacy } = useAnimationModeStore.getState();
      expect(isLegacy()).toBe(false);
    });
  });

  describe('isAnimationSystem', () => {
    it('should return false when in legacy mode', () => {
      const { isAnimationSystem } = useAnimationModeStore.getState();
      expect(isAnimationSystem()).toBe(false);
    });

    it('should return true when in animation-system mode', () => {
      useAnimationModeStore.setState({ mode: 'animation-system' });
      const { isAnimationSystem } = useAnimationModeStore.getState();
      expect(isAnimationSystem()).toBe(true);
    });
  });

  describe('toggle', () => {
    it('should toggle from legacy to animation-system', () => {
      const { toggle } = useAnimationModeStore.getState();

      toggle();

      expect(useAnimationModeStore.getState().mode).toBe('animation-system');
    });

    it('should toggle from animation-system to legacy', () => {
      useAnimationModeStore.setState({ mode: 'animation-system' });
      const { toggle } = useAnimationModeStore.getState();

      toggle();

      expect(useAnimationModeStore.getState().mode).toBe('legacy');
    });
  });

  describe('mode labels', () => {
    it('should provide human-readable labels', () => {
      const { getModeLabel } = useAnimationModeStore.getState();

      expect(getModeLabel('legacy')).toBe('Legacy (Manual Updates)');
      expect(getModeLabel('animation-system')).toBe('AnimationSystem (Unified)');
    });
  });
});
