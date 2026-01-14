/**
 * Event Hooks (INV-A005: TanStack Query for Server State)
 *
 * TanStack Query hooks for event operations.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql-client';
import { gql } from 'graphql-request';
import { useAuthStore } from '@/store/auth-store';
import type { FuzzyDate } from '@/lib/date-utils';

// Types
interface EventParticipant {
  id: string;
  personId: string;
  person?: {
    id: string;
    givenName: string;
    surname?: string | null;
  };
}

interface Event {
  id: string;
  title: string;
  description?: string | null;
  icon?: string | null;
  date: FuzzyDate | null;
  location: { place: string; region?: string; country?: string } | null;
  primaryPersonId: string;
  primaryPerson?: {
    id: string;
    givenName: string;
    surname?: string | null;
  };
  participants: EventParticipant[];
  privacy: 'PRIVATE' | 'CONNECTIONS' | 'PUBLIC';
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CreateEventInput {
  primaryPersonId: string;
  title: string;
  description?: string;
  icon?: string;
  date?: FuzzyDate;
  location?: { place: string; region?: string; country?: string };
  participantIds?: string[];
  privacy?: 'PRIVATE' | 'CONNECTIONS' | 'PUBLIC';
}

interface UpdateEventInput {
  title?: string;
  description?: string;
  icon?: string;
  date?: FuzzyDate;
  location?: { place: string; region?: string; country?: string };
  privacy?: 'PRIVATE' | 'CONNECTIONS' | 'PUBLIC';
}

// GraphQL Documents
const PERSON_EVENTS_QUERY = gql`
  query PersonEvents($personId: ID!) {
    personEvents(personId: $personId) {
      id
      title
      description
      icon
      date
      location
      primaryPersonId
      participants {
        id
        personId
      }
      privacy
      createdAt
      updatedAt
    }
  }
`;

const EVENT_QUERY = gql`
  query Event($id: ID!) {
    event(id: $id) {
      id
      title
      description
      icon
      date
      location
      primaryPersonId
      primaryPerson {
        id
        givenName
        surname
      }
      participants {
        id
        personId
        person {
          id
          givenName
          surname
        }
      }
      privacy
      createdAt
      updatedAt
    }
  }
`;

const CREATE_EVENT_MUTATION = gql`
  mutation CreateEvent($input: CreateEventInput!) {
    createEvent(input: $input) {
      id
      title
      description
      icon
      date
      location
      primaryPersonId
      participants {
        id
        personId
      }
      privacy
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_EVENT_MUTATION = gql`
  mutation UpdateEvent($id: ID!, $input: UpdateEventInput!) {
    updateEvent(id: $id, input: $input) {
      id
      title
      description
      icon
      date
      location
      primaryPersonId
      participants {
        id
        personId
      }
      privacy
      createdAt
      updatedAt
    }
  }
`;

const DELETE_EVENT_MUTATION = gql`
  mutation DeleteEvent($id: ID!) {
    deleteEvent(id: $id) {
      id
      deletedAt
    }
  }
`;

const ADD_EVENT_PARTICIPANT_MUTATION = gql`
  mutation AddEventParticipant($eventId: ID!, $personId: ID!) {
    addEventParticipant(eventId: $eventId, personId: $personId) {
      id
      participants {
        id
        personId
      }
    }
  }
`;

const REMOVE_EVENT_PARTICIPANT_MUTATION = gql`
  mutation RemoveEventParticipant($eventId: ID!, $personId: ID!) {
    removeEventParticipant(eventId: $eventId, personId: $personId) {
      id
      participants {
        id
        personId
      }
    }
  }
`;

/**
 * Hook to fetch events for a person
 */
export function usePersonEvents(personId: string | null | undefined) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ['events', 'person', personId],
    queryFn: async () => {
      const response = await graphqlClient.request<{ personEvents: Event[] }>(
        PERSON_EVENTS_QUERY,
        { personId }
      );
      return response.personEvents;
    },
    enabled: !!personId && !!token,
  });
}

/**
 * Hook to fetch a single event by ID
 */
export function useEvent(eventId: string | null | undefined) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ['events', eventId],
    queryFn: async () => {
      const response = await graphqlClient.request<{ event: Event | null }>(
        EVENT_QUERY,
        { id: eventId }
      );
      return response.event;
    },
    enabled: !!eventId && !!token,
  });
}

/**
 * Hook to create an event
 */
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEventInput) => {
      const response = await graphqlClient.request<{ createEvent: Event }>(
        CREATE_EVENT_MUTATION,
        { input }
      );
      return response.createEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

/**
 * Hook to update an event
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateEventInput }) => {
      const response = await graphqlClient.request<{ updateEvent: Event }>(
        UPDATE_EVENT_MUTATION,
        { id, input }
      );
      return response.updateEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

/**
 * Hook to delete an event
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await graphqlClient.request<{ deleteEvent: Event }>(
        DELETE_EVENT_MUTATION,
        { id }
      );
      return response.deleteEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

/**
 * Hook to add a participant to an event
 */
export function useAddEventParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, personId }: { eventId: string; personId: string }) => {
      const response = await graphqlClient.request<{ addEventParticipant: Event }>(
        ADD_EVENT_PARTICIPANT_MUTATION,
        { eventId, personId }
      );
      return response.addEventParticipant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

/**
 * Hook to remove a participant from an event
 */
export function useRemoveEventParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, personId }: { eventId: string; personId: string }) => {
      const response = await graphqlClient.request<{ removeEventParticipant: Event }>(
        REMOVE_EVENT_PARTICIPANT_MUTATION,
        { eventId, personId }
      );
      return response.removeEventParticipant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
