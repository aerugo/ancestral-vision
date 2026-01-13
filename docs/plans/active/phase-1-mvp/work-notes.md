# Phase 1 MVP - Work Notes

**Feature**: Complete single-player MVP for closed beta launch
**Started**: 2026-01-13
**Branch**: `feature/phase-1-mvp`

---

## Session Log

### 2026-01-13 - Planning Complete

**Context Review Completed**:

- Read `docs/invariants/INVARIANTS.md` - Identified all applicable invariants
- Read `docs/plans/CLAUDE.md` - Understood planning protocol
- Read `docs/plans/grand_plan/05_features.md` - Detailed feature specifications
- Read `docs/plans/grand_plan/04_user_stories.md` - User story requirements
- Read `docs/plans/grand_plan/12_roadmap.md` - MVP scope and success metrics
- Analyzed `src/graphql/resolvers/index.ts` - Current resolver structure
- Analyzed `src/visualization/constellation.ts` - Current 3D implementation

**Applicable Invariants**:

- INV-D001-D005: Data model constraints for new entities
- INV-S001-S003: Security requirements for all new mutations
- INV-A005-A009: Architecture patterns for hooks and components
- INV-U001-U003: UI patterns for new components

**Key Insights**:

- Phase 0 provides solid foundation with 246 tests passing
- Current GraphQL resolvers are in single file - need to split for maintainability
- Constellation rendering exists but lacks selection interaction
- Form validation not yet standardized - need Zod throughout

**Completed**:

- [x] Created Phase 1 MVP spec.md
- [x] Created development-plan.md with 12 sub-phases
- [x] Identified ~250 new tests needed
- [x] Documented all invariants to respect
- [x] Identified new invariants to introduce

**Next Steps**:

1. Create detailed phase plans in phases/ directory
2. Start Phase 1.1 (Relationships) with TDD
3. Update INVARIANTS.md with new invariants as implemented

---

## Phase Progress

### Phase 1.1: Relationships

**Status**: Complete
**Started**: 2026-01-13
**Completed**: 2026-01-13

#### Test Results

```
Test Files: 29 passed (29)
Tests: 269 passed (269)
```

#### Results

- Added 25+ relationship resolver tests
- Extended GraphQL schema with relationship types and mutations
- Implemented 6 relationship mutations (create/update/delete for parent-child and spouse)
- Added personRelationships query
- Implemented Person field resolvers (parents, children, spouses)
- Created TanStack Query hooks for all relationship operations

#### Notes

- Prisma models (ParentChildRelationship, SpouseRelationship) already existed in schema
- Used existing isDatabaseAvailable() pattern for graceful test skipping
- Query returns empty array for unauthenticated (consistent with other queries)
- Mutations throw GraphQLError for unauthenticated (INV-S001)

---

### Phase 1.2: Person Enhancement

**Status**: Complete
**Started**: 2026-01-13
**Completed**: 2026-01-13

#### Test Results

```
Test Files: 31 passed (31)
Tests: 302 passed (302)
```

#### Results

- Created Zod validation schema for person forms (INV-U003)
- Implemented PersonForm component with full international name support
- Added useAutoSave hook with 2s debounce (INV-A010)
- Contextual creation headers ("Add Parent/Child/Spouse of X")
- 20 PersonForm tests + 13 useAutoSave tests = 33 new tests

#### Notes

- Used z.preprocess() to handle empty strings from HTML form selects
- PersonFormInput vs PersonFormData types distinguish raw form data from validated output
- International names: Western, Eastern, Patronymic, Patronymic Suffix, Matronymic
- Optional fields: surname, maidenName, patronymic, matronymic, nickname, suffix, biography
- Speculative flag for uncertain/theoretical ancestors

---

### Phase 1.3: Selection & Profile

**Status**: Complete
**Started**: 2026-01-13
**Completed**: 2026-01-13

#### Test Results

```
Test Files: 35 passed (35)
Tests: 354 passed (354)
```

