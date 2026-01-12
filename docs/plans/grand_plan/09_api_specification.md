# Ancestral Vision: API Specification

> **Status**: COMPLETE - GraphQL schema and all decisions finalized

This document specifies the GraphQL API layer for Ancestral Vision.

---

## API Design Decisions

### Resolved Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q9.1: API Style | **GraphQL** | Per 07_technology_decisions.md B1; flexible querying, type safety, excellent tooling |
| Q9.2: API Versioning | **No versioning (GraphQL evolution)** | GraphQL handles schema evolution gracefully via field deprecation; additive changes are non-breaking |
| Q9.3: Authentication | **Firebase Auth Bearer token (JWT)** | Per 07_technology_decisions.md A1; JWT in Authorization header; Firebase handles token validation |
| Q9.4: Real-time | **GraphQL Subscriptions** | Per 07_technology_decisions.md B6; native GraphQL pattern; works with GraphQL Yoga |
| Q9.5: Server Framework | **GraphQL Yoga (Next.js API routes)** | Per 07_technology_decisions.md B2; lightweight, excellent DX, built-in subscriptions |

---

## Authentication

### Request Format

All authenticated requests must include the Firebase Auth JWT token:

```http
POST /api/graphql
Authorization: Bearer <firebase-jwt-token>
Content-Type: application/json

{
  "query": "...",
  "variables": {}
}
```

### Token Validation

1. Extract JWT from `Authorization: Bearer <token>` header
2. Verify with Firebase Admin SDK
3. Extract `uid` as user identifier
4. Attach user context to GraphQL resolver context

### Public Endpoints

Some queries are accessible without authentication:
- `shareLink(token: String!)` - View shared constellation (returns ConstellationPublic with PersonPublic list)

---

## GraphQL Schema

### Scalar Types

```graphql
scalar DateTime    # ISO 8601 format
scalar JSON        # Arbitrary JSON (for FuzzyDate, Place, Tiptap content)
scalar Upload      # File upload (multipart)
```

### Enums

```graphql
enum Gender {
  MALE
  FEMALE
  OTHER
  UNKNOWN
}

enum NameOrder {
  WESTERN           # "John Smith"
  EASTERN           # "王明" (surname first)
  PATRONYMIC        # "Jón Jónsson" (Icelandic)
  PATRONYMIC_SUFFIX # "Ivan Ivanovich Petrov" (Russian)
  MATRONYMIC        # givenName + matronymic
}

enum ParentType {
  BIOLOGICAL
  ADOPTIVE
  FOSTER
  STEP
  GUARDIAN
  UNKNOWN
}

enum PrivacyLevel {
  PRIVATE           # Only creator
  CONNECTIONS       # Creator + connections
  PUBLIC            # Anyone via share link
}

enum MediaType {
  PHOTO
  DOCUMENT
  AUDIO
}

enum TranscriptionStatus {
  NONE
  PENDING
  PROCESSING
  COMPLETE
  FAILED
}

enum SourceType {
  DOCUMENT
  BOOK
  WEBSITE
  INTERVIEW
  PHOTOGRAPH
  NEWSPAPER
  CENSUS
  FAMILY_BIBLE
  ORAL_HISTORY
  OTHER
}

enum MatchStatus {
  SUGGESTED
  PENDING
  ACCEPTED
  REJECTED
  BROKEN
}

enum MatchMethod {
  AUTOMATIC
  MANUAL
  PROPAGATED
}

enum ConnectionStatus {
  PENDING
  ACCEPTED
  REJECTED
  BLOCKED
}

enum ConnectionPermission {
  FAMILY            # See private-to-connections content
  RESEARCHER        # See public content only
}

enum OnboardingStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
  SKIPPED
}

enum OnboardingStep {
  TOUR
  ADD_SELF
  ADD_PARENTS
  ADD_GRANDPARENTS
  AHA_MOMENT
}

enum SubscriptionPlan {
  FREE
  PREMIUM
}

enum SubscriptionStatus {
  ACTIVE
  CANCELLED
  PAST_DUE
  TRIALING
}
```

