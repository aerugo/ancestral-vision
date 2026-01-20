# Phase 1.4-1.12 Summary Plans

These are summary plans for phases 1.4-1.12. Detailed TDD plans should be created when each phase begins.

---

## Phase 1.4: Notes System

**Objective**: Implement rich text notes with Tiptap, version history, and privacy levels.

### Key Deliverables
- Prisma Note model with `content` (JSON), `versions` (JSON array), `privacy` enum
- GraphQL Note CRUD operations
- NoteEditor component using Tiptap
- Version history display (last 10)
- Privacy level selector

### TDD Test Outline (~25 tests)
1. Note creation with valid content
2. Note update captures previous version
3. Version limit enforced (max 10)
4. Character limit enforced (50,000)
5. Privacy levels (PRIVATE, CONNECTIONS, PUBLIC)
6. Tiptap editor renders and captures input
7. Note belongs to person in user's constellation
8. Note deletion (soft delete)

### Files to Create
- `prisma/schema.prisma` (update Note model)
- `src/graphql/resolvers/note.ts`
- `src/graphql/resolvers/note.test.ts`
- `src/components/note-editor.tsx`
- `src/components/note-editor.test.tsx`
- `src/hooks/use-notes.ts`
- `src/hooks/use-notes.test.tsx`

---

## Phase 1.5: Events System

**Objective**: Implement freeform events with GEDCOM-style flexible dates and shared events.

### Key Deliverables
- Prisma Event model with flexible date JSON
- date-utils.ts for parsing/formatting dates
- GraphQL Event CRUD operations
- EventForm component
- Shared events (EventParticipant join table)

### TDD Test Outline (~25 tests)
1. Exact date parsing (1990-05-15)
2. Approximate date (circa 1920)
3. Date range (between 1920 and 1925)
4. Before/after dates
5. Event creation with participants
6. Shared event links multiple people
7. Event timeline display
8. Location geocoding structure

### Files to Create
- `src/lib/date-utils.ts`
- `src/lib/date-utils.test.ts`
- `src/graphql/resolvers/event.ts`
- `src/graphql/resolvers/event.test.ts`
- `src/components/event-form.tsx`
- `src/components/event-form.test.tsx`
- `src/hooks/use-events.ts`
- `src/hooks/use-events.test.tsx`

---

## Phase 1.6: Media System

**Objective**: Implement photo and document upload with Cloud Storage integration.

### Key Deliverables
- Prisma Media model with storage metadata
- Cloud Storage upload utilities
- Thumbnail generation (200px, 800px)
- Signed URL generation (1hr expiry)
- MediaUploader component
- Media gallery in profile panel

### TDD Test Outline (~20 tests)
1. File upload to Cloud Storage
2. Thumbnail generation
3. Signed URL generation
4. File type validation (JPEG, PNG, WebP, HEIC, PDF)
5. Size limit enforcement (25MB)
6. Media association with person
7. Privacy levels per media
8. Duplicate detection (SHA-256)

### Files to Create
- `src/lib/storage.ts`
- `src/lib/storage.test.ts`
- `src/graphql/resolvers/media.ts`
- `src/graphql/resolvers/media.test.ts`
- `src/components/media-uploader.tsx`
- `src/components/media-uploader.test.tsx`
- `src/hooks/use-media.ts`
- `src/hooks/use-media.test.tsx`

---

## Phase 1.7: Search

**Objective**: Implement fuzzy name search with pg_trgm PostgreSQL extension.

### Key Deliverables
- pg_trgm extension migration
- GIN indexes on name fields
- searchPeople GraphQL query
- SearchBar component with results dropdown
- Navigation to person on result click

### TDD Test Outline (~15 tests)
1. Exact name match
2. Fuzzy match with typos
3. Partial name match
4. Search result ranking
5. Rate limiting (10 req/min)
6. Empty query handling
7. Results navigation
8. Keyboard navigation in results

### Files to Create
- `prisma/migrations/add_pg_trgm.sql`
- `src/graphql/resolvers/search.ts`
- `src/graphql/resolvers/search.test.ts`
- `src/components/search-bar.tsx`
- `src/components/search-bar.test.tsx`
- `src/hooks/use-search.ts`
- `src/hooks/use-search.test.tsx`

---

## Phase 1.8: Onboarding

**Objective**: Implement first-run wizard with step persistence and "aha moment" reveal.

### Key Deliverables
- OnboardingProgress Prisma model
- OnboardingWizard multi-step component
- Step 1: Add yourself
- Step 2: Add parents (can skip)
- Step 3: Add grandparents (optional)
- Real-time star appearance
- "Aha moment" camera pullback reveal

