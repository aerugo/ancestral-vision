/**
 * Settings Resolvers
 *
 * GraphQL resolvers for user settings management.
 * Handles profile updates and preference changes.
 *
 * Invariants:
 * - INV-S001: All mutations require authentication
 * - INV-S002: Users can only access their own settings
 */
import { prisma } from '@/lib/prisma';
import { requireAuth, type GraphQLContext } from './utils';
import type { User } from '@prisma/client';
import { GraphQLError } from 'graphql';

// Valid values for validation
const VALID_THEMES = ['dark', 'light', 'system'] as const;
const VALID_PRIVACY_LEVELS = ['private', 'connections', 'public'] as const;
const VALID_DIGEST_FREQUENCIES = ['daily', 'weekly', 'never'] as const;

const MAX_DISPLAY_NAME_LENGTH = 100;

/**
 * User preferences interface
 */
interface UserPreferences {
  theme: string;
  defaultPrivacy: string;
  defaultView: string;
  speculationEnabled: boolean;
  emailNotifications: boolean;
  emailDigestFrequency: string;
  notifyConnectionRequests: boolean;
  notifyMatchSuggestions: boolean;
  notifySharedContentUpdates: boolean;
  notifyBillingAlerts: boolean;
}

/**
 * User settings response type
 */
interface UserSettings {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  preferences: UserPreferences;
}

/**
 * Update profile input type
 */
interface UpdateProfileInput {
  displayName?: string;
  avatarUrl?: string;
}

/**
 * Update preferences input type
 */
interface UpdatePreferencesInput {
  theme?: string;
  defaultPrivacy?: string;
  emailNotifications?: boolean;
  emailDigestFrequency?: string;
}

/**
 * Convert User to UserSettings
 */
function toUserSettings(user: User): UserSettings {
  const preferences = (user.preferences as unknown as UserPreferences) || {
    theme: 'dark',
    defaultPrivacy: 'private',
    defaultView: '3d',
    speculationEnabled: true,
    emailNotifications: true,
    emailDigestFrequency: 'daily',
    notifyConnectionRequests: true,
    notifyMatchSuggestions: true,
    notifySharedContentUpdates: true,
    notifyBillingAlerts: true,
  };

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    preferences,
  };
}

/**
 * Settings query resolvers
 */
export const settingsQueries = {
  /**
   * Get user settings for current user
   */
  userSettings: async (
    _parent: unknown,
    _args: unknown,
    context: GraphQLContext
  ): Promise<UserSettings | null> => {
    if (!context.user) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: context.user.id },
    });

    if (!user) {
      return null;
    }

    return toUserSettings(user);
  },
};

/**
 * Settings mutation resolvers
 */
export const settingsMutations = {
  /**
   * Update user profile (display name, avatar)
   */
  updateProfile: async (
    _parent: unknown,
    { input }: { input: UpdateProfileInput },
    context: GraphQLContext
  ): Promise<UserSettings> => {
    const authUser = requireAuth(context);

    // Validate display name if provided
    if (input.displayName !== undefined) {
      if (input.displayName.trim() === '') {
        throw new GraphQLError('Display name cannot be empty', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      if (input.displayName.length > MAX_DISPLAY_NAME_LENGTH) {
        throw new GraphQLError(
          `Display name cannot exceed ${MAX_DISPLAY_NAME_LENGTH} characters`,
          { extensions: { code: 'BAD_USER_INPUT' } }
        );
      }
    }

    const updateData: Partial<{ displayName: string; avatarUrl: string }> = {};

    if (input.displayName !== undefined) {
      updateData.displayName = input.displayName.trim();
    }
    if (input.avatarUrl !== undefined) {
      updateData.avatarUrl = input.avatarUrl;
    }

    const user = await prisma.user.update({
      where: { id: authUser.id },
      data: updateData,
    });

    return toUserSettings(user);
  },

  /**
   * Update user preferences
   */
  updatePreferences: async (
    _parent: unknown,
    { input }: { input: UpdatePreferencesInput },
    context: GraphQLContext
  ): Promise<UserSettings> => {
    const authUser = requireAuth(context);

    // Validate theme
    if (input.theme !== undefined) {
      if (!VALID_THEMES.includes(input.theme as (typeof VALID_THEMES)[number])) {
        throw new GraphQLError('Invalid theme value', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
    }

    // Validate privacy
    if (input.defaultPrivacy !== undefined) {
      if (
        !VALID_PRIVACY_LEVELS.includes(
          input.defaultPrivacy as (typeof VALID_PRIVACY_LEVELS)[number]
        )
      ) {
        throw new GraphQLError('Invalid privacy value', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
    }

    // Validate digest frequency
    if (input.emailDigestFrequency !== undefined) {
      if (
        !VALID_DIGEST_FREQUENCIES.includes(
          input.emailDigestFrequency as (typeof VALID_DIGEST_FREQUENCIES)[number]
        )
      ) {
        throw new GraphQLError('Invalid email digest frequency', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
    }

    // Get current preferences
    const currentUser = await prisma.user.findUnique({
      where: { id: authUser.id },
    });

    const currentPreferences = (currentUser?.preferences as unknown as UserPreferences) || {};

    // Merge with new preferences
    const updatedPreferences: UserPreferences = {
      ...currentPreferences,
      ...(input.theme !== undefined && { theme: input.theme }),
      ...(input.defaultPrivacy !== undefined && {
        defaultPrivacy: input.defaultPrivacy,
      }),
      ...(input.emailNotifications !== undefined && {
        emailNotifications: input.emailNotifications,
      }),
      ...(input.emailDigestFrequency !== undefined && {
        emailDigestFrequency: input.emailDigestFrequency,
      }),
    };

    const user = await prisma.user.update({
      where: { id: authUser.id },
      data: { preferences: updatedPreferences as unknown as object },
    });

    return toUserSettings(user);
  },
};