### Core Types

```graphql
type User {
  id: ID!                          # Firebase UID
  email: String!
  displayName: String!
  avatarUrl: String
  createdAt: DateTime!
  updatedAt: DateTime!
  lastLoginAt: DateTime

  # Account deletion (per Q4.16.3: 14-day grace period)
  deletionRequestedAt: DateTime    # When user requested deletion
  deletionScheduledFor: DateTime   # When deletion will occur (14 days after request)

  # Settings
  preferences: UserPreferences!
  subscription: SubscriptionInfo!
  usage: UsageTracking!
  onboarding: OnboardingProgress

  # Relations
  constellation: Constellation
  connections: [Connection!]!
  pendingConnectionRequests: [Connection!]!
}

type UserPreferences {
  theme: String!                   # 'dark' | 'light' | 'system'
  defaultPrivacy: PrivacyLevel!
  defaultView: String!             # '3d' | '2d'
  speculationEnabled: Boolean!
  emailNotifications: Boolean!
  emailDigestFrequency: String!    # 'immediate' | 'daily' | 'weekly'
  notifyConnectionRequests: Boolean!
  notifyMatchSuggestions: Boolean!
  notifySharedContentUpdates: Boolean!
  notifyBillingAlerts: Boolean!
}

type SubscriptionInfo {
  plan: SubscriptionPlan!
  status: SubscriptionStatus!
  currentPeriodEnd: DateTime
  lemonSqueezyCustomerId: String
  lemonSqueezySubscriptionId: String
}

type UsageTracking {
  id: ID!
  periodStart: DateTime!
  periodEnd: DateTime!
  aiOperationsUsed: Int!
  aiOperationsLimit: Int!
  storageUsedBytes: Float!         # BigInt as Float
  storageLimitBytes: Float!
  lastUpdatedAt: DateTime!

  # Computed percentages
  aiOperationsPercentage: Float!
  storagePercentage: Float!
}

type OnboardingProgress {
  id: ID!
  status: OnboardingStatus!
  currentStep: OnboardingStep!
  completedSteps: [OnboardingStep!]!
  savedData: JSON
  hasCompletedTour: Boolean!
  tourSkipped: Boolean!
  startedAt: DateTime!
  lastUpdatedAt: DateTime!
  completedAt: DateTime
}

type Constellation {
  id: ID!
  owner: User!
  title: String!
  description: String
  centeredPersonId: ID
  personCount: Int!
  generationSpan: Int!
  createdAt: DateTime!
  updatedAt: DateTime!

  # Relations
  people(
    first: Int
    after: String
    filter: PersonFilter
  ): PersonConnection!
  sources: [Source!]!
  shareLinks: [ShareLink!]!

  # Graph data for 3D visualization
  graph: ConstellationGraph!
}

type Person {
  id: ID!
  constellationId: ID!

  # Identity (international name support)
  givenName: String!
  surname: String
  maidenName: String
  patronymic: String
  matronymic: String
  nickname: String
  suffix: String
  nameOrder: NameOrder!
  displayName: String!             # Computed based on nameOrder

  # Demographics
  gender: Gender

  # Dates (GEDCOM-style flexible)
  birthDate: FuzzyDate
  deathDate: FuzzyDate

  # Places
  birthPlace: Place
  deathPlace: Place

  # Content
  biography: String                # Tiptap JSON

  # Flags
  speculative: Boolean!
  isLiving: Boolean!               # Computed: deathDate is null

  # Computed
  generation: Int                  # Relative to constellation center
  biographyWeight: Float           # 0-1, for star brightness

  # Soft delete
  deletedAt: DateTime
  deletedBy: ID

  # Metadata
  createdAt: DateTime!
  updatedAt: DateTime!
  createdBy: ID!

  # Relations
  events: [Event!]!
  notes: [Note!]!
  media: [Media!]!
  parents: [ParentRelationship!]!
  children: [ParentRelationship!]!
  spouses: [SpouseRelationship!]!
  ancestors(maxGenerations: Int = 10, preferredOnly: Boolean = true): [Person!]!
  descendants(maxGenerations: Int = 10): [Person!]!
  siblings: [Person!]!             # Computed from shared parents
}

type FuzzyDate {
  type: String!                    # 'exact' | 'partial' | 'approximate' | 'range' | 'before' | 'after'
  year: Int
  month: Int
  day: Int
  isApproximate: Boolean
  rangeStart: DatePart
  rangeEnd: DatePart
  displayText: String!
}

type DatePart {
  year: Int!
  month: Int
  day: Int
}

type Place {
  displayText: String!
  locality: String
  adminArea: String
  country: String
  countryCode: String
  coordinates: Coordinates
  googlePlaceId: String
  historicalName: String
}

type Coordinates {
  latitude: Float!
  longitude: Float!
}

type ParentRelationship {
  id: ID!
  parent: Person!
  child: Person!
  relationshipType: ParentType!
  isPreferred: Boolean!
  startDate: FuzzyDate
  endDate: FuzzyDate
  createdAt: DateTime!
  createdBy: ID!
}

type SpouseRelationship {
  id: ID!
  person1: Person!
  person2: Person!
  marriageDate: FuzzyDate
  marriagePlace: Place
  divorceDate: FuzzyDate
  description: String              # Freeform: "Married", "Partners", etc.
  displayOrder: Int
  status: String!                  # Computed: 'current' | 'divorced' | 'widowed'
  createdAt: DateTime!
  createdBy: ID!
}

type Event {
  id: ID!
  constellationId: ID!
  title: String!
  description: String              # Tiptap JSON
  icon: String
  date: FuzzyDate
  location: Place
  primaryPerson: Person!
  participants: [Person!]!
  privacy: PrivacyLevel!
  source: Source
  deletedAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
  createdBy: ID!
}

type Note {
  id: ID!
  personId: ID!
  constellationId: ID!
  title: String
  content: String!                 # Tiptap JSON (max 50,000 chars)
  privacy: PrivacyLevel!
  referencedPeople: [Person!]!
  source: Source
  version: Int!
  previousVersions: [NoteVersion!]
  deletedAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
  createdBy: ID!
}

type NoteVersion {
  version: Int!
  content: String!
  updatedAt: DateTime!
  updatedBy: ID!
}

type Media {
  id: ID!
  constellationId: ID!
  type: MediaType!
  filename: String!
  mimeType: String!
  fileSize: Int!
  storagePath: String!
  storageUrl: String!              # Signed URL (1hr expiry)
  thumbnails: MediaThumbnails
  title: String
  description: String
  dateTaken: FuzzyDate
  people: [Person!]!
  privacy: PrivacyLevel!

  # Audio specific
  duration: Int                    # seconds (max 7200)
  transcription: String
  transcriptionJson: JSON
  transcriptionStatus: TranscriptionStatus
  speakerLabels: JSON

  # Metadata
  exifData: JSON
  hash: String                     # SHA-256 for duplicate detection
  deletedAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
  createdBy: ID!
}

type MediaThumbnails {
  small: String!                   # 200px
  medium: String!                  # 800px
}

type Source {
  id: ID!
  constellationId: ID!
  sourceType: SourceType!
  title: String!
  description: String
  author: String
  publicationDate: FuzzyDate
  url: String
  citation: String
  media: Media
  events: [Event!]!
  notes: [Note!]!
  createdAt: DateTime!
  updatedAt: DateTime!
  createdBy: ID!
}

type Match {
  id: ID!
  person1: Person!
  constellation1: Constellation!
  user1: User!
  person2: Person!
  constellation2: Constellation!
  user2: User!
  confidence: Int!                 # 0-100
  confidenceBreakdown: ConfidenceBreakdown
  matchedBy: MatchMethod!
  status: MatchStatus!
  user1Status: String!             # 'pending' | 'accepted' | 'rejected'
  user2Status: String!
  suggestedAt: DateTime!
  user1RespondedAt: DateTime
  user2RespondedAt: DateTime
  brokenAt: DateTime
  brokenBy: ID
  cooldownUntil: DateTime
}

type ConfidenceBreakdown {
  nameScore: Float!
  dateScore: Float!
  locationScore: Float!
  parentScore: Float!
}

type Connection {
  id: ID!
  user1: User!
  user2: User!
  status: ConnectionStatus!
  permissionLevel: ConnectionPermission!
  requestedAt: DateTime!
  requestedBy: ID!
  acceptedAt: DateTime
  blockedAt: DateTime
}

type ShareLink {
  id: ID!
  constellationId: ID!
  createdBy: ID!
  token: String!
  title: String
  expiresAt: DateTime
  isActive: Boolean!
  viewCount: Int!
  lastViewedAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!

  # Public URL
  url: String!                     # Computed: /share/{token}
}

# Graph data for 3D visualization
type ConstellationGraph {
  nodes: [GraphNode!]!
  edges: [GraphEdge!]!
  centeredPersonId: ID

  # Denormalized for performance
  eventCounts: JSON                # personId -> count
  noteCounts: JSON                 # personId -> count
  mediaCounts: JSON                # personId -> count
}

type GraphNode {
  id: ID!
  person: PersonSummary!
  generation: Int!
  biographyWeight: Float!
  eventCount: Int!
}

type PersonSummary {
  id: ID!
  displayName: String!
  givenName: String!
  surname: String
  gender: Gender
  birthDate: FuzzyDate
  deathDate: FuzzyDate
  speculative: Boolean!
  isLiving: Boolean!
}

type GraphEdge {
  id: ID!
  sourceId: ID!
  targetId: ID!
  type: String!                    # 'parent-child' | 'spouse'
  strength: Float!
  relationshipType: ParentType     # For parent-child edges
}
```

