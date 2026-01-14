/**
 * Phase 1.4: Note Hooks
 *
 * TanStack Query hooks for note operations:
 * - usePersonNotes - fetch notes for a person
 * - useCreateNote - create a new note
 * - useUpdateNote - update an existing note
 * - useDeleteNote - soft delete a note
 *
 * Implements INV-A005: TanStack Query for Server State
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/graphql-client';
import { useAuthStore } from '@/store/auth-store';

/**
 * Privacy level enum matching GraphQL schema
 */
export type PrivacyLevel = 'PRIVATE' | 'CONNECTIONS' | 'PUBLIC';

/**
 * Note version from previousVersions array
 */
export interface NoteVersion {
  version: number;
  content: string;
  updatedAt: string;
}

/**
 * Note from the API
 */
export interface Note {
  id: string;
  personId: string;
  title: string | null;
  content: string;
  privacy: PrivacyLevel;
  version: number;
  previousVersions: NoteVersion[] | null;
  referencedPersonIds: string[];
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating a note
 */
export interface CreateNoteInput {
  personId: string;
  title?: string;
  content: string;
  privacy?: PrivacyLevel;
}

/**
 * Input for updating a note
 */
export interface UpdateNoteInput {
  title?: string;
  content?: string;
  privacy?: PrivacyLevel;
}

// GraphQL Queries and Mutations
const PERSON_NOTES_QUERY = `
  query PersonNotes($personId: ID!) {
    personNotes(personId: $personId) {
      id
      personId
      title
      content
      privacy
      version
      previousVersions
      referencedPersonIds
      createdAt
      updatedAt
    }
  }
`;

const CREATE_NOTE_MUTATION = `
  mutation CreateNote($input: CreateNoteInput!) {
    createNote(input: $input) {
      id
      personId
      title
      content
      privacy
      version
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_NOTE_MUTATION = `
  mutation UpdateNote($id: ID!, $input: UpdateNoteInput!) {
    updateNote(id: $id, input: $input) {
      id
      title
      content
      privacy
      version
      previousVersions
      updatedAt
    }
  }
`;

const DELETE_NOTE_MUTATION = `
  mutation DeleteNote($id: ID!) {
    deleteNote(id: $id) {
      id
      deletedAt
    }
  }
`;

/**
 * Query key for person notes
 */
export function personNotesQueryKey(personId: string | null) {
  return ['personNotes', personId] as const;
}

/**
 * Hook to fetch notes for a person
 *
 * @param personId - Person ID to fetch notes for, or null to disable
 * @returns TanStack Query result with array of notes
 */
export function usePersonNotes(personId: string | null) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: personNotesQueryKey(personId),
    queryFn: async () => {
      if (!personId) return [];
      const data = await gql<{ personNotes: Note[] }>(PERSON_NOTES_QUERY, {
        personId,
      });
      return data.personNotes;
    },
    enabled: personId !== null && !!token,
  });
}

/**
 * Hook to create a new note
 *
 * @returns TanStack Query mutation result
 */
export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateNoteInput) => {
      const data = await gql<{ createNote: Note }>(CREATE_NOTE_MUTATION, {
        input,
      });
      return data.createNote;
    },
    onSuccess: (_data, variables) => {
      // Invalidate notes for the person
      queryClient.invalidateQueries({
        queryKey: personNotesQueryKey(variables.personId),
      });
    },
  });
}

/**
 * Hook to update a note
 *
 * @returns TanStack Query mutation result
 */
export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateNoteInput }) => {
      const data = await gql<{ updateNote: Note }>(UPDATE_NOTE_MUTATION, {
        id,
        input,
      });
      return data.updateNote;
    },
    onSuccess: () => {
      // Invalidate all note queries
      queryClient.invalidateQueries({ queryKey: ['personNotes'] });
    },
  });
}

/**
 * Hook to soft delete a note
 *
 * @returns TanStack Query mutation result
 */
export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const data = await gql<{ deleteNote: Note }>(DELETE_NOTE_MUTATION, { id });
      return data.deleteNote;
    },
    onSuccess: () => {
      // Invalidate all note queries
      queryClient.invalidateQueries({ queryKey: ['personNotes'] });
    },
  });
}
