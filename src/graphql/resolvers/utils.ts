/**
 * Shared utilities for GraphQL resolvers
 *
 * Contains common types, helper functions, and constants used across resolvers.
 */
import { prisma } from '@/lib/prisma';
import type { User, Constellation, Person, ParentType, PrivacyLevel } from '@prisma/client';
import { GraphQLError } from 'graphql';

/**
 * GraphQL context containing authenticated user
 */
export interface GraphQLContext {
  user: User | null;
}

/**
 * Require authentication and return user
 * @throws GraphQLError if user is not authenticated
 */
export function requireAuth(context: GraphQLContext): User {
  if (!context.user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return context.user;
}

/**
 * Get the constellation owned by a user
 */
export async function getUserConstellation(userId: string): Promise<Constellation | null> {
  return prisma.constellation.findUnique({
    where: { ownerId: userId },
  });
}

/**
 * Verify a person belongs to user's constellation
 */
export async function verifyPersonOwnership(
  personId: string,
  constellation: Constellation
): Promise<Person | null> {
  return prisma.person.findFirst({
    where: {
      id: personId,
      constellationId: constellation.id,
    },
  });
}

// Input type interfaces

/**
 * Input type for creating a person
 */
export interface CreatePersonInput {
  givenName: string;
  surname?: string;
  maidenName?: string;
  patronymic?: string;
  matronymic?: string;
  nickname?: string;
  suffix?: string;
  nameOrder?: 'WESTERN' | 'EASTERN' | 'PATRONYMIC' | 'PATRONYMIC_SUFFIX' | 'MATRONYMIC';
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';
  birthDate?: unknown;
  deathDate?: unknown;
  birthPlace?: unknown;
  deathPlace?: unknown;
  biography?: string;
  speculative?: boolean;
}

/**
 * Input type for updating a person
 */
export type UpdatePersonInput = Partial<CreatePersonInput>;

/**
 * Input type for creating a constellation
 */
export interface CreateConstellationInput {
  title: string;
  description?: string;
}

/**
 * Input type for updating a constellation
 */
export interface UpdateConstellationInput {
  title?: string;
  description?: string;
  centeredPersonId?: string;
}

/**
 * Input type for creating a parent-child relationship
 */
export interface CreateParentChildRelationshipInput {
  parentId: string;
  childId: string;
  relationshipType?: ParentType;
  isPreferred?: boolean;
  startDate?: unknown;
  endDate?: unknown;
}

/**
 * Input type for updating a parent-child relationship
 */
export interface UpdateParentChildRelationshipInput {
  relationshipType?: ParentType;
  isPreferred?: boolean;
  startDate?: unknown;
  endDate?: unknown;
}

/**
 * Input type for creating a spouse relationship
 */
export interface CreateSpouseRelationshipInput {
  person1Id: string;
  person2Id: string;
  marriageDate?: unknown;
  marriagePlace?: unknown;
  divorceDate?: unknown;
  description?: string;
}

/**
 * Input type for updating a spouse relationship
 */
export interface UpdateSpouseRelationshipInput {
  marriageDate?: unknown;
  marriagePlace?: unknown;
  divorceDate?: unknown;
  description?: string;
}

/**
 * Input type for creating a note
 */
export interface CreateNoteInput {
  personId: string;
  title?: string;
  content: string;
  privacy?: PrivacyLevel;
}

/**
 * Input type for updating a note
 */
export interface UpdateNoteInput {
  title?: string;
  content?: string;
  privacy?: PrivacyLevel;
}

/**
 * Note version stored in previousVersions array
 */
export interface NoteVersion {
  version: number;
  content: string;
  updatedAt: string;
}

// Constants
export const MAX_CONTENT_LENGTH = 50000;
export const MAX_VERSIONS = 10;
