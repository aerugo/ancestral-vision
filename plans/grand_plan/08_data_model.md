# Ancestral Vision: Data Model Specification

> **Status**: COMPLETE - All entities and decisions finalized

This document defines the data model for Ancestral Vision using PostgreSQL with Prisma ORM.

---

## Entity Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                         User                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │
│  │ UserPreferences │  │ SubscriptionInfo│  │  UsageTracking  │  │OnboardingProgress│        │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘        │
└──────────────────────────────────┬──────────────────────────────────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
             ┌─────────────┐               ┌─────────────┐
             │ Constellation│               │  Connection │
             └──────┬──────┘               └─────────────┘
                    │
      ┌─────────────┼─────────────┐
      ▼             ▼             ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  ShareLink  │ │   Person    │ │   Source    │
└─────────────┘ └──────┬──────┘ └─────────────┘
                       │
      ┌────────────────┼────────────────┬────────────────┐
      ▼                ▼                ▼                ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│    Event    │  │    Note     │  │   Media     │  │ Relationship│
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘

Cross-User Entities:
┌─────────────┐
│    Match    │  (links Person across Constellations)
└─────────────┘
```

---

## Core Entities

### User

The authenticated user of the system.

```typescript
interface User {
  id: string;                    // Firebase UID (from Firebase Auth)
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: DateTime;
  updatedAt: DateTime;
  lastLoginAt?: DateTime;

  // Account deletion (per Q4.16.3: 14-day grace period)
  deletionRequestedAt?: DateTime;  // When user requested deletion
  deletionScheduledFor?: DateTime; // When deletion will occur (14 days after request)

  // Settings
  preferences: UserPreferences;

  // Subscription (synced from LemonSqueezy)
  subscription: SubscriptionInfo;

  // Usage tracking (per US-10.5)
  usage: UsageTracking;

  // Onboarding state (per Q4.14.5)
  onboarding?: OnboardingProgress;

  // Relationships (via Prisma relations)
  constellation?: Constellation;  // Single constellation per user
  connections: Connection[];      // Other users they're connected to
}

interface UserPreferences {
  theme: 'dark' | 'light' | 'system';
  defaultPrivacy: PrivacyLevel;        // Default: 'private' (Q4.16.6)
  defaultView: '3d' | '2d';            // Default: '3d' (Q4.13.5)
  speculationEnabled: boolean;

  // Notification preferences (per Q4.10.5, 05_features.md 4.16)
  emailNotifications: boolean;         // Global email toggle; default: true
  emailDigestFrequency: 'immediate' | 'daily' | 'weekly';  // Default: 'daily'

  // Per-type notification settings (per 05_features.md 4.16)
  notifyConnectionRequests: boolean;   // Default: true
  notifyMatchSuggestions: boolean;     // Default: true
  notifySharedContentUpdates: boolean; // Default: true
  notifyBillingAlerts: boolean;        // Default: true (critical - always sent even if global off)
}

interface SubscriptionInfo {
  plan: 'free' | 'premium';
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  currentPeriodEnd?: DateTime;
  lemonSqueezyCustomerId?: string;
  lemonSqueezySubscriptionId?: string;
}
```

### UsageTracking

Tracks user quota consumption for features with limits (per US-10.5 pricing tiers).

```typescript
interface UsageTracking {
  id: string;                    // UUID v4
  userId: string;                // Firebase UID

  // Billing period (resets monthly)
  periodStart: DateTime;         // Start of current billing period
  periodEnd: DateTime;           // End of current billing period

  // AI operations quota (per US-10.5: Free 15/month, Premium 100/month)
  aiOperationsUsed: number;      // Count of AI operations this period
  aiOperationsLimit: number;     // Current limit based on plan

  // Storage quota (per US-10.5: Free 250MB, Premium 10GB)
  storageUsedBytes: number;      // Total bytes used across all media
  storageLimitBytes: number;     // Current limit based on plan (262144000 free, 10737418240 premium)

  // Timestamps
  lastUpdatedAt: DateTime;       // When usage was last calculated
}

// Quota limits by plan (for reference)
const QUOTA_LIMITS = {
  free: {
    people: 50,                  // Max people in constellation
    aiOperationsPerMonth: 15,
    storageBytes: 250 * 1024 * 1024,      // 250 MB
    activeShareLinks: 1,
    connections: 0               // No connections on free tier
  },
  premium: {
    people: Infinity,            // Unlimited
    aiOperationsPerMonth: 100,
    storageBytes: 10 * 1024 * 1024 * 1024, // 10 GB
    activeShareLinks: Infinity,  // Unlimited
    connections: Infinity        // Unlimited
  }
};
```

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q8.1.1: User ID format | **Firebase UID** | Using Firebase Auth per 07_technology_decisions.md A1 |
| Q8.1.2: Profile completeness | **Not tracked** | Not needed; UX encourages completion organically |
| Q8.1.3: Multiple constellations | **Single constellation per user** | Simpler model; can extend later if needed |
| Q8.1.4: Usage tracking | **Dedicated UsageTracking entity** | Per US-10.5; tracks AI ops and storage; resets monthly |
| Q8.1.5: Notification granularity | **Per-type settings** | Per 05_features.md 4.16; users can configure each notification type |

---

### OnboardingProgress

Tracks first-run wizard progress to enable resumption if interrupted (per Q4.14.5).

```typescript
interface OnboardingProgress {
  id: string;                    // UUID v4
  userId: string;                // Firebase UID

  // Wizard state
  status: OnboardingStatus;
  currentStep: OnboardingStep;

  // Completed steps with data
  completedSteps: OnboardingStep[];

  // Saved form data (to restore if user returns)
  savedData: {
    self?: {
      givenName?: string;
      birthDate?: FuzzyDate;
      photoUrl?: string;
    };
    parents?: Array<{
      givenName?: string;
      surname?: string;
      isLiving?: boolean;
      relationship: 'mother' | 'father';
    }>;
    grandparents?: Array<{
      givenName?: string;
      surname?: string;
      parentRelationship: 'mother' | 'father';  // Which parent this grandparent belongs to
      relationship: 'grandmother' | 'grandfather';
    }>;
  };

