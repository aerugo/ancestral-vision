import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/graphql-client';

/**
 * Current user data from the API
 */
export interface CurrentUser {
  id: string;
  email: string | null;
  displayName: string | null;
  createdAt: string;
  preferences?: Record<string, unknown>;
}

// GraphQL Query
const ME_QUERY = `
  query Me {
    me {
      id
      email
      displayName
      createdAt
    }
  }
`;

/**
 * Query key for current user data
 */
export const meQueryKey = ['me'] as const;

/**
 * Hook to fetch the current authenticated user
 *
 * @returns TanStack Query result with current user data
 *
 * @example
 * ```tsx
 * function UserProfile() {
 *   const { data: user, isLoading, error } = useMe();
 *
 *   if (isLoading) return <Loading />;
 *   if (error) return <Error message={error.message} />;
 *   if (!user) return <LoginPrompt />;
 *
 *   return <Profile user={user} />;
 * }
 * ```
 */
export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: async () => {
      const data = await gql<{ me: CurrentUser | null }>(ME_QUERY);
      return data.me;
    },
  });
}