### TDD Test Outline (~25 tests)
1. Wizard step navigation
2. Progress persistence across sessions
3. Required field validation per step
4. Skip functionality
5. Real-time constellation updates
6. Camera reveal animation
7. Completion detection
8. Returning user bypass

### Files to Create
- `src/components/onboarding-wizard.tsx`
- `src/components/onboarding-wizard.test.tsx`
- `src/components/onboarding-step.tsx`
- `src/hooks/use-onboarding.ts`
- `src/hooks/use-onboarding.test.tsx`
- `src/app/onboarding/page.tsx`
- `src/app/onboarding/page.test.tsx`

---

## Phase 1.9: Settings

**Objective**: Implement account settings page with profile and preference management.

### Key Deliverables
- Settings page layout
- Email change form (Firebase Auth)
- Password change form
- Default privacy preference
- Theme preference (dark/light/system)

### TDD Test Outline (~15 tests)
1. Email change validation
2. Password change validation
3. Privacy preference persistence
4. Theme preference persistence
5. Form error handling
6. Success notifications
7. Firebase Auth integration

### Files to Create
- `src/app/settings/page.tsx`
- `src/app/settings/page.test.tsx`
- `src/components/settings-form.tsx`
- `src/components/settings-form.test.tsx`

---

## Phase 1.10: Subscription

**Objective**: Implement LemonSqueezy subscription billing with usage tracking.

### Key Deliverables
- lemonsqueezy.ts integration utilities
- Webhook handlers for subscription events
- Pricing page with plan comparison
- Usage tracking (people count, storage)
- Quota warnings at 80% threshold
- Customer Portal link

### TDD Test Outline (~20 tests)
1. Webhook signature verification
2. Subscription created event handling
3. Subscription updated event handling
4. Subscription cancelled event handling
5. Usage calculation
6. Quota limit enforcement
7. Warning threshold detection
8. Checkout URL generation

### Files to Create
- `src/lib/lemonsqueezy.ts`
- `src/lib/lemonsqueezy.test.ts`
- `src/app/api/webhooks/lemonsqueezy/route.ts`
- `src/app/api/webhooks/lemonsqueezy/route.test.ts`
- `src/app/pricing/page.tsx`
- `src/app/pricing/page.test.tsx`
- `src/components/pricing-table.tsx`
- `src/components/pricing-table.test.tsx`
- `src/hooks/use-subscription.ts`
- `src/hooks/use-subscription.test.tsx`

---

## Phase 1.11: Export

**Objective**: Implement GEDCOM and JSON export of constellation data.

### Key Deliverables
- export.ts utilities
- GEDCOM 5.5.1 format generation
- JSON export with full constellation data
- Download endpoint with signed URLs
- Export options (include/exclude speculative)

### TDD Test Outline (~15 tests)
1. GEDCOM header generation
2. GEDCOM individual records
3. GEDCOM family records
4. GEDCOM date formatting
5. JSON structure completeness
6. Large constellation handling
7. Download URL generation
8. Speculative exclusion option

### Files to Create
- `src/lib/export.ts`
- `src/lib/export.test.ts`
- `src/lib/gedcom.ts`
- `src/lib/gedcom.test.ts`
- `src/graphql/resolvers/export.ts`
- `src/graphql/resolvers/export.test.ts`

---

## Phase 1.12: Polish

**Objective**: Visual enhancements for star brightness, animations, and overall UX polish.

### Key Deliverables
- Biography weight calculation
- Star brightness mapping (weight → luminosity)
- Selection animation improvements
- Loading states throughout app
- Error handling improvements
- Performance optimization

### TDD Test Outline (~15 tests)
1. Weight calculation (notes=3, events=2, media=1)
2. Brightness normalization (0-1 scale)
3. Connected people dimming
4. Loading state display
5. Error boundary behavior
6. Animation smoothness verification

### Files to Create/Modify
- `src/lib/biography-weight.ts`
- `src/lib/biography-weight.test.ts`
- `src/visualization/constellation.ts` (update)
- `src/components/loading-skeleton.tsx`
- `src/components/error-boundary.tsx`

---

## Implementation Order Rationale

1. **1.4 Notes** - Depends on profile panel (1.3)
2. **1.5 Events** - Depends on profile panel, similar pattern to notes
3. **1.6 Media** - Requires Cloud Storage setup, depends on profile panel
4. **1.7 Search** - Needs people data to search
5. **1.8 Onboarding** - Builds on all person/content features
6. **1.9 Settings** - Independent, can be done in parallel
7. **1.10 Subscription** - Independent billing system
8. **1.11 Export** - Needs all data types populated
9. **1.12 Polish** - Final visual refinements

---

*Created: 2026-01-13*
