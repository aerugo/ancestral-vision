/**
 * Onboarding Hooks Tests
 *
 * Tests for useOnboarding and related mutation hooks.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useOnboarding,
  useStartOnboarding,
  useUpdateOnboardingStep,
  useCompleteOnboardingStep,
  useSaveOnboardingData,
  useCompleteTour,
  useSkipTour,
  useCompleteOnboarding,
  useSkipOnboarding,
  type OnboardingProgress,
} from './use-onboarding';

// Mock the GraphQL client
vi.mock('@/lib/graphql-client', () => ({
  graphqlClient: {
    request: vi.fn(),
  },
}));

import { graphqlClient } from '@/lib/graphql-client';

const mockOnboardingProgress: OnboardingProgress = {
  id: 'progress-1',
  userId: 'user-1',
  status: 'IN_PROGRESS',
  currentStep: 'ADD_SELF',
  completedSteps: ['TOUR'],
  savedData: { TOUR: { seen: true } },
  hasCompletedTour: true,
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

describe('Onboarding Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useOnboarding', () => {
    it('should fetch onboarding progress', async () => {
      vi.mocked(graphqlClient.request).mockResolvedValueOnce({
        onboardingProgress: mockOnboardingProgress,
      });

      const { result } = renderHook(() => useOnboarding(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockOnboardingProgress);
      expect(graphqlClient.request).toHaveBeenCalledTimes(1);
    });

    it('should handle null progress', async () => {
      vi.mocked(graphqlClient.request).mockResolvedValueOnce({
        onboardingProgress: null,
      });

      const { result } = renderHook(() => useOnboarding(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });

    it('should handle errors', async () => {
      vi.mocked(graphqlClient.request).mockRejectedValueOnce(
        new Error('Network error')
      );

      const { result } = renderHook(() => useOnboarding(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useStartOnboarding', () => {
    it('should start onboarding', async () => {
      const startedProgress = { ...mockOnboardingProgress, status: 'IN_PROGRESS' };
      vi.mocked(graphqlClient.request).mockResolvedValueOnce({
        startOnboarding: startedProgress,
      });

      const { result } = renderHook(() => useStartOnboarding(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(graphqlClient.request).toHaveBeenCalled();
    });
  });

  describe('useUpdateOnboardingStep', () => {
    it('should update current step', async () => {
      const updatedProgress = { ...mockOnboardingProgress, currentStep: 'ADD_PARENTS' };
      vi.mocked(graphqlClient.request).mockResolvedValueOnce({
        updateOnboardingStep: updatedProgress,
      });

      const { result } = renderHook(() => useUpdateOnboardingStep(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({ step: 'ADD_PARENTS' });
      });

      expect(graphqlClient.request).toHaveBeenCalled();
    });
  });

  describe('useCompleteOnboardingStep', () => {
    it('should complete step with data', async () => {
      const completedProgress = {
        ...mockOnboardingProgress,
        completedSteps: ['TOUR', 'ADD_SELF'],
        savedData: { TOUR: { seen: true }, ADD_SELF: { givenName: 'John' } },
      };
      vi.mocked(graphqlClient.request).mockResolvedValueOnce({
        completeOnboardingStep: completedProgress,
      });

      const { result } = renderHook(() => useCompleteOnboardingStep(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          step: 'ADD_SELF',
          data: { givenName: 'John' },
        });
      });

      expect(graphqlClient.request).toHaveBeenCalled();
    });

    it('should complete step without data', async () => {
      const completedProgress = {
        ...mockOnboardingProgress,
        completedSteps: ['TOUR', 'ADD_SELF'],
      };
      vi.mocked(graphqlClient.request).mockResolvedValueOnce({
        completeOnboardingStep: completedProgress,
      });

      const { result } = renderHook(() => useCompleteOnboardingStep(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({ step: 'ADD_SELF' });
      });

      expect(graphqlClient.request).toHaveBeenCalled();
    });
  });

  describe('useSaveOnboardingData', () => {
    it('should save arbitrary data', async () => {
      const savedProgress = {
        ...mockOnboardingProgress,
        savedData: { TOUR: { seen: true }, formData: { name: 'Test' } },
      };
      vi.mocked(graphqlClient.request).mockResolvedValueOnce({
        saveOnboardingData: savedProgress,
      });

      const { result } = renderHook(() => useSaveOnboardingData(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({ formData: { name: 'Test' } });
      });

      expect(graphqlClient.request).toHaveBeenCalled();
    });
  });

  describe('useCompleteTour', () => {
    it('should complete tour', async () => {
      const completedProgress = {
        ...mockOnboardingProgress,
        hasCompletedTour: true,
        currentStep: 'ADD_SELF',
      };
      vi.mocked(graphqlClient.request).mockResolvedValueOnce({
        completeTour: completedProgress,
      });

      const { result } = renderHook(() => useCompleteTour(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(graphqlClient.request).toHaveBeenCalled();
    });
  });

  describe('useSkipTour', () => {
    it('should skip tour', async () => {
      const skippedProgress = {
        ...mockOnboardingProgress,
        tourSkipped: true,
        currentStep: 'ADD_SELF',
      };
      vi.mocked(graphqlClient.request).mockResolvedValueOnce({
        skipTour: skippedProgress,
      });

      const { result } = renderHook(() => useSkipTour(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(graphqlClient.request).toHaveBeenCalled();
    });
  });

  describe('useCompleteOnboarding', () => {
    it('should complete onboarding', async () => {
      const completedProgress = {
        ...mockOnboardingProgress,
        status: 'COMPLETED',
        completedAt: '2026-01-13T12:00:00.000Z',
      };
      vi.mocked(graphqlClient.request).mockResolvedValueOnce({
        completeOnboarding: completedProgress,
      });

      const { result } = renderHook(() => useCompleteOnboarding(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(graphqlClient.request).toHaveBeenCalled();
    });
  });

  describe('useSkipOnboarding', () => {
    it('should skip onboarding', async () => {
      const skippedProgress = {
        ...mockOnboardingProgress,
        status: 'SKIPPED',
        completedAt: '2026-01-13T12:00:00.000Z',
      };
      vi.mocked(graphqlClient.request).mockResolvedValueOnce({
        skipOnboarding: skippedProgress,
      });

      const { result } = renderHook(() => useSkipOnboarding(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(graphqlClient.request).toHaveBeenCalled();
    });
  });
});
