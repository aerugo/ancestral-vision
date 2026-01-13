import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUIStore } from './ui-store';

// Mock localStorage for persistence tests
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('UI Store', () => {
  beforeEach(() => {
    useUIStore.getState().reset();
    localStorageMock.clear();
  });

  describe('initial state', () => {
    it('should initialize with default UI state', () => {
      const state = useUIStore.getState();
      expect(state.theme).toBe('dark');
      expect(state.selectedPersonId).toBeNull();
      expect(state.isPanelOpen).toBe(false);
      expect(state.viewMode).toBe('3d');
    });

    it('should have null camera target initially', () => {
      const { cameraTarget } = useUIStore.getState();
      expect(cameraTarget).toBeNull();
    });
  });

  describe('theme', () => {
    it('should toggle theme to light', () => {
      useUIStore.getState().setTheme('light');
      expect(useUIStore.getState().theme).toBe('light');
    });

    it('should toggle theme to dark', () => {
      useUIStore.getState().setTheme('light');
      useUIStore.getState().setTheme('dark');
      expect(useUIStore.getState().theme).toBe('dark');
    });

    it('should support system theme', () => {
      useUIStore.getState().setTheme('system');
      expect(useUIStore.getState().theme).toBe('system');
    });
  });

  describe('view mode', () => {
    it('should default to 3d view mode', () => {
      expect(useUIStore.getState().viewMode).toBe('3d');
    });

    it('should switch to 2d view mode', () => {
      useUIStore.getState().setViewMode('2d');
      expect(useUIStore.getState().viewMode).toBe('2d');
    });

    it('should switch back to 3d view mode', () => {
      useUIStore.getState().setViewMode('2d');
      useUIStore.getState().setViewMode('3d');
      expect(useUIStore.getState().viewMode).toBe('3d');
    });
  });

  describe('person selection', () => {
    it('should track selected person', () => {
      useUIStore.getState().setSelectedPerson('person-123');
      expect(useUIStore.getState().selectedPersonId).toBe('person-123');
    });

    it('should open panel when selecting a person', () => {
      useUIStore.getState().setSelectedPerson('person-123');
      expect(useUIStore.getState().isPanelOpen).toBe(true);
    });

    it('should clear selection when set to null', () => {
      useUIStore.getState().setSelectedPerson('person-123');
      useUIStore.getState().setSelectedPerson(null);
      expect(useUIStore.getState().selectedPersonId).toBeNull();
    });

    it('should keep panel closed when clearing selection', () => {
      useUIStore.getState().setSelectedPerson('person-123');
      useUIStore.getState().setSelectedPerson(null);
      // When clearing selection, panel state should close
      expect(useUIStore.getState().isPanelOpen).toBe(false);
    });
  });

  describe('panel state', () => {
    it('should track panel open state', () => {
      useUIStore.getState().setSelectedPerson('person-123');
      expect(useUIStore.getState().isPanelOpen).toBe(true);
    });

    it('should close panel', () => {
      useUIStore.getState().setSelectedPerson('person-123');
      useUIStore.getState().closePanel();
      expect(useUIStore.getState().isPanelOpen).toBe(false);
    });

    it('should open panel', () => {
      useUIStore.getState().openPanel();
      expect(useUIStore.getState().isPanelOpen).toBe(true);
    });
  });

  describe('camera target', () => {
    it('should set camera target', () => {
      const target = { x: 1, y: 2, z: 3 };
      useUIStore.getState().setCameraTarget(target);
      expect(useUIStore.getState().cameraTarget).toEqual(target);
    });

    it('should clear camera target', () => {
      useUIStore.getState().setCameraTarget({ x: 1, y: 2, z: 3 });
      useUIStore.getState().setCameraTarget(null);
      expect(useUIStore.getState().cameraTarget).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      // Modify state
      useUIStore.getState().setTheme('light');
      useUIStore.getState().setViewMode('2d');
      useUIStore.getState().setSelectedPerson('person-123');
      useUIStore.getState().setCameraTarget({ x: 1, y: 2, z: 3 });

      // Reset
      useUIStore.getState().reset();

      const state = useUIStore.getState();
      expect(state.theme).toBe('dark');
      expect(state.viewMode).toBe('3d');
      expect(state.selectedPersonId).toBeNull();
      expect(state.isPanelOpen).toBe(false);
      expect(state.cameraTarget).toBeNull();
    });
  });
});
