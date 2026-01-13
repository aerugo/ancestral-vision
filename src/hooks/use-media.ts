/**
 * Media Hooks (INV-A005: TanStack Query for Server State)
 *
 * TanStack Query hooks for media operations.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { gql } from 'graphql-request';

// Types
interface MediaThumbnails {
  small: string;
  medium: string;
}

interface MediaPerson {
  id: string;
  givenName: string;
  surname?: string | null;
}

interface Media {
  id: string;
  type: 'PHOTO' | 'DOCUMENT' | 'AUDIO';
  filename: string;
  mimeType: string;
  fileSize: number;
  url: string;
  thumbnails: MediaThumbnails | null;
  title?: string | null;
  description?: string | null;
  dateTaken?: unknown;
  privacy: 'PRIVATE' | 'CONNECTIONS' | 'PUBLIC';
  people: MediaPerson[];
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PrepareUploadResult {
  mediaId: string;
  uploadUrl: string;
  isDuplicate: boolean;
  duplicateMediaId?: string | null;
}

interface PrepareMediaUploadInput {
  filename: string;
  mimeType: string;
  fileSize: number;
  hash: string;
  personIds: string[];
}

interface ConfirmMediaUploadInput {
  mediaId: string;
  title?: string;
  description?: string;
  dateTaken?: unknown;
  privacy?: 'PRIVATE' | 'CONNECTIONS' | 'PUBLIC';
}

// GraphQL Documents
const PERSON_MEDIA_QUERY = gql`
  query PersonMedia($personId: ID!) {
    personMedia(personId: $personId) {
      id
      type
      filename
      mimeType
      fileSize
      url
      thumbnails
      title
      description
      dateTaken
      privacy
      people {
        id
        givenName
        surname
      }
      createdAt
      updatedAt
    }
  }
`;

const MEDIA_QUERY = gql`
  query Media($id: ID!) {
    media(id: $id) {
      id
      type
      filename
      mimeType
      fileSize
      url
      thumbnails
      title
      description
      dateTaken
      privacy
      people {
        id
        givenName
        surname
      }
      createdAt
      updatedAt
    }
  }
`;

const PREPARE_MEDIA_UPLOAD_MUTATION = gql`
  mutation PrepareMediaUpload($input: PrepareMediaUploadInput!) {
    prepareMediaUpload(input: $input) {
      mediaId
      uploadUrl
      isDuplicate
      duplicateMediaId
    }
  }
`;

const CONFIRM_MEDIA_UPLOAD_MUTATION = gql`
  mutation ConfirmMediaUpload($input: ConfirmMediaUploadInput!) {
    confirmMediaUpload(input: $input) {
      id
      type
      filename
      thumbnails
      title
      privacy
    }
  }
`;

const DELETE_MEDIA_MUTATION = gql`
  mutation DeleteMedia($id: ID!) {
    deleteMedia(id: $id) {
      id
      deletedAt
    }
  }
`;

const ASSOCIATE_MEDIA_WITH_PERSON_MUTATION = gql`
  mutation AssociateMediaWithPerson($mediaId: ID!, $personId: ID!) {
    associateMediaWithPerson(mediaId: $mediaId, personId: $personId) {
      id
      people {
        id
        givenName
        surname
      }
    }
  }
`;

const REMOVE_MEDIA_FROM_PERSON_MUTATION = gql`
  mutation RemoveMediaFromPerson($mediaId: ID!, $personId: ID!) {
    removeMediaFromPerson(mediaId: $mediaId, personId: $personId) {
      id
      people {
        id
        givenName
        surname
      }
    }
  }
`;

/**
 * Hook to fetch media for a person
 */
export function usePersonMedia(personId: string | null | undefined) {
  return useQuery({
    queryKey: ['media', 'person', personId],
    queryFn: async () => {
      const response = await graphqlClient.request<{ personMedia: Media[] }>(
        PERSON_MEDIA_QUERY,
        { personId }
      );
      return response.personMedia;
    },
    enabled: !!personId,
  });
}

/**
 * Hook to fetch a single media by ID
 */
export function useMedia(mediaId: string | null | undefined) {
  return useQuery({
    queryKey: ['media', mediaId],
    queryFn: async () => {
      const response = await graphqlClient.request<{ media: Media | null }>(
        MEDIA_QUERY,
        { id: mediaId }
      );
      return response.media;
    },
    enabled: !!mediaId,
  });
}

/**
 * Hook to prepare media upload
 */
export function usePrepareMediaUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PrepareMediaUploadInput) => {
      const response = await graphqlClient.request<{
        prepareMediaUpload: PrepareUploadResult;
      }>(PREPARE_MEDIA_UPLOAD_MUTATION, { input });
      return response.prepareMediaUpload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
  });
}

/**
 * Hook to confirm media upload
 */
export function useConfirmMediaUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ConfirmMediaUploadInput) => {
      const response = await graphqlClient.request<{ confirmMediaUpload: Media }>(
        CONFIRM_MEDIA_UPLOAD_MUTATION,
        { input }
      );
      return response.confirmMediaUpload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
  });
}

/**
 * Hook to delete media
 */
export function useDeleteMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await graphqlClient.request<{ deleteMedia: Media }>(
        DELETE_MEDIA_MUTATION,
        { id }
      );
      return response.deleteMedia;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
  });
}

/**
 * Hook to associate media with a person
 */
export function useAssociateMediaWithPerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      mediaId,
      personId,
    }: {
      mediaId: string;
      personId: string;
    }) => {
      const response = await graphqlClient.request<{
        associateMediaWithPerson: Media;
      }>(ASSOCIATE_MEDIA_WITH_PERSON_MUTATION, { mediaId, personId });
      return response.associateMediaWithPerson;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
  });
}

/**
 * Hook to remove media from a person
 */
export function useRemoveMediaFromPerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      mediaId,
      personId,
    }: {
      mediaId: string;
      personId: string;
    }) => {
      const response = await graphqlClient.request<{
        removeMediaFromPerson: Media;
      }>(REMOVE_MEDIA_FROM_PERSON_MUTATION, { mediaId, personId });
      return response.removeMediaFromPerson;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
  });
}
