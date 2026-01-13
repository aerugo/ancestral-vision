/**
 * Settings Hooks
 *
 * TanStack Query hooks for user settings management.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { gql } from 'graphql-request';

/**
 * User preferences type
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  defaultPrivacy: 'private' | 'family' | 'public';
  emailNotifications: boolean;
  emailDigestFrequency: 'daily' | 'weekly' | 'never';
}

/**
 * User settings type
 */
export interface UserSettings {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  preferences: UserPreferences;
}

/**
 * Profile update input
 */
export interface UpdateProfileInput {
  displayName?: string;
  avatarUrl?: string;
}

/**
 * Preferences update input
 */
export interface UpdatePreferencesInput {
  theme?: 'light' | 'dark' | 'system';
  defaultPrivacy?: 'private' | 'family' | 'public';
  emailNotifications?: boolean;
  emailDigestFrequency?: 'daily' | 'weekly' | 'never';
}

const USER_SETTINGS_QUERY = gql`
  query UserSettings {
    userSettings {
      id
      email
      displayName
      avatarUrl
      preferences {
        theme
        defaultPrivacy
        emailNotifications
        emailDigestFrequency
      }
    }
  }
`;

const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      email
      displayName
      avatarUrl
      preferences {
        theme
        defaultPrivacy
        emailNotifications
        emailDigestFrequency
      }
    }
  }
`;

const UPDATE_PREFERENCES_MUTATION = gql`
  mutation UpdatePreferences($input: UpdatePreferencesInput!) {
    updatePreferences(input: $input) {
      id
      email
      displayName
      avatarUrl
      preferences {
        theme
        defaultPrivacy
        emailNotifications
        emailDigestFrequency
      }
    }
  }
`;

/**
 * Settings query key
 */
export const SETTINGS_QUERY_KEY = ['userSettings'] as const;

/**
 * Hook to fetch user settings
 */
export function useSettings() {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: async () => {
      const response = await graphqlClient.request<{ userSettings: UserSettings | null }>(
        USER_SETTINGS_QUERY
      );
      return response.userSettings;
    },
  });
}

/**
 * Hook to update user profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const response = await graphqlClient.request<{ updateProfile: UserSettings }>(
        UPDATE_PROFILE_MUTATION,
        { input }
      );
      return response.updateProfile;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(SETTINGS_QUERY_KEY, data);
    },
  });
}

/**
 * Hook to update user preferences
 */
export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdatePreferencesInput) => {
      const response = await graphqlClient.request<{ updatePreferences: UserSettings }>(
        UPDATE_PREFERENCES_MUTATION,
        { input }
      );
      return response.updatePreferences;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(SETTINGS_QUERY_KEY, data);
    },
  });
}
