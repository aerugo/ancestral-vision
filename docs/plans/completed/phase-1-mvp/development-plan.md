# Phase 1 MVP - Development Plan

**Status**: Not Started
**Created**: 2026-01-13
**Branch**: `feature/phase-1-mvp`
**Spec**: [spec.md](spec.md)

---

## Summary

Implement the complete single-player MVP experience for closed beta launch, including person management, 3D constellation enhancements, content management (notes/events/media), search, onboarding wizard, and subscription billing.

---

## Critical Invariants to Respect

Reference invariants from `docs/invariants/INVARIANTS.md`:

### Data Model Invariants
- **INV-D001**: Entity IDs are UUID v4 - All new entities (Note, Event, Media, Relationship) must use UUID
- **INV-D002**: User IDs are Firebase UIDs - Never generate user IDs, always use Firebase UID
- **INV-D003**: Every Person belongs to exactly one Constellation - Enforce in all person creation
- **INV-D004**: One Constellation per User - Check before constellation operations
- **INV-D005**: Soft Delete with 30-Day Recovery - Use deletedAt/deletedBy pattern for Person, Note, Event

### Security Invariants
- **INV-S001**: All GraphQL Mutations Require Authentication - Every new mutation needs requireAuth()
- **INV-S002**: Users Can Only Access Their Own Constellation - Filter all queries by user's constellation
- **INV-S003**: Firebase Admin SDK is Server-Only - Never import in client components

### Architecture Invariants
- **INV-A005**: TanStack Query for Server State - All new data fetching via hooks
- **INV-A006**: Zustand for Client/UI State Only - Selection, panel visibility, etc.
- **INV-A007**: GraphQL Client Includes Auth Header - Use existing graphqlClient
- **INV-A008**: No Direct Database Access in React Components - All via GraphQL API
- **INV-A009**: Scene Cleanup on Unmount - Dispose 3D resources properly

### UI Invariants
- **INV-U001**: Dark Theme is Default - Maintain cosmic aesthetic
- **INV-U002**: Keyboard Navigation Support - Use Radix UI primitives
- **INV-U003**: Form Validation Uses Zod - All new forms validated with Zod

**New invariants to introduce** (add to INVARIANTS.md after implementation):

- **NEW INV-D006**: Notes have version history (max 10) - Stored as JSON array
- **NEW INV-D007**: Events support flexible dates - GEDCOM-style date objects
- **NEW INV-D008**: Media files stored in Cloud Storage with signed URLs
- **NEW INV-A010**: Auto-save with debounce (2s) for inline editing
- **NEW INV-U004**: Profile panel is slide-in, maintains 3D context

---

## Current State Analysis

Phase 0 Foundation provides:
- Working authentication (Firebase Auth + provider)
- GraphQL API with User, Constellation, Person CRUD
- 3D visualization with WebGPU/WebGL renderer
- State management (Zustand + TanStack Query)
- UI components (shadcn/ui)
- 246 passing tests

### Files to Modify