### Pagination Types

```graphql
type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

type PersonConnection {
  edges: [PersonEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type PersonEdge {
  cursor: String!
  node: Person!
}
```

### Input Types

```graphql
input PersonFilter {
  search: String                   # Fuzzy name search
  speculative: Boolean
  hasMedia: Boolean
  hasNotes: Boolean
  generation: Int
  surname: String
}

input FuzzyDateInput {
  type: String!
  year: Int
  month: Int
  day: Int
  isApproximate: Boolean
  rangeStartYear: Int
  rangeStartMonth: Int
  rangeStartDay: Int
  rangeEndYear: Int
  rangeEndMonth: Int
  rangeEndDay: Int
  displayText: String
}

input PlaceInput {
  displayText: String!
  locality: String
  adminArea: String
  country: String
  countryCode: String
  latitude: Float
  longitude: Float
  googlePlaceId: String
  historicalName: String
}

input CreatePersonInput {
  givenName: String!
  surname: String
  maidenName: String
  patronymic: String
  matronymic: String
  nickname: String
  suffix: String
  nameOrder: NameOrder = WESTERN
  gender: Gender
  birthDate: FuzzyDateInput
  deathDate: FuzzyDateInput
  birthPlace: PlaceInput
  deathPlace: PlaceInput
  biography: String
  speculative: Boolean = false
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

input CreateEventInput {
  title: String!
  description: String
  icon: String
  date: FuzzyDateInput
  location: PlaceInput
  primaryPersonId: ID!
  participantIds: [ID!]
  privacy: PrivacyLevel = PRIVATE
  sourceId: ID
}

input UpdateEventInput {
  title: String
  description: String
  icon: String
  date: FuzzyDateInput
  location: PlaceInput
  participantIds: [ID!]
  privacy: PrivacyLevel
  sourceId: ID
}

input CreateNoteInput {
  personId: ID!
  title: String
  content: String!
  privacy: PrivacyLevel = PRIVATE
  referencedPersonIds: [ID!]
  sourceId: ID
}

input UpdateNoteInput {
  title: String
  content: String
  privacy: PrivacyLevel
  referencedPersonIds: [ID!]
  sourceId: ID
}

input CreateMediaInput {
  title: String
  description: String
  dateTaken: FuzzyDateInput
  personIds: [ID!]!
  privacy: PrivacyLevel = PRIVATE
}

input UpdateMediaInput {
  title: String
  description: String
  dateTaken: FuzzyDateInput
  personIds: [ID!]
  privacy: PrivacyLevel
}

input CreateSourceInput {
  sourceType: SourceType!
  title: String!
  description: String
  author: String
  publicationDate: FuzzyDateInput
  url: String
  citation: String
  mediaId: ID
}

input UpdateSourceInput {
  sourceType: SourceType
  title: String
  description: String
  author: String
  publicationDate: FuzzyDateInput
  url: String
  citation: String
  mediaId: ID
}

input CreateParentChildInput {
  parentId: ID!
  childId: ID!
  relationshipType: ParentType = BIOLOGICAL
  isPreferred: Boolean = true
  startDate: FuzzyDateInput
  endDate: FuzzyDateInput
}

input CreateSpouseInput {
  person1Id: ID!
  person2Id: ID!
  marriageDate: FuzzyDateInput
  marriagePlace: PlaceInput
  divorceDate: FuzzyDateInput
  description: String
  displayOrder: Int
}

input UpdateSpouseInput {
  marriageDate: FuzzyDateInput
  marriagePlace: PlaceInput
  divorceDate: FuzzyDateInput
  description: String
  displayOrder: Int
}

input UpdatePreferencesInput {
  theme: String
  defaultPrivacy: PrivacyLevel
  defaultView: String
  speculationEnabled: Boolean
  emailNotifications: Boolean
  emailDigestFrequency: String
  notifyConnectionRequests: Boolean
  notifyMatchSuggestions: Boolean
  notifySharedContentUpdates: Boolean
  notifyBillingAlerts: Boolean
}

input UpdateOnboardingInput {
  status: OnboardingStatus
  currentStep: OnboardingStep
  completedSteps: [OnboardingStep!]
  savedData: JSON
  hasCompletedTour: Boolean
  tourSkipped: Boolean
}

input CreateShareLinkInput {
  title: String
  expiresAt: DateTime
}

input SearchInput {
  query: String!
  types: [String!]                 # 'people' | 'notes' | 'events'
  constellationId: ID
}
```

