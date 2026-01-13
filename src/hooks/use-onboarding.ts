/**
 * Onboarding Hooks
 *
 * TanStack Query hooks for onboarding wizard functionality.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';

// GraphQL Operations

const ONBOARDING_PROGRESS = /* GraphQL */ `
  query OnboardingProgress {
    onboardingProgress {
      id
      userId
      status
      currentStep
      completedSteps
      savedData
      hasCompletedTour
      tourSkipped
      startedAt
      lastUpdatedAt
      completedAt
    }
  }
`;

const START_ONBOARDING = /* GraphQL */ `
  mutation StartOnboarding {
    startOnboarding {
      id
      userId
      status
      currentStep
      completedSteps
      savedData
      hasCompletedTour
      tourSkipped
      startedAt
      lastUpdatedAt
      completedAt
    }
  }
`;

const UPDATE_ONBOARDING_STEP = /* GraphQL */ `
  mutation UpdateOnboardingStep($step: OnboardingStep!) {
    updateOnboardingStep(step: $step) {
      id
      userId
      status
      currentStep
      completedSteps
      savedData
      hasCompletedTour
      tourSkipped
      startedAt
      lastUpdatedAt
      completedAt
    }
  }
`;

const COMPLETE_ONBOARDING_STEP = /* GraphQL */ `
  mutation CompleteOnboardingStep($step: OnboardingStep!, $data: JSON) {
    completeOnboardingStep(step: $step, data: $data) {
      id
      userId
      status
      currentStep
      completedSteps
      savedData
      hasCompletedTour
      tourSkipped
      startedAt
      lastUpdatedAt
      completedAt
    }
  }
`;

const SAVE_ONBOARDING_DATA = /* GraphQL */ `
  mutation SaveOnboardingData($data: JSON!) {
    saveOnboardingData(data: $data) {
      id
      userId
      status
      currentStep
      completedSteps
      savedData
      hasCompletedTour
      tourSkipped
      startedAt
      lastUpdatedAt
      completedAt
    }
  }
`;

const COMPLETE_TOUR = /* GraphQL */ `
  mutation CompleteTour {
    completeTour {
      id
      userId
      status
      currentStep
      completedSteps
      savedData
      hasCompletedTour
      tourSkipped
      startedAt
      lastUpdatedAt
      completedAt
    }
  }
`;

const SKIP_TOUR = /* GraphQL */ `
  mutation SkipTour {
    skipTour {
      id
      userId
      status
      currentStep
      completedSteps
      savedData
      hasCompletedTour
      tourSkipped
      startedAt
      lastUpdatedAt
      completedAt
    }
  }
`;

const COMPLETE_ONBOARDING = /* GraphQL */ `
  mutation CompleteOnboarding {
    completeOnboarding {
      id
      userId
      status
      currentStep
      completedSteps
      savedData
      hasCompletedTour
      tourSkipped
      startedAt
      lastUpdatedAt
      completedAt
    }
  }
`;

const SKIP_ONBOARDING = /* GraphQL */ `
  mutation SkipOnboarding {
    skipOnboarding {
      id
      userId
      status
      currentStep
      completedSteps
      savedData
      hasCompletedTour
      tourSkipped
      startedAt
      lastUpdatedAt
      completedAt
    }
  }
`;

// Types

export type OnboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
export type OnboardingStep = 'TOUR' | 'ADD_SELF' | 'ADD_PARENTS' | 'ADD_GRANDPARENTS' | 'AHA_MOMENT';

export interface OnboardingProgress {
  id: string;
  userId: string;
  status: OnboardingStatus;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  savedData: Record<string, unknown> | null;
  hasCompletedTour: boolean;
  tourSkipped: boolean;
  startedAt: string;
  lastUpdatedAt: string;
  completedAt: string | null;
}

interface OnboardingProgressResponse {
  onboardingProgress: OnboardingProgress | null;
}

interface StartOnboardingResponse {
  startOnboarding: OnboardingProgress;
}

interface UpdateOnboardingStepResponse {
  updateOnboardingStep: OnboardingProgress;
}

interface CompleteOnboardingStepResponse {
  completeOnboardingStep: OnboardingProgress;
}

interface SaveOnboardingDataResponse {
  saveOnboardingData: OnboardingProgress;
}

interface CompleteTourResponse {
  completeTour: OnboardingProgress;
}

interface SkipTourResponse {
  skipTour: OnboardingProgress;
}

interface CompleteOnboardingResponse {
  completeOnboarding: OnboardingProgress;
}

interface SkipOnboardingResponse {
  skipOnboarding: OnboardingProgress;
}

// Query Keys
const ONBOARDING_QUERY_KEY = ['onboarding'];

// Hooks

/**
 * Fetch onboarding progress for current user
 */
export function useOnboarding() {
  return useQuery({
    queryKey: ONBOARDING_QUERY_KEY,
    queryFn: async (): Promise<OnboardingProgress | null> => {
      const result = await graphqlClient.request<OnboardingProgressResponse>(
        ONBOARDING_PROGRESS
      );
      return result.onboardingProgress;
    },
  });
}

/**
 * Start the onboarding process
 */
export function useStartOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<OnboardingProgress> => {
      const result = await graphqlClient.request<StartOnboardingResponse>(
        START_ONBOARDING
      );
      return result.startOnboarding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY });
    },
  });
}

/**
 * Update current onboarding step
 */
export function useUpdateOnboardingStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ step }: { step: OnboardingStep }): Promise<OnboardingProgress> => {
      const result = await graphqlClient.request<UpdateOnboardingStepResponse>(
        UPDATE_ONBOARDING_STEP,
        { step }
      );
      return result.updateOnboardingStep;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY });
    },
  });
}

/**
 * Complete an onboarding step with optional data
 */
export function useCompleteOnboardingStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      step,
      data,
    }: {
      step: OnboardingStep;
      data?: unknown;
    }): Promise<OnboardingProgress> => {
      const result = await graphqlClient.request<CompleteOnboardingStepResponse>(
        COMPLETE_ONBOARDING_STEP,
        { step, data }
      );
      return result.completeOnboardingStep;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY });
    },
  });
}

/**
 * Save arbitrary onboarding data
 */
export function useSaveOnboardingData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>): Promise<OnboardingProgress> => {
      const result = await graphqlClient.request<SaveOnboardingDataResponse>(
        SAVE_ONBOARDING_DATA,
        { data }
      );
      return result.saveOnboardingData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY });
    },
  });
}

/**
 * Complete the tour
 */
export function useCompleteTour() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<OnboardingProgress> => {
      const result = await graphqlClient.request<CompleteTourResponse>(
        COMPLETE_TOUR
      );
      return result.completeTour;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY });
    },
  });
}

/**
 * Skip the tour
 */
export function useSkipTour() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<OnboardingProgress> => {
      const result = await graphqlClient.request<SkipTourResponse>(
        SKIP_TOUR
      );
      return result.skipTour;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY });
    },
  });
}

/**
 * Complete the entire onboarding process
 */
export function useCompleteOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<OnboardingProgress> => {
      const result = await graphqlClient.request<CompleteOnboardingResponse>(
        COMPLETE_ONBOARDING
      );
      return result.completeOnboarding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY });
    },
  });
}

/**
 * Skip the entire onboarding process
 */
export function useSkipOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<OnboardingProgress> => {
      const result = await graphqlClient.request<SkipOnboardingResponse>(
        SKIP_ONBOARDING
      );
      return result.skipOnboarding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ONBOARDING_QUERY_KEY });
    },
  });
}