| File | Current State | Planned Changes |
|------|---------------|-----------------|
| `prisma/schema.prisma` | Core entities | Add Note, Event, Media, Relationship, OnboardingProgress |
| `src/graphql/schema.ts` | Basic queries/mutations | Add all Phase 1 operations |
| `src/graphql/resolvers/index.ts` | User, Constellation, Person | Split into modules, add all resolvers |
| `src/visualization/constellation.ts` | Static mesh generation | Dynamic brightness, selection highlighting |
| `src/visualization/scene.ts` | Basic scene | Camera animations, selection system |
| `src/store/ui-store.ts` | Theme, view mode | Add selection state, panel state |
| `src/components/constellation-canvas.tsx` | Basic render | Click handling, selection |

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/person-profile-panel.tsx` | Slide-in detail panel |
| `src/components/person-profile-panel.test.tsx` | Panel tests |
| `src/components/person-form.tsx` | Add/edit person form |
| `src/components/person-form.test.tsx` | Form tests |
| `src/components/relationship-manager.tsx` | Relationship CRUD |
| `src/components/relationship-manager.test.tsx` | Relationship tests |
| `src/components/note-editor.tsx` | Tiptap rich text editor |
| `src/components/note-editor.test.tsx` | Editor tests |
| `src/components/event-form.tsx` | Event creation/editing |
| `src/components/event-form.test.tsx` | Event form tests |
| `src/components/media-uploader.tsx` | Photo/document upload |
| `src/components/media-uploader.test.tsx` | Upload tests |
| `src/components/search-bar.tsx` | Global fuzzy search |
| `src/components/search-bar.test.tsx` | Search tests |
| `src/components/onboarding-wizard.tsx` | Multi-step wizard |
| `src/components/onboarding-wizard.test.tsx` | Wizard tests |
| `src/components/pricing-table.tsx` | Plan comparison |
| `src/components/pricing-table.test.tsx` | Pricing tests |
| `src/hooks/use-relationships.ts` | Relationship data hooks |
| `src/hooks/use-notes.ts` | Notes data hooks |
| `src/hooks/use-events.ts` | Events data hooks |
| `src/hooks/use-media.ts` | Media data hooks |
| `src/hooks/use-search.ts` | Search hook |
| `src/hooks/use-subscription.ts` | Subscription hooks |
| `src/lib/date-utils.ts` | Flexible date handling |
| `src/lib/date-utils.test.ts` | Date utility tests |
| `src/lib/storage.ts` | Cloud Storage operations |
| `src/lib/storage.test.ts` | Storage tests |
| `src/lib/lemonsqueezy.ts` | LemonSqueezy integration |
| `src/lib/lemonsqueezy.test.ts` | Payment tests |
| `src/lib/export.ts` | GEDCOM/JSON export |
| `src/lib/export.test.ts` | Export tests |
| `src/app/onboarding/page.tsx` | Onboarding wizard page |
| `src/app/settings/page.tsx` | Settings page |
| `src/app/pricing/page.tsx` | Pricing page |

---

## Solution Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI Layer                                  │
├─────────────────────────────────────────────────────────────────┤
│  Constellation Canvas │ Profile Panel │ Search │ Onboarding     │
│  (Three.js + WebGPU)  │ (Slide-in)   │ (Bar)  │ (Wizard)       │
├─────────────────────────────────────────────────────────────────┤
│                     State Layer                                  │
├─────────────────────────────────────────────────────────────────┤
│  UI Store (Zustand)   │  Server State (TanStack Query)          │
│  - selectedPersonId   │  - useConstellation, usePeople          │
│  - isPanelOpen        │  - useNotes, useEvents, useMedia        │
│  - onboardingStep     │  - useRelationships, useSubscription    │
├─────────────────────────────────────────────────────────────────┤
│                     API Layer                                    │
├─────────────────────────────────────────────────────────────────┤
│  GraphQL Yoga (/api/graphql)                                    │
│  - Queries: me, constellation, person, people, search, etc.    │
│  - Mutations: createPerson, updatePerson, createNote, etc.     │
├─────────────────────────────────────────────────────────────────┤
│                   Data Layer                                     │
├─────────────────────────────────────────────────────────────────┤
│  Prisma ORM           │  Cloud Storage    │  LemonSqueezy       │
│  (PostgreSQL)         │  (Media files)    │  (Subscriptions)    │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Profile Panel as Slide-in**: Maintains 3D constellation context while showing details
2. **Auto-save with Debounce**: Modern UX, prevents data loss, 2s debounce
3. **Flexible Date Storage**: GEDCOM-style JSON objects support exact, approximate, ranges
4. **Note Versioning**: Last 10 versions stored as JSON array in Note entity
5. **Relationship Entity**: Explicit Relationship model for parent-child and spouse links
6. **Media Signed URLs**: Private media accessed via 1hr signed URLs
7. **LemonSqueezy Webhooks**: Server-side subscription state management

---

## Phase Overview

| Phase | Name | Description | TDD Focus | Est. Tests |
|-------|------|-------------|-----------|------------|
| 1.1 | Relationships | Relationship entity and CRUD | Schema, mutations, validation | ~25 tests |
| 1.2 | Person Enhancement | Person CRUD improvements | Forms, auto-save, validation | ~20 tests |
| 1.3 | Selection & Profile | 3D selection and profile panel | Click handling, panel display | ~30 tests |
| 1.4 | Notes System | Rich text notes with versioning | Tiptap, versions, privacy | ~25 tests |
| 1.5 | Events System | Freeform events with flex dates | Date utils, event CRUD | ~25 tests |
| 1.6 | Media System | Photo/document upload | Storage, thumbnails, display | ~20 tests |
| 1.7 | Search | Fuzzy name search | pg_trgm, search UI | ~15 tests |
| 1.8 | Onboarding | First-run wizard | Wizard flow, progress | ~25 tests |
| 1.9 | Settings | Account settings page | Forms, preferences | ~15 tests |
| **1.X** | **Integration** | **Wire components together** | **E2E flow, state connection** | **~15 tests** |
| **1.X.1** | **Integration Fixes** | **Fix onboarding, media, relationships** | **Data persistence, UI wiring** | **~15 tests** |
| **1.13** | **Bug Fixes** | **Fix P0/P1 bugs from testing audit** | **Search, Notes, Media, Onboarding** | **~10 tests** |
| **1.14** | **Missing Features** | **Complete AC10-13, AC33-34, deletion** | **Highlighting, brightness, layout, reveal** | **~20 tests** |
| 1.10 | Subscription | LemonSqueezy billing | Webhooks, quota tracking | ~20 tests |
| 1.11 | Export | GEDCOM/JSON export | Export logic, download | ~15 tests |
| 1.12 | Polish | Visual enhancements | Brightness, animations | ~15 tests |

**Total Estimated Tests**: ~265 new tests

---

## Phase 1.1: Relationships

**Goal**: Implement relationship entity and management for parent-child and spouse links
**Detailed Plan**: [phases/phase-1.1.md](phases/phase-1.1.md)

### Deliverables
1. Prisma schema updates (Relationship model)
2. GraphQL schema (relationship types and mutations)
3. Resolver implementation
4. TanStack Query hooks
5. Unit tests for all components

### TDD Approach
1. Write failing tests for Prisma schema constraints
2. Write failing tests for GraphQL mutations
3. Implement schema and resolvers to pass tests
4. Refactor for clarity

### Success Criteria
- [ ] All relationship tests pass
- [ ] Can create parent-child relationships
- [ ] Can create spouse relationships with dates
- [ ] Can update and delete relationships
- [ ] Adoptive relationships supported
- [ ] Type check passes
- [ ] Lint passes

---

## Phase 1.2: Person Enhancement

**Goal**: Improve person CRUD with contextual creation, auto-save, and form validation
**Detailed Plan**: [phases/phase-1.2.md](phases/phase-1.2.md)

### Deliverables
1. PersonForm component with Zod validation
2. Auto-save functionality with debounce
3. Contextual creation ("Add parent" from selected person)
4. International name support
5. Unit and integration tests

### TDD Approach
1. Write failing tests for form validation
2. Write failing tests for auto-save behavior
3. Implement components to pass tests
4. Refactor for UX improvements

### Success Criteria
- [ ] PersonForm validates with Zod
- [ ] Auto-save triggers after 2s debounce
- [ ] Can add person contextually from selection
- [ ] International names (patronymic, Eastern) supported
- [ ] All tests pass

---

## Phase 1.3: Selection & Profile Panel

**Goal**: Implement star selection in 3D view and slide-in profile panel
**Detailed Plan**: [phases/phase-1.3.md](phases/phase-1.3.md)

### Deliverables
1. Click/tap detection on 3D stars
2. Selection state in Zustand
3. Camera animation to selected person
4. PersonProfilePanel component
5. Connected people highlighting
6. Tests for all functionality

### TDD Approach
1. Write failing tests for selection detection
2. Write failing tests for panel display
3. Implement Three.js raycasting and panel
4. Refactor for smooth animations

### Success Criteria
- [ ] Click on star selects person
- [ ] Camera animates smoothly to selection
- [ ] Profile panel slides in with person data
- [ ] Connected people highlighted
- [ ] Non-connected people dimmed
- [ ] All tests pass

---

## Phase 1.4: Notes System

**Goal**: Implement rich text notes with Tiptap, versioning, and privacy levels
**Detailed Plan**: [phases/phase-1.4.md](phases/phase-1.4.md)

### Deliverables
1. Prisma Note model with versions field
2. GraphQL Note operations
3. NoteEditor component (Tiptap)
4. Version history display
5. Privacy level controls
6. Tests for all functionality

### TDD Approach
1. Write failing tests for Note CRUD
2. Write failing tests for version capture
3. Implement schema, resolvers, components
4. Refactor for editor polish

### Success Criteria
- [ ] Can create/edit/delete notes
- [ ] Rich text formatting works
- [ ] 50,000 character limit enforced
- [ ] Last 10 versions preserved
- [ ] Privacy levels work
- [ ] All tests pass

---

## Phase 1.5: Events System

**Goal**: Implement freeform events with flexible GEDCOM-style dates
**Detailed Plan**: [phases/phase-1.5.md](phases/phase-1.5.md)

### Deliverables
1. Prisma Event model
2. date-utils.ts for flexible date handling
3. GraphQL Event operations
4. EventForm component
5. Shared events (multiple participants)
6. Tests for all functionality

### TDD Approach
1. Write failing tests for date parsing/formatting
2. Write failing tests for Event CRUD
3. Implement utilities, schema, components
4. Refactor for UX clarity

### Success Criteria
- [ ] Flexible dates work (exact, approximate, ranges)
- [ ] Can create/edit/delete events
- [ ] Shared events link multiple people
- [ ] Events display in profile panel
- [ ] All tests pass

---

## Phase 1.6: Media System

**Goal**: Implement photo and document upload with Cloud Storage
**Detailed Plan**: [phases/phase-1.6.md](phases/phase-1.6.md)

### Deliverables
1. Prisma Media model
2. Cloud Storage integration
3. Thumbnail generation
4. MediaUploader component
5. Signed URL generation
6. Tests for all functionality

### TDD Approach
1. Write failing tests for storage operations
2. Write failing tests for upload flow
3. Implement storage, thumbnails, UI
4. Refactor for reliability

### Success Criteria
- [ ] Can upload photos (JPEG, PNG, WebP, HEIC)
- [ ] Can upload documents (PDF)
- [ ] Thumbnails generated automatically
- [ ] Signed URLs for private media
- [ ] Size limits enforced (25MB)
- [ ] All tests pass

---

## Phase 1.7: Search

**Goal**: Implement fuzzy name search with pg_trgm
**Detailed Plan**: [phases/phase-1.7.md](phases/phase-1.7.md)

### Deliverables
1. pg_trgm extension migration
2. GIN indexes for search
3. searchPeople GraphQL query
4. SearchBar component
5. Search results navigation
6. Tests for all functionality

### TDD Approach
1. Write failing tests for search queries
2. Write failing tests for UI behavior
3. Implement search backend and UI
4. Refactor for performance

### Success Criteria
- [ ] Fuzzy matching handles typos
- [ ] Search results ranked by relevance
- [ ] Click result navigates to person
- [ ] Rate limiting (10 req/min)
- [ ] All tests pass

---

## Phase 1.8: Onboarding

**Goal**: Implement first-run wizard with "aha moment"
**Detailed Plan**: [phases/phase-1.8.md](phases/phase-1.8.md)

### Deliverables
1. OnboardingProgress Prisma model
2. OnboardingWizard component
3. Step persistence
4. Real-time star appearance
5. Camera reveal animation
6. Tests for all functionality

### TDD Approach
1. Write failing tests for wizard flow
2. Write failing tests for progress persistence
3. Implement wizard and animations
4. Refactor for emotional impact

### Success Criteria
- [ ] Wizard guides through steps
- [ ] Progress saved between sessions
- [ ] Stars appear as people added
- [ ] "Aha moment" camera reveal works
- [ ] Can skip/resume at any point
- [ ] All tests pass

---

## Phase 1.9: Settings

**Goal**: Implement account settings page
**Detailed Plan**: [phases/phase-1.9.md](phases/phase-1.9.md)

### Deliverables
1. Settings page layout
2. Email/password change forms
3. Privacy preference
4. Theme preference
5. Tests for all functionality

### TDD Approach
1. Write failing tests for forms
2. Write failing tests for preferences
3. Implement settings UI
4. Refactor for clarity

### Success Criteria
- [ ] Can change email
- [ ] Can change password
- [ ] Default privacy setting works
- [ ] Theme preference persists
- [ ] All tests pass

---

## Phase 1.10: Subscription

**Goal**: Implement LemonSqueezy subscription billing
**Detailed Plan**: [phases/phase-1.10.md](phases/phase-1.10.md)

### Deliverables
1. lemonsqueezy.ts integration
2. Webhook handlers
3. Pricing page
4. Usage tracking
5. Quota warnings
6. Tests for all functionality

### TDD Approach
1. Write failing tests for webhook handling
2. Write failing tests for quota checks
3. Implement integration and UI
4. Refactor for reliability

### Success Criteria
- [ ] Checkout flow works
- [ ] Webhooks update subscription state
- [ ] Usage tracked correctly
- [ ] Quota warnings at 80%
- [ ] Customer portal accessible
- [ ] All tests pass

---

## Phase 1.11: Export

**Goal**: Implement GEDCOM and JSON export
**Detailed Plan**: [phases/phase-1.11.md](phases/phase-1.11.md)

### Deliverables
1. export.ts utilities
2. GEDCOM generation
3. JSON generation
4. Download endpoints
5. Tests for all functionality

### TDD Approach
1. Write failing tests for GEDCOM format
2. Write failing tests for JSON structure
3. Implement export logic
4. Refactor for completeness

### Success Criteria
- [ ] GEDCOM export valid
- [ ] JSON export complete
- [ ] Download works in browser
- [ ] Large constellations handled
- [ ] All tests pass

---

## Phase 1.12: Polish

**Goal**: Visual enhancements for star brightness, animations, and UX polish
**Detailed Plan**: [phases/phase-1.12.md](phases/phase-1.12.md)

### Deliverables
1. Biography weight calculation
2. Star brightness mapping
3. Selection animation improvements
4. Loading states
5. Error handling improvements
6. Tests for calculations

### TDD Approach
1. Write failing tests for weight calculation
2. Write failing tests for brightness mapping
3. Implement visual improvements
4. Refactor for smoothness

### Success Criteria
- [ ] Star brightness reflects content richness
- [ ] Animations are smooth and responsive
- [ ] Loading states provide feedback
- [ ] Errors handled gracefully
- [ ] All tests pass

---

## Testing Strategy

### Unit Tests (co-located with source)
- `src/lib/date-utils.test.ts` - Date parsing and formatting
- `src/lib/storage.test.ts` - Cloud Storage operations
- `src/lib/lemonsqueezy.test.ts` - Payment integration
- `src/lib/export.test.ts` - Export format generation
- `src/components/*.test.tsx` - All component tests
- `src/hooks/*.test.tsx` - All hook tests

### Integration Tests
- `src/graphql/resolvers/*.test.ts` - Resolver integration with database

### Invariant Tests
- `tests/invariants/data-model.test.ts` - INV-D001-D008
- `tests/invariants/security.test.ts` - INV-S001-S003

---

## Documentation Updates

After implementation is complete:

- [ ] `docs/invariants/INVARIANTS.md` - Add INV-D006-D008, INV-A010, INV-U004
- [ ] API documentation for new schema
- [ ] README updates for new features

---

## Progress Tracking

| Phase | Status | Started | Completed | Notes |
|-------|--------|---------|-----------|-------|
| 1.1 Relationships | Complete | 2026-01-13 | 2026-01-13 | Relationship hooks and resolvers |
| 1.2 Person Enhancement | Complete | 2026-01-13 | 2026-01-13 | PersonForm with international names |
| 1.3 Selection & Profile | Complete | 2026-01-13 | 2026-01-13 | Selection store, panel, camera |
| 1.4 Notes System | Complete | 2026-01-13 | 2026-01-13 | + Phase 1.4b for UI |
| 1.5 Events System | Complete | 2026-01-13 | 2026-01-13 | Flexible dates, timeline |
| 1.6 Media System | Complete | 2026-01-13 | 2026-01-13 | Upload, gallery, signed URLs |
| 1.7 Search | Complete | 2026-01-13 | 2026-01-13 | Fuzzy search, SearchBar |
| 1.8 Onboarding | Complete | 2026-01-13 | 2026-01-13 | Wizard, step persistence |
| 1.9 Settings | Complete | 2026-01-13 | 2026-01-13 | Profile, security, theme |
| **1.X Integration** | **Complete** | 2026-01-13 | 2026-01-13 | Display path wired |
| **1.X.1 Integration Fixes** | **Complete** | 2026-01-13 | 2026-01-13 | Data persistence, dialogs |
| **1.13 Bug Fixes** | **Ready** | | | [bugfix-completion-plan.md](bugfix-completion-plan.md) |
| **1.14 Missing Features** | **Ready** | | | [bugfix-completion-plan.md](bugfix-completion-plan.md) |
| 1.10 Subscription | Pending | | | |
| 1.11 Export | Pending | | | |
| 1.12 Polish | Pending | | | |

**Current Test Count**: 856 passing

---

## Phase 1.13-1.14 Details

See **[bugfix-completion-plan.md](bugfix-completion-plan.md)** for detailed implementation plan covering:

### P0 Bug Fixes (1.13.1-1.13.3)
- **Search**: Fix `searchPeople` returning no results
- **Notes**: Fix Tiptap SSR crash (`immediatelyRender: false`)
- **Media**: Fix `ctx.prisma` undefined in media resolver

### P1 Bug Fixes (1.13.4)
- **Onboarding**: Fix grandparents form pre-filled with parent data

### Missing Features (1.14.1-1.14.6)
- **AC10**: Connected people highlighting
- **AC12**: Star brightness based on content
- **AC13**: Generation-based mandala layout
- **AC33**: Real-time stars during onboarding
- **AC34**: Camera reveal "aha moment"
- **Account Deletion**: Settings page danger zone

### Deferred
- Theme switching visual apply (saves but doesn't change UI) → Phase 2

---

*Created: 2026-01-13*
*Last Updated: 2026-01-14*
