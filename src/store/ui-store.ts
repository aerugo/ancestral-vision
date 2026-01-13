import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Available themes for the application
 */
export type Theme = 'dark' | 'light' | 'system';

/**
 * Available view modes for the constellation display
 */
export type ViewMode = '3d' | '2d';

/**
 * 3D camera target coordinates
 */
export interface CameraTarget {
  x: number;
  y: number;
  z: number;
}

/**
 * UI store state and actions
 */
interface UIState {
  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // View mode
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Person selection
  selectedPersonId: string | null;
  setSelectedPerson: (id: string | null) => void;

  // Panel state
  isPanelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;

  // Camera
  cameraTarget: CameraTarget | null;
  setCameraTarget: (target: CameraTarget | null) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  theme: 'dark' as Theme,
  viewMode: '3d' as ViewMode,
  selectedPersonId: null as string | null,
  isPanelOpen: false,
  cameraTarget: null as CameraTarget | null,
};

/**
 * Zustand store for UI state
 * Persists theme and view mode preferences to localStorage
 */
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      ...initialState,

      setTheme: (theme: Theme) => set({ theme }),

      setViewMode: (viewMode: ViewMode) => set({ viewMode }),

      setSelectedPerson: (selectedPersonId: string | null) =>
        set({
          selectedPersonId,
          isPanelOpen: selectedPersonId !== null,
        }),

      openPanel: () => set({ isPanelOpen: true }),

      closePanel: () => set({ isPanelOpen: false }),

      setCameraTarget: (cameraTarget: CameraTarget | null) => set({ cameraTarget }),

      reset: () => set(initialState),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        // Persist user preferences
        theme: state.theme,
        viewMode: state.viewMode,
      }),
    }
  )
);