  // Tour state
  hasCompletedTour: boolean;     // US-1.2: Sample constellation tour
  tourSkipped: boolean;          // User skipped the tour

  // Timestamps
  startedAt: DateTime;
  lastUpdatedAt: DateTime;
  completedAt?: DateTime;
}

enum OnboardingStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped'
}

enum OnboardingStep {
  TOUR = 'tour',                 // US-1.2: Optional sample constellation tour
  ADD_SELF = 'add_self',         // US-1.3: Add yourself
  ADD_PARENTS = 'add_parents',   // US-1.4: Add parents
  ADD_GRANDPARENTS = 'add_grandparents',  // US-1.5: Add grandparents (optional)
  AHA_MOMENT = 'aha_moment'      // US-1.6: Constellation reveal
}
```

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q8.1.6: Onboarding persistence | **Server-side with OnboardingProgress entity** | Per Q4.14.5; survives browser close; enables cross-device resume |
| Q8.1.7: Onboarding data storage | **Embedded in savedData JSON** | Temporary data until wizard completes; converted to real entities on completion |

---

### Constellation

A user's family tree/network. Each user has one constellation.

```typescript
interface Constellation {
  id: string;                  // UUID v4
  ownerId: string;             // User who owns this (Firebase UID)
  title: string;               // Default: "{displayName}'s Family"
  description?: string;
  createdAt: DateTime;
  updatedAt: DateTime;

  // Configuration
  centeredPersonId?: string;   // The "center" of the constellation (typically the user)

  // Cached stats (updated on person changes)
  personCount: number;
  generationSpan: number;      // e.g., 5 generations

  // Relationships (via Prisma relations)
  people: Person[];
  events: Event[];
  media: Media[];
  sources: Source[];
}
```

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q8.2.1: Constellation sharing | **Read-only share links** | Per US-8.1; public content only; no ownership transfer |

---

### Person

An individual in the family constellation.

```typescript
interface Person {
  id: string;                  // UUID v4
  constellationId: string;

  // Identity (structured names supporting international systems)
  givenName: string;           // Required - first/given name
  surname?: string;            // Family name (paternal in Western systems)
  maidenName?: string;         // Birth surname (before marriage)
  patronymic?: string;         // Father's name (e.g., Icelandic: Jónsson, Russian: Ivanovich)
  matronymic?: string;         // Mother's name (less common but used in some cultures)
  nickname?: string;           // Informal name
  suffix?: string;             // Jr., Sr., III
  nameOrder: NameOrder;        // How to construct displayName (default: 'western')
  displayName: string;         // Computed based on nameOrder (see below)

  // Demographics
  gender?: Gender;

  // Dates (GEDCOM-style flexible)
  birthDate?: FuzzyDate;
  deathDate?: FuzzyDate;

  // Places
  birthPlace?: Place;
  deathPlace?: Place;

  // Content
  biography?: string;          // Rich text (Tiptap JSON) - AI-generated or user-written

  // Speculative flag (per 03_core_concepts.md)
  speculative: boolean;        // Default: false; true = AI-generated, unverified

  // Soft delete (per Q4.15.2: 30-day recovery period)
  deletedAt?: DateTime;        // When soft deleted; null = not deleted
  deletedBy?: string;          // User ID who deleted

  // Metadata
  createdAt: DateTime;
  updatedAt: DateTime;
  createdBy: string;           // User ID (Firebase UID)

  // Computed (not stored, calculated on read)
  generation?: number;         // Relative to constellation center (0 = center)
  biographyWeight?: number;    // 0-1, calculated: (notes×3 + events×2 + media×1) normalized
  isLiving?: boolean;          // Computed: deathDate is null

  // Relationships (via Prisma relations)
  events: Event[];
  notes: Note[];
  media: Media[];
  parentRelationships: ParentChildRelationship[];  // As child
  childRelationships: ParentChildRelationship[];   // As parent
  spouseRelationships: SpouseRelationship[];
}

enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  UNKNOWN = 'unknown'
}

enum NameOrder {
  WESTERN = 'western',         // "John Smith" - givenName + surname
  EASTERN = 'eastern',         // "Smith John" - surname + givenName (Chinese, Japanese, Korean)
  PATRONYMIC = 'patronymic',   // "John Jónsson" - givenName + patronymic (Icelandic)
  PATRONYMIC_SUFFIX = 'patronymic_suffix',  // "Ivan Ivanovich Petrov" - givenName + patronymic + surname (Russian)
  MATRONYMIC = 'matronymic'    // givenName + matronymic (rare but supported)
}

