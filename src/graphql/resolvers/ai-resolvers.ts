/**
 * AI GraphQL Resolvers
 *
 * GraphQL resolvers for AI-related operations including
 * quota checking, usage tracking, and biography generation.
 *
 * Invariants:
 * - INV-AI001: AI Operations Require Quota Check
 * - INV-AI002: AI Operations Must Track Usage
 * - INV-AI003: AI Suggestions Require User Approval
 */
import { requireAuth, type GraphQLContext } from './utils';
import {
  getUsageStats,
  checkAndConsumeQuota,
  hasQuota,
  getRemainingQuota,
  QuotaExceededError,
  type UsageStats,
} from '@/ai/quota';
import { generateBiography } from '@/ai/flows/biography';
import type { BiographyInput } from '@/ai/schemas/biography';
import { prisma } from '@/lib/prisma';
import { GraphQLError } from 'graphql';

/**
 * AI quota check result
 */
interface QuotaCheckResult {
  hasQuota: boolean;
  remaining: number;
}

/**
 * Biography generation result
 */
interface BiographyGenerationResult {
  suggestionId: string;
  biography: string;
  wordCount: number;
  confidence: number;
  sourcesUsed: string[];
}

/**
 * AI query resolvers
 */
export const aiQueries = {
  /**
   * Get current AI usage statistics for authenticated user
   */
  aiUsage: async (
    _parent: unknown,
    _args: unknown,
    context: GraphQLContext
  ): Promise<UsageStats | null> => {
    if (!context.user) {
      return null;
    }

    return getUsageStats(context.user.id);
  },
};

/**
 * AI mutation resolvers
 */
export const aiMutations = {
  /**
   * Check if user has AI quota and consume one operation.
   * This is a test mutation to verify quota enforcement.
   *
   * @throws QuotaExceededError if no quota remaining
   */
  checkAIQuota: async (
    _parent: unknown,
    _args: unknown,
    context: GraphQLContext
  ): Promise<QuotaCheckResult> => {
    const authUser = requireAuth(context);

    const hasAvailableQuota = await hasQuota(authUser.id);

    if (!hasAvailableQuota) {
      throw new GraphQLError('AI operation quota exceeded', {
        extensions: { code: 'QUOTA_EXCEEDED' },
      });
    }

    // Consume one operation
    try {
      await checkAndConsumeQuota(authUser.id);
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        throw new GraphQLError('AI operation quota exceeded', {
          extensions: { code: 'QUOTA_EXCEEDED' },
        });
      }
      throw error;
    }

    const remaining = await getRemainingQuota(authUser.id);

    return {
      hasQuota: true,
      remaining,
    };
  },

  /**
   * Generate a biography for a person using AI.
   *
   * Creates an AISuggestion record instead of directly modifying the person.
   * User must approve the suggestion to apply the biography (INV-AI003).
   *
   * @throws Error if person not found or not in user's constellation
   * @throws QuotaExceededError if no quota remaining
   */
  generateBiography: async (
    _parent: unknown,
    args: { personId: string; maxLength?: number },
    context: GraphQLContext
  ): Promise<BiographyGenerationResult> => {
    const authUser = requireAuth(context);

    // Get the person and verify access
    const person = await prisma.person.findFirst({
      where: {
        id: args.personId,
        constellation: {
          ownerId: authUser.id,
        },
        deletedAt: null,
      },
    });

    if (!person) {
      throw new GraphQLError('Person not found or access denied', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Check and consume quota (INV-AI001, INV-AI002)
    try {
      await checkAndConsumeQuota(authUser.id);
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        throw new GraphQLError('AI operation quota exceeded', {
          extensions: { code: 'QUOTA_EXCEEDED' },
        });
      }
      throw error;
    }

    // Build input for biography generation
    // Convert null values to undefined for Zod schema compatibility
    const input: BiographyInput = {
      personId: person.id,
      givenName: person.givenName,
      surname: person.surname ?? undefined,
      displayName: person.displayName,
      gender: person.gender ?? undefined,
      birthDate: (person.birthDate as BiographyInput['birthDate']) ?? undefined,
      deathDate: (person.deathDate as BiographyInput['deathDate']) ?? undefined,
      birthPlace: (person.birthPlace as BiographyInput['birthPlace']) ?? undefined,
      deathPlace: (person.deathPlace as BiographyInput['deathPlace']) ?? undefined,
      maxLength: args.maxLength,
    };

    // Generate biography
    const result = await generateBiography(input);

    // Create AI suggestion instead of directly modifying person (INV-AI003)
    const suggestion = await prisma.aISuggestion.create({
      data: {
        type: 'BIOGRAPHY',
        status: 'PENDING',
        personId: person.id,
        userId: authUser.id,
        payload: { biography: result.biography },
        metadata: {
          wordCount: result.wordCount,
          confidence: result.confidence,
          sourcesUsed: result.sourcesUsed,
        },
      },
    });

    return {
      suggestionId: suggestion.id,
      biography: result.biography,
      wordCount: result.wordCount,
      confidence: result.confidence,
      sourcesUsed: result.sourcesUsed,
    };
  },
};
