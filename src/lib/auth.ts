/**
 * Auth Utilities
 *
 * Server-side authentication utilities for token verification and user management.
 * Uses Firebase Admin SDK for token verification and Prisma for user persistence.
 */
import { getFirebaseAdmin } from './firebase-admin';
import { prisma } from './prisma';
import type { User } from '@prisma/client';
import { isTemplateMode, TEMPLATE_USER_ID } from './template-mode';

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
  const userEmail = email ?? `${uid}@placeholder.ancestralvision.com`;

  // First, check if user exists by UID
  let user = await prisma.user.findUnique({
    where: { id: uid },
  });

  if (user) {
    // User exists with this UID, update last login
    return prisma.user.update({
      where: { id: uid },
      data: { lastLoginAt: new Date() },
    });
  }

  // User doesn't exist by UID - check if email exists (from old UID)
  // This handles Firebase emulator resets where UID changes but email stays same
  const existingByEmail = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (existingByEmail) {
    // Update the existing user's ID to the new Firebase UID
    return prisma.user.update({
      where: { email: userEmail },
      data: {
        id: uid,
        lastLoginAt: new Date(),
      },
    });
  }

  // No existing user - create new user with a constellation
  const newUser = await prisma.user.create({
    data: {
      id: uid,
      email: userEmail,
      displayName: name ?? 'New User',
    },
  });

  // Create default constellation for new user
  const constellation = await prisma.constellation.create({
    data: {
      ownerId: newUser.id,
      title: 'My Family',
    },
  });

  // The constellation is already linked via ownerId, no need to update user
  // Just return the user (Prisma relation is established through constellation.ownerId)
  return newUser;
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
    console.log('[Auth] No Authorization header or invalid format');
    return null;
  }

  const token = authHeader.substring(7);
  if (!token) {
    console.log('[Auth] Empty token');
    return null;
  }

  // Check for template mode token
  if (isTemplateMode() && token === 'template-mode-token') {
    console.log('[Auth] Template mode - returning template user');
    return prisma.user.findUnique({
      where: { id: TEMPLATE_USER_ID },
    });
  }

  console.log('[Auth] Verifying token...');
  try {
    const tokenData = await verifyAuthToken(token);
    console.log('[Auth] Token verified, uid:', tokenData.uid);
    const user = await getOrCreateUser(tokenData);
    console.log('[Auth] User retrieved:', user.id);
    return user;
  } catch (error) {
    console.error('[Auth] Token verification failed:', error);
    return null;
  }
}