// Display name computation examples:
// WESTERN:           "John" + "Smith" → "John Smith"
// EASTERN:           "明" + "王" → "王明" (Wang Ming)
// PATRONYMIC:        "Jón" + "Jónsson" → "Jón Jónsson"
// PATRONYMIC_SUFFIX: "Ivan" + "Ivanovich" + "Petrov" → "Ivan Ivanovich Petrov"
```

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q8.3.1: Name structure | **Structured + computed displayName** | Supports genealogical needs (maiden names, suffixes); displayName for UI |
| Q8.3.2: International names | **Full support with nameOrder field** | Patronymic (Icelandic, Russian), Eastern (Chinese, Japanese), and Western systems all supported |
| Q8.3.3: Living person flag | **Computed from deathDate absence** | Per Q4.15.4; no explicit field needed |
| Q8.3.4: PersonStatus enum | **Removed - use speculative boolean** | Per 03_core_concepts.md; simplified to single boolean flag |
| Q8.3.5: Patronymic systems | **Dedicated patronymic/matronymic fields** | Separate from surname; supports Icelandic (Jónsson), Russian (Ivanovich), Arabic (bin/bint), etc. |

### International Name Systems

The data model supports multiple naming conventions used worldwide:

**Western Names** (default):
- `nameOrder: WESTERN`
- Display: `"{givenName} {surname}"` → "John Smith"
- Most common in Europe, Americas, Australia

**Eastern Names** (Chinese, Japanese, Korean, Vietnamese):
- `nameOrder: EASTERN`
- Display: `"{surname}{givenName}"` → "王明" (Wang Ming)
- Family name comes first

**Patronymic Names** (Icelandic):
- `nameOrder: PATRONYMIC`
- Display: `"{givenName} {patronymic}"` → "Jón Jónsson"
- No family surname; patronymic derived from father's given name + suffix
- Icelandic suffixes: -son (son), -dóttir (daughter)
- Note: Icelanders are addressed by given name, not patronymic

**Patronymic with Surname** (Russian, Bulgarian, Ukrainian):
- `nameOrder: PATRONYMIC_SUFFIX`
- Display: `"{givenName} {patronymic} {surname}"` → "Ivan Ivanovich Petrov"
- Three-part name: given name + patronymic + family surname
- Russian suffixes: -ovich/-evich (son), -ovna/-evna (daughter)

**Matronymic Names** (rare but supported):
- `nameOrder: MATRONYMIC`
- Display: `"{givenName} {matronymic}"` → derived from mother's name
- Used in some Icelandic families, historical cases

**Arabic/Hebrew Naming** (using patronymic field):
- Arabic: "bin" (son of) or "bint" (daughter of) stored in patronymic
- Hebrew: "ben" (son of) or "bat" (daughter of)
- Example: "Muhammad bin Abdullah" - patronymic = "bin Abdullah"

**Display Name Computation Logic**:
```typescript
function computeDisplayName(person: Person): string {
  switch (person.nameOrder) {
    case 'WESTERN':
      return [person.givenName, person.surname].filter(Boolean).join(' ');
    case 'EASTERN':
      return [person.surname, person.givenName].filter(Boolean).join('');
    case 'PATRONYMIC':
      return [person.givenName, person.patronymic].filter(Boolean).join(' ');
    case 'PATRONYMIC_SUFFIX':
      return [person.givenName, person.patronymic, person.surname].filter(Boolean).join(' ');
    case 'MATRONYMIC':
      return [person.givenName, person.matronymic].filter(Boolean).join(' ');
    default:
      return person.givenName;
  }
}
```

---

### FuzzyDate

Dates with varying precision (exact, approximate, ranges). Supports GEDCOM-style flexible dates per Q4.3.2.

```typescript
interface FuzzyDate {
  // Precision type
  type: DateType;

  // For exact or partial dates (type = 'exact' | 'partial')
  year?: number;
  month?: number;           // 1-12
  day?: number;             // 1-31

  // For approximate dates (type = 'approximate')
  isApproximate: boolean;   // "about 1920", "circa 1920"

  // For date ranges (type = 'range')
  rangeStart?: {
    year: number;
    month?: number;
    day?: number;
  };
  rangeEnd?: {
    year: number;
    month?: number;
    day?: number;
  };

  // For before/after (type = 'before' | 'after')
  // Uses year/month/day fields with type indicator

  // Display text (computed or user-provided)
  displayText: string;      // "circa 1920", "between 1918-1922", "before 1900"
}

enum DateType {
  EXACT = 'exact',          // 1920-05-15
  PARTIAL = 'partial',      // 1920-05, 1920
  APPROXIMATE = 'approximate', // ABT 1920
  RANGE = 'range',          // BET 1918 AND 1922
  BEFORE = 'before',        // BEF 1920
  AFTER = 'after'           // AFT 1920
}
```

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q8.4.1: Date storage format | **Structured JSON object** | Supports GEDCOM patterns; easy to query year ranges |
| Q8.4.2: Date validation | **Strict validation** | No impossible dates (Feb 30); validates month/day ranges |

---

### Place

Location with varying precision. Supports structured + geocoded per Q4.3.3.

```typescript
interface Place {
  // Free text (always stored - user's original input)
  displayText: string;       // "Boston, Massachusetts, USA"

  // Structured (from geocoding or manual entry)
  locality?: string;         // City/town
  adminArea?: string;        // State/province/region
  country?: string;          // Country name
  countryCode?: string;      // ISO 3166-1 alpha-2 (e.g., "US")

  // Geocoded coordinates (from Google Maps API)
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  googlePlaceId?: string;    // For future lookups

  // Historical context
  historicalName?: string;   // Original name if different: "Prussia" when modern is "Germany"
}
```

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q8.5.1: Geocoding approach | **On-demand via Google Maps API** | Per Q4.3.3; autocomplete on input; geocode on save |
| Q8.5.2: Historical place names | **Store both original and modern** | Preserves historical accuracy; displayText shows original |

---

### Relationship

Links between people (parent-child, spouse). Per Q4.15.3: core relationships only; siblings inferred.

**Adoption Model**: Following industry standards (FamilySearch, Ancestry, MyHeritage, Geni), a person can have multiple sets of parents. Each parent-child link includes a relationship type and a "preferred" flag for display purposes.

```typescript
interface ParentChildRelationship {
  id: string;                  // UUID v4
  parentId: string;            // Person ID
  childId: string;             // Person ID
  constellationId: string;     // For query scoping

  // Type (per Q4.15.3 + adoption support)
  relationshipType: ParentType;

  // Preferred flag for display (per adoption model)
  // When multiple parent sets exist, preferred=true determines which appears in main tree view
  // Only one mother and one father can be preferred at a time per child
  isPreferred: boolean;        // Default: true for first parent of each gender

  // Optional date range (for foster care, guardianship)
  startDate?: FuzzyDate;       // When relationship began
  endDate?: FuzzyDate;         // When relationship ended (for temporary relationships)

  // Metadata
  createdAt: DateTime;
  createdBy: string;           // User ID
}

enum ParentType {
  BIOLOGICAL = 'biological',   // Default - birth parents
  ADOPTIVE = 'adoptive',       // Legal adoption
  FOSTER = 'foster',           // Temporary foster care
  STEP = 'step',               // Marriage to biological parent
  GUARDIAN = 'guardian',       // Legal guardianship (non-adoption)
  UNKNOWN = 'unknown'          // Relationship type not known
}

