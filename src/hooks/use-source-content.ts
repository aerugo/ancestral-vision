/**
 * Source Content Hook
 *
 * React Query hook for fetching source content (notes, events, biographies)
 * for display in citation modals.
 */
import { useQuery } from '@tanstack/react-query';
import { gql } from '@/lib/graphql-client';
import type { CitationType } from '@/types/citation';

/**
 * GraphQL response types for source content
 */
interface NoteContent {
  __typename: 'NoteContent';
  id: string;
  title: string;
  content: string;
  privacy: string;
  createdAt: string;
  updatedAt: string;
}

interface EventParticipant {
  id: string;
  displayName: string;
}

interface EventContent {
  __typename: 'EventContent';
  id: string;
  title: string;
  description: string | null;
  date: unknown | null;
  location: unknown | null;
  participants: EventParticipant[];
  createdAt: string;
}

interface BiographyContent {
  __typename: 'BiographyContent';
  id: string;
  personName: string;
  biography: string | null;
}

export type SourceContent = NoteContent | EventContent | BiographyContent;

interface SourceContentResponse {
  sourceContent: SourceContent | null;
}

/**
 * GraphQL query for fetching source content
 */
const SOURCE_CONTENT_QUERY = `
  query SourceContent($type: SourceType!, $id: ID!) {
    sourceContent(type: $type, id: $id) {
      ... on NoteContent {
        __typename
        id
        title
        content
        privacy
        createdAt
        updatedAt
      }
      ... on EventContent {
        __typename
        id
        title
        description
        date
        location
        participants {
          id
          displayName
        }
        createdAt
      }
      ... on BiographyContent {
        __typename
        id
        personName
        biography
      }
    }
  }
`;

/**
 * Hook for fetching source content by type and ID.
 *
 * @param type - The type of source (Note, Event, Biography)
 * @param id - The ID of the source
 * @param enabled - Whether to enable the query (default: true when type and id are provided)
 * @returns Query result with source content
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useSourceContent('Note', 'note-123');
 *
 * if (data?.sourceContent?.__typename === 'NoteContent') {
 *   return <div>{data.sourceContent.content}</div>;
 * }
 * ```
 */
export function useSourceContent(
  type: CitationType | null,
  id: string | null,
  enabled = true
) {
  return useQuery({
    queryKey: ['sourceContent', type, id],
    queryFn: async () => {
      if (!type || !id) return { sourceContent: null };
      console.log('[useSourceContent] Fetching:', { type, id });
      try {
        const result = await gql<SourceContentResponse>(SOURCE_CONTENT_QUERY, { type, id });
        console.log('[useSourceContent] Result:', result);
        return result;
      } catch (error) {
        console.error('[useSourceContent] Error:', error);
        throw error;
      }
    },
    enabled: enabled && !!type && !!id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
