/**
 * Custom hooks for data fetching and state management
 * All hooks use TanStack Query for server state
 */

// User hooks
export { useMe, meQueryKey, type CurrentUser } from './use-me';

// Constellation hooks
export {
  useConstellation,
  useCreateConstellation,
  constellationQueryKey,
  type Constellation,
  type CreateConstellationInput,
} from './use-constellation';

// People hooks
export {
  usePeople,
  usePerson,
  useCreatePerson,
  peopleQueryKey,
  personQueryKey,
  type PersonSummary,
  type Person,
  type CreatePersonInput,
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