interface SpouseRelationship {
  id: string;                  // UUID v4
  person1Id: string;           // Person ID (order doesn't matter)
  person2Id: string;           // Person ID
  constellationId: string;     // For query scoping

  // Dates (structured - useful for timeline)
  marriageDate?: FuzzyDate;
  marriagePlace?: Place;
  divorceDate?: FuzzyDate;

  // Freeform description (consistent with Events having freeform titles)
  description?: string;        // "Married", "Partners", "Common-law", "Affair", etc.

  // Order for display (when person has multiple concurrent spouses)
  displayOrder?: number;       // Lower = displayed first; null = automatic ordering

  // Metadata
  createdAt: DateTime;
  createdBy: string;           // User ID
}

// Status is computed, not stored:
// - Has divorceDate → "Divorced"
// - Spouse has deathDate → "Widowed"
// - Neither → "Current"
```

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q8.6.1: Relationship storage | **Junction tables (normalized)** | Clean PostgreSQL relations; Prisma handles joins elegantly |
| Q8.6.2: Sibling relationships | **Computed from shared parents** | Per Q4.15.3; no storage needed; query on demand |
| Q8.6.3: Polygamy support | **Full concurrent polygamy supported** | Multiple simultaneous spouses allowed; displayOrder for visualization |
| Q8.6.4: Adoption model | **Multiple parent sets with preferred flag** | Per industry standard (FamilySearch, Ancestry, MyHeritage, Geni); supports biological, adoptive, foster, step, guardian |
| Q8.6.5: Spouse relationship model | **Freeform description, no enums** | Consistent with freeform Events/Notes; status computed from dates; description field for context |

### Adoption Model (Detailed)

Following industry standards from FamilySearch, Ancestry, MyHeritage, and Geni:

**Multiple Parent Sets**: A person can have multiple sets of parents:
- **Biological parents**: Birth parents (0-2)
- **Adoptive parents**: Legal adoption (0-2)
- **Foster parents**: Temporary care (0-n)
- **Step parents**: Via marriage to biological parent (0-n)
- **Guardians**: Legal guardianship (0-n)

**Preferred Parents**: Each person has at most one "preferred" mother and one "preferred" father for display:
- Main tree view shows preferred parents only
- Detail view shows all parent sets with relationship types
- User can change which parents are preferred
- First parents added of each gender are preferred by default

**UX Flow**:
1. Add first parent → automatically marked as preferred
2. Add second parent of same gender → prompt: "Is this an additional parent?"
3. If yes → select relationship type (adoptive, foster, step, guardian)
4. Option to "Make preferred" to switch which parent shows in main view

**Half-siblings**: Children who share exactly one biological parent are automatically identified as half-siblings.

### Polygamy Model (Detailed)

Supporting concurrent spouse relationships for historical accuracy and modern family structures:

**Use Cases**:
- Historical polygamous marriages (common in many cultures)
- Children born outside of marriage
- Sequential marriages where divorce/death dates are unknown
- Unmarried partners with children

**Freeform Description**: Users can describe the relationship in their own words:
- "Married" - formal marriage
- "Partners" - unmarried partnership
- "Common-law" - common-law marriage
- "Affair" - extramarital relationship
- Or any other description that fits their situation

**Computed Status**: Relationship status is derived from dates, not stored:
- Has `divorceDate` → "Divorced"
- Either spouse has `deathDate` → "Widowed" (for survivor)
- Neither → "Current"

**Display Order**: When a person has multiple concurrent spouses:
- `displayOrder` field determines visual order in tree
- Lower numbers displayed first (closer to person)
- Null values sorted after explicit orders

**Children Outside Marriage**:
- Create `ParentChildRelationship` links from both biological parents to child
- Spouse relationship between parents is optional (can be omitted if other parent unknown)
- Child appears connected to both parents regardless of whether a spouse link exists

---

### Event

Life events associated with one or more people. **Freeform** per Q4.3.1 - no predefined types.

```typescript
interface Event {
  id: string;                  // UUID v4
  constellationId: string;

  // What (freeform - user defines their own event types)
  title: string;               // Required: "Marriage", "Graduation", "Family Reunion", etc.
  description?: string;        // Rich text (Tiptap JSON)
  icon?: string;               // Optional icon from preset library

  // When (GEDCOM-style flexible dates)
  date?: FuzzyDate;

  // Where
  location?: Place;

  // Who
  primaryPersonId: string;     // Main person this event belongs to
  participantIds: string[];    // Other people involved (for shared events)

  // Privacy
  privacy: PrivacyLevel;

  // Soft delete (per Q4.15.2: content deleted with person)
  deletedAt?: DateTime;

  // Metadata
  createdAt: DateTime;
  updatedAt: DateTime;
  createdBy: string;           // User ID - creator owns the event
  sourceId?: string;           // Link to source citation

  // Relationships (via Prisma)
  primaryPerson: Person;
  participants: Person[];
  source?: Source;
}
```

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q8.7.1: Event types | **Freeform (no enum)** | Per Q4.3.1; users enter title freely; optional icon from preset library |
| Q8.7.2: Event ownership | **Creator owns** | Creator can edit; participants have read access; per Q4.3.5 |
| Q8.7.3: Event validation | **Warning for events outside lifetime** | Non-blocking; allows historical uncertainty; strict only for birth/death consistency |

---

### Note

**Freeform** annotations about a person. No categories per 03_core_concepts.md.

```typescript
interface Note {
  id: string;                  // UUID v4
  personId: string;
  constellationId: string;

  // Content (freeform - no categories)
  title?: string;              // Optional title for organization
  content: string;             // Rich text: Tiptap JSON (ProseMirror format) per Q4.4.1
                               // Validation: max 50,000 characters (~10,000 words) per Q4.4.2

  // References to other people mentioned in this note
  referencedPersonIds: string[];

