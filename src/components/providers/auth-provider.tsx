'use client';

/**
 * Auth Provider Component
 *
 * Provides authentication state and methods to the React component tree.
 * Uses Firebase client SDK for browser-side authentication.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type FirebaseUser,
} from '@/lib/firebase';
import { useAuthStore } from '@/store/auth-store';
import { isTemplateMode, getTemplateUser, getTemplateToken } from '@/lib/template-mode';

/**
 * Simplified auth user type for components
 */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

/**
 * Auth context type definition
 */
export interface AuthContextType {
  /** Current authenticated user, null if not logged in */
  user: AuthUser | null;
  /** True while checking auth state */
  loading: boolean;
  /** Error message from last auth operation */
  error: string | null;
  /** Log in with email and password */
  login: (email: string, password: string) => Promise<void>;
  /** Register a new user */
  register: (email: string, password: string, displayName: string) => Promise<void>;
  /** Log out the current user */
  logout: () => Promise<void>;
  /** Get the current user's ID token */
  getIdToken: () => Promise<string | null>;
  /** Clear any error state */
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth Provider Component
 *
 * Wraps the application to provide authentication context.
 * Automatically syncs with Firebase auth state changes.
 */
export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to Firebase auth state changes and sync token to Zustand store
  useEffect(() => {
    const { setUser: setStoreUser, setToken, clearUser: clearStoreUser } = useAuthStore.getState();

    // Check for template mode first - bypass Firebase entirely
    if (isTemplateMode()) {
      console.log('[AuthProvider] Template mode detected - using mock user');
      const templateUser = getTemplateUser();
      setUser({
        uid: templateUser.uid,
        email: templateUser.email,
        displayName: templateUser.displayName,
      });
      setStoreUser({
        uid: templateUser.uid,
        email: templateUser.email,
        displayName: templateUser.displayName,
      });
      setToken(getTemplateToken());
      setLoading(false);
      return; // Skip Firebase subscription in template mode
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      console.log('[AuthProvider] Auth state changed:', firebaseUser?.uid ?? 'null');
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
        });
        // Sync user and token to Zustand store for GraphQL client
        setStoreUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
        });
        try {
          const token = await firebaseUser.getIdToken();
          console.log('[AuthProvider] Token obtained, length:', token?.length);
          setToken(token);
        } catch (err) {
          console.error('[AuthProvider] Failed to get token:', err);
          setToken(null);
        }
      } else {
        setUser(null);
        clearStoreUser();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Proactively refresh token before it expires (every 50 minutes)
  // Firebase tokens expire after 1 hour, this keeps sessions alive indefinitely
  useEffect(() => {
    if (isTemplateMode()) return;

    const REFRESH_INTERVAL = 50 * 60 * 1000; // 50 minutes in milliseconds

    const refreshToken = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken(true); // Force refresh
          useAuthStore.getState().setToken(token);
          console.log('[AuthProvider] Token refreshed proactively');
        } catch (err) {
          console.error('[AuthProvider] Token refresh failed:', err);
        }
      }
    };

    const intervalId = setInterval(refreshToken, REFRESH_INTERVAL);

    // Also refresh when tab becomes visible after being hidden
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshToken();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  /**
   * Login with email and password
   */
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    }
  }, []);

  /**
   * Register a new user with email, password, and display name
   */
  const register = useCallback(
    async (email: string, password: string, displayName: string): Promise<void> => {
      setError(null);
      try {
        const { user: firebaseUser } = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        await updateProfile(firebaseUser, { displayName });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Registration failed';
        setError(message);
        throw err;
      }
    },
    []
  );

  /**
   * Log out the current user
   */
  const logout = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      await signOut(auth);
      // Clear Zustand store on logout
      useAuthStore.getState().clearUser();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed';
      setError(message);
      throw err;
    }
  }, []);

  /**
   * Get the current user's Firebase ID token (or template token in template mode)
   */
  const getIdToken = useCallback(async (): Promise<string | null> => {
    // Return template token if in template mode
    if (isTemplateMode()) {
      return getTemplateToken();
    }
    const currentUser = auth.currentUser;
    if (!currentUser) return null;
    return currentUser.getIdToken();
  }, []);

  /**
   * Clear any error state
   */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, error, login, register, logout, getIdToken, clearError }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context
 *
 * @throws Error if used outside of AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
