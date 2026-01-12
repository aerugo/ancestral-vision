"use client";

/**
 * Authentication Provider Component
 *
 * Provides authentication state and methods to the application.
 * Wraps the entire app to enable useAuth() hook access.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Auth, User as FirebaseUser } from "firebase/auth";

/** Simplified user object for context consumers */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

/** Auth context value shape */
export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  getIdToken: () => Promise<string | null>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Transform Firebase user to simplified AuthUser
 */
function toAuthUser(firebaseUser: FirebaseUser): AuthUser {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
  };
}

export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auth, setAuth] = useState<Auth | null>(null);

  // Initialize Firebase auth on mount (client-side only)
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function initAuth(): Promise<void> {
      try {
        const firebaseModule = await import("@/lib/firebase");
        const authInstance = firebaseModule.auth();
        setAuth(authInstance);

        const { onAuthStateChanged } = firebaseModule;

        unsubscribe = onAuthStateChanged(authInstance, (firebaseUser) => {
          if (firebaseUser) {
            setUser(toAuthUser(firebaseUser));
          } else {
            setUser(null);
          }
          setLoading(false);
        });
      } catch {
        setError("Failed to initialize authentication");
        setLoading(false);
      }
    }

    void initAuth();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      if (!auth) {
        throw new Error("Auth not initialized");
      }

      setError(null);
      try {
        const { signInWithEmailAndPassword } = await import("@/lib/firebase");
        await signInWithEmailAndPassword(auth, email, password);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Login failed";
        setError(message);
        throw err;
      }
    },
    [auth]
  );

  const register = useCallback(
    async (email: string, password: string, displayName: string): Promise<void> => {
      if (!auth) {
        throw new Error("Auth not initialized");
      }

      setError(null);
      try {
        const { createUserWithEmailAndPassword, updateProfile } = await import(
          "@/lib/firebase"
        );
        const { user: firebaseUser } = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        await updateProfile(firebaseUser, { displayName });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Registration failed";
        setError(message);
        throw err;
      }
    },
    [auth]
  );

  const logout = useCallback(async (): Promise<void> => {
    if (!auth) {
      throw new Error("Auth not initialized");
    }

    setError(null);
    try {
      const { signOut } = await import("@/lib/firebase");
      await signOut(auth);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Logout failed";
      setError(message);
      throw err;
    }
  }, [auth]);

  const resetPassword = useCallback(
    async (email: string): Promise<void> => {
      if (!auth) {
        throw new Error("Auth not initialized");
      }

      setError(null);
      try {
        const { sendPasswordResetEmail } = await import("@/lib/firebase");
        await sendPasswordResetEmail(auth, email);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Password reset failed";
        setError(message);
        throw err;
      }
    },
    [auth]
  );

  const getIdToken = useCallback(async (): Promise<string | null> => {
    if (!auth?.currentUser) {
      return null;
    }
    return auth.currentUser.getIdToken();
  }, [auth]);

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    resetPassword,
    getIdToken,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access authentication context.
 * Must be used within an AuthProvider.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