  // Privacy
  privacy: PrivacyLevel;

  // Versioning (per Q4.4.3: last 10 versions)
  version: number;
  previousVersions?: NoteVersion[];  // Stored separately, limited to 10

  // Soft delete (per Q4.15.2: content deleted with person)
  deletedAt?: DateTime;

  // Metadata
  createdAt: DateTime;
  updatedAt: DateTime;
  createdBy: string;           // User ID
  sourceId?: string;           // Link to source citation

  // Relationships (via Prisma)
  person: Person;
  referencedPeople: Person[];
  source?: Source;
}

interface NoteVersion {
  version: number;
  content: string;
  updatedAt: DateTime;
  updatedBy: string;
}

enum PrivacyLevel {
  PRIVATE = 'private',           // Only creator (default per Q4.16.6)
  CONNECTIONS = 'connections',   // Creator + connections
  PUBLIC = 'public'              // Anyone via match/share link
}
```

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q8.8.1: Note categories | **Removed (freeform)** | Per 03_core_concepts.md; notes are freeform annotations |
| Q8.8.2: Note content format | **Tiptap JSON (ProseMirror)** | Per Q4.4.1; rich text with formatting; AI-processable |
| Q8.8.3: Note size limit | **50,000 characters** | Per Q4.4.2; ~10,000 words; generous for long-form biography |
| Q8.8.4: Note versioning | **Last 10 versions** | Per Q4.4.3; covers most "undo" needs; storage-efficient |

---

### Media

Photos, documents, and audio associated with people.

```typescript
interface Media {
  id: string;                  // UUID v4
  constellationId: string;

  // File info
  type: MediaType;
  filename: string;            // Original filename
  mimeType: string;            // e.g., "image/jpeg", "audio/mpeg"
  fileSize: number;            // bytes

  // Storage (per Q4.5.1: GCS with hierarchical structure)
  storagePath: string;         // {bucket}/users/{userId}/media/{type}/{uuid}.{ext}
  storageUrl: string;          // Signed URL (regenerated on access)

  // Thumbnails (for images - per Q4.5.2)
  thumbnails?: {
    small: string;             // 200px
    medium: string;            // 800px
  };

  // Content
  title?: string;
  description?: string;

  // Date
  dateTaken?: FuzzyDate;

  // People
  personIds: string[];         // People in/associated with media

  // Audio specific (per Q4.5.3, Q4.6.x)
  duration?: number;           // seconds (max 7200 = 2 hours)
  transcription?: string;      // Full transcript text
  transcriptionJson?: string;  // Structured with timestamps and speakers
  transcriptionStatus?: TranscriptionStatus;
  speakerLabels?: Record<string, string>;  // "Speaker 1" -> "Grandma"

  // Extracted metadata
  exifData?: Record<string, any>;
  hash?: string;               // SHA-256 for duplicate detection (per Q4.5.6)

  // Privacy (per Q4.5.5: independent per item)
  privacy: PrivacyLevel;

  // Soft delete (per Q4.15.2: content deleted with person)
  deletedAt?: DateTime;

  // Metadata
  createdAt: DateTime;
  updatedAt: DateTime;
  createdBy: string;           // User ID

  // Relationships (via Prisma)
  people: Person[];
}

enum MediaType {
  PHOTO = 'photo',
  DOCUMENT = 'document',
  AUDIO = 'audio'
}

enum TranscriptionStatus {
  NONE = 'none',
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETE = 'complete',
  FAILED = 'failed'
}
```

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q8.9.1: Media storage structure | **Hierarchical: `users/{userId}/media/{type}/{uuid}.{ext}`** | Per Q4.5.1; organized; easy to manage per-user quotas |
| Q8.9.2: Image thumbnails | **200px (small), 800px (medium)** | Per Q4.5.2; covers list views and detail views |
| Q8.9.3: Image processing | **Max 2048px, WebP conversion** | Per Q4.5.2; balances quality and storage; WebP for efficiency |
| Q8.9.4: Audio formats | **MP3, M4A, WAV, WebM; transcode to Opus** | Per Q4.5.3; broad input support; Opus for storage |
| Q8.9.5: Duplicate detection | **SHA-256 hash on upload** | Per Q4.5.6; warn user; allow override |

---

### Source

Citations and references for information. Per Q4.3.4: optional source reference for verification.

```typescript
interface Source {
  id: string;                  // UUID v4
  constellationId: string;

  // Type
  sourceType: SourceType;

  // Content
  title: string;               // Required
  description?: string;
  author?: string;
  publicationDate?: FuzzyDate;

  // Reference
  url?: string;                // External URL
  citation?: string;           // Formatted citation text

  // Associated media (if uploaded)
  mediaId?: string;            // Link to uploaded document/photo

  // Metadata
  createdAt: DateTime;
  updatedAt: DateTime;
  createdBy: string;           // User ID

  // Relationships (via Prisma)
  media?: Media;
  events: Event[];             // Events citing this source
  notes: Note[];               // Notes citing this source
}

enum SourceType {
  DOCUMENT = 'document',       // Birth certificate, marriage license, etc.
  BOOK = 'book',
  WEBSITE = 'website',
  INTERVIEW = 'interview',
  PHOTOGRAPH = 'photograph',
  NEWSPAPER = 'newspaper',
  CENSUS = 'census',
  FAMILY_BIBLE = 'family_bible',
  ORAL_HISTORY = 'oral_history',
  OTHER = 'other'
}
```

---

### Match (Tree Matching)

Links between the same person in different constellations. Per Epic 7 (US-7.x).

```typescript
interface Match {
  id: string;                  // UUID v4

  // The matched people
  person1Id: string;
  constellation1Id: string;
  user1Id: string;             // Owner of constellation1
  person2Id: string;
  constellation2Id: string;
  user2Id: string;             // Owner of constellation2

  // Match details
  confidence: number;          // 0-100 (per Q4.9.2: threshold 60+)
  confidenceBreakdown?: {      // Show why this confidence score
    nameScore: number;
    dateScore: number;
    locationScore: number;
    parentScore: number;
  };
  matchedBy: MatchMethod;

