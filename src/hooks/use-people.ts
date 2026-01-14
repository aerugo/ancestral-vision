import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gql } from '@/lib/graphql-client';
import { useAuthStore } from '@/store/auth-store';

/**
 * Person data from the API (summary view)
 */
export interface PersonSummary {
  id: string;
  givenName: string | null;
  surname: string | null;
  generation: number;
}

/**
 * Person data from the API (full view)
 */
export interface Person extends PersonSummary {
  patronymic: string | null;
  maidenName: string | null;
  matronymic: string | null;
  nickname: string | null;
  suffix: string | null;
  nameOrder: string | null;
  gender: string | null;
  biography: string | null;
  speculative: boolean;
  birthDate: string | null;
  deathDate: string | null;
}

/**
 * Input for creating a new person
 */
export interface CreatePersonInput {
  givenName?: string;
  surname?: string;
  patronymic?: string;
  nameOrder?: 'GIVEN_FIRST' | 'FAMILY_FIRST';
  speculative?: boolean;
}

/**
 * Input for updating an existing person
 */
export interface UpdatePersonInput {
  givenName?: string;
  surname?: string;
  maidenName?: string;
  patronymic?: string;
  matronymic?: string;
  nickname?: string;
  suffix?: string;
  nameOrder?: string;
  gender?: string;
  birthDate?: unknown;
  deathDate?: unknown;
  biography?: string;
  speculative?: boolean;
}

// GraphQL Queries and Mutations
const PEOPLE_QUERY = `
  query People {
    people {
      id
      givenName
      surname
      generation
    }
  }
`;

const PERSON_QUERY = `
  query Person($id: ID!) {
    person(id: $id) {
      id
      givenName
      surname
      patronymic
      maidenName
      matronymic
      nickname
      suffix
      nameOrder
      gender
      biography
      speculative
      generation
      birthDate
      deathDate
    }
  }
`;

const CREATE_PERSON_MUTATION = `
  mutation CreatePerson($input: CreatePersonInput!) {
    createPerson(input: $input) {
      id
      givenName
      surname
      generation
    }
  }
`;

const UPDATE_PERSON_MUTATION = `
  mutation UpdatePerson($id: ID!, $input: UpdatePersonInput!) {
    updatePerson(id: $id, input: $input) {
      id
      givenName
      surname
      patronymic
      maidenName
      matronymic
      nickname
      suffix
      nameOrder
      gender
      biography
      speculative
      generation
      birthDate
      deathDate
    }
  }
`;

/**
 * Query key for people list
 */
export const peopleQueryKey = ['people'] as const;

/**
 * Query key for single person
 */
export function personQueryKey(id: string | null) {
  return ['person', id] as const;
}

/**
 * Hook to fetch all people in the user's constellation
 *
 * @returns TanStack Query result with array of people
 *
 * @example
 * ```tsx
 * function PeopleList() {
 *   const { data: people, isLoading } = usePeople();
 *
 *   if (isLoading) return <Loading />;
 *   if (!people?.length) return <Empty />;
 *
 *   return (
 *     <ul>
 *       {people.map(person => (
 *         <li key={person.id}>{person.givenName} {person.surname}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function usePeople() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: peopleQueryKey,
    queryFn: async () => {
      const data = await gql<{ people: PersonSummary[] }>(PEOPLE_QUERY);
      return data.people;
    },
    // Only fetch when authenticated to avoid caching empty results
    enabled: !!token,
  });
}

/**
 * Hook to fetch a single person by ID
 *
 * @param id - Person ID to fetch, or null to disable the query
 * @returns TanStack Query result with person data
 *
 * @example
 * ```tsx
 * function PersonDetail({ id }: { id: string }) {
 *   const { data: person, isLoading } = usePerson(id);
 *
 *   if (isLoading) return <Loading />;
 *   if (!person) return <NotFound />;
 *
 *   return <PersonCard person={person} />;
 * }
 * ```
 */
export function usePerson(id: string | null) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: personQueryKey(id),
    queryFn: async () => {
      if (!id) return null;
      const data = await gql<{ person: Person | null }>(PERSON_QUERY, { id });
      return data.person;
    },
    // Only fetch when authenticated and have an ID
    enabled: id !== null && !!token,
  });
}

/**
 * Hook to create a new person in the constellation
 *
 * @returns TanStack Query mutation result
 *
 * @example
 * ```tsx
 * function AddPersonForm() {
 *   const { mutate, isPending } = useCreatePerson();
 *
 *   const handleSubmit = (e: FormEvent) => {
 *     e.preventDefault();
 *     mutate({ givenName: 'John', surname: 'Doe' });
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       ...
 *       <button disabled={isPending}>
 *         {isPending ? 'Creating...' : 'Add Person'}
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useCreatePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePersonInput) => {
      const data = await gql<{ createPerson: PersonSummary }>(
        CREATE_PERSON_MUTATION,
        { input }
      );
      return data.createPerson;
    },
    onSuccess: () => {
      // Invalidate people query to refetch the list
      queryClient.invalidateQueries({ queryKey: peopleQueryKey });
    },
  });
}

/**
 * Hook to update an existing person in the constellation
 *
 * @returns TanStack Query mutation result
 *
 * @example
 * ```tsx
 * function EditPersonForm({ personId }: { personId: string }) {
 *   const { mutate, isPending } = useUpdatePerson();
 *
 *   const handleSubmit = (data: UpdatePersonInput) => {
 *     mutate({ id: personId, input: data });
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       ...
 *       <button disabled={isPending}>
 *         {isPending ? 'Saving...' : 'Save'}
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useUpdatePerson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdatePersonInput }) => {
      const data = await gql<{ updatePerson: Person }>(
        UPDATE_PERSON_MUTATION,
        { id, input }
      );
      return data.updatePerson;
    },
    onSuccess: (updatedPerson) => {
      // Invalidate people list
      queryClient.invalidateQueries({ queryKey: peopleQueryKey });
      // Update the specific person cache
      queryClient.setQueryData(personQueryKey(updatedPerson.id), updatedPerson);
    },
  });
}
