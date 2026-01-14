import { GraphQLClient } from 'graphql-request';
import { useAuthStore } from '@/store/auth-store';

/**
 * Get the GraphQL endpoint URL
 * graphql-request requires an absolute URL for the URL constructor
 */
function getGraphQLEndpoint(): string {
  // In browser, use window.location.origin
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/graphql`;
  }
  // Server-side: use environment variable or default to localhost
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/api/graphql`;
}

/**
 * Get authorization headers based on current auth state
 * Reads token from Zustand store
 */
export function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  console.log('[GraphQL] Getting auth headers, token exists:', !!token);
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
export const graphqlClient = new GraphQLClient(getGraphQLEndpoint(), {
  headers: {
    'Content-Type': 'application/json',
  },
  requestMiddleware: (request) => {
    const authHeaders = getAuthHeaders();
    return {
      ...request,
      headers: {
        'Content-Type': 'application/json',
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
