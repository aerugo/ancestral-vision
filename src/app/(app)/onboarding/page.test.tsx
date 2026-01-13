/**
 * Onboarding Page Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import OnboardingPage from './page';

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
  useAuth: vi.fn(),
}));

// Mock onboarding hooks
vi.mock('@/hooks/use-onboarding', () => ({
  useOnboarding: vi.fn(),
  useStartOnboarding: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useUpdateOnboardingStep: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useCompleteOnboardingStep: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useSaveOnboardingData: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useCompleteTour: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useSkipTour: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useCompleteOnboarding: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useSkipOnboarding: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

import { useAuth } from '@/components/providers/auth-provider';
import { useOnboarding } from '@/hooks/use-onboarding';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('OnboardingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockClear();
  });

  it('should redirect unauthenticated users to login', async () => {
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

    vi.mocked(useOnboarding).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useOnboarding>);

    render(<OnboardingPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('should redirect completed users to constellation', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'user-1', email: 'test@example.com', displayName: 'Test' },
      loading: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      getIdToken: vi.fn(),
      clearError: vi.fn(),
    });

    vi.mocked(useOnboarding).mockReturnValue({
      data: {
        id: 'progress-1',
        userId: 'user-1',
        status: 'COMPLETED',
        currentStep: 'AHA_MOMENT',
        completedSteps: ['TOUR', 'ADD_SELF', 'ADD_PARENTS', 'ADD_GRANDPARENTS', 'AHA_MOMENT'],
        savedData: null,
        hasCompletedTour: true,
        tourSkipped: false,
        startedAt: '2026-01-13T00:00:00.000Z',
        lastUpdatedAt: '2026-01-13T00:00:00.000Z',
        completedAt: '2026-01-13T12:00:00.000Z',
      },
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useOnboarding>);

    render(<OnboardingPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/constellation');
    });
  });

  it('should show wizard for new users', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'user-1', email: 'test@example.com', displayName: 'Test' },
      loading: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      getIdToken: vi.fn(),
      clearError: vi.fn(),
    });

    vi.mocked(useOnboarding).mockReturnValue({
      data: {
        id: 'progress-1',
        userId: 'user-1',
        status: 'IN_PROGRESS',
        currentStep: 'TOUR',
        completedSteps: [],
        savedData: null,
        hasCompletedTour: false,
        tourSkipped: false,
        startedAt: '2026-01-13T00:00:00.000Z',
        lastUpdatedAt: '2026-01-13T00:00:00.000Z',
        completedAt: null,
      },
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useOnboarding>);

    render(<OnboardingPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/welcome/i)).toBeInTheDocument();
    });
  });

  it('should show loading state', () => {
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

    vi.mocked(useOnboarding).mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
      error: null,
    } as ReturnType<typeof useOnboarding>);

    render(<OnboardingPage />, { wrapper: createWrapper() });

    expect(screen.getByTestId('page-loading')).toBeInTheDocument();
  });
});
