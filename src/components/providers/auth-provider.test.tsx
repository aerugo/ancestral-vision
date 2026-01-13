/**
 * AuthProvider Component Tests
 *
 * Tests for the React auth context provider and useAuth hook.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { User as FirebaseUser } from 'firebase/auth';

// Mock Firebase client
vi.mock('@/lib/firebase', () => ({
  auth: { currentUser: null },
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  updateProfile: vi.fn(),
}));

import { AuthProvider, useAuth } from './auth-provider';

// Test component to consume auth context
function TestAuthConsumer(): React.JSX.Element {
  const { user, loading, error, login, logout, register } = useAuth();

  if (loading) return <div data-testid="loading">Loading...</div>;
  if (error) return <div data-testid="error">{error}</div>;

  return (
    <div>
      <div data-testid="user-status">
        {user ? `Logged in as ${user.email}` : 'Not logged in'}
      </div>
      <button onClick={() => login('test@example.com', 'password')}>Login</button>
      <button onClick={() => logout()}>Logout</button>
      <button onClick={() => register('new@example.com', 'password', 'New User')}>
        Register
      </button>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state initially', async () => {
    const { onAuthStateChanged } = await import('@/lib/firebase');
    (onAuthStateChanged as ReturnType<typeof vi.fn>).mockImplementation(() => () => {});

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('should show not logged in when no user', async () => {
    const { onAuthStateChanged } = await import('@/lib/firebase');
    (onAuthStateChanged as ReturnType<typeof vi.fn>).mockImplementation(
      (_auth: unknown, callback: (user: FirebaseUser | null) => void) => {
        callback(null);
        return () => {};
      }
    );

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in');
    });
  });

  it('should show logged in user', async () => {
    const mockUser = {
      uid: 'test-uid',
      email: 'test@example.com',
      displayName: 'Test User',
    } as FirebaseUser;

    const { onAuthStateChanged } = await import('@/lib/firebase');
    (onAuthStateChanged as ReturnType<typeof vi.fn>).mockImplementation(
      (_auth: unknown, callback: (user: FirebaseUser | null) => void) => {
        callback(mockUser);
        return () => {};
      }
    );

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent(
        'Logged in as test@example.com'
      );
    });
  });

  it('should handle login', async () => {
    const mockUser = {
      uid: 'login-uid',
      email: 'login@example.com',
      displayName: 'Login User',
      getIdToken: vi.fn().mockResolvedValue('mock-token'),
    } as unknown as FirebaseUser;

    const { onAuthStateChanged, signInWithEmailAndPassword } = await import(
      '@/lib/firebase'
    );

    let authCallback: ((user: FirebaseUser | null) => void) | null = null;
    (onAuthStateChanged as ReturnType<typeof vi.fn>).mockImplementation(
      (_auth: unknown, callback: (user: FirebaseUser | null) => void) => {
        authCallback = callback;
        callback(null);
        return () => {};
      }
    );

    (signInWithEmailAndPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      user: mockUser,
    });

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in');
    });

    const loginButton = screen.getByText('Login');
    await userEvent.click(loginButton);

    // Simulate Firebase auth state change
    act(() => {
      authCallback?.(mockUser);
    });

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent(
        'Logged in as login@example.com'
      );
    });
  });

  it('should handle logout', async () => {
    const mockUser = {
      uid: 'logout-uid',
      email: 'logout@example.com',
      displayName: 'Logout User',
    } as FirebaseUser;

    const { onAuthStateChanged, signOut } = await import('@/lib/firebase');

    let authCallback: ((user: FirebaseUser | null) => void) | null = null;
    (onAuthStateChanged as ReturnType<typeof vi.fn>).mockImplementation(
      (_auth: unknown, callback: (user: FirebaseUser | null) => void) => {
        authCallback = callback;
        callback(mockUser);
        return () => {};
      }
    );

    (signOut as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Logged in');
    });

    const logoutButton = screen.getByText('Logout');
    await userEvent.click(logoutButton);

    // Simulate Firebase auth state change
    act(() => {
      authCallback?.(null);
    });

    await waitFor(() => {
      expect(screen.getByTestId('user-status')).toHaveTextContent('Not logged in');
    });
  });

  it('should throw error when useAuth is used outside AuthProvider', () => {
    // Suppress console.error for expected error
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => {
      render(<TestAuthConsumer />);
    }).toThrow('useAuth must be used within an AuthProvider');

    console.error = originalError;
  });
});
