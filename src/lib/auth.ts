/**
 * Auth Utilities
 *
 * Server-side authentication utilities for token verification and user management.
 * Uses Firebase Admin SDK for token verification and Prisma for user persistence.
 */
import { getFirebaseAdmin } from './firebase-admin';
import { prisma } from './prisma';
import type { User } from '@prisma/client';

/**
 * Decoded token data from Firebase
 */
export interface DecodedToken {
  uid: string;
  email?: string;
  name?: string;
}

/**
 * Verify a Firebase ID token
 *
 * @param token - The Firebase ID token to verify
 * @returns Decoded token data containing uid, email, and name
 * @throws Error if token is invalid or expired
 */
export async function verifyAuthToken(token: string): Promise<DecodedToken> {
  const { auth } = getFirebaseAdmin();
  const decodedToken = await auth.verifyIdToken(token);

  return {
    uid: decodedToken.uid,
    email: decodedToken.email,
    name: decodedToken.name,
  };
}

/**
 * Get or create a user in the database
 *
 * If a user with the given uid exists, updates their lastLoginAt timestamp.
 * If the user doesn't exist, creates a new user record.
 *
 * @param tokenData - Decoded token data from Firebase
 * @returns The user record from the database
 */
export async function getOrCreateUser(tokenData: DecodedToken): Promise<User> {
  const { uid, email, name } = tokenData;

  let user = await prisma.user.findUnique({
    where: { id: uid },
  });

  if (!user) {
    // Create new user
    user = await prisma.user.create({
      data: {
        id: uid,
        email: email ?? `${uid}@placeholder.ancestralvision.com`,
        displayName: name ?? 'New User',
      },
    });
  } else {
    // Update last login time
    user = await prisma.user.update({
      where: { id: uid },
      data: { lastLoginAt: new Date() },
    });
  }

  return user;
}

/**
 * Get current user from Authorization header
 *
 * Parses a Bearer token from the Authorization header, verifies it with
 * Firebase, and returns the corresponding user from the database.
 *
 * @param authHeader - The Authorization header value (e.g., "Bearer <token>")
 * @returns The user if authenticated, null otherwise
 */
export async function getCurrentUser(authHeader: string | null): Promise<User | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  if (!token) {
    return null;
  }

  try {
    const tokenData = await verifyAuthToken(token);
    return await getOrCreateUser(tokenData);
  } catch {
    return null;
  }
}
