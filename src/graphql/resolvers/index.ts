/**
 * GraphQL Resolvers
 *
 * Composes all resolvers from domain-specific modules.
 * All mutations require authentication and respect constellation ownership.
 */

// Re-export context type for external use
export { type GraphQLContext } from './utils';

// Import domain resolvers
import { userQueries, userFieldResolvers } from './user-resolvers';
import {
  constellationQueries,
  constellationMutations,
  constellationFieldResolvers,
} from './constellation-resolvers';
import { personQueries, personMutations, personFieldResolvers } from './person-resolvers';
import {
  relationshipQueries,
  relationshipMutations,
  relationshipTypeResolver,
} from './relationship-resolvers';
import { noteQueries, noteMutations } from './note-resolvers';

/**
 * Composed GraphQL resolvers
 */
export const resolvers = {
  Query: {
    ...userQueries,
    ...constellationQueries,
    ...personQueries,
    ...relationshipQueries,
    ...noteQueries,
  },

  Mutation: {
    ...constellationMutations,
    ...personMutations,
    ...relationshipMutations,
    ...noteMutations,
  },

  // Field resolvers
  User: userFieldResolvers,
  Constellation: constellationFieldResolvers,
  Person: personFieldResolvers,

  // Union type resolver
  Relationship: relationshipTypeResolver,
};