### Queries

```graphql
type Query {
  # User
  me: User!
  user(id: ID!): User

  # Constellation
  constellation: Constellation     # Current user's constellation
  constellationGraph: ConstellationGraph

  # People
  person(id: ID!): Person
  people(
    first: Int = 50
    after: String
    filter: PersonFilter
  ): PersonConnection!
  ancestors(personId: ID!, maxGenerations: Int = 10, preferredOnly: Boolean = true): [Person!]!
  descendants(personId: ID!, maxGenerations: Int = 10): [Person!]!
  relatives(personId: ID!): RelativesResult!
  deletedPeople: [Person!]!        # Trash view (30-day recovery)
  deletedEvents: [Event!]!         # Trash view (30-day recovery)
  deletedNotes: [Note!]!           # Trash view (30-day recovery)
  deletedMedia: [Media!]!          # Trash view (30-day recovery)

  # Events
  event(id: ID!): Event
  personEvents(personId: ID!): [Event!]!

  # Notes
  note(id: ID!): Note
  personNotes(personId: ID!): [Note!]!
  noteVersions(noteId: ID!): [NoteVersion!]!

  # Media
  media(id: ID!): Media
  personMedia(personId: ID!): [Media!]!

  # Sources
  source(id: ID!): Source
  sources: [Source!]!

  # Matches
  match(id: ID!): Match
  potentialMatches(personId: ID!): [Match!]!
  pendingMatches: [Match!]!
  acceptedMatches: [Match!]!

  # Connections
  connections: [Connection!]!
  pendingConnectionRequests: [Connection!]!

  # Share Links
  shareLink(token: String!): ShareLinkView
  shareLinks: [ShareLink!]!

  # Search
  search(input: SearchInput!): SearchResult!
  searchPeople(query: String!): [Person!]!
  surnameList: [SurnameCount!]!

  # AI Suggestions
  pendingSuggestions: [AISuggestion!]!
}

type RelativesResult {
  parents: [Person!]!
  children: [Person!]!
  spouses: [Person!]!
  siblings: [Person!]!
}

type ShareLinkView {
  constellation: ConstellationPublic!
  graph: ConstellationGraph!
  title: String
}

type ConstellationPublic {
  id: ID!
  title: String!
  personCount: Int!
  people: [PersonPublic!]!
}

type PersonPublic {
  id: ID!
  displayName: String!
  gender: Gender
  birthDate: FuzzyDate
  deathDate: FuzzyDate
  isLiving: Boolean!
  # Only public content visible
}

type SearchResult {
  people: [Person!]!
  notes: [Note!]!
  events: [Event!]!
  totalCount: Int!
}

type SurnameCount {
  surname: String!
  count: Int!
}

type AISuggestion {
  id: ID!
  type: String!                    # 'person' | 'event' | 'relationship' | 'correction'
  confidence: Float!
  data: JSON!
  reasoning: String!
  sourceExcerpt: String
  personId: ID
  createdAt: DateTime!
}
```

