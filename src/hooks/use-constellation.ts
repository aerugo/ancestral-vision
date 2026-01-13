import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/graphql-client';

/**
 * Constellation data from the API
 */
export interface Constellation {
  id: string;
  title: string;
  description: string | null;
  personCount: number;
  generationSpan: number;
  centeredPersonId: string | null;
}

/**
 * Input for creating a new constellation
 */
export interface CreateConstellationInput {
  title: string;
  description?: string;
}

// GraphQL Queries
const CONSTELLATION_QUERY = `
  query Constellation {
    constellation {
      id
      title
      description
      personCount
      generationSpan
      centeredPersonId
    }
  }
`;

const CREATE_CONSTELLATION_MUTATION = `
  mutation CreateConstellation($input: CreateConstellationInput!) {
    createConstellation(input: $input) {
      id
      title
      description
    }
  }
`;

/**
 * Query key for constellation data
 */
export const constellationQueryKey = ['constellation'] as const;

/**
 * Hook to fetch the current user's constellation
 *
 * @returns TanStack Query result with constellation data
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { data, isLoading, error } = useConstellation();
 *
 *   if (isLoading) return <Loading />;
 *   if (error) return <Error message={error.message} />;
 *   if (!data) return <NoConstellation />;
 *
 *   return <ConstellationView constellation={data} />;
 * }
 * ```
 */
export function useConstellation() {
  return useQuery({
    queryKey: constellationQueryKey,
    queryFn: async () => {
      const data = await gql<{ constellation: Constellation | null }>(
        CONSTELLATION_QUERY
      );
      return data.constellation;
    },
  });
}

/**
 * Hook to create a new constellation
 *
 * @returns TanStack Query mutation result
 *
 * @example
 * ```tsx
 * function CreateButton() {
 *   const { mutate, isPending } = useCreateConstellation();
 *
 *   const handleCreate = () => {
 *     mutate({ title: 'My Family Tree' });
 *   };
 *
 *   return (
 *     <button onClick={handleCreate} disabled={isPending}>
 *       {isPending ? 'Creating...' : 'Create Constellation'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useCreateConstellation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateConstellationInput) => {
      const data = await gql<{ createConstellation: Constellation }>(
        CREATE_CONSTELLATION_MUTATION,
        { input }
      );
      return data.createConstellation;
    },
    onSuccess: () => {
      // Invalidate constellation query to refetch updated data
      queryClient.invalidateQueries({ queryKey: constellationQueryKey });
    },
  });
}
