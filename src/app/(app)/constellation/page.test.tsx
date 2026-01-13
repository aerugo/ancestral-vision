/**
 * Constellation Page Integration Tests
 *
 * Tests for the main constellation page including:
 * - PersonProfilePanel integration
 * - SearchBar callback
 * - Onboarding redirect
 * - Selection state management
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import ConstellationPage from './page';

// Track AppShell props to verify onPersonSelect is passed
let capturedAppShellProps: { onPersonSelect?: (id: string) => void } = {};

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
}));

// Mock auth provider
vi.mock('@/components/providers/auth-provider', () => ({
  useAuth: vi.fn(() => ({
    user: { uid: 'user-1', email: 'test@example.com', displayName: 'Test User' },
    loading: false,
  })),
}));

// Mock onboarding hook
vi.mock('@/hooks/use-onboarding', () => ({
  useOnboarding: vi.fn(),
}));

// Mock selection store
const mockSelectPerson = vi.fn();
const mockClearSelection = vi.fn();
vi.mock('@/store/selection-store', () => ({
  useSelectionStore: vi.fn(),
}));

// Mock ConstellationCanvas
vi.mock('@/components/constellation-canvas', () => ({
  ConstellationCanvas: () => <div data-testid="constellation-canvas">Canvas Mock</div>,
}));

// Mock AppShell to capture props
vi.mock('@/components/app-shell', () => ({
  AppShell: ({ children, onPersonSelect }: { children: ReactNode; onPersonSelect?: (id: string) => void }) => {
    capturedAppShellProps = { onPersonSelect };
    return (
      <div data-testid="app-shell" data-has-person-select={!!onPersonSelect}>
        {children}
      </div>
    );
  },
}));

// Mock PersonProfilePanel
vi.mock('@/components/person-profile-panel', () => ({
  PersonProfilePanel: () => <div data-testid="person-profile-panel">Profile Panel Mock</div>,
}));

import { useOnboarding } from '@/hooks/use-onboarding';
import { useSelectionStore } from '@/store/selection-store';
import { useAuth } from '@/components/providers/auth-provider';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('Constellation Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedAppShellProps = {};

    // Default: user is authenticated
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'user-1', email: 'test@example.com', displayName: 'Test User' },
      loading: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      getIdToken: vi.fn(),
      clearError: vi.fn(),
    });

    // Default: onboarding completed
    vi.mocked(useOnboarding).mockReturnValue({
      data: { status: 'COMPLETED' },
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useOnboarding>);

    // Default: no selection
    vi.mocked(useSelectionStore).mockReturnValue({
      selectedPersonId: null,
      connectedPersonIds: [],
      isPanelOpen: false,
      selectPerson: mockSelectPerson,
      clearSelection: mockClearSelection,
      togglePanel: vi.fn(),
      setConnectedPersonIds: vi.fn(),
    });
  });

  describe('Basic Rendering', () => {
    it('should render the page', () => {
      render(<ConstellationPage />, { wrapper: createWrapper() });
      expect(screen.getByTestId('constellation-page')).toBeInTheDocument();
    });

    it('should include the AppShell', () => {
      render(<ConstellationPage />, { wrapper: createWrapper() });
      expect(screen.getByTestId('app-shell')).toBeInTheDocument();
    });

    it('should include the ConstellationCanvas', () => {
      render(<ConstellationPage />, { wrapper: createWrapper() });
      expect(screen.getByTestId('constellation-canvas')).toBeInTheDocument();
    });

    it('should have full height layout', () => {
      render(<ConstellationPage />, { wrapper: createWrapper() });
      const page = screen.getByTestId('constellation-page');
      expect(page).toHaveClass('h-screen');
    });
  });

  describe('PersonProfilePanel Integration', () => {
    it('should render PersonProfilePanel when isPanelOpen is true and person selected', () => {
      vi.mocked(useSelectionStore).mockReturnValue({
        selectedPersonId: 'person-123',
        connectedPersonIds: [],
        isPanelOpen: true,
        selectPerson: mockSelectPerson,
        clearSelection: mockClearSelection,
        togglePanel: vi.fn(),
        setConnectedPersonIds: vi.fn(),
      });

      render(<ConstellationPage />, { wrapper: createWrapper() });
      expect(screen.getByTestId('person-profile-panel')).toBeInTheDocument();
    });

    it('should NOT render PersonProfilePanel when isPanelOpen is false', () => {
      vi.mocked(useSelectionStore).mockReturnValue({
        selectedPersonId: 'person-123',
        connectedPersonIds: [],
        isPanelOpen: false,
        selectPerson: mockSelectPerson,
        clearSelection: mockClearSelection,
        togglePanel: vi.fn(),
        setConnectedPersonIds: vi.fn(),
      });

      render(<ConstellationPage />, { wrapper: createWrapper() });
      expect(screen.queryByTestId('person-profile-panel')).not.toBeInTheDocument();
    });

    it('should NOT render PersonProfilePanel when no person selected', () => {
      vi.mocked(useSelectionStore).mockReturnValue({
        selectedPersonId: null,
        connectedPersonIds: [],
        isPanelOpen: true,
        selectPerson: mockSelectPerson,
        clearSelection: mockClearSelection,
        togglePanel: vi.fn(),
        setConnectedPersonIds: vi.fn(),
      });

      render(<ConstellationPage />, { wrapper: createWrapper() });
      expect(screen.queryByTestId('person-profile-panel')).not.toBeInTheDocument();
    });
  });

  describe('SearchBar Integration', () => {
    it('should pass onPersonSelect callback to AppShell', () => {
      render(<ConstellationPage />, { wrapper: createWrapper() });

      // Verify AppShell received onPersonSelect prop
      expect(capturedAppShellProps.onPersonSelect).toBeDefined();
      expect(typeof capturedAppShellProps.onPersonSelect).toBe('function');
    });

    it('should select person when onPersonSelect callback is called', () => {
      render(<ConstellationPage />, { wrapper: createWrapper() });

      // Call the captured callback
      capturedAppShellProps.onPersonSelect?.('person-456');

      expect(mockSelectPerson).toHaveBeenCalledWith('person-456', []);
    });
  });

  describe('Onboarding Redirect', () => {
    it('should redirect to onboarding if status is NOT_STARTED', async () => {
      vi.mocked(useOnboarding).mockReturnValue({
        data: { status: 'NOT_STARTED' },
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof useOnboarding>);

      render(<ConstellationPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/onboarding');
      });
    });

    it('should redirect to onboarding if status is IN_PROGRESS', async () => {
      vi.mocked(useOnboarding).mockReturnValue({
        data: { status: 'IN_PROGRESS' },
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof useOnboarding>);

      render(<ConstellationPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/onboarding');
      });
    });

    it('should NOT redirect if onboarding status is COMPLETED', () => {
      vi.mocked(useOnboarding).mockReturnValue({
        data: { status: 'COMPLETED' },
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof useOnboarding>);

      render(<ConstellationPage />, { wrapper: createWrapper() });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should NOT redirect if onboarding status is SKIPPED', () => {
      vi.mocked(useOnboarding).mockReturnValue({
        data: { status: 'SKIPPED' },
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof useOnboarding>);

      render(<ConstellationPage />, { wrapper: createWrapper() });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should NOT redirect while onboarding data is loading', () => {
      vi.mocked(useOnboarding).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
      } as ReturnType<typeof useOnboarding>);

      render(<ConstellationPage />, { wrapper: createWrapper() });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should redirect to onboarding if no onboarding data exists (new user)', async () => {
      vi.mocked(useOnboarding).mockReturnValue({
        data: null,
        isLoading: false,
        isError: false,
        error: null,
      } as ReturnType<typeof useOnboarding>);

      render(<ConstellationPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/onboarding');
      });
    });
  });

  describe('Authentication', () => {
    it('should redirect to login if user is not authenticated', async () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        loading: false,
        error: null,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        getIdToken: vi.fn(),
        clearError: vi.fn(),
      });

      render(<ConstellationPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login');
      });
    });

    it('should NOT redirect while auth is loading', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        loading: true,
        error: null,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        getIdToken: vi.fn(),
        clearError: vi.fn(),
      });

      render(<ConstellationPage />, { wrapper: createWrapper() });

      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
