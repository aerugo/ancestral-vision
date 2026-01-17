import { GraphQLClient } from 'graphql-request';
import { useAuthStore } from '@/store/auth-store';
import { isTemplateMode, getTemplateToken } from '@/lib/template-mode';

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
 * Reads token from Zustand store (sync fallback)
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
 * Get a fresh auth token from Firebase
 * This ensures the token is valid and not expired (tokens last 1 hour)
 * Firebase automatically refreshes the token if needed
 */
export async function getFreshAuthToken(): Promise<string | null> {
  // In template mode, return the template token
  if (isTemplateMode()) {
    return getTemplateToken();
  }

  // Lazy import Firebase auth to avoid initialization in tests
  try {
    const { auth } = await import('@/lib/firebase');
    const currentUser = auth.currentUser;
    if (currentUser) {
      const token = await currentUser.getIdToken();
      // Update the store with the fresh token
      useAuthStore.getState().setToken(token);
      return token;
    }
  } catch (error) {
    console.error('[GraphQL] Failed to get fresh token:', error);
  }

  // Fall back to stored token if Firebase not available
  return useAuthStore.getState().token;
}

/**
 * Get authorization headers with a fresh token (async)
 * Use this for important API calls to ensure token is valid
 */
export async function getFreshAuthHeaders(): Promise<Record<string, string>> {
  const token = await getFreshAuthToken();
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
 * Gets a fresh auth token before each request to ensure validity
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
  // Get fresh token before each request to ensure it's valid
  // Firebase tokens expire after 1 hour, this ensures automatic refresh
  const headers = await getFreshAuthHeaders();
  return graphqlClient.request<T>(query, variables, headers);
}
