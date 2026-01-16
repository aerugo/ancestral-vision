/**
 * Event Hooks Tests
 *
 * Tests for TanStack Query hooks for event operations.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
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

// Mock graphql-request gql (used for query templates)
vi.mock('graphql-request', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce((acc, str, i) => acc + str + (values[i] ?? ''), ''),
}));

import {
  usePersonEvents,
  useEvent,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useAddEventParticipant,
  useRemoveEventParticipant,
} from './use-events';

import { graphqlClient } from '@/lib/graphql-client';

const mockEvents = [
  {
    id: 'event-1',
    title: 'Birth',
    description: null,
    date: { type: 'exact', year: 1985, month: 6, day: 15 },
    location: { place: 'Boston', region: 'MA', country: 'USA' },
    primaryPersonId: 'person-1',
    participants: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'event-2',
    title: 'Graduation',
    description: 'College graduation',
    date: { type: 'approximate', year: 2007 },
    location: null,
    primaryPersonId: 'person-1',
    participants: [{ id: 'participant-1', personId: 'person-2' }],
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
];

function createWrapper(): ({ children }: { children: ReactNode }) => ReactNode {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }): ReactNode {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe('Event Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('usePersonEvents', () => {
    it('should fetch events for a person', async () => {
      vi.mocked(graphqlClient.request).mockResolvedValueOnce({
        personEvents: mockEvents,
      });

      const { result } = renderHook(() => usePersonEvents('person-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].title).toBe('Birth');
    });

    it('should handle loading state', () => {
      vi.mocked(graphqlClient.request).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => usePersonEvents('person-1'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('should handle error state', async () => {
      vi.mocked(graphqlClient.request).mockRejectedValueOnce(
        new Error('Network error')
      );

      const { result } = renderHook(() => usePersonEvents('person-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it('should not fetch when personId is null', () => {
      const { result } = renderHook(() => usePersonEvents(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(graphqlClient.request).not.toHaveBeenCalled();
    });
  });

  describe('useEvent', () => {
    it('should fetch a single event by ID', async () => {
      vi.mocked(graphqlClient.request).mockResolvedValueOnce({
        event: mockEvents[0],
      });

      const { result } = renderHook(() => useEvent('event-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.title).toBe('Birth');
    });
  });

  describe('useCreateEvent', () => {
    it('should create an event', async () => {
      const newEvent = {
        id: 'event-3',
        title: 'New Event',
        primaryPersonId: 'person-1',
        participants: [],
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z',
      };

      vi.mocked(graphqlClient.request).mockResolvedValueOnce({
        createEvent: newEvent,
      });

      const { result } = renderHook(() => useCreateEvent(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        primaryPersonId: 'person-1',
        title: 'New Event',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.title).toBe('New Event');
    });

    it('should invalidate cache after mutation', async () => {
      const newEvent = {
        id: 'event-3',
        title: 'New Event',
        primaryPersonId: 'person-1',
        participants: [],
      };

      vi.mocked(graphqlClient.request).mockResolvedValueOnce({
        createEvent: newEvent,
      });

      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(() => useCreateEvent(), { wrapper });

      result.current.mutate({
        primaryPersonId: 'person-1',
        title: 'New Event',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['events'],
      });
    });
  });

  describe('useUpdateEvent', () => {
    it('should update an event', async () => {
      const updatedEvent = {
        ...mockEvents[0],
        title: 'Updated Birth',
      };

      vi.mocked(graphqlClient.request).mockResolvedValueOnce({
        updateEvent: updatedEvent,
      });

      const { result } = renderHook(() => useUpdateEvent(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        id: 'event-1',
        input: { title: 'Updated Birth' },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.title).toBe('Updated Birth');
    });
  });

  describe('useDeleteEvent', () => {
    it('should delete an event', async () => {
      const deletedEvent = {
        ...mockEvents[0],
        deletedAt: '2024-01-05T00:00:00Z',
      };

      vi.mocked(graphqlClient.request).mockResolvedValueOnce({
        deleteEvent: deletedEvent,
      });

      const { result } = renderHook(() => useDeleteEvent(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('event-1');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.deletedAt).toBeDefined();
    });
  });

  describe('useAddEventParticipant', () => {
    it('should add participant to event', async () => {
      const eventWithParticipant = {
        ...mockEvents[0],
        participants: [{ id: 'p-1', personId: 'person-2' }],
      };

      vi.mocked(graphqlClient.request).mockResolvedValueOnce({
        addEventParticipant: eventWithParticipant,
      });

      const { result } = renderHook(() => useAddEventParticipant(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        eventId: 'event-1',
        personId: 'person-2',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.participants).toHaveLength(1);
    });
  });

  describe('useRemoveEventParticipant', () => {
    it('should remove participant from event', async () => {
      const eventWithoutParticipant = {
        ...mockEvents[1],
        participants: [],
      };

      vi.mocked(graphqlClient.request).mockResolvedValueOnce({
        removeEventParticipant: eventWithoutParticipant,
      });

      const { result } = renderHook(() => useRemoveEventParticipant(), {
        wrapper: createWrapper(),
      });

      result.current.mutate({
        eventId: 'event-2',
        personId: 'person-2',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.participants).toHaveLength(0);
    });
  });
});
