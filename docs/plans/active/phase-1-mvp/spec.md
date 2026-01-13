# Feature: Phase 1 MVP (Closed Beta)

**Status**: Draft
**Created**: 2026-01-13
**User Stories**: US-1.3-1.6, US-2.1-2.5, US-3.1, US-3.4-3.6, US-3.8, US-4.1-4.4, US-6.1, US-9.1-9.2, US-10.1-10.5

---

## Goal

Deliver a complete single-player MVP experience for closed beta launch where users can create a meaningful family constellation with stories, photos, and events.

---

## Background

Phase 0 (Foundation) is complete with:
- 246 passing tests across 28 test files
- Complete tech stack (Next.js 15+, React 19, Three.js r171+, Prisma, GraphQL Yoga)
- Firebase Auth integration
- WebGPU/WebGL 3D rendering foundation
- CI/CD pipeline

Phase 1 builds on this foundation to deliver the core user experience needed for closed beta.

---

## Acceptance Criteria

### Person Management
- [ ] AC1: User can add a person with required name and optional details
- [ ] AC2: User can add person contextually ("Add parent", "Add child", "Add spouse")
- [ ] AC3: User can edit person details with auto-save (2s debounce)
- [ ] AC4: User can soft delete a person with confirmation dialog
- [ ] AC5: User can define parent-child relationships (biological/adoptive)
- [ ] AC6: User can define spouse/partner relationships with dates
- [ ] AC7: International name support (patronymic, Eastern names, maiden names)

### 3D Constellation
- [ ] AC8: User can click/tap a star to select a person
- [ ] AC9: Camera animates smoothly to selected person
- [ ] AC10: Connected people (parents, children, spouse) are highlighted on selection
- [ ] AC11: Non-connected people dim slightly on selection
- [ ] AC12: Star brightness reflects biography weight (notes + events + media)
- [ ] AC13: Generation-based mandala layout with user at center

### Content Management
- [ ] AC14: User can create/edit/delete rich text notes with Tiptap editor
- [ ] AC15: Notes have 50,000 character limit
- [ ] AC16: Notes support version history (last 10 versions)
- [ ] AC17: User can create freeform events with flexible dates
- [ ] AC18: Events support approximate dates (circa, ranges, before/after)
- [ ] AC19: User can create shared events involving multiple people
- [ ] AC20: User can upload photos with automatic thumbnails
- [ ] AC21: User can upload documents (PDF)
- [ ] AC22: User can set privacy levels (Private, Connections, Public) per item

### Person Profile Panel
- [ ] AC23: Slide-in panel opens when person is selected
- [ ] AC24: Tabbed interface: Events, Notes, Photos
- [ ] AC25: Immediate family members displayed with quick navigation
- [ ] AC26: Inline editing with auto-save

### Search
- [ ] AC27: Global search bar with fuzzy name matching
- [ ] AC28: Search results show matching people with navigation
- [ ] AC29: Fuzzy matching handles typos (pg_trgm)

### Onboarding
- [ ] AC30: First-run wizard: Add yourself step
- [ ] AC31: First-run wizard: Add parents step (can skip)
- [ ] AC32: First-run wizard: Add grandparents step (optional)
- [ ] AC33: Stars appear in real-time as people are added
- [ ] AC34: "Aha moment" camera reveal when wizard completes
- [ ] AC35: Progress saved between steps (resume on return)

### Account & Settings
- [ ] AC36: Account settings page with profile management
- [ ] AC37: Change email and password
- [ ] AC38: Default privacy setting preference
- [ ] AC39: Theme preference (dark/light/system)

### Subscription & Billing
- [ ] AC40: Pricing page with Free vs Premium comparison
- [ ] AC41: LemonSqueezy Checkout integration
- [ ] AC42: Customer Portal link for subscription management
- [ ] AC43: Webhook handlers for subscription events
- [ ] AC44: Usage tracking (people count, storage used)
- [ ] AC45: Quota warnings at 80% threshold

### Data Export
- [ ] AC46: GEDCOM export of constellation
- [ ] AC47: JSON export of constellation

---

## Technical Requirements

### Database Changes

**New Columns/Indexes**:
- `Person.biography` - Generated biography text
- `Person.biographyGeneratedAt` - When biography was last generated
- `Note.versions` - JSON array of previous versions
- Add pg_trgm extension for fuzzy search
- Add GIN indexes for full-text search

**Usage Tracking**:
- Add storage usage calculation
- Add people count tracking per constellation

### API Changes

**New Queries**:
- `searchPeople(query: String!)` - Fuzzy name search
- `personProfile(id: ID!)` - Full person with relations
- `subscriptionStatus` - Current subscription state
- `usageStats` - People count, storage used

**New Mutations**:
- `createRelationship(input: CreateRelationshipInput!)`
- `updateRelationship(id: ID!, input: UpdateRelationshipInput!)`
- `deleteRelationship(id: ID!)`
- `createNote(personId: ID!, input: CreateNoteInput!)`
- `updateNote(id: ID!, input: UpdateNoteInput!)`
- `deleteNote(id: ID!)`
- `createEvent(input: CreateEventInput!)`
- `updateEvent(id: ID!, input: UpdateEventInput!)`
- `deleteEvent(id: ID!)`
- `uploadMedia(personId: ID!, file: Upload!)`
- `deleteMedia(id: ID!)`
- `updateOnboardingProgress(step: OnboardingStep!)`
- `completeOnboarding`
- `updateSettings(input: UpdateSettingsInput!)`
- `exportGedcom` - Returns download URL
- `exportJson` - Returns download URL

### UI Changes

**New Pages**:
- `/app/constellation` - Main constellation view (exists, needs enhancement)
- `/app/onboarding` - First-run wizard
- `/app/settings` - Account settings
- `/app/pricing` - Subscription plans

**New Components**:
- `PersonProfilePanel` - Slide-in detail panel
- `PersonForm` - Add/edit person form
- `RelationshipManager` - Parent/child/spouse management
- `NoteEditor` - Tiptap rich text editor
- `EventForm` - Event creation/editing
- `MediaUploader` - Photo/document upload
- `SearchBar` - Global fuzzy search
- `OnboardingWizard` - Multi-step wizard
- `PricingTable` - Plan comparison
- `UsageIndicator` - Quota display

---

## Dependencies

- Phase 0 Foundation complete (✅)
- LemonSqueezy account and API keys
- Cloud Storage bucket for media uploads
- pg_trgm PostgreSQL extension

---

## Out of Scope

- AI features (Phase 2)
- Social/matching features (Phase 3)
- 2D tree view (Phase 4)
- Frame mode (Phase 4)
- Audio recording/transcription (Phase 2)
- GEDCOM import (Phase 4)

---

## Security Considerations

- All mutations require authentication (INV-S001)
- Users can only access their own constellation (INV-S002)
- Media uploads validated for file type and size
- Signed URLs for private media (1hr expiry)
- LemonSqueezy webhooks verified with signature
- Rate limiting on search (10 req/min)

---

## Success Metrics

From roadmap:
- Onboarding completion rate >70%
- Users create average 10+ people in first session
- <3s initial load time for 100-person constellation
- <5% error rate on media uploads

---

## Open Questions

All questions resolved in grand_plan documents.

---

*Created: 2026-01-13*
