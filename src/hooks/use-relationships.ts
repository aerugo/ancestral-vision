import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/graphql-client';

/**
 * Parent type enum matching GraphQL schema
 */
export type ParentType =
  | 'BIOLOGICAL'
  | 'ADOPTIVE'
  | 'FOSTER'
  | 'STEP'
  | 'GUARDIAN'
  | 'UNKNOWN';

/**
 * Parent-child relationship from the API
 */
export interface ParentChildRelationship {
  id: string;
  parentId: string;
  childId: string;
  relationshipType: ParentType;
  isPreferred: boolean;
  startDate: unknown | null;
  endDate: unknown | null;
  createdAt: string;
  parent: {
    id: string;
    givenName: string | null;
    surname: string | null;
  };
  child: {
    id: string;
    givenName: string | null;
    surname: string | null;
  };
}

/**
 * Spouse relationship from the API
 */
export interface SpouseRelationship {
  id: string;
  person1Id: string;
  person2Id: string;
  marriageDate: unknown | null;
  marriagePlace: unknown | null;
  divorceDate: unknown | null;
  description: string | null;
  createdAt: string;
  person1: {
    id: string;
    givenName: string | null;
    surname: string | null;
  };
  person2: {
    id: string;
    givenName: string | null;
    surname: string | null;
  };
}

/**
 * Union type for all relationships
 */
export type Relationship = ParentChildRelationship | SpouseRelationship;

/**
 * Input for creating a parent-child relationship
 */
export interface CreateParentChildRelationshipInput {
  parentId: string;
  childId: string;
  relationshipType?: ParentType;
  isPreferred?: boolean;
  startDate?: unknown;
  endDate?: unknown;
}

/**
 * Input for updating a parent-child relationship
 */
export interface UpdateParentChildRelationshipInput {
  relationshipType?: ParentType;
  isPreferred?: boolean;
  startDate?: unknown;
  endDate?: unknown;
}

/**
 * Input for creating a spouse relationship
 */
export interface CreateSpouseRelationshipInput {
  person1Id: string;
  person2Id: string;
  marriageDate?: unknown;
  marriagePlace?: unknown;
  divorceDate?: unknown;
  description?: string;
}

/**
 * Input for updating a spouse relationship
 */
export interface UpdateSpouseRelationshipInput {
  marriageDate?: unknown;
  marriagePlace?: unknown;
  divorceDate?: unknown;
  description?: string;
}

// GraphQL Queries and Mutations
const PERSON_RELATIONSHIPS_QUERY = `
  query PersonRelationships($personId: ID!) {
    personRelationships(personId: $personId) {
      ... on ParentChildRelationship {
        id
        parentId
        childId
        relationshipType
        isPreferred
        startDate
        endDate
        createdAt
        parent {
          id
          givenName
          surname
        }
        child {
          id
          givenName
          surname
        }
      }
      ... on SpouseRelationship {
        id
        person1Id
        person2Id
        marriageDate
        marriagePlace
        divorceDate
        description
        createdAt
        person1 {
          id
          givenName
          surname
        }
        person2 {
          id
          givenName
          surname
        }
      }
    }
  }
`;

const CREATE_PARENT_CHILD_RELATIONSHIP_MUTATION = `
  mutation CreateParentChildRelationship($input: CreateParentChildRelationshipInput!) {
    createParentChildRelationship(input: $input) {
      id
      parentId
      childId
      relationshipType
      isPreferred
      parent {
        id
        givenName
        surname
      }
      child {
        id
        givenName
        surname
      }
    }
  }
`;

const UPDATE_PARENT_CHILD_RELATIONSHIP_MUTATION = `
  mutation UpdateParentChildRelationship($id: ID!, $input: UpdateParentChildRelationshipInput!) {
    updateParentChildRelationship(id: $id, input: $input) {
      id
      relationshipType
      isPreferred
      startDate
      endDate
    }
  }
`;

const DELETE_PARENT_CHILD_RELATIONSHIP_MUTATION = `
  mutation DeleteParentChildRelationship($id: ID!) {
    deleteParentChildRelationship(id: $id) {
      id
    }
  }
`;

const CREATE_SPOUSE_RELATIONSHIP_MUTATION = `
  mutation CreateSpouseRelationship($input: CreateSpouseRelationshipInput!) {
    createSpouseRelationship(input: $input) {
      id
      person1Id
      person2Id
      marriageDate
      marriagePlace
      divorceDate
      description
      person1 {
        id
        givenName
        surname
      }
      person2 {
        id
        givenName
        surname
      }
    }
  }
`;

const UPDATE_SPOUSE_RELATIONSHIP_MUTATION = `
  mutation UpdateSpouseRelationship($id: ID!, $input: UpdateSpouseRelationshipInput!) {
    updateSpouseRelationship(id: $id, input: $input) {
      id
      marriageDate
      marriagePlace
      divorceDate
      description
    }
  }
`;

