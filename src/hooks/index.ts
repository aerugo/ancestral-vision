/**
 * Custom hooks for data fetching and state management
 * All hooks use TanStack Query for server state
 */

// User hooks
export { useMe, meQueryKey, type CurrentUser } from './use-me';

// People hooks
export {
  usePeople,
  usePerson,
  useCreatePerson,
  useUpdatePerson,
  peopleQueryKey,
  personQueryKey,
  type PersonSummary,
  type Person,
  type CreatePersonInput,
  type UpdatePersonInput,
} from './use-people';

// Relationship hooks
export {
  usePersonRelationships,
  useCreateParentChildRelationship,
  useUpdateParentChildRelationship,
  useDeleteParentChildRelationship,
  useCreateSpouseRelationship,
  useUpdateSpouseRelationship,
  useDeleteSpouseRelationship,
  personRelationshipsQueryKey,
  type ParentType,
  type ParentChildRelationship,
  type SpouseRelationship,
  type Relationship,
  type CreateParentChildRelationshipInput,
  type UpdateParentChildRelationshipInput,
  type CreateSpouseRelationshipInput,
  type UpdateSpouseRelationshipInput,
} from './use-relationships';

// Development shortcuts (only active in template mode)
export { useDevShortcuts, DevShortcutsProvider } from './use-dev-shortcuts';
