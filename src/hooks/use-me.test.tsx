import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the GraphQL client
vi.mock('@/lib/graphql-client', () => ({
  gql: vi.fn(),
}));

import { useMe } from './use-me';
import { gql } from '@/lib/graphql-client';

const mockedGql = vi.mocked(gql);

describe('useMe Hook', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    return function Wrapper({ children }: { children: React.ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch current user', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      createdAt: '2026-01-12T00:00:00Z',
    };

    mockedGql.mockResolvedValueOnce({
      me: mockUser,
    });

    const { result } = renderHook(() => useMe(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockUser);
  });

  it('should handle loading state', () => {
    mockedGql.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useMe(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('should handle error state', async () => {
    mockedGql.mockRejectedValueOnce(new Error('Unauthorized'));

    const { result } = renderHook(() => useMe(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('should return null when not authenticated', async () => {
    mockedGql.mockResolvedValueOnce({
      me: null,
    });

    const { result } = renderHook(() => useMe(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeNull();
  });
});
