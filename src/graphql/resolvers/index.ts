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
import {
  eventQueries,
  eventMutations,
  eventFieldResolvers,
  eventParticipantFieldResolvers,
} from './event-resolvers';
import {
  mediaQueries,
  mediaMutations,
  mediaFieldResolvers,
} from './media-resolvers';
import { searchQueries } from './search-resolvers';
import { onboardingQueries, onboardingMutations } from './onboarding-resolvers';
import { settingsQueries, settingsMutations } from './settings-resolvers';

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
    ...eventQueries,
    ...mediaQueries,
    ...searchQueries,
    ...onboardingQueries,
    ...settingsQueries,
  },

  Mutation: {
    ...constellationMutations,
    ...personMutations,
    ...relationshipMutations,
    ...noteMutations,
    ...eventMutations,
    ...mediaMutations,
    ...onboardingMutations,
    ...settingsMutations,
  },

  // Field resolvers
  User: userFieldResolvers,
  Constellation: constellationFieldResolvers,
  Person: personFieldResolvers,
  Event: eventFieldResolvers,
  EventParticipant: eventParticipantFieldResolvers,
  Media: mediaFieldResolvers,

  // Union type resolver
  Relationship: relationshipTypeResolver,
};
