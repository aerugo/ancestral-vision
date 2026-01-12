/**
 * Phase 0.3: Auth Provider Tests
 *
 * Tests for client-side authentication context and hooks.
 * Uses mocks for Firebase client SDK.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "./auth-provider";

// Mock Firebase auth functions
const mockSignInWithEmailAndPassword = vi.fn();
const mockCreateUserWithEmailAndPassword = vi.fn();
const mockSignOut = vi.fn();
const mockOnAuthStateChanged = vi.fn();
const mockUpdateProfile = vi.fn();
const mockSendPasswordResetEmail = vi.fn();

// Mock auth instance
const mockAuth = {
  currentUser: null as { getIdToken: () => Promise<string> } | null,
};

// Mock the firebase module
vi.mock("@/lib/firebase", () => ({
  auth: () => mockAuth,
  signInWithEmailAndPassword: (...args: unknown[]) =>
    mockSignInWithEmailAndPassword(...args),
  createUserWithEmailAndPassword: (...args: unknown[]) =>
    mockCreateUserWithEmailAndPassword(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  sendPasswordResetEmail: (...args: unknown[]) => mockSendPasswordResetEmail(...args),
}));

/** Test component that uses auth context */
function TestComponent(): React.ReactElement {
  const { user, loading, error, login, logout, register, clearError } = useAuth();

  // Wrap handlers to catch and ignore errors (they're set in context)
  const handleLogin = async (): Promise<void> => {
    try {
      await login("test@example.com", "password");
    } catch {
      // Error is handled by context
    }
  };

  const handleRegister = async (): Promise<void> => {
    try {
      await register("new@example.com", "password", "New User");
    } catch {
      // Error is handled by context
    }
  };

  const handleLogout = async (): Promise<void> => {
    try {
      await logout();
    } catch {
      // Error is handled by context
    }
  };

  if (loading) {
    return <div data-testid="loading">Loading...</div>;
  }

  return (
    <div>
      <div data-testid="user-status">
        {user ? `Logged in as ${user.email}` : "Not logged in"}
      </div>
      {error && <div data-testid="error">{error}</div>}
      <button data-testid="login-btn" onClick={() => void handleLogin()}>
        Login
      </button>
      <button data-testid="logout-btn" onClick={() => void handleLogout()}>
        Logout
      </button>
      <button data-testid="register-btn" onClick={() => void handleRegister()}>
        Register
      </button>
      <button data-testid="clear-error-btn" onClick={clearError}>
        Clear Error
      </button>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.currentUser = null;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should show loading state initially", async () => {
    // Don't call the callback immediately
    mockOnAuthStateChanged.mockImplementation(() => () => undefined);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Loading should appear initially
    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  it("should provide null user when not authenticated", async () => {
    mockOnAuthStateChanged.mockImplementation((_auth, callback: (user: null) => void) => {
      // Call with null user (not authenticated)
      callback(null);
      return () => undefined;
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-status")).toHaveTextContent("Not logged in");
    });
  });

  it("should provide user when authenticated", async () => {
    const mockUser = {
      uid: "test-uid",
      email: "test@example.com",
      displayName: "Test User",
    };

    mockOnAuthStateChanged.mockImplementation(
      (_auth, callback: (user: typeof mockUser) => void) => {
        callback(mockUser);
        return () => undefined;
      }
    );

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-status")).toHaveTextContent(
        "Logged in as test@example.com"
      );
    });
  });

  it("should handle login flow", async () => {
    const user = userEvent.setup();
    let authCallback: ((user: unknown) => void) | null = null;

    mockOnAuthStateChanged.mockImplementation(
      (_auth: unknown, callback: (user: unknown) => void) => {
        authCallback = callback;
        callback(null); // Initially not logged in
        return () => undefined;
      }
    );

    mockSignInWithEmailAndPassword.mockResolvedValueOnce({
      user: { uid: "test-uid", email: "test@example.com" },
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-status")).toHaveTextContent("Not logged in");
    });

    // Click login
    await user.click(screen.getByTestId("login-btn"));

    expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
      mockAuth,
      "test@example.com",
      "password"
    );

    // Simulate Firebase calling the auth state callback after login
    act(() => {
      if (authCallback) {
        authCallback({
          uid: "test-uid",
          email: "test@example.com",
          displayName: "Test User",
        });
      }
    });

    await waitFor(() => {
      expect(screen.getByTestId("user-status")).toHaveTextContent(
        "Logged in as test@example.com"
      );
    });
  });

  it("should handle logout flow", async () => {
    const user = userEvent.setup();
    let authCallback: ((user: unknown) => void) | null = null;

    const mockUser = {
      uid: "test-uid",
      email: "test@example.com",
      displayName: "Test User",
    };

    mockOnAuthStateChanged.mockImplementation(
      (_auth: unknown, callback: (user: unknown) => void) => {
        authCallback = callback;
        callback(mockUser); // Initially logged in
        return () => undefined;
      }
    );

    mockSignOut.mockResolvedValueOnce(undefined);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-status")).toHaveTextContent("Logged in");
    });

    // Click logout
    await user.click(screen.getByTestId("logout-btn"));

    expect(mockSignOut).toHaveBeenCalledWith(mockAuth);

    // Simulate Firebase calling the auth state callback after logout
    act(() => {
      if (authCallback) {
        authCallback(null);
      }
    });

    await waitFor(() => {
      expect(screen.getByTestId("user-status")).toHaveTextContent("Not logged in");
    });
  });

  it("should handle registration flow", async () => {
    const user = userEvent.setup();
    const mockFirebaseUser = {
      uid: "new-uid",
      email: "new@example.com",
      displayName: null,
    };

    mockOnAuthStateChanged.mockImplementation((_auth, callback: (user: null) => void) => {
      callback(null);
      return () => undefined;
    });

    mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({ user: mockFirebaseUser });
    mockUpdateProfile.mockResolvedValueOnce(undefined);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-status")).toHaveTextContent("Not logged in");
    });

    // Click register
    await user.click(screen.getByTestId("register-btn"));

    expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
      mockAuth,
      "new@example.com",
      "password"
    );
    expect(mockUpdateProfile).toHaveBeenCalledWith(mockFirebaseUser, {
      displayName: "New User",
    });
  });

  it("should handle login error", async () => {
    const user = userEvent.setup();

    mockOnAuthStateChanged.mockImplementation((_auth, callback: (user: null) => void) => {
      callback(null);
      return () => undefined;
    });

    mockSignInWithEmailAndPassword.mockRejectedValueOnce(
      new Error("Invalid credentials")
    );

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-status")).toHaveTextContent("Not logged in");
    });

    // Try to login - should fail
    await user.click(screen.getByTestId("login-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("error")).toHaveTextContent("Invalid credentials");
    });
  });

  it("should clear error", async () => {
    const user = userEvent.setup();

    mockOnAuthStateChanged.mockImplementation((_auth, callback: (user: null) => void) => {
      callback(null);
      return () => undefined;
    });

    mockSignInWithEmailAndPassword.mockRejectedValueOnce(new Error("Test error"));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByTestId("user-status")).toHaveTextContent("Not logged in");
    });

    // Trigger error
    await user.click(screen.getByTestId("login-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("error")).toBeInTheDocument();
    });

    // Clear error
    await user.click(screen.getByTestId("clear-error-btn"));

    await waitFor(() => {
      expect(screen.queryByTestId("error")).not.toBeInTheDocument();
    });
  });
});

describe("useAuth hook", () => {
  it("should throw when used outside AuthProvider", () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => {
      render(<TestComponent />);
    }).toThrow("useAuth must be used within an AuthProvider");

    consoleSpy.mockRestore();
  });
});