  // Status (bilateral acceptance per US-7.3)
  status: MatchStatus;
  user1Status: 'pending' | 'accepted' | 'rejected';
  user2Status: 'pending' | 'accepted' | 'rejected';

  // Timestamps
  suggestedAt: DateTime;
  user1RespondedAt?: DateTime;
  user2RespondedAt?: DateTime;
  brokenAt?: DateTime;
  brokenBy?: string;           // User ID who broke the match

  // Cool-down (per Q4.9.5: 30-day before re-matching)
  cooldownUntil?: DateTime;
}

enum MatchMethod {
  AUTOMATIC = 'automatic',     // System suggested based on algorithm
  MANUAL = 'manual',           // User created manually
  PROPAGATED = 'propagated'    // Inferred from existing match (family relationship)
}

enum MatchStatus {
  SUGGESTED = 'suggested',     // Awaiting both users' response
  PENDING = 'pending',         // One user accepted, waiting for other
  ACCEPTED = 'accepted',       // Both parties accepted
  REJECTED = 'rejected',       // One or both rejected
  BROKEN = 'broken'            // Previously accepted, now unlinked
}
```

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q8.10.1: Match acceptance | **Bilateral (both must accept)** | Per US-7.3; builds trust; both users confirm identity |
| Q8.10.2: Match propagation | **Auto-suggest related matches** | Per US-7.3; system infers from family relationships; still requires acceptance |
| Q8.10.3: Unmatching | **Unilateral with 30-day cooldown** | Per Q4.9.5; either can break; prevents harassment via re-matching |

---

### Connection (Social)

Social connections between users. Per Epic 7 (US-7.1) and Q4.10.x.

```typescript
interface Connection {
  id: string;                  // UUID v4

  // Users
  user1Id: string;             // Firebase UID
  user2Id: string;             // Firebase UID

  // Status
  status: ConnectionStatus;

  // Permission level (per Q4.10.2)
  permissionLevel: ConnectionPermission;

  // Metadata
  requestedAt: DateTime;
  requestedBy: string;         // Who initiated
  acceptedAt?: DateTime;
  blockedAt?: DateTime;
}

enum ConnectionStatus {
  PENDING = 'pending',         // Request sent, awaiting response
  ACCEPTED = 'accepted',       // Both parties connected
  REJECTED = 'rejected',       // Request declined
  BLOCKED = 'blocked'          // One user blocked the other
}

enum ConnectionPermission {
  FAMILY = 'family',           // See private-to-connections content
  RESEARCHER = 'researcher'    // See public content only
}
```

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q8.11.1: Connection permission levels | **Two tiers: Family and Researcher** | Per Q4.10.2; simpler than granular permissions |
| Q8.11.2: Blocking | **Block user entirely** | Per Q4.10.3; blocked user cannot see any data or send requests |

---

### ShareLink

Shareable links for read-only constellation viewing. Per US-8.1 and Q4.11.x.

```typescript
interface ShareLink {
  id: string;                  // UUID v4
  constellationId: string;
  createdBy: string;           // User ID (Firebase UID)

  // Link token (URL-safe random string)
  token: string;               // Used in share URL: /share/{token}

  // Configuration
  title?: string;              // Optional custom title for the share
  expiresAt?: DateTime;        // When link expires; null = never
  isActive: boolean;           // Can be deactivated without deleting

  // Access tracking
  viewCount: number;           // Number of times viewed
  lastViewedAt?: DateTime;

