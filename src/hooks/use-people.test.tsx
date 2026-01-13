import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the GraphQL client
vi.mock('@/lib/graphql-client', () => ({
  gql: vi.fn(),
}));

import { usePeople, usePerson, useCreatePerson } from './use-people';
import { gql } from '@/lib/graphql-client';

const mockedGql = vi.mocked(gql);

describe('usePeople Hook', () => {
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

  it('should fetch all people in constellation', async () => {
    const mockPeople = [
      {
        id: 'person-1',
        givenName: 'John',
        surname: 'Doe',
        generation: 0,
      },
      {
        id: 'person-2',
        givenName: 'Jane',
        surname: 'Doe',
        generation: 0,
      },
    ];

    mockedGql.mockResolvedValueOnce({
      people: mockPeople,
    });

    const { result } = renderHook(() => usePeople(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockPeople);
    expect(result.current.data).toHaveLength(2);
  });

  it('should handle loading state', () => {
    mockedGql.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => usePeople(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('should handle empty people list', async () => {
    mockedGql.mockResolvedValueOnce({
      people: [],
    });

    const { result } = renderHook(() => usePeople(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });
});

describe('usePerson Hook', () => {
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

  it('should fetch a single person by id', async () => {
    const mockPerson = {
      id: 'person-1',
      givenName: 'John',
      surname: 'Doe',
      generation: 0,
    };

    mockedGql.mockResolvedValueOnce({
      person: mockPerson,
    });

    const { result } = renderHook(() => usePerson('person-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockPerson);
  });

  it('should not fetch when id is null', () => {
    const { result } = renderHook(() => usePerson(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(mockedGql).not.toHaveBeenCalled();
  });

  it('should handle person not found', async () => {
    mockedGql.mockResolvedValueOnce({
      person: null,
    });

    const { result } = renderHook(() => usePerson('nonexistent'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeNull();
  });
});

describe('useCreatePerson Hook', () => {
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

  it('should create a new person', async () => {
    const mockNewPerson = {
      id: 'new-person-123',
      givenName: 'Alice',
      surname: 'Smith',
      generation: 1,
    };

    mockedGql.mockResolvedValueOnce({
      createPerson: mockNewPerson,
    });

    const { result } = renderHook(() => useCreatePerson(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      givenName: 'Alice',
      surname: 'Smith',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockNewPerson);
  });

  it('should handle creation error', async () => {
    mockedGql.mockRejectedValueOnce(new Error('Failed to create'));

    const { result } = renderHook(() => useCreatePerson(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      givenName: 'Alice',
      surname: 'Smith',
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});
