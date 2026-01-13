import { GraphQLClient } from 'graphql-request';
import { useAuthStore } from '@/store/auth-store';

/**
 * GraphQL endpoint - uses relative path for same-origin requests
 */
const GRAPHQL_ENDPOINT = '/api/graphql';

/**
 * Get authorization headers based on current auth state
 * Reads token from Zustand store
 */
export function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  if (token) {
    return {
      Authorization: `Bearer ${token}`,
    };
  }
  return {};
}

/**
 * GraphQL client instance configured with auth middleware
 */
export const graphqlClient = new GraphQLClient(GRAPHQL_ENDPOINT, {
  requestMiddleware: (request) => {
    const authHeaders = getAuthHeaders();
    return {
      ...request,
      headers: {
        ...request.headers,
        ...authHeaders,
      },
    };
  },
});

/**
 * Type-safe GraphQL request helper
 * Automatically includes auth headers from the store
 *
 * @param query - GraphQL query or mutation string
 * @param variables - Optional variables for the query
 * @returns Typed response data
 *
 * @example
 * ```typescript
 * const data = await gql<{ me: User }>(`
 *   query Me {
 *     me {
 *       id
 *       email
 *     }
 *   }
 * `);
 * ```
 */
export async function gql<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  return graphqlClient.request<T>(query, variables);
}
