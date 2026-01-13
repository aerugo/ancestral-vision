/**
 * Settings Hooks Tests
 *
 * Tests for useSettings and related mutation hooks.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useSettings,
  useUpdateProfile,
  useUpdatePreferences,
  type UserSettings,
} from './use-settings';

// Mock the GraphQL client
vi.mock('@/lib/graphql-client', () => ({
  graphqlClient: {
    request: vi.fn(),
  },
}));

import { graphqlClient } from '@/lib/graphql-client';

const mockUserSettings: UserSettings = {
  id: 'user-1',
  email: 'test@example.com',
  displayName: 'Test User',
  avatarUrl: null,
  preferences: {
    theme: 'dark',
    defaultPrivacy: 'private',
    emailNotifications: true,
    emailDigestFrequency: 'daily',
  },
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('Settings Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useSettings', () => {
    it('should fetch user settings', async () => {
      vi.mocked(graphqlClient.request).mockResolvedValueOnce({
        userSettings: mockUserSettings,
      });

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockUserSettings);
      expect(graphqlClient.request).toHaveBeenCalledTimes(1);
    });

    it('should handle null settings', async () => {
      vi.mocked(graphqlClient.request).mockResolvedValueOnce({
        userSettings: null,
      });

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });

    it('should handle errors', async () => {
      vi.mocked(graphqlClient.request).mockRejectedValueOnce(
        new Error('Network error')
      );

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useUpdateProfile', () => {
    it('should update display name', async () => {
      const updatedSettings = { ...mockUserSettings, displayName: 'New Name' };
      vi.mocked(graphqlClient.request).mockResolvedValueOnce({
        updateProfile: updatedSettings,
      });

      const { result } = renderHook(() => useUpdateProfile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({ displayName: 'New Name' });
      });

      expect(graphqlClient.request).toHaveBeenCalled();
    });

    it('should update avatar URL', async () => {
      const avatarUrl = 'https://example.com/avatar.jpg';
      const updatedSettings = { ...mockUserSettings, avatarUrl };
      vi.mocked(graphqlClient.request).mockResolvedValueOnce({
        updateProfile: updatedSettings,
      });

      const { result } = renderHook(() => useUpdateProfile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({ avatarUrl });
      });

      expect(graphqlClient.request).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      vi.mocked(graphqlClient.request).mockRejectedValueOnce(
        new Error('Update failed')
      );

      const { result } = renderHook(() => useUpdateProfile(), {
        wrapper: createWrapper(),
      });

      await expect(
        act(async () => {
          await result.current.mutateAsync({ displayName: 'New Name' });
        })
      ).rejects.toThrow('Update failed');
    });
  });

  describe('useUpdatePreferences', () => {
    it('should update theme preference', async () => {
      const updatedSettings = {
        ...mockUserSettings,
        preferences: { ...mockUserSettings.preferences, theme: 'light' },
      };
      vi.mocked(graphqlClient.request).mockResolvedValueOnce({
        updatePreferences: updatedSettings,
      });

      const { result } = renderHook(() => useUpdatePreferences(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({ theme: 'light' });
      });

      expect(graphqlClient.request).toHaveBeenCalled();
    });

    it('should update privacy preference', async () => {
      const updatedSettings = {
        ...mockUserSettings,
        preferences: { ...mockUserSettings.preferences, defaultPrivacy: 'public' },
      };
      vi.mocked(graphqlClient.request).mockResolvedValueOnce({
        updatePreferences: updatedSettings,
      });

      const { result } = renderHook(() => useUpdatePreferences(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({ defaultPrivacy: 'public' });
      });

      expect(graphqlClient.request).toHaveBeenCalled();
    });

    it('should update email notifications preference', async () => {
      const updatedSettings = {
        ...mockUserSettings,
        preferences: { ...mockUserSettings.preferences, emailNotifications: false },
      };
      vi.mocked(graphqlClient.request).mockResolvedValueOnce({
        updatePreferences: updatedSettings,
      });

      const { result } = renderHook(() => useUpdatePreferences(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({ emailNotifications: false });
      });

      expect(graphqlClient.request).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      vi.mocked(graphqlClient.request).mockRejectedValueOnce(
        new Error('Update failed')
      );

      const { result } = renderHook(() => useUpdatePreferences(), {
        wrapper: createWrapper(),
      });

      await expect(
        act(async () => {
          await result.current.mutateAsync({ theme: 'light' });
        })
      ).rejects.toThrow('Update failed');
    });
  });
});
