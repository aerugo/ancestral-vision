import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * User representation from Firebase Auth
 */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

/**
 * Auth store state and actions
 */
interface AuthState {
  /** Current authenticated user, null if not logged in */
  user: AuthUser | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Firebase ID token for API requests */
  token: string | null;
  /** Set the current user (called on login) */
  setUser: (user: AuthUser) => void;
  /** Set the auth token */
  setToken: (token: string | null) => void;
  /** Clear user data (called on logout) */
  clearUser: () => void;
  /** Reset store to initial state */
  reset: () => void;
}

const initialState = {
  user: null,
  isAuthenticated: false,
  token: null,
};

/**
 * Zustand store for authentication state
 * Persists token to localStorage for session continuity
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...initialState,

      setUser: (user: AuthUser) =>
        set({
          user,
          isAuthenticated: true,
        }),

      setToken: (token: string | null) => set({ token }),

      clearUser: () =>
        set({
          user: null,
          isAuthenticated: false,
          token: null,
        }),

      reset: () => set(initialState),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        // Only persist token; user state comes from Firebase on refresh
        token: state.token,
      }),
    }
  )
);
