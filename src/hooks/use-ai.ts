/**
 * AI-related React hooks
 *
 * Provides hooks for AI operations including biography generation
 * and suggestion management.
 *
 * Invariants:
 * - INV-AI001: AI Operations Require Quota Check
 * - INV-AI002: AI Operations Must Track Usage
 * - INV-AI003: AI Suggestions Require User Approval
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/graphql-client';
import { personQueryKey, peopleQueryKey, type Person } from './use-people';
import { constellationGraphQueryKey } from './use-constellation-graph';
import { scheduleInvalidation } from '@/visualization/biography-transition-events';

/**
 * Result of AI biography generation
 */
export interface BiographyGenerationResult {
  suggestionId: string;
  biography: string;
  wordCount: number;
  confidence: number;
  sourcesUsed: string[];
}

// GraphQL Mutations
const GENERATE_BIOGRAPHY_MUTATION = `
  mutation GenerateBiography($personId: ID!, $maxLength: Int) {
    generateBiography(personId: $personId, maxLength: $maxLength) {
      suggestionId
      biography
      wordCount
      confidence
      sourcesUsed
    }
  }
`;

const APPLY_BIOGRAPHY_SUGGESTION_MUTATION = `
  mutation ApplyBiographySuggestion($suggestionId: ID!) {
    applyBiographySuggestion(suggestionId: $suggestionId) {
      id
      givenName
      surname
      patronymic
      maidenName
      matronymic
      nickname
      suffix
      nameOrder
      gender
      biography
      speculative
      generation
      birthDate
      deathDate
    }
  }
`;

/**
 * Hook to generate a biography for a person using AI
 *
 * This creates an AI suggestion that must be approved before
 * being applied to the person (INV-AI003).
 *
 * @returns TanStack Query mutation result
 *
 * @example
 * ```tsx
 * function GenerateBioButton({ personId }: { personId: string }) {
 *   const { mutate, isPending, data } = useGenerateBiography();
 *
 *   const handleGenerate = () => {
 *     mutate({ personId });
 *   };
 *
 *   return (
 *     <button onClick={handleGenerate} disabled={isPending}>
 *       {isPending ? 'Generating...' : 'Generate Biography'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useGenerateBiography() {
  return useMutation({
    mutationFn: async ({
      personId,
      maxLength,
    }: {
      personId: string;
      maxLength?: number;
    }) => {
      const data = await gql<{ generateBiography: BiographyGenerationResult }>(
        GENERATE_BIOGRAPHY_MUTATION,
        { personId, maxLength }
      );
      return data.generateBiography;
    },
  });
}

/**
 * Hook to apply an AI-generated biography suggestion
 *
 * This updates the person's biography and marks the suggestion
 * as accepted. Call this after the user approves the generated
 * biography.
 *
 * @returns TanStack Query mutation result
 *
 * @example
 * ```tsx
 * function ApproveButton({ suggestionId, personId }: Props) {
 *   const { mutate, isPending } = useApplyBiographySuggestion();
 *
 *   const handleApprove = () => {
 *     mutate({ suggestionId, personId });
 *   };
 *
 *   return (
 *     <button onClick={handleApprove} disabled={isPending}>
 *       {isPending ? 'Applying...' : 'Use This Biography'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useApplyBiographySuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      suggestionId,
    }: {
      suggestionId: string;
      personId: string;
    }) => {
      const data = await gql<{ applyBiographySuggestion: Person }>(
        APPLY_BIOGRAPHY_SUGGESTION_MUTATION,
        { suggestionId }
      );
      return data.applyBiographySuggestion;
    },
    onSuccess: (updatedPerson) => {
      // Invalidate people list
      queryClient.invalidateQueries({ queryKey: peopleQueryKey });
      // Update the specific person cache
      queryClient.setQueryData(personQueryKey(updatedPerson.id), updatedPerson);
      // Invalidate constellation graph (biography changes affect node appearance)
      // Use scheduleInvalidation to delay during transition animation
      scheduleInvalidation(() => {
        queryClient.invalidateQueries({ queryKey: constellationGraphQueryKey });
      });
    },
  });
}
