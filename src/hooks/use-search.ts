/**
 * Search Hooks
 *
 * TanStack Query hooks for people search with debouncing.
 */
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { useAuthStore } from '@/store/auth-store';

const SEARCH_PEOPLE = /* GraphQL */ `
  query SearchPeople($query: String!, $limit: Int) {
    searchPeople(query: $query, limit: $limit) {
      id
      displayName
      givenName
      surname
      birthDate
      similarity
    }
  }
`;

export interface SearchResult {
  id: string;
  displayName: string;
  givenName: string | null;
  surname: string | null;
  birthDate: unknown;
  similarity: number;
}

interface SearchPeopleResponse {
  searchPeople: SearchResult[];
}

/**
 * Hook for debouncing a value
 *
 * @param value - Value to debounce
 * @param delay - Debounce delay in milliseconds
 * @returns Debounced value
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Search people by name with debouncing
 *
 * Uses TanStack Query with a 300ms debounce to avoid excessive API calls.
 * Returns empty array for queries shorter than 2 characters.
 *
 * @param query - Search query string
 * @param limit - Maximum number of results (default 20)
 * @returns Query result with search results
 */
export function useSearchPeople(query: string, limit = 20) {
  const debouncedQuery = useDebouncedValue(query, 300);
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ['searchPeople', debouncedQuery, limit],
    queryFn: async (): Promise<SearchResult[]> => {
      // Don't search for empty or short queries
      if (!debouncedQuery || debouncedQuery.trim().length < 2) {
        return [];
      }

      const result = await graphqlClient.request<SearchPeopleResponse>(
        SEARCH_PEOPLE,
        { query: debouncedQuery, limit }
      );

      return result.searchPeople;
    },
    // Only enable query when we have a valid search term and auth token
    enabled: debouncedQuery.trim().length >= 2 && !!token,
    // Cache results for 30 seconds
    staleTime: 30000,
    // Use placeholder data instead of initialData to allow fetching
    placeholderData: [],
  });
}
