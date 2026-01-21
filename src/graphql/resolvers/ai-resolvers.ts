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
 * Pending biography suggestion result
 */
interface PendingBiographySuggestion {
  suggestionId: string;
  personId: string;
  biography: string;
  wordCount: number;
  confidence: number;
  sourcesUsed: string[];
  createdAt: Date;
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

  /**
   * Get all pending biography suggestions for the authenticated user.
   * Used to restore pending suggestions after page reload.
   *
   * If multiple suggestions exist for the same person, only the latest is returned.
   */
  pendingBiographySuggestions: async (
    _parent: unknown,
    _args: unknown,
    context: GraphQLContext
  ): Promise<PendingBiographySuggestion[]> => {
    const authUser = requireAuth(context);

    const suggestions = await prisma.aISuggestion.findMany({
      where: {
        userId: authUser.id,
        type: 'BIOGRAPHY',
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by personId and only keep the latest (first in descending order)
    const latestByPerson = new Map<string, (typeof suggestions)[0]>();
    for (const s of suggestions) {
      if (!latestByPerson.has(s.personId)) {
        latestByPerson.set(s.personId, s);
      }
    }

    return Array.from(latestByPerson.values()).map((s) => {
      const payload = s.payload as { biography?: string };
      const metadata = s.metadata as {
        wordCount?: number;
        confidence?: number;
        sourcesUsed?: string[];
      } | null;

      return {
        suggestionId: s.id,
        personId: s.personId,
        biography: payload.biography ?? '',
        wordCount: metadata?.wordCount ?? 0,
        confidence: metadata?.confidence ?? 0,
        sourcesUsed: metadata?.sourcesUsed ?? [],
        createdAt: s.createdAt,
      };
    });
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
   * Uses the multi-step agentic flow:
   * 1. Eligibility check - Verify source material exists
   * 2. Source assembly - Gather person details, notes, events
   * 3. Context mining - Find relatives and extract relevant facts
   * 4. Generation - Synthesize into biographical narrative
   *
   * Creates an AISuggestion record instead of directly modifying the person.
   * User must approve the suggestion to apply the biography (INV-AI003).
   *
   * @throws Error if person not found, not eligible, or not in user's constellation
   * @throws QuotaExceededError if no quota remaining
   */
  generateBiography: async (
    _parent: unknown,
    args: { personId: string; maxLength?: number },
    context: GraphQLContext
  ): Promise<BiographyGenerationResult> => {
    const authUser = requireAuth(context);

    // Check and consume quota first (INV-AI001, INV-AI002)
    // We check quota before eligibility to avoid unnecessary DB queries if over quota
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

    // Generate biography (handles eligibility, source assembly, context mining)
    let result;
    try {
      result = await generateBiography(args.personId, authUser.id, {
        maxLength: args.maxLength,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      // Check for eligibility-related errors
      if (message.includes('not eligible') || message.includes('at least one note or event')) {
        throw new GraphQLError(
          'Biography generation requires at least one note or event for this person. Add some notes or events first.',
          { extensions: { code: 'NOT_ELIGIBLE' } }
        );
      }

      // Check for access denied errors
      if (message.includes('not found') || message.includes('access denied')) {
        throw new GraphQLError('Person not found or access denied', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      throw new GraphQLError(`Biography generation failed: ${message}`, {
        extensions: { code: 'AI_GENERATION_FAILED' },
      });
    }

    // Create AI suggestion instead of directly modifying person (INV-AI003)
    const suggestion = await prisma.aISuggestion.create({
      data: {
        type: 'BIOGRAPHY',
        status: 'PENDING',
        personId: result.personId,
        userId: authUser.id,
        payload: { biography: result.biography },
        metadata: {
          wordCount: result.wordCount,
          confidence: result.confidence,
          sourcesUsed: result.sourcesUsed,
          usedContextMining: result.usedContextMining,
          relativesUsed: result.relativesUsed,
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

  /**
   * Apply an AI-generated biography suggestion to a person.
   *
   * Updates the person's biography and marks the suggestion as accepted.
   *
   * @throws Error if suggestion not found or not owned by user
   * @throws Error if suggestion is not pending or not a biography type
   */
  applyBiographySuggestion: async (
    _parent: unknown,
    args: { suggestionId: string },
    context: GraphQLContext
  ) => {
    const authUser = requireAuth(context);

    // Get the suggestion and verify ownership
    const suggestion = await prisma.aISuggestion.findFirst({
      where: {
        id: args.suggestionId,
        userId: authUser.id,
      },
      include: {
        person: true,
      },
    });

    if (!suggestion) {
      throw new GraphQLError('Suggestion not found or access denied', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (suggestion.status !== 'PENDING') {
      throw new GraphQLError('Suggestion has already been processed', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }

    if (suggestion.type !== 'BIOGRAPHY') {
      throw new GraphQLError('Suggestion is not a biography suggestion', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }

    const payload = suggestion.payload as { biography?: string };
    if (!payload.biography) {
      throw new GraphQLError('Suggestion has no biography content', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }

    // Update person and mark suggestion as accepted in a transaction
    const [updatedPerson] = await prisma.$transaction([
      prisma.person.update({
        where: { id: suggestion.personId },
        data: { biography: payload.biography },
      }),
      prisma.aISuggestion.update({
        where: { id: suggestion.id },
        data: {
          status: 'ACCEPTED',
          reviewedAt: new Date(),
        },
      }),
    ]);

    return updatedPerson;
  },

  /**
   * Reject/discard an AI-generated biography suggestion.
   *
   * Marks the suggestion as rejected so it won't be shown again.
   *
   * @throws Error if suggestion not found or not owned by user
   * @throws Error if suggestion is not pending or not a biography type
   */
  rejectBiographySuggestion: async (
    _parent: unknown,
    args: { suggestionId: string },
    context: GraphQLContext
  ): Promise<boolean> => {
    const authUser = requireAuth(context);

    // Get the suggestion and verify ownership
    const suggestion = await prisma.aISuggestion.findFirst({
      where: {
        id: args.suggestionId,
        userId: authUser.id,
      },
    });

    if (!suggestion) {
      throw new GraphQLError('Suggestion not found or access denied', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (suggestion.status !== 'PENDING') {
      throw new GraphQLError('Suggestion has already been processed', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }

    if (suggestion.type !== 'BIOGRAPHY') {
      throw new GraphQLError('Suggestion is not a biography suggestion', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }

    // Mark suggestion as rejected
    await prisma.aISuggestion.update({
      where: { id: suggestion.id },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
      },
    });

    return true;
  },
};
