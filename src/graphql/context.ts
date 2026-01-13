/**
 * GraphQL Context Factory
 *
 * Creates the context object for each GraphQL request.
 * Handles authentication by extracting and verifying Bearer tokens.
 */
import type { User } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';

/**
 * GraphQL context type
 */
export interface GraphQLContext {
  user: User | null;
}

/**
 * Create GraphQL context from incoming request
 *
 * Extracts the Authorization header and verifies the token
 * to populate the context with the authenticated user.
 *
 * @param request - The incoming HTTP request
 * @returns GraphQL context with user if authenticated
 */
export async function createContext(request: Request): Promise<GraphQLContext> {
  const authHeader = request.headers.get('authorization');
  const user = await getCurrentUser(authHeader);
  return { user };
}