### Mutations

```graphql
type Mutation {
  # User
  updateProfile(displayName: String, avatarUrl: String): User!
  updatePreferences(input: UpdatePreferencesInput!): UserPreferences!
  updateOnboarding(input: UpdateOnboardingInput!): OnboardingProgress!
  requestAccountDeletion: User!
  cancelAccountDeletion: User!

  # Constellation
  createConstellation(title: String!): Constellation!
  updateConstellation(title: String, description: String, centeredPersonId: ID): Constellation!

  # People
  createPerson(input: CreatePersonInput!): Person!
  updatePerson(id: ID!, input: UpdatePersonInput!): Person!
  deletePerson(id: ID!): Person!               # Soft delete
  restorePerson(id: ID!): Person!              # Restore from trash
  permanentlyDeletePerson(id: ID!): Boolean!   # Hard delete (admin only)

  # Relationships
  createParentChild(input: CreateParentChildInput!): ParentRelationship!
  updateParentChild(id: ID!, relationshipType: ParentType, isPreferred: Boolean): ParentRelationship!
  deleteParentChild(id: ID!): Boolean!
  createSpouse(input: CreateSpouseInput!): SpouseRelationship!
  updateSpouse(id: ID!, input: UpdateSpouseInput!): SpouseRelationship!
  deleteSpouse(id: ID!): Boolean!

  # Events
  createEvent(input: CreateEventInput!): Event!
  updateEvent(id: ID!, input: UpdateEventInput!): Event!
  deleteEvent(id: ID!): Event!                   # Soft delete
  restoreEvent(id: ID!): Event!                  # Restore from trash

  # Notes
  createNote(input: CreateNoteInput!): Note!
  updateNote(id: ID!, input: UpdateNoteInput!): Note!
  deleteNote(id: ID!): Note!                     # Soft delete
  restoreNote(id: ID!): Note!                    # Restore from trash
  restoreNoteVersion(noteId: ID!, version: Int!): Note!

  # Media
  uploadMedia(file: Upload!, input: CreateMediaInput!): Media!
  updateMedia(id: ID!, input: UpdateMediaInput!): Media!
  deleteMedia(id: ID!): Media!                   # Soft delete
  restoreMedia(id: ID!): Media!                  # Restore from trash
  startTranscription(mediaId: ID!): Media!

  # Sources
  createSource(input: CreateSourceInput!): Source!
  updateSource(id: ID!, input: UpdateSourceInput!): Source!
  deleteSource(id: ID!): Boolean!

  # Matches
  proposeMatch(person1Id: ID!, person2Id: ID!): Match!
  acceptMatch(id: ID!): Match!
  rejectMatch(id: ID!): Match!
  breakMatch(id: ID!): Match!

  # Connections
  requestConnection(userId: ID!, permissionLevel: ConnectionPermission!): Connection!
  acceptConnection(id: ID!): Connection!
  rejectConnection(id: ID!): Connection!
  updateConnectionPermission(id: ID!, permissionLevel: ConnectionPermission!): Connection!
  removeConnection(id: ID!): Boolean!
  blockUser(userId: ID!): Connection!
  unblockUser(userId: ID!): Boolean!

  # Share Links
  createShareLink(input: CreateShareLinkInput!): ShareLink!
  updateShareLink(id: ID!, title: String, expiresAt: DateTime, isActive: Boolean): ShareLink!
  deleteShareLink(id: ID!): Boolean!
  recordShareLinkView(token: String!): Boolean!

  # AI Operations
  generateBiography(personId: ID!): AIOperationResult!
  analyzePerson(personId: ID!): AIOperationResult!
  extractFromText(personId: ID!, text: String!): AIOperationResult!
  suggestMatches(personId: ID!): AIOperationResult!
  speculateAncestor(personId: ID!, generations: Int = 1): AIOperationResult!
  acceptSuggestion(suggestionId: ID!): Boolean!
  rejectSuggestion(suggestionId: ID!): Boolean!

  # Data Export (per 08_data_model.md Export Formats, Q4.16.4)
  exportGedcom: ExportResult!                    # Standard GEDCOM 5.5.1 format
  exportJson: ExportResult!                      # Full JSON dump
  exportCsv: ExportResult!                       # Simplified spreadsheet format

  # LemonSqueezy webhooks (internal)
  handleSubscriptionWebhook(payload: JSON!): Boolean!
}

type AIOperationResult {
  success: Boolean!
  message: String
  suggestions: [AISuggestion!]
  usageRemaining: Int!
}

type ExportResult {
  success: Boolean!
  downloadUrl: String!               # Signed URL (1hr expiry)
  filename: String!
  format: String!                    # 'gedcom' | 'json' | 'csv'
  fileSize: Int!
  expiresAt: DateTime!
}
```