#### Results

- Created Zustand selection store for UI state (INV-A006)
- Implemented 3D raycasting with ConstellationSelection class
- Added CameraAnimator with 3 easing functions (linear, easeInOutCubic, easeOutCubic)
- Built slide-in PersonProfilePanel with dark theme support (INV-U001, INV-U004)
- Tabbed interface (Events, Notes, Photos) prepared for future content
- Displays immediate family from relationship data

#### Notes

- Raycasting tests use mocked THREE.Raycaster.prototype.intersectObjects (JSDOM limitation)
- Selection store manages: selectedPersonId, connectedPersonIds, isPanelOpen
- Camera animation supports configurable duration and easing
- Profile panel processes Relationship[] into parents/children/spouses using type guards
- 52 new tests: 9 store + 14 selection + 15 camera + 14 panel

---

### Phase 1.4: Notes System

**Status**: Complete (Backend) / Pending (UI - see Phase 1.4b)
**Started**: 2026-01-13
**Completed**: 2026-01-13 (Backend)

#### Test Results

```
Test Files: 38 passed (38)
Tests: 392 passed (392)
```

#### Results

- Created Note GraphQL types (Note, CreateNoteInput, UpdateNoteInput, PrivacyLevel enum)
- Implemented note resolvers (personNotes query, createNote/updateNote/deleteNote mutations)
- Added version history support with max 10 versions (INV-D006)
- Enforced 50,000 character limit for note content
- Implemented privacy levels (PRIVATE, CONNECTIONS, PUBLIC)
- Created TanStack Query hooks for all note operations
- Built NoteList component with timestamps, version badges, and privacy indicators
- Soft delete support with deletedAt timestamp

#### Notes

- Used JSON field for previousVersions array in Prisma
- Version history stores {version, content, updatedAt} for each previous version
- Content preview extracts plain text from JSON (supports both Tiptap JSON and plain text)
- Test file needed .tsx extension for JSX support
- Added date-fns dependency for relative timestamps
- 38 new tests: 15 resolver tests + 12 hook tests + 11 component tests

---

### Phase 1.4b: Notes UI Completion

**Status**: Complete
**Started**: 2026-01-13
**Completed**: 2026-01-13

#### Test Results

```
Test Files: 41 passed (41)
Tests: 422 passed (422)
```

#### Results

- Installed Tiptap dependencies (@tiptap/react, @tiptap/starter-kit, @tiptap/extension-character-count)
- Created NoteEditor component with rich text formatting toolbar
- Created NoteVersionHistory component with preview and restore
- Created PersonNotesTab component orchestrating list/edit/history views
- Integrated Notes tab into PersonProfilePanel with tab switching
- 30 new tests: 12 editor + 8 version history + 10 notes tab

#### Notes

- Mocked Tiptap in JSDOM tests (useEditor, EditorContent)
- Used native HTML select for privacy dropdown (simpler than shadcn Select)
- Used fixed overlay for confirmation dialogs (simpler than AlertDialog)
- Auto-save uses 2s debounce via setTimeout in editor component

**Plan**: See [phases/phase-1.4b-notes-ui.md](phases/phase-1.4b-notes-ui.md)

---

### Phase 1.5: Events System

**Status**: Pending
**Started**:
**Completed**:

---

### Phase 1.6: Media System

**Status**: Pending
**Started**:
**Completed**:

---

### Phase 1.7: Search

**Status**: Pending
**Started**:
**Completed**:

---

### Phase 1.8: Onboarding

**Status**: Pending
**Started**:
**Completed**:

---

### Phase 1.9: Settings

**Status**: Pending
**Started**:
**Completed**:

---

### Phase 1.10: Subscription

**Status**: Pending
**Started**:
**Completed**:

---

### Phase 1.11: Export

**Status**: Pending
**Started**:
**Completed**:

---

### Phase 1.12: Polish

