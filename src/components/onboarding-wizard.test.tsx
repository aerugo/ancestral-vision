/**
 * OnboardingWizard Component Tests
 *
 * Tests for the multi-step onboarding wizard.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { OnboardingWizard } from './onboarding-wizard';
import * as onboardingHooks from '@/hooks/use-onboarding';
import type { OnboardingProgress } from '@/hooks/use-onboarding';

// Mock the onboarding hooks
vi.mock('@/hooks/use-onboarding', () => ({
  useOnboarding: vi.fn(),
  useStartOnboarding: vi.fn(),
  useUpdateOnboardingStep: vi.fn(),
  useCompleteOnboardingStep: vi.fn(),
  useSaveOnboardingData: vi.fn(),
  useCompleteTour: vi.fn(),
  useSkipTour: vi.fn(),
  useCompleteOnboarding: vi.fn(),
  useSkipOnboarding: vi.fn(),
}));

const mockProgress: OnboardingProgress = {
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
};

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

describe('OnboardingWizard', () => {
  const mockOnComplete = vi.fn();
  const mockMutateAsync = vi.fn().mockResolvedValue(mockProgress);

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    vi.mocked(onboardingHooks.useOnboarding).mockReturnValue({
      data: mockProgress,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof onboardingHooks.useOnboarding>);

    vi.mocked(onboardingHooks.useCompleteTour).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof onboardingHooks.useCompleteTour>);

    vi.mocked(onboardingHooks.useSkipTour).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof onboardingHooks.useSkipTour>);

    vi.mocked(onboardingHooks.useUpdateOnboardingStep).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof onboardingHooks.useUpdateOnboardingStep>);

    vi.mocked(onboardingHooks.useCompleteOnboardingStep).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof onboardingHooks.useCompleteOnboardingStep>);

    vi.mocked(onboardingHooks.useCompleteOnboarding).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof onboardingHooks.useCompleteOnboarding>);

    vi.mocked(onboardingHooks.useSkipOnboarding).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof onboardingHooks.useSkipOnboarding>);
  });

  it('should render tour step initially', () => {
    render(<OnboardingWizard onComplete={mockOnComplete} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText(/welcome/i)).toBeInTheDocument();
  });

  it('should show progress indicator', () => {
    render(<OnboardingWizard onComplete={mockOnComplete} />, {
      wrapper: createWrapper(),
    });

    // Progress bar should be present
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should show skip onboarding button', () => {
    render(<OnboardingWizard onComplete={mockOnComplete} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByRole('button', { name: /skip onboarding/i })).toBeInTheDocument();
  });

  it('should call onComplete when skip onboarding is clicked', async () => {
    const user = userEvent.setup();

    render(<OnboardingWizard onComplete={mockOnComplete} />, {
      wrapper: createWrapper(),
    });

    await user.click(screen.getByRole('button', { name: /skip onboarding/i }));

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  it('should show add yourself step when currentStep is ADD_SELF', () => {
    vi.mocked(onboardingHooks.useOnboarding).mockReturnValue({
      data: { ...mockProgress, currentStep: 'ADD_SELF', completedSteps: ['TOUR'] },
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof onboardingHooks.useOnboarding>);

    render(<OnboardingWizard onComplete={mockOnComplete} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText(/start with yourself/i)).toBeInTheDocument();
  });

  it('should show add parents step when currentStep is ADD_PARENTS', () => {
    vi.mocked(onboardingHooks.useOnboarding).mockReturnValue({
      data: { ...mockProgress, currentStep: 'ADD_PARENTS', completedSteps: ['TOUR', 'ADD_SELF'] },
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof onboardingHooks.useOnboarding>);

    render(<OnboardingWizard onComplete={mockOnComplete} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText(/add your parents/i)).toBeInTheDocument();
  });

  it('should show add grandparents step when currentStep is ADD_GRANDPARENTS', () => {
    vi.mocked(onboardingHooks.useOnboarding).mockReturnValue({
      data: { ...mockProgress, currentStep: 'ADD_GRANDPARENTS', completedSteps: ['TOUR', 'ADD_SELF', 'ADD_PARENTS'] },
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof onboardingHooks.useOnboarding>);

    render(<OnboardingWizard onComplete={mockOnComplete} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText(/grandparents/i)).toBeInTheDocument();
  });

  it('should show aha moment step when currentStep is AHA_MOMENT', () => {
    vi.mocked(onboardingHooks.useOnboarding).mockReturnValue({
      data: { ...mockProgress, currentStep: 'AHA_MOMENT', completedSteps: ['TOUR', 'ADD_SELF', 'ADD_PARENTS', 'ADD_GRANDPARENTS'] },
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof onboardingHooks.useOnboarding>);

    render(<OnboardingWizard onComplete={mockOnComplete} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText(/constellation awaits/i)).toBeInTheDocument();
  });

  it('should call completeTour when continuing from tour step', async () => {
    const user = userEvent.setup();

    render(<OnboardingWizard onComplete={mockOnComplete} />, {
      wrapper: createWrapper(),
    });

    await user.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });
  });

  it('should show loading state', () => {
    vi.mocked(onboardingHooks.useOnboarding).mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
      error: null,
    } as ReturnType<typeof onboardingHooks.useOnboarding>);

    render(<OnboardingWizard onComplete={mockOnComplete} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});