### Subscriptions

```graphql
type Subscription {
  # Constellation changes (for 3D view sync)
  constellationUpdated: ConstellationUpdateEvent!

  # Person changes
  personCreated: Person!
  personUpdated(id: ID): Person!
  personDeleted: ID!

  # Match notifications
  matchSuggested: Match!
  matchAccepted: Match!

  # Connection notifications
  connectionRequested: Connection!
  connectionAccepted: Connection!

  # AI operations
  aiSuggestionCreated: AISuggestion!
  transcriptionCompleted(mediaId: ID!): Media!
}

type ConstellationUpdateEvent {
  type: String!                    # 'person' | 'relationship' | 'event' | 'note' | 'media'
  action: String!                  # 'created' | 'updated' | 'deleted'
  entityId: ID!
  entity: JSON                     # The updated entity data
}
```

---

## Rate Limiting

### Limits (per Q4.7.5)

| Category | Free Tier | Premium Tier |
|----------|-----------|--------------|
| General API | 10 requests/minute | 10 requests/minute |
| Daily API calls | 50 requests/day | 200 requests/day |
| AI operations | 15/month | 100/month |
| File uploads | 250 MB total | 10 GB total |
| Active share links | 1 | Unlimited |

### Rate Limit Headers

All responses include rate limit information:

