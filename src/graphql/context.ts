/**
 * GraphQL Context
 *
 * Provides authenticated user context to all resolvers.
 */
import type { User } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";

export interface GraphQLContext {
  user: User | null;
}

/**
 * Create GraphQL context from incoming request.
 * Extracts and validates authentication token.
 */
export async function createContext(request: Request): Promise<GraphQLContext> {
  const authHeader = request.headers.get("authorization");
  const user = await getCurrentUser(authHeader);
  return { user };
}
