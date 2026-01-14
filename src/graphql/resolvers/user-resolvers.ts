/**
 * User Resolvers
 *
 * Handles user queries and field resolvers.
 */
import { prisma } from '@/lib/prisma';
import type { User, Constellation } from '@prisma/client';
import { requireAuth, type GraphQLContext } from './utils';

// 14 days in milliseconds
const DELETION_GRACE_PERIOD_MS = 14 * 24 * 60 * 60 * 1000;

interface AccountDeletionResult {
  success: boolean;
  message: string;
  scheduledDeletionDate: Date | null;
  isPending: boolean;
}

export const userQueries = {
  /**
   * Get the currently authenticated user
   */
  me: async (
    _parent: unknown,
    _args: unknown,
    context: GraphQLContext
  ): Promise<User | null> => {
    return context.user;
  },
};

export const userMutations = {
  /**
   * Request account deletion with 14-day grace period
   */
  requestAccountDeletion: async (
    _parent: unknown,
    _args: unknown,
    context: GraphQLContext
  ): Promise<AccountDeletionResult> => {
    const user = requireAuth(context);

    // Check if deletion is already pending
    if (user.deletionRequestedAt) {
      return {
        success: false,
        message: 'Account deletion is already pending',
        scheduledDeletionDate: user.deletionScheduledFor,
        isPending: true,
      };
    }

    const now = new Date();
    const scheduledDeletion = new Date(now.getTime() + DELETION_GRACE_PERIOD_MS);

    // Update user record
    await prisma.user.update({
      where: { id: user.id },
      data: {
        deletionRequestedAt: now,
        deletionScheduledFor: scheduledDeletion,
      },
    });

    return {
      success: true,
      message: 'Account deletion scheduled. You have 14 days to cancel this request.',
      scheduledDeletionDate: scheduledDeletion,
      isPending: true,
    };
  },

  /**
   * Cancel a pending account deletion request
   */
  cancelAccountDeletion: async (
    _parent: unknown,
    _args: unknown,
    context: GraphQLContext
  ): Promise<AccountDeletionResult> => {
    const user = requireAuth(context);

    // Check if deletion is pending
    if (!user.deletionRequestedAt) {
      return {
        success: false,
        message: 'No pending account deletion request to cancel',
        scheduledDeletionDate: null,
        isPending: false,
      };
    }

    // Clear deletion fields
    await prisma.user.update({
      where: { id: user.id },
      data: {
        deletionRequestedAt: null,
        deletionScheduledFor: null,
      },
    });

    return {
      success: true,
      message: 'Account deletion cancelled. Your account is safe.',
      scheduledDeletionDate: null,
      isPending: false,
    };
  },
};

// Field resolvers for User type
export const userFieldResolvers = {
  /**
   * Resolve constellation field on User type
   */
  constellation: async (parent: User): Promise<Constellation | null> => {
    return prisma.constellation.findUnique({
      where: { ownerId: parent.id },
    });
  },
};
