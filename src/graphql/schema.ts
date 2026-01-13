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

    """Get all relationships for a person (both parent-child and spouse)"""
    personRelationships(personId: ID!): [Relationship!]!
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

    """Create a parent-child relationship"""
    createParentChildRelationship(input: CreateParentChildRelationshipInput!): ParentChildRelationship!

    """Update a parent-child relationship"""
    updateParentChildRelationship(id: ID!, input: UpdateParentChildRelationshipInput!): ParentChildRelationship!

    """Delete a parent-child relationship"""
    deleteParentChildRelationship(id: ID!): ParentChildRelationship!

    """Create a spouse relationship"""
    createSpouseRelationship(input: CreateSpouseRelationshipInput!): SpouseRelationship!

    """Update a spouse relationship"""
    updateSpouseRelationship(id: ID!, input: UpdateSpouseRelationshipInput!): SpouseRelationship!

    """Delete a spouse relationship"""
    deleteSpouseRelationship(id: ID!): SpouseRelationship!
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
    """Parents of this person"""
    parents: [Person!]!
    """Children of this person"""
    children: [Person!]!
    """Spouses/partners of this person"""
    spouses: [Person!]!
  }

  """Parent-child relationship type"""
  enum ParentType {
    BIOLOGICAL
    ADOPTIVE
    FOSTER
    STEP
    GUARDIAN
    UNKNOWN
  }

  """A parent-child relationship between two people"""
  type ParentChildRelationship {
    id: ID!
    parent: Person!
    child: Person!
    parentId: ID!
    childId: ID!
    relationshipType: ParentType!
    isPreferred: Boolean!
    startDate: JSON
    endDate: JSON
    createdAt: DateTime!
  }

  """A spouse/partner relationship between two people"""
  type SpouseRelationship {
    id: ID!
    person1: Person!
    person2: Person!
    person1Id: ID!
    person2Id: ID!
    marriageDate: JSON
    marriagePlace: JSON
    divorceDate: JSON
    description: String
    createdAt: DateTime!
  }

  """Union type for all relationship types"""
  union Relationship = ParentChildRelationship | SpouseRelationship

  input CreateParentChildRelationshipInput {
    parentId: ID!
    childId: ID!
    relationshipType: ParentType!
    isPreferred: Boolean
    startDate: JSON
    endDate: JSON
  }

  input UpdateParentChildRelationshipInput {
    relationshipType: ParentType
    isPreferred: Boolean
    startDate: JSON
    endDate: JSON
  }

  input CreateSpouseRelationshipInput {
    person1Id: ID!
    person2Id: ID!
    marriageDate: JSON
    marriagePlace: JSON
    divorceDate: JSON
    description: String
  }

  input UpdateSpouseRelationshipInput {
    marriageDate: JSON
    marriagePlace: JSON
    divorceDate: JSON
    description: String
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