**Status**: Pending
**Started**:
**Completed**:

---

## Key Decisions

### Decision 1: Phase Order

**Date**: 2026-01-13
**Context**: Determining optimal implementation order for MVP features
**Decision**: Start with Relationships → Person Enhancement → Selection/Profile → Content → Search → Onboarding → Billing → Export → Polish
**Rationale**:
- Relationships unlock contextual person creation
- Profile panel needed for content display
- Search requires people data
- Onboarding builds on all person/content features
- Billing can be tested independently
- Polish comes last for visual refinement
**Alternatives Considered**:
- Starting with onboarding (rejected: needs person CRUD first)
- Starting with content (rejected: needs profile panel to display)

---

## Files Modified

### Created

- `docs/plans/active/phase-1-mvp/spec.md` - Feature specification
- `docs/plans/active/phase-1-mvp/development-plan.md` - 12-phase implementation plan
- `docs/plans/active/phase-1-mvp/work-notes.md` - This file
- `docs/plans/active/phase-1-mvp/phases/` - Phase plan directory

### Modified

- `src/graphql/schema.ts` - Extended with relationship types and mutations
- `src/graphql/resolvers/index.ts` - Added relationship resolver implementations
- `tests/graphql-test-utils.ts` - Added cleanupTestData and seedTestUserWithPeople

### Created (Phase 1.1)

- `src/graphql/resolvers/relationship.test.ts` - TDD test suite for relationships
- `src/hooks/use-relationships.ts` - TanStack Query hooks for relationships

### Created (Phase 1.2)

- `src/lib/schemas/person.ts` - Zod validation schema for person forms
- `src/components/person-form.tsx` - Person form component with international name support
- `src/components/person-form.test.tsx` - PersonForm component tests (20 tests)
- `src/hooks/use-auto-save.ts` - Auto-save debounce hook (INV-A010)
- `src/hooks/use-auto-save.test.ts` - useAutoSave hook tests (13 tests)

### Created (Phase 1.3)

- `src/store/selection-store.ts` - Zustand selection state (INV-A006)
- `src/store/selection-store.test.ts` - Selection store tests (9 tests)
- `src/visualization/selection.ts` - 3D raycasting class
- `src/visualization/selection.test.ts` - Selection tests (14 tests)
- `src/visualization/camera-animation.ts` - Camera animator with easing
- `src/visualization/camera-animation.test.ts` - Animation tests (15 tests)
- `src/components/person-profile-panel.tsx` - Slide-in profile panel (INV-U004)
- `src/components/person-profile-panel.test.tsx` - Profile panel tests (14 tests)

### Created (Phase 1.4)

- `src/graphql/resolvers/note.test.ts` - Note resolver tests (15 tests)
- `src/hooks/use-notes.ts` - TanStack Query hooks for notes
- `src/hooks/use-notes.test.tsx` - Note hooks tests (12 tests)
- `src/components/note-list.tsx` - Note list component with timestamps
- `src/components/note-list.test.tsx` - Note list tests (11 tests)

### Modified (Phase 1.4)

- `src/graphql/schema.ts` - Added Note types, PrivacyLevel enum, note queries/mutations
- `src/graphql/resolvers/index.ts` - Added note resolver implementations

---

## Documentation Updates Required

### INVARIANTS.md Changes

- [x] Add INV-D006: Notes have version history (max 10) - implemented in Phase 1.4
- [ ] Add INV-D007: Events support flexible GEDCOM-style dates
- [ ] Add INV-D008: Media files stored in Cloud Storage with signed URLs
- [x] Add INV-A010: Auto-save with debounce (2s) for inline editing (implemented in Phase 1.2)
- [x] Add INV-U004: Profile panel is slide-in, maintains 3D context (implemented in Phase 1.3)

### Other Documentation

- [ ] API documentation for new GraphQL schema
- [ ] README updates for beta features

---

*Last Updated: 2026-01-13 (Phase 1.4b Complete)*