```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 8
X-RateLimit-Reset: 1704067200
X-RateLimit-Daily-Limit: 50
X-RateLimit-Daily-Remaining: 42
X-RateLimit-Daily-Reset: 1704153600
```

### Exceeded Limits

When rate limited, the API returns:

```graphql
{
  "errors": [{
    "message": "Rate limit exceeded",
    "extensions": {
      "code": "RATE_LIMITED",
      "retryAfter": 60
    }
  }]
}
```

---

## Error Handling

### Error Format

```graphql
{
  "errors": [{
    "message": "Person not found",
    "path": ["person"],
    "extensions": {
      "code": "NOT_FOUND",
      "details": {
        "id": "123e4567-e89b-12d3-a456-426614174000"
      }
    }
  }]
}
```

### Error Codes

| Code | Description |
|------|-------------|
| AUTH_REQUIRED | Authentication required (missing/invalid token) |
| AUTH_INVALID | Invalid credentials |
| AUTH_EXPIRED | Token has expired |
| FORBIDDEN | Not authorized for resource |
| NOT_FOUND | Resource not found |
| VALIDATION_ERROR | Invalid input data |
| CONFLICT | Resource conflict (e.g., duplicate) |
| RATE_LIMITED | Too many requests |
| AI_QUOTA_EXCEEDED | AI operation quota exceeded |
| STORAGE_QUOTA_EXCEEDED | Storage limit reached |
| PEOPLE_LIMIT_EXCEEDED | People count limit reached (Free tier) |
| SHARE_LINK_LIMIT_EXCEEDED | Share link limit reached (Free tier) |
| CONNECTION_NOT_ALLOWED | Connections not available (Free tier) |
| INTERNAL_ERROR | Server error |

