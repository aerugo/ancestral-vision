/**
 * Authentication Utilities
 *
 * Server-side functions for token verification and user management.
 */
import type { User } from "@prisma/client";

export interface DecodedToken {
  uid: string;
  email?: string;
  name?: string;
}

/**
 * Verify a Firebase ID token and extract user data.
 *
 * @throws Error if token is invalid or expired
 */
export async function verifyAuthToken(token: string): Promise<DecodedToken> {
  // Dynamic import to avoid initialization errors in test environment
  const { getFirebaseAdmin, isFirebaseAdminConfigured } = await import("./firebase-admin");

  if (!isFirebaseAdminConfigured()) {
    throw new Error("Firebase Admin is not configured");
  }

  const { auth } = getFirebaseAdmin();
  const decodedToken = await auth.verifyIdToken(token);

  return {
    uid: decodedToken.uid,
    email: decodedToken.email,
    name: decodedToken["name"] as string | undefined,
  };
}

/**
 * Get or create a user in the database based on Firebase token data.
 * Creates new user on first login, updates lastLoginAt on subsequent logins.
 */
export async function getOrCreateUser(tokenData: DecodedToken): Promise<User> {
  const { prisma } = await import("./prisma");
  const { uid, email, name } = tokenData;

  // Try to find existing user
  let user = await prisma.user.findUnique({
    where: { id: uid },
  });

  if (!user) {
    // Create new user with default constellation
    user = await prisma.user.create({
      data: {
        id: uid,
        email: email ?? `${uid}@placeholder.ancestralvision.com`,
        displayName: name ?? "New User",
      },
    });
  } else {
    // Update last login timestamp
    user = await prisma.user.update({
      where: { id: uid },
      data: { lastLoginAt: new Date() },
    });
  }

  return user;
}

/**
 * Extract and verify user from Authorization header.
 *
 * @param authHeader - The Authorization header value (Bearer token)
 * @returns User if authenticated, null otherwise
 */
export async function getCurrentUser(authHeader: string | null): Promise<User | null> {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const tokenData = await verifyAuthToken(token);
    return await getOrCreateUser(tokenData);
  } catch {
    return null;
  }
}

/**
 * Require authentication - throws if not authenticated.
 */
export async function requireAuth(authHeader: string | null): Promise<User> {
  const user = await getCurrentUser(authHeader);
  if (!user) {
    throw new Error("Authentication required");
  }
  return user;
}
