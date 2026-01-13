/**
 * GraphQL Schema Definition
 *
 * Defines the complete GraphQL schema for the Ancestral Vision API.
 * Includes types for User, Constellation, and Person management.
 */
export const typeDefs = /* GraphQL */ `
  scalar DateTime
  scalar JSON

  type Query {
    """Current authenticated user"""
    me: User

    """Current user's constellation"""
    constellation: Constellation

    """Get person by ID (must be in user's constellation)"""
    person(id: ID!): Person

    """List people in user's constellation"""
    people(includeDeleted: Boolean = false): [Person!]!
  }

  type Mutation {
    """Create constellation for authenticated user"""
    createConstellation(input: CreateConstellationInput!): Constellation!

    """Update user's constellation"""
    updateConstellation(input: UpdateConstellationInput!): Constellation!

    """Create person in user's constellation"""
    createPerson(input: CreatePersonInput!): Person!

    """Update person in user's constellation"""
    updatePerson(id: ID!, input: UpdatePersonInput!): Person!

    """Soft delete person (30-day recovery)"""
    deletePerson(id: ID!): Person!
  }

  type User {
    id: ID!
    email: String!
    displayName: String!
    avatarUrl: String
    createdAt: DateTime!
    constellation: Constellation
  }

  type Constellation {
    id: ID!
    title: String!
    description: String
    personCount: Int!
    generationSpan: Int!
    centeredPersonId: ID
    people: [Person!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Person {
    id: ID!
    givenName: String!
    surname: String
    maidenName: String
    patronymic: String
    matronymic: String
    nickname: String
    suffix: String
    nameOrder: NameOrder!
    gender: Gender
    birthDate: JSON
    deathDate: JSON
    birthPlace: JSON
    deathPlace: JSON
    biography: String
    speculative: Boolean!
    deletedAt: DateTime
    deletedBy: ID
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input CreateConstellationInput {
    title: String!
    description: String
  }

  input UpdateConstellationInput {
    title: String
    description: String
    centeredPersonId: ID
  }

  input CreatePersonInput {
    givenName: String!
    surname: String
    maidenName: String
    patronymic: String
    matronymic: String
    nickname: String
    suffix: String
    nameOrder: NameOrder
    gender: Gender
    birthDate: JSON
    deathDate: JSON
    birthPlace: JSON
    deathPlace: JSON
    biography: String
    speculative: Boolean
  }

  input UpdatePersonInput {
    givenName: String
    surname: String
    maidenName: String
    patronymic: String
    matronymic: String
    nickname: String
    suffix: String
    nameOrder: NameOrder
    gender: Gender
    birthDate: JSON
    deathDate: JSON
    birthPlace: JSON
    deathPlace: JSON
    biography: String
    speculative: Boolean
  }

  enum NameOrder {
    WESTERN
    EASTERN
    PATRONYMIC
    PATRONYMIC_SUFFIX
    MATRONYMIC
  }

  enum Gender {
    MALE
    FEMALE
    OTHER
    UNKNOWN
  }
`;
