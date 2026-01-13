import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the GraphQL client
vi.mock('@/lib/graphql-client', () => ({
  gql: vi.fn(),
}));

import { useConstellation, useCreateConstellation } from './use-constellation';
import { gql } from '@/lib/graphql-client';

const mockedGql = vi.mocked(gql);

describe('useConstellation Hook', () => {
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

  it('should fetch constellation for authenticated user', async () => {
    const mockConstellation = {
      id: 'const-123',
      title: 'Test Family',
      description: 'A test constellation',
      personCount: 5,
      generationSpan: 3,
      centeredPersonId: 'person-1',
    };

    mockedGql.mockResolvedValueOnce({
      constellation: mockConstellation,
    });

    const { result } = renderHook(() => useConstellation(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockConstellation);
  });

  it('should handle loading state', () => {
    mockedGql.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useConstellation(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('should handle error state', async () => {
    mockedGql.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useConstellation(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('should return null when no constellation exists', async () => {
    mockedGql.mockResolvedValueOnce({
      constellation: null,
    });

    const { result } = renderHook(() => useConstellation(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeNull();
  });
});

describe('useCreateConstellation Hook', () => {
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

  it('should create a constellation', async () => {
    const mockNewConstellation = {
      id: 'new-const-123',
      title: 'New Family',
    };

    mockedGql.mockResolvedValueOnce({
      createConstellation: mockNewConstellation,
    });

    const { result } = renderHook(() => useCreateConstellation(), {
      wrapper: createWrapper(),
    });

    // Trigger the mutation
    result.current.mutate({ title: 'New Family' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockNewConstellation);
  });

  it('should handle mutation error', async () => {
    mockedGql.mockRejectedValueOnce(new Error('Failed to create'));

    const { result } = renderHook(() => useCreateConstellation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: 'New Family' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('should accept optional description', async () => {
    const mockNewConstellation = {
      id: 'new-const-123',
      title: 'New Family',
      description: 'A new family constellation',
    };

    mockedGql.mockResolvedValueOnce({
      createConstellation: mockNewConstellation,
    });

    const { result } = renderHook(() => useCreateConstellation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      title: 'New Family',
      description: 'A new family constellation',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify the mutation was called with the correct input
    expect(mockedGql).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        input: {
          title: 'New Family',
          description: 'A new family constellation',
        },
      })
    );
  });
});
