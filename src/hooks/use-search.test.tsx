/**
 * Search Hooks Tests
 *
 * Tests for the useSearchPeople hook with debouncing.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Mock the auth store FIRST (before importing hooks that use it)
vi.mock('@/store/auth-store', () => ({
  useAuthStore: vi.fn((selector) => {
    const state = { token: 'mock-token', user: null, isAuthenticated: true };
    return selector ? selector(state) : state;
  }),
}));

// Mock the GraphQL client
vi.mock('@/lib/graphql-client', () => ({
  graphqlClient: {
    request: vi.fn(),
  },
}));

import { useSearchPeople, useDebouncedValue } from './use-search';
import { graphqlClient } from '@/lib/graphql-client';

const mockSearchResults = [
  {
    id: 'person-1',
    displayName: 'John Smith',
    givenName: 'John',
    surname: 'Smith',
    birthDate: { year: 1985 },
    similarity: 0.95,
  },
  {
    id: 'person-2',
    displayName: 'Jane Smith',
    givenName: 'Jane',
    surname: 'Smith',
    birthDate: { year: 1988 },
    similarity: 0.85,
  },
];

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

describe('Search Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useDebouncedValue', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return initial value immediately', () => {
      const { result } = renderHook(() => useDebouncedValue('test', 300));
      expect(result.current).toBe('test');
    });

    it('should debounce value changes', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebouncedValue(value, 300),
        { initialProps: { value: 'initial' } }
      );

      expect(result.current).toBe('initial');

      rerender({ value: 'changed' });
      expect(result.current).toBe('initial'); // Still initial before debounce

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current).toBe('changed');
    });

    it('should cancel previous timer on new value', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebouncedValue(value, 300),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'first' });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      rerender({ value: 'second' });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current).toBe('second');
    });
  });

  describe('useSearchPeople', () => {
    it('should return empty array for empty query', async () => {
      const { result } = renderHook(() => useSearchPeople(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.data).toEqual([]);
      expect(graphqlClient.request).not.toHaveBeenCalled();
    });

    it('should return empty array for query shorter than 2 chars', async () => {
      const { result } = renderHook(() => useSearchPeople('J'), {
        wrapper: createWrapper(),
      });

      expect(result.current.data).toEqual([]);
      expect(graphqlClient.request).not.toHaveBeenCalled();
    });

    it('should search people when query is valid', async () => {
      vi.mocked(graphqlClient.request).mockResolvedValue({
        searchPeople: mockSearchResults,
      });

      const { result } = renderHook(() => useSearchPeople('Smith'), {
        wrapper: createWrapper(),
      });

      // Query starts with initialData of []
      expect(result.current.data).toEqual([]);

      // Wait for debounce (300ms) + query execution
      await waitFor(
        () => {
          expect(result.current.data).toHaveLength(2);
        },
        { timeout: 2000 }
      );

      expect(graphqlClient.request).toHaveBeenCalled();
    });

    it('should handle error state', async () => {
      vi.mocked(graphqlClient.request).mockRejectedValue(
        new Error('Search failed')
      );

      const { result } = renderHook(() => useSearchPeople('Smith'), {
        wrapper: createWrapper(),
      });

      // Wait for debounce + query to fail
      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 2000 }
      );
    });

    it('should pass limit parameter to query', async () => {
      vi.mocked(graphqlClient.request).mockResolvedValue({
        searchPeople: [mockSearchResults[0]],
      });

      renderHook(() => useSearchPeople('Smith', 5), {
        wrapper: createWrapper(),
      });

      // Wait for debounce + query execution
      await waitFor(
        () => {
          expect(graphqlClient.request).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ limit: 5 })
          );
        },
        { timeout: 2000 }
      );
    });
  });
});
