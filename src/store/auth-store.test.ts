import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from './auth-store';

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

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useAuthStore.getState().reset();
    localStorageMock.clear();
  });

  describe('initial state', () => {
    it('should initialize with null user', () => {
      const { user, isAuthenticated } = useAuthStore.getState();
      expect(user).toBeNull();
      expect(isAuthenticated).toBe(false);
    });

    it('should initialize with null token', () => {
      const { token } = useAuthStore.getState();
      expect(token).toBeNull();
    });
  });

  describe('setUser', () => {
    it('should set user on login', () => {
      const mockUser = {
        uid: 'test-uid-123',
        email: 'test@example.com',
        displayName: 'Test User',
      };

      useAuthStore.getState().setUser(mockUser);

      const { user, isAuthenticated } = useAuthStore.getState();
      expect(user).toEqual(mockUser);
      expect(isAuthenticated).toBe(true);
    });

    it('should handle user with null optional fields', () => {
      const mockUser = {
        uid: 'test-uid-123',
        email: null,
        displayName: null,
      };

      useAuthStore.getState().setUser(mockUser);

      const { user, isAuthenticated } = useAuthStore.getState();
      expect(user).toEqual(mockUser);
      expect(isAuthenticated).toBe(true);
    });
  });

  describe('setToken', () => {
    it('should set auth token', () => {
      const mockToken = 'mock-jwt-token-12345';

      useAuthStore.getState().setToken(mockToken);

      const { token } = useAuthStore.getState();
      expect(token).toBe(mockToken);
    });

    it('should clear token when set to null', () => {
      useAuthStore.getState().setToken('some-token');
      useAuthStore.getState().setToken(null);

      const { token } = useAuthStore.getState();
      expect(token).toBeNull();
    });
  });

  describe('clearUser', () => {
    it('should clear user on logout', () => {
      // First set a user
      useAuthStore.getState().setUser({
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
      });
      useAuthStore.getState().setToken('mock-token');

      // Then clear
      useAuthStore.getState().clearUser();

      const { user, isAuthenticated, token } = useAuthStore.getState();
      expect(user).toBeNull();
      expect(isAuthenticated).toBe(false);
      expect(token).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      // Set some state
      useAuthStore.getState().setUser({
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
      });
      useAuthStore.getState().setToken('mock-token');

      // Reset
      useAuthStore.getState().reset();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.token).toBeNull();
    });
  });

  describe('computed state', () => {
    it('should have isAuthenticated false when user is null', () => {
      const { isAuthenticated } = useAuthStore.getState();
      expect(isAuthenticated).toBe(false);
    });

    it('should have isAuthenticated true when user is set', () => {
      useAuthStore.getState().setUser({
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
      });

      const { isAuthenticated } = useAuthStore.getState();
      expect(isAuthenticated).toBe(true);
    });
  });
});
