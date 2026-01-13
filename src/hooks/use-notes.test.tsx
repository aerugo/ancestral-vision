/**
 * Phase 1.4: Note Hooks Tests
 *
 * TDD Tests for note TanStack Query hooks:
 * - usePersonNotes
 * - useCreateNote
 * - useUpdateNote
 * - useDeleteNote
 *
 * Invariants tested:
 * - INV-A005: TanStack Query for Server State
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Mock the graphql client
vi.mock('@/lib/graphql-client', () => ({
  gql: vi.fn(),
}));

import { gql } from '@/lib/graphql-client';
import {
  usePersonNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  personNotesQueryKey,
} from './use-notes';

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

describe('Note Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('personNotesQueryKey', () => {
    it('should return correct query key', () => {
      expect(personNotesQueryKey('person-123')).toEqual([
        'personNotes',
        'person-123',
      ]);
    });

    it('should return null key when personId is null', () => {
      expect(personNotesQueryKey(null)).toEqual(['personNotes', null]);
    });
  });

  describe('usePersonNotes', () => {
    it('should fetch notes for a person', async () => {
      const mockNotes = [
        {
          id: 'note-1',
          title: 'Test Note',
          content: 'Content',
          privacy: 'PRIVATE',
          version: 1,
          createdAt: '2026-01-13T00:00:00Z',
          updatedAt: '2026-01-13T00:00:00Z',
        },
      ];

      vi.mocked(gql).mockResolvedValueOnce({ personNotes: mockNotes });

      const { result } = renderHook(() => usePersonNotes('person-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockNotes);
      expect(gql).toHaveBeenCalledWith(
        expect.stringContaining('personNotes'),
        { personId: 'person-123' }
      );
    });

    it('should not fetch when personId is null', async () => {
      const { result } = renderHook(() => usePersonNotes(null), {
        wrapper: createWrapper(),
      });

      // Should not be loading and have no data
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(gql).not.toHaveBeenCalled();
    });

    it('should handle loading state', async () => {
      // Create a promise that we can control
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(gql).mockReturnValueOnce(promise as Promise<unknown>);

      const { result } = renderHook(() => usePersonNotes('person-123'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      resolvePromise!({ personNotes: [] });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle errors', async () => {
      const mockError = new Error('Network error');
      vi.mocked(gql).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => usePersonNotes('person-123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useCreateNote', () => {
    it('should create a note', async () => {
      const mockNote = {
        id: 'new-note-id',
        title: 'New Note',
        content: 'Content',
        privacy: 'PRIVATE',
        version: 1,
      };

      vi.mocked(gql).mockResolvedValueOnce({ createNote: mockNote });

      const { result } = renderHook(() => useCreateNote(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        personId: 'person-123',
        title: 'New Note',
        content: 'Content',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockNote);
    });

    it('should invalidate cache after create', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });

      // Pre-populate cache
      queryClient.setQueryData(['personNotes', 'person-123'], []);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      vi.mocked(gql).mockResolvedValueOnce({
        createNote: { id: 'new-note', content: 'Content' },
      });

      const { result } = renderHook(() => useCreateNote(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      result.current.mutate({ personId: 'person-123', content: 'Content' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['personNotes', 'person-123'],
      });
    });
  });

  describe('useUpdateNote', () => {
    it('should update a note', async () => {
      const mockUpdatedNote = {
        id: 'note-1',
        title: 'Updated Title',
        content: 'Updated Content',
        version: 2,
        previousVersions: [{ version: 1, content: 'Old content' }],
      };

      vi.mocked(gql).mockResolvedValueOnce({ updateNote: mockUpdatedNote });

      const { result } = renderHook(() => useUpdateNote(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        id: 'note-1',
        input: { title: 'Updated Title', content: 'Updated Content' },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockUpdatedNote);
    });

    it('should invalidate cache after update', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      vi.mocked(gql).mockResolvedValueOnce({
        updateNote: { id: 'note-1', content: 'Updated' },
      });

      const { result } = renderHook(() => useUpdateNote(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      result.current.mutate({ id: 'note-1', input: { content: 'Updated' } });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['personNotes'],
      });
    });
  });

  describe('useDeleteNote', () => {
    it('should delete a note', async () => {
      const mockDeletedNote = {
        id: 'note-1',
        deletedAt: '2026-01-13T00:00:00Z',
      };

      vi.mocked(gql).mockResolvedValueOnce({ deleteNote: mockDeletedNote });

      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('note-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockDeletedNote);
    });

    it('should invalidate cache after delete', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      vi.mocked(gql).mockResolvedValueOnce({
        deleteNote: { id: 'note-1', deletedAt: '2026-01-13T00:00:00Z' },
      });

      const { result } = renderHook(() => useDeleteNote(), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      result.current.mutate('note-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['personNotes'],
      });
    });
  });
});