  // Metadata
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q8.12.1: Share link limits | **Free: 1 active, Premium: unlimited** | Per Q4.11.2 and pricing table |
| Q8.12.2: Link expiration | **Optional, user-configurable** | Per US-8.1; can set or leave permanent |
| Q8.12.3: Link revocation | **Instant via isActive flag** | Per US-8.1; can revoke without deleting (preserves history) |

---

## Indexes and Queries

### Common Query Patterns

| Query | Approach | Index |
|-------|----------|-------|
| Get all people in a constellation | Simple WHERE | `idx_person_constellation` |
| Get ancestors of person X (tree view) | Recursive CTE + is_preferred | `idx_parent_child_preferred` |
| Get ALL ancestors (detail view) | Recursive CTE (no preferred filter) | Parent-child FK indexes |
| Get descendants of person X | Recursive CTE | Parent-child FK indexes |
| Get all parent sets for person X | Filter by child_id, group by type | `idx_parent_child_child` |
| Get all spouses for person X | Union person1Id and person2Id queries | `idx_spouse_person1`, `idx_spouse_person2` |
| Get all events for person X | JOIN via primaryPersonId | `idx_event_person` |
| Search people by name (fuzzy) | pg_trgm similarity | `idx_person_name_trgm` |
| Search notes/biography | Full-text search | `idx_note_content_fts` |
| Find potential matches | Scoring algorithm | Composite indexes |
| Get share link by token | Unique lookup | `idx_share_link_token` |
| Get active share links | Filter by constellation + isActive | `idx_share_link_constellation` |
| Get deleted items (Trash) | Filter by deletedAt IS NOT NULL | Soft delete indexes |
| Get active people | Filter by deletedAt IS NULL | `idx_person_active` |

### PostgreSQL Indexes

```sql
-- Person lookups
CREATE INDEX idx_person_constellation ON person(constellation_id);
CREATE INDEX idx_person_name_trgm ON person USING gin (
  (given_name || ' ' || COALESCE(surname, '') || ' ' || COALESCE(patronymic, '')) gin_trgm_ops
);

-- Full-text search on notes
CREATE INDEX idx_note_content_fts ON note USING gin (to_tsvector('english', content));

-- Relationships
CREATE INDEX idx_parent_child_parent ON parent_child_relationship(parent_id);
CREATE INDEX idx_parent_child_child ON parent_child_relationship(child_id);
CREATE INDEX idx_parent_child_preferred ON parent_child_relationship(child_id, is_preferred)
  WHERE is_preferred = true;  -- Fast lookup for preferred parents
CREATE INDEX idx_spouse_person1 ON spouse_relationship(person1_id);
CREATE INDEX idx_spouse_person2 ON spouse_relationship(person2_id);

-- Events
CREATE INDEX idx_event_person ON event(primary_person_id);
CREATE INDEX idx_event_constellation ON event(constellation_id);

-- Matches
CREATE INDEX idx_match_users ON match(user1_id, user2_id);
CREATE INDEX idx_match_status ON match(status) WHERE status = 'suggested';

-- Share links
CREATE UNIQUE INDEX idx_share_link_token ON share_link(token);
CREATE INDEX idx_share_link_constellation ON share_link(constellation_id) WHERE is_active = true;

-- Soft delete (filter out deleted records by default)
CREATE INDEX idx_person_active ON person(constellation_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_event_active ON event(constellation_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_note_active ON note(person_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_media_active ON media(constellation_id) WHERE deleted_at IS NULL;
```

### Recursive Ancestry Query Example

```sql
-- Get all ancestors of a person (preferred parents only for main tree)
WITH RECURSIVE ancestors AS (
  -- Base case: the person's preferred parents
  SELECT parent_id as person_id, 1 as generation
  FROM parent_child_relationship
  WHERE child_id = $1
    AND is_preferred = true  -- Only preferred parents in main tree

  UNION ALL

  -- Recursive case: preferred parents of ancestors
  SELECT pcr.parent_id, a.generation + 1
  FROM parent_child_relationship pcr
  JOIN ancestors a ON a.person_id = pcr.child_id
  WHERE a.generation < 10  -- Limit depth
    AND pcr.is_preferred = true
)
SELECT p.*, a.generation
FROM ancestors a
JOIN person p ON p.id = a.person_id;

-- Get ALL ancestors including non-preferred (for detail view)
WITH RECURSIVE all_ancestors AS (
  SELECT parent_id as person_id, 1 as generation, relationship_type, is_preferred
  FROM parent_child_relationship
  WHERE child_id = $1

  UNION ALL

  SELECT pcr.parent_id, a.generation + 1, pcr.relationship_type, pcr.is_preferred
  FROM parent_child_relationship pcr
  JOIN all_ancestors a ON a.person_id = pcr.child_id
  WHERE a.generation < 10
)
SELECT p.*, a.generation, a.relationship_type, a.is_preferred
FROM all_ancestors a
JOIN person p ON p.id = a.person_id;
```

### Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| Q8.13.1: Ancestry query approach | **PostgreSQL recursive CTE** | Per 07_technology_decisions.md B4; elegant and efficient |
| Q8.13.2: Search indexes | **pg_trgm for names, full-text for content** | Per 07_technology_decisions.md B5; fuzzy name matching + content search |

---

## Data Validation Rules

Validation runs both client-side (immediate feedback) and server-side (security) using shared Zod schemas per Q6.2.4.

### Person Validation
| Rule | Behavior | Rationale |
|------|----------|-----------|
| Name required | **Error** | At least givenName or surname required |
| Birth before death | **Error** | Impossible otherwise |
| Birth before current date | **Warning** | Allow future dates for expected births |
| Reasonable lifespan (< 120 years) | **Warning** | Flag but allow historical exceptions |

### Relationship Validation
| Rule | Behavior | Rationale |
|------|----------|-----------|
| Parent 14-60 years older than child | **Warning** | Flag unusual but allow edge cases |
| No circular relationships | **Error** | Person cannot be own ancestor |
| No self-relationships | **Error** | Person cannot be own parent/spouse |
| Max 2 preferred parents per child | **Error** | Only one preferred mother + one preferred father |
| Multiple biological parents warning | **Warning** | Flag if >2 biological parents (possible data entry error) |

### Event Validation
| Rule | Behavior | Rationale |
|------|----------|-----------|
| Event within person's lifetime | **Warning** | Flag but allow (dates may be uncertain) |
| No duplicate birth/death events | **Error** | One of each per person |

### Note Validation
| Rule | Behavior | Rationale |
|------|----------|-----------|
| Content max 50,000 characters | **Error** | Per Q4.4.2; prevents abuse while allowing detailed entries |
| Title max 200 characters | **Error** | Reasonable limit for organization |

### Media Validation
| Rule | Behavior | Rationale |
|------|----------|-----------|
| Image max 25MB | **Error** | Per Q4.5.2; prevents excessive storage |
| Audio max 2 hours | **Error** | Per Q4.6.2; reasonable for oral history recordings |
| Duplicate hash warning | **Warning** | Per Q4.5.6; warn but allow override |

### Quota Validation (per US-10.5)
| Rule | Behavior | Rationale |
|------|----------|-----------|
| People count exceeds limit | **Error** | Free: 50 max; Premium: unlimited |
| AI operations exceeds limit | **Error** | Free: 15/month; Premium: 100/month |
| Storage exceeds limit | **Error** | Free: 250MB; Premium: 10GB |
| Share links exceeds limit | **Error** | Free: 1 active; Premium: unlimited |
| Connections on free tier | **Error** | Free tier has no connections |

---

## Migration Considerations

### From ancestral-synth (Python → TypeScript)

| ancestral-synth | Ancestral Vision | Notes |
|-----------------|------------------|-------|
| `Person.status` | `Person.speculative` | Simplified to boolean |
| `Person.given_name` | `Person.givenName` | camelCase |
| *(none)* | `Person.patronymic` | New field for international names |
| *(none)* | `Person.nameOrder` | New field for name display order |
| `Event.event_type` | `Event.title` | Freeform, no enum |
| `Note.category` | *(removed)* | Freeform notes |
| `child_links` | `ParentChildRelationship` | Junction table with `isPreferred` flag |
| `spouse_links` | `SpouseRelationship` | Junction table with freeform `description` |

### Export Formats

| Format | Content | Use Case |
|--------|---------|----------|
| GEDCOM 5.5.1 | People, relationships, events, notes | Industry standard; import to other tools |
| JSON | Full constellation data | Backup; API consumption |
| CSV | People list with basic fields | Spreadsheet analysis |

---

## Prisma Schema Preview

```prisma
// schema.prisma (simplified)

model User {
  id                    String        @id // Firebase UID
  email                 String        @unique
  displayName           String
  deletionRequestedAt   DateTime?     // Account deletion grace period
  deletionScheduledFor  DateTime?
  preferences           Json          // UserPreferences
  subscription          Json          // SubscriptionInfo
  constellation         Constellation?
  connections           Connection[]
  usage                 UsageTracking?
  onboarding            OnboardingProgress?
}

model UsageTracking {
  id                  String    @id @default(uuid())
  user                User      @relation(fields: [userId], references: [id])
  userId              String    @unique
  periodStart         DateTime
  periodEnd           DateTime
  aiOperationsUsed    Int       @default(0)
  aiOperationsLimit   Int
  storageUsedBytes    BigInt    @default(0)
  storageLimitBytes   BigInt
  lastUpdatedAt       DateTime  @updatedAt
}

model OnboardingProgress {
  id                String            @id @default(uuid())
  user              User              @relation(fields: [userId], references: [id])
  userId            String            @unique
  status            OnboardingStatus  @default(NOT_STARTED)
  currentStep       OnboardingStep    @default(TOUR)
  completedSteps    OnboardingStep[]
  savedData         Json?             // Temporary wizard data
  hasCompletedTour  Boolean           @default(false)
  tourSkipped       Boolean           @default(false)
  startedAt         DateTime          @default(now())
  lastUpdatedAt     DateTime          @updatedAt
  completedAt       DateTime?
}

model Constellation {
  id         String      @id @default(uuid())
  owner      User        @relation(fields: [ownerId], references: [id])
  ownerId    String      @unique
  people     Person[]
  events     Event[]
  shareLinks ShareLink[]
  // ... other fields
}

model Person {
  id              String    @id @default(uuid())
  constellation   Constellation @relation(fields: [constellationId], references: [id])
  constellationId String

  // Names (international support)
  givenName       String
  surname         String?
  maidenName      String?
  patronymic      String?        // Icelandic, Russian, Arabic, etc.
  matronymic      String?
  nickname        String?
  suffix          String?
  nameOrder       NameOrder      @default(WESTERN)

  speculative     Boolean        @default(false)

  // Soft delete (30-day recovery)
  deletedAt       DateTime?
  deletedBy       String?

  // Relationships
  parentRelationships  ParentChildRelationship[] @relation("ChildParents")
  childRelationships   ParentChildRelationship[] @relation("ParentChildren")
  spouseRelationships1 SpouseRelationship[]      @relation("Spouse1")
  spouseRelationships2 SpouseRelationship[]      @relation("Spouse2")

  @@index([constellationId])
}

model ParentChildRelationship {
  id               String     @id @default(uuid())
  parent           Person     @relation("ParentChildren", fields: [parentId], references: [id])
  parentId         String
  child            Person     @relation("ChildParents", fields: [childId], references: [id])
  childId          String
  constellationId  String
  relationshipType ParentType @default(BIOLOGICAL)
  isPreferred      Boolean    @default(true)

  @@unique([parentId, childId])  // No duplicate parent-child links
  @@index([childId])
}

model SpouseRelationship {
  id              String  @id @default(uuid())
  person1         Person  @relation("Spouse1", fields: [person1Id], references: [id])
  person1Id       String
  person2         Person  @relation("Spouse2", fields: [person2Id], references: [id])
  person2Id       String
  constellationId String
  marriageDate    Json?   // FuzzyDate
  marriagePlace   Json?   // Place
  divorceDate     Json?   // FuzzyDate
  description     String? // Freeform: "Married", "Partners", etc.
  displayOrder    Int?

  @@unique([person1Id, person2Id])  // No duplicate spouse links
}

model ShareLink {
  id              String    @id @default(uuid())
  constellation   Constellation @relation(fields: [constellationId], references: [id])
  constellationId String
  createdBy       String    // Firebase UID
  token           String    @unique
  title           String?
  expiresAt       DateTime?
  isActive        Boolean   @default(true)
  viewCount       Int       @default(0)
  lastViewedAt    DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

enum NameOrder {
  WESTERN
  EASTERN
  PATRONYMIC
  PATRONYMIC_SUFFIX
  MATRONYMIC
}

enum ParentType {
  BIOLOGICAL
  ADOPTIVE
  FOSTER
  STEP
  GUARDIAN
  UNKNOWN
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
```

---

## Decision Summary

All data model decisions are documented inline with each entity. Key decisions:

- **User IDs**: Firebase UID (from Firebase Auth)
- **All other IDs**: UUID v4
- **Dates**: Structured FuzzyDate supporting GEDCOM patterns
- **Places**: Structured with Google Maps geocoding
- **Events**: Freeform (no predefined types)
- **Notes**: Freeform (no categories); max 50,000 characters
- **Relationships**: Normalized junction tables
- **Polygamy**: Fully supported - concurrent spouse relationships allowed
- **Spouse relationships**: Freeform description (no enums); status computed from dates
- **Adoption**: Multiple parent sets per person with preferred flag (per industry standard)
- **International names**: Patronymic/matronymic fields with nameOrder for display
- **Queries**: PostgreSQL recursive CTEs for ancestry
- **Search**: pg_trgm for fuzzy names, full-text for content
- **Validation**: Shared Zod schemas (isomorphic)
- **Soft delete**: 30-day recovery for Person and associated content
- **Account deletion**: 14-day grace period with cancellation option
- **Share links**: Token-based with optional expiration
- **Usage tracking**: Dedicated UsageTracking entity for AI ops and storage quotas (per US-10.5)
- **Onboarding**: Server-side OnboardingProgress entity for wizard state persistence (per Q4.14.5)
- **Notifications**: Per-type notification settings (connection requests, matches, content updates, billing)

---

*Status: Complete - All decisions resolved 2026-01-11*
