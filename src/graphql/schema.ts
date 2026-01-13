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

    """Get notes for a person"""
    personNotes(personId: ID!): [Note!]!

    """Get a single note by ID"""
    note(id: ID!): Note

    """Get events for a person (as primary or participant)"""
    personEvents(personId: ID!): [Event!]!

    """Get a single event by ID"""
    event(id: ID!): Event

    """Get media for a person"""
    personMedia(personId: ID!): [Media!]!

    """Get a single media by ID"""
    media(id: ID!): Media
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

    """Create a note for a person"""
    createNote(input: CreateNoteInput!): Note!

    """Update a note"""
    updateNote(id: ID!, input: UpdateNoteInput!): Note!

    """Soft delete a note"""
    deleteNote(id: ID!): Note!

    """Create an event for a person"""
    createEvent(input: CreateEventInput!): Event!

    """Update an event"""
    updateEvent(id: ID!, input: UpdateEventInput!): Event!

    """Soft delete an event"""
    deleteEvent(id: ID!): Event!

    """Add a participant to an event"""
    addEventParticipant(eventId: ID!, personId: ID!): Event!

    """Remove a participant from an event"""
    removeEventParticipant(eventId: ID!, personId: ID!): Event!

    """Prepare media upload and get signed URL (INV-D008)"""
    prepareMediaUpload(input: PrepareMediaUploadInput!): PrepareUploadResult!

    """Confirm media upload after file is uploaded to storage"""
    confirmMediaUpload(input: ConfirmMediaUploadInput!): Media!

    """Soft delete media"""
    deleteMedia(id: ID!): Media!

    """Associate media with a person"""
    associateMediaWithPerson(mediaId: ID!, personId: ID!): Media!

    """Remove media from a person"""
    removeMediaFromPerson(mediaId: ID!, personId: ID!): Media!
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

  """Privacy level for content"""
  enum PrivacyLevel {
    PRIVATE
    CONNECTIONS
    PUBLIC
  }

  """A note attached to a person"""
  type Note {
    id: ID!
    personId: ID!
    title: String
    content: String!
    privacy: PrivacyLevel!
    version: Int!
    previousVersions: JSON
    referencedPersonIds: [ID!]!
    deletedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input CreateNoteInput {
    personId: ID!
    title: String
    content: String!
    privacy: PrivacyLevel
  }

  input UpdateNoteInput {
    title: String
    content: String
    privacy: PrivacyLevel
  }

  """An event in a person's life (INV-D007: supports flexible dates)"""
  type Event {
    id: ID!
    title: String!
    description: String
    icon: String
    """GEDCOM-style flexible date (exact, approximate, before, after, range)"""
    date: JSON
    """Location information"""
    location: JSON
    """Primary person this event belongs to"""
    primaryPersonId: ID!
    primaryPerson: Person!
    """Additional participants in the event"""
    participants: [EventParticipant!]!
    privacy: PrivacyLevel!
    deletedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  """A participant in an event"""
  type EventParticipant {
    id: ID!
    eventId: ID!
    personId: ID!
    person: Person!
  }

  input CreateEventInput {
    primaryPersonId: ID!
    title: String!
    description: String
    icon: String
    date: JSON
    location: JSON
    participantIds: [ID!]
    privacy: PrivacyLevel
  }

  input UpdateEventInput {
    title: String
    description: String
    icon: String
    date: JSON
    location: JSON
    privacy: PrivacyLevel
  }

  """Media type enumeration"""
  enum MediaType {
    PHOTO
    DOCUMENT
    AUDIO
  }

  """Media file attached to people (INV-D008)"""
  type Media {
    id: ID!
    type: MediaType!
    filename: String!
    mimeType: String!
    fileSize: Int!
    """Signed URL for accessing the media (1hr expiry)"""
    url: String!
    """Thumbnail URLs for images"""
    thumbnails: JSON
    title: String
    description: String
    """Date the media was taken/created"""
    dateTaken: JSON
    privacy: PrivacyLevel!
    """People associated with this media"""
    people: [Person!]!
    deletedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  """Result of preparing a media upload"""
  type PrepareUploadResult {
    mediaId: ID!
    """Signed URL for uploading the file"""
    uploadUrl: String!
    """Whether a duplicate file was detected"""
    isDuplicate: Boolean!
    """ID of existing media if duplicate"""
    duplicateMediaId: ID
  }

  input PrepareMediaUploadInput {
    filename: String!
    mimeType: String!
    fileSize: Int!
    """SHA-256 hash of file content for duplicate detection"""
    hash: String!
    """People to associate with this media"""
    personIds: [ID!]!
  }

  input ConfirmMediaUploadInput {
    mediaId: ID!
    title: String
    description: String
    dateTaken: JSON
    privacy: PrivacyLevel
  }
`;
