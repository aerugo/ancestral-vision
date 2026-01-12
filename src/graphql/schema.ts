/**
 * GraphQL Schema Type Definitions
 *
 * Defines the GraphQL API surface for Ancestral Vision.
 */

export const typeDefs = /* GraphQL */ `
  type Query {
    me: User
    constellation: Constellation
    person(id: ID!): Person
    people(
      constellationId: ID!
      includeDeleted: Boolean = false
    ): [Person!]!
  }

  type Mutation {
    createConstellation(input: CreateConstellationInput!): Constellation!
    updateConstellation(input: UpdateConstellationInput!): Constellation!
    createPerson(input: CreatePersonInput!): Person!
    updatePerson(id: ID!, input: UpdatePersonInput!): Person!
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
    displayName: String!
    gender: Gender
    birthDate: FuzzyDate
    deathDate: FuzzyDate
    birthPlace: Place
    deathPlace: Place
    biography: String
    speculative: Boolean!
    deletedAt: DateTime
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
    birthDate: FuzzyDateInput
    deathDate: FuzzyDateInput
    birthPlace: PlaceInput
    deathPlace: PlaceInput
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
    birthDate: FuzzyDateInput
    deathDate: FuzzyDateInput
    birthPlace: PlaceInput
    deathPlace: PlaceInput
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

  scalar DateTime
  scalar FuzzyDate
  scalar Place

  input FuzzyDateInput {
    type: String!
    year: Int
    month: Int
    day: Int
    isApproximate: Boolean
    displayText: String
  }

  input PlaceInput {
    displayText: String!
    locality: String
    adminArea: String
    country: String
    countryCode: String
  }
`;
