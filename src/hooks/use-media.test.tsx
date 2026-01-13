/**
 * Media Hooks Tests
 *
 * Tests for TanStack Query hooks for media operations.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  usePersonMedia,
  usePrepareMediaUpload,
  useConfirmMediaUpload,
  useDeleteMedia,
  useAssociateMediaWithPerson,
  useRemoveMediaFromPerson,
} from './use-media';

// Mock the GraphQL client
vi.mock('@/lib/graphql-client', () => ({
  graphqlClient: {
    request: vi.fn(),
  },
}));

import { graphqlClient } from '@/lib/graphql-client';

const mockMedia = [
  {
    id: 'media-1',
    type: 'PHOTO',
    filename: 'family.jpg',
    mimeType: 'image/jpeg',
    fileSize: 1024000,
    url: 'https://storage.example.com/signed-url/family.jpg',
    thumbnails: { small: 'https://storage.example.com/family_200.jpg' },
    title: 'Family Photo',
    description: null,
    privacy: 'PRIVATE',
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'media-2',
    type: 'DOCUMENT',
    filename: 'certificate.pdf',
    mimeType: 'application/pdf',
    fileSize: 512000,
    url: 'https://storage.example.com/signed-url/certificate.pdf',
    thumbnails: null,
    title: 'Birth Certificate',
    description: 'Original copy',
    privacy: 'PRIVATE',
    createdAt: '2024-01-10T08:00:00Z',
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

describe('Media Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('usePersonMedia', () => {
    it('should fetch media for a person', async () => {
      vi.mocked(graphqlClient.request).mockResolvedValue({
        personMedia: mockMedia,
      });

      const { result } = renderHook(() => usePersonMedia('person-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].filename).toBe('family.jpg');
      expect(result.current.data?.[1].filename).toBe('certificate.pdf');
    });

    it('should not fetch when personId is null', () => {
      const { result } = renderHook(() => usePersonMedia(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
    });

    it('should handle loading state', () => {
      vi.mocked(graphqlClient.request).mockImplementation(
        () => new Promise(() => {})
      );

      const { result } = renderHook(() => usePersonMedia('person-1'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('should handle error state', async () => {
      vi.mocked(graphqlClient.request).mockRejectedValue(
        new Error('Failed to fetch')
      );

      const { result } = renderHook(() => usePersonMedia('person-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('usePrepareMediaUpload', () => {
    it('should prepare upload and return signed URL', async () => {
      vi.mocked(graphqlClient.request).mockResolvedValue({
        prepareMediaUpload: {
          mediaId: 'new-media-id',
          uploadUrl: 'https://storage.example.com/upload-signed-url',
          isDuplicate: false,
          duplicateMediaId: null,
        },
      });

      const { result } = renderHook(() => usePrepareMediaUpload(), {
        wrapper: createWrapper(),
      });

      const response = await result.current.mutateAsync({
        filename: 'photo.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024000,
        hash: 'abc123hash',
        personIds: ['person-1'],
      });

      expect(response.mediaId).toBe('new-media-id');
      expect(response.uploadUrl).toContain('upload-signed-url');
      expect(response.isDuplicate).toBe(false);
    });

    it('should return isDuplicate true when duplicate detected', async () => {
      vi.mocked(graphqlClient.request).mockResolvedValue({
        prepareMediaUpload: {
          mediaId: 'new-media-id',
          uploadUrl: 'https://storage.example.com/upload-signed-url',
          isDuplicate: true,
          duplicateMediaId: 'existing-media-id',
        },
      });

      const { result } = renderHook(() => usePrepareMediaUpload(), {
        wrapper: createWrapper(),
      });

      const response = await result.current.mutateAsync({
        filename: 'duplicate.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024000,
        hash: 'existinghash',
        personIds: ['person-1'],
      });

      expect(response.isDuplicate).toBe(true);
      expect(response.duplicateMediaId).toBe('existing-media-id');
    });
  });

  describe('useConfirmMediaUpload', () => {
    it('should confirm upload', async () => {
      vi.mocked(graphqlClient.request).mockResolvedValue({
        confirmMediaUpload: {
          id: 'media-1',
          type: 'PHOTO',
          filename: 'photo.jpg',
          thumbnails: { small: 'photo_200.jpg', medium: 'photo_800.jpg' },
        },
      });

      const { result } = renderHook(() => useConfirmMediaUpload(), {
        wrapper: createWrapper(),
      });

      const response = await result.current.mutateAsync({
        mediaId: 'media-1',
        title: 'My Photo',
        privacy: 'PRIVATE',
      });

      expect(response.id).toBe('media-1');
      expect(response.thumbnails).toBeDefined();
    });
  });

  describe('useDeleteMedia', () => {
    it('should delete media', async () => {
      vi.mocked(graphqlClient.request).mockResolvedValue({
        deleteMedia: {
          id: 'media-1',
          deletedAt: '2024-01-20T12:00:00Z',
        },
      });

      const { result } = renderHook(() => useDeleteMedia(), {
        wrapper: createWrapper(),
      });

      const response = await result.current.mutateAsync('media-1');

      expect(response.id).toBe('media-1');
      expect(response.deletedAt).toBeDefined();
    });
  });

  describe('useAssociateMediaWithPerson', () => {
    it('should add person to media', async () => {
      vi.mocked(graphqlClient.request).mockResolvedValue({
        associateMediaWithPerson: {
          id: 'media-1',
          people: [{ id: 'person-1' }, { id: 'person-2' }],
        },
      });

      const { result } = renderHook(() => useAssociateMediaWithPerson(), {
        wrapper: createWrapper(),
      });

      const response = await result.current.mutateAsync({
        mediaId: 'media-1',
        personId: 'person-2',
      });

      expect(response.people).toHaveLength(2);
    });
  });

  describe('useRemoveMediaFromPerson', () => {
    it('should remove person from media', async () => {
      vi.mocked(graphqlClient.request).mockResolvedValue({
        removeMediaFromPerson: {
          id: 'media-1',
          people: [{ id: 'person-1' }],
        },
      });

      const { result } = renderHook(() => useRemoveMediaFromPerson(), {
        wrapper: createWrapper(),
      });

      const response = await result.current.mutateAsync({
        mediaId: 'media-1',
        personId: 'person-2',
      });

      expect(response.people).toHaveLength(1);
    });
  });
});