---

## Authorization

### Ownership Rules

| Resource | Owner | Access |
|----------|-------|--------|
| Constellation | User who created it | Owner has full access |
| Person | Constellation owner | Owner has full access |
| Event | Event creator (createdBy) | Creator can edit; participants read-only |
| Note | Note creator (createdBy) | Creator only (respects privacy level) |
| Media | Media uploader (createdBy) | Uploader only (respects privacy level) |
| ShareLink | Link creator | Creator can manage |

### Privacy Level Access

| Privacy | Who Can See |
|---------|-------------|
| PRIVATE | Only the creator |
| CONNECTIONS | Creator + Family-level connections |
| PUBLIC | Anyone via share link + all connections |

### Connection-Based Access

- **Family connections**: Can see CONNECTIONS-level content
- **Researcher connections**: Can only see PUBLIC content
- **Matched people**: Can see shared data per match agreement

---

## File Upload

### Upload Flow

1. Client calls `uploadMedia` mutation with file and metadata
2. Server generates signed upload URL for GCS
3. Client uploads file directly to GCS
4. Server processes file (thumbnails, transcoding)
5. Media entity created and returned

### Supported Formats

| Type | Formats | Max Size | Processing |
|------|---------|----------|------------|
| Photo | JPEG, PNG, WebP, HEIC | 25 MB | Resize to 2048px, WebP conversion, thumbnails |
| Document | PDF | 25 MB | None |
| Audio | MP3, M4A, WAV, WebM | 2 hours | Opus transcode, original preserved |

### Upload Response

```graphql
type Media {
  id: ID!
  storageUrl: String!    # Signed URL for download (1hr expiry)
  thumbnails: {
    small: String!       # 200px signed URL
    medium: String!      # 800px signed URL
  }
  # ... other fields
}
```

---

## GraphQL Schema Location

The complete schema is generated and available at:

```
/api/graphql (introspection enabled in development)
/docs/api/schema.graphql (exported schema file)
```

### Code Generation

Types are generated from the schema using GraphQL Code Generator:

```bash
# Generate TypeScript types for client
npm run codegen
```

Output locations:
- `src/generated/graphql.ts` - All types, queries, mutations
- `src/generated/hooks.ts` - React Query hooks for queries/mutations

---

## Next Steps

1. ✅ Resolve all API design decisions
2. ✅ Define complete GraphQL schema
3. ✅ Document rate limits and quotas
4. ✅ Document authentication flow
5. ✅ Document real-time subscriptions
6. Implement GraphQL Yoga server in Next.js API routes
7. Set up GraphQL Code Generator for type safety
8. Implement resolvers with Prisma

---

*Status: Complete - Last Updated: 2026-01-11*