const DELETE_SPOUSE_RELATIONSHIP_MUTATION = `
  mutation DeleteSpouseRelationship($id: ID!) {
    deleteSpouseRelationship(id: $id) {
      id
    }
  }
`;

/**
 * Query key for person relationships
 */
export function personRelationshipsQueryKey(personId: string | null) {
  return ['personRelationships', personId] as const;
}

/**
 * Hook to fetch all relationships for a person
 *
 * @param personId - Person ID to fetch relationships for, or null to disable
 * @returns TanStack Query result with array of relationships
 */
export function usePersonRelationships(personId: string | null) {
  return useQuery({
    queryKey: personRelationshipsQueryKey(personId),
    queryFn: async () => {
      if (!personId) return [];
      const data = await gql<{ personRelationships: Relationship[] }>(
        PERSON_RELATIONSHIPS_QUERY,
        { personId }
      );
      return data.personRelationships;
    },
    enabled: personId !== null,
  });
}

/**
 * Hook to create a parent-child relationship
 *
 * @returns TanStack Query mutation result
 */
export function useCreateParentChildRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateParentChildRelationshipInput) => {
      const data = await gql<{
        createParentChildRelationship: ParentChildRelationship;
      }>(CREATE_PARENT_CHILD_RELATIONSHIP_MUTATION, { input });
      return data.createParentChildRelationship;
    },
    onSuccess: (_data, variables) => {
      // Invalidate relationship queries for both parent and child
      queryClient.invalidateQueries({
        queryKey: personRelationshipsQueryKey(variables.parentId),
      });
      queryClient.invalidateQueries({
        queryKey: personRelationshipsQueryKey(variables.childId),
      });
    },
  });
}

/**
 * Hook to update a parent-child relationship
 *
 * @returns TanStack Query mutation result
 */
export function useUpdateParentChildRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateParentChildRelationshipInput;
    }) => {
      const data = await gql<{
        updateParentChildRelationship: ParentChildRelationship;
      }>(UPDATE_PARENT_CHILD_RELATIONSHIP_MUTATION, { id, input });
      return data.updateParentChildRelationship;
    },
    onSuccess: () => {
      // Invalidate all relationship queries
      queryClient.invalidateQueries({ queryKey: ['personRelationships'] });
    },
  });
}

/**
 * Hook to delete a parent-child relationship
 *
 * @returns TanStack Query mutation result
 */
export function useDeleteParentChildRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const data = await gql<{
        deleteParentChildRelationship: { id: string };
      }>(DELETE_PARENT_CHILD_RELATIONSHIP_MUTATION, { id });
      return data.deleteParentChildRelationship;
    },
    onSuccess: () => {
      // Invalidate all relationship queries
      queryClient.invalidateQueries({ queryKey: ['personRelationships'] });
    },
  });
}

/**
 * Hook to create a spouse relationship
 *
 * @returns TanStack Query mutation result
 */
export function useCreateSpouseRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSpouseRelationshipInput) => {
      const data = await gql<{
        createSpouseRelationship: SpouseRelationship;
      }>(CREATE_SPOUSE_RELATIONSHIP_MUTATION, { input });
      return data.createSpouseRelationship;
    },
    onSuccess: (_data, variables) => {
      // Invalidate relationship queries for both people
      queryClient.invalidateQueries({
        queryKey: personRelationshipsQueryKey(variables.person1Id),
      });
      queryClient.invalidateQueries({
        queryKey: personRelationshipsQueryKey(variables.person2Id),
      });
    },
  });
}

/**
 * Hook to update a spouse relationship
 *
 * @returns TanStack Query mutation result
 */
export function useUpdateSpouseRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateSpouseRelationshipInput;
    }) => {
      const data = await gql<{
        updateSpouseRelationship: SpouseRelationship;
      }>(UPDATE_SPOUSE_RELATIONSHIP_MUTATION, { id, input });
      return data.updateSpouseRelationship;
    },
    onSuccess: () => {
      // Invalidate all relationship queries
      queryClient.invalidateQueries({ queryKey: ['personRelationships'] });
    },
  });
}

/**
 * Hook to delete a spouse relationship
 *
 * @returns TanStack Query mutation result
 */
export function useDeleteSpouseRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const data = await gql<{
        deleteSpouseRelationship: { id: string };
      }>(DELETE_SPOUSE_RELATIONSHIP_MUTATION, { id });
      return data.deleteSpouseRelationship;
    },
    onSuccess: () => {
      // Invalidate all relationship queries
      queryClient.invalidateQueries({ queryKey: ['personRelationships'] });
    },
  });
}
