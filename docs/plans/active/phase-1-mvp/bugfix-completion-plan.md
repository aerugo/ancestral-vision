# Phase 1 MVP - Bug Fix & Completion Plan

**Status**: Ready for Implementation
**Created**: 2026-01-14
**Reference**: [testing-audit.md](testing-audit.md)

---

## Summary

This plan addresses all critical bugs and missing features identified in the testing audit, excluding theme switching (deferred). The goal is to bring Phase 1 MVP to a functional state for closed beta.

---

## Bug Priority Overview

| Priority | Count | Description |
|----------|-------|-------------|
| P0 | 3 | Blocking bugs - features completely broken |
| P1 | 1 | Major bugs - features work but have issues |
| P2 | 2 | Polish - visual/UX improvements |
| Missing | 6 | Features marked complete but not working |

---

## Phase 1.13: Bug Fixes

### 1.13.1 Fix Search (P0)

**Status**: ❌ BROKEN
**Issue**: Search returns "No results found" for all queries
**Location**: `src/graphql/resolvers/search-resolvers.ts`, `src/hooks/use-search.ts`

**Root Cause Investigation**:
1. Check if pg_trgm extension is enabled in database
2. Check if GIN indexes exist on Person table
3. Check if searchPeople resolver is receiving query correctly
4. Check if similarity threshold is too high

**Fix Steps**:
```bash
# 1. Verify pg_trgm extension
npx prisma db execute --stdin <<< "SELECT * FROM pg_extension WHERE extname = 'pg_trgm';"

# 2. Check for GIN indexes
npx prisma db execute --stdin <<< "SELECT indexname FROM pg_indexes WHERE tablename = 'Person' AND indexdef LIKE '%gin%';"
```

**Code Changes**:
- [ ] Verify `searchPeople` resolver in `src/graphql/resolvers/search-resolvers.ts`
- [ ] Check similarity threshold (should be ~0.3 for typo tolerance)
- [ ] Add logging to debug query execution
- [ ] Verify hook is passing query to API correctly
- [ ] Test with simple exact match first, then fuzzy

**Acceptance Criteria**:
- [ ] Searching "John" returns John from constellation
- [ ] Searching "Jhon" (typo) returns John
- [ ] Results navigate to person when clicked

---

### 1.13.2 Fix Notes - Tiptap SSR Error (P0)

**Status**: ❌ BROKEN
**Issue**: App crashes when clicking "Add First Note"
**Location**: `src/components/note-editor.tsx:52`
**Error**: `Tiptap Error: SSR has been detected, please set 'immediatelyRender' explicitly to 'false'`

**Root Cause**: Tiptap doesn't support SSR by default in Next.js App Router

**Fix Steps**:
```typescript
// In note-editor.tsx, update useEditor config:
const editor = useEditor({
  extensions: [...],
  immediatelyRender: false, // ADD THIS
  content: initialContent,
});
```

**Code Changes**:
- [ ] Add `immediatelyRender: false` to useEditor options
- [ ] Wrap editor in dynamic import with `ssr: false` if needed
- [ ] Add loading state while editor initializes
- [ ] Test note creation, editing, saving

**Acceptance Criteria**:
- [ ] Clicking "Add First Note" opens note editor without crash
- [ ] Can type and format text
- [ ] Note saves successfully
- [ ] Note appears in list after save

---

### 1.13.3 Fix Media Resolver (P0)

**Status**: ❌ BROKEN
**Issue**: Photos tab shows "Error loading media"
**Location**: `src/graphql/resolvers/media-resolvers.ts:64`
**Error**: `Cannot read properties of undefined (reading 'person')`

**Root Cause**: `ctx.prisma` is undefined in the `personMedia` resolver

**Fix Steps**:
1. Check how prisma is passed to GraphQL context
2. Compare with working resolvers (e.g., person-resolvers.ts)
3. Ensure media-resolvers receives same context

**Code Changes**:
- [ ] Check `src/app/api/graphql/route.ts` for context setup
- [ ] Verify `media-resolvers.ts` imports and uses prisma correctly
- [ ] Ensure resolver function signature matches other resolvers
- [ ] Add null check for ctx.prisma with helpful error message

**Acceptance Criteria**:
- [ ] Photos tab loads without error
- [ ] "No photos yet" message shown for empty state
- [ ] Can upload a photo (if storage configured)

---

### 1.13.4 Fix Onboarding Grandparents Bug (P1)

**Status**: ⚠️ BUG
**Issue**: Grandparents step is pre-filled with parent data
**Location**: `src/components/onboarding-wizard.tsx`

**Root Cause**: Form state from parents step leaks into grandparents step

**Fix Steps**:
1. Review form state management between steps
2. Ensure each step has isolated form state
3. Clear form fields when entering grandparents step

**Code Changes**:
- [ ] Check how `GrandparentsStep` initializes form values
- [ ] Clear or reset form state on step transition
- [ ] Ensure `defaultValues` are correct for grandparents step
- [ ] Test full onboarding flow

**Acceptance Criteria**:
- [ ] Grandparents form fields are empty when entering step
- [ ] Paternal/maternal labels are correct
- [ ] Parents data is NOT shown in grandparents fields

---

## Phase 1.14: Missing Features

### 1.14.1 Connected People Highlighting (AC10)

**Status**: ❌ Not Implemented
**Location**: `src/visualization/constellation.ts`, `src/components/constellation-canvas.tsx`

**Implementation Plan**:
1. When person is selected, get their connected IDs (parents, children, spouse)
2. Pass connected IDs to constellation renderer
3. Apply highlight material to connected stars
4. Dim non-connected stars

**Code Changes**:
- [ ] Update `selectPerson` to include connected IDs
- [ ] Modify star material to support highlight state
- [ ] Add shader uniform or material swap for highlighting
- [ ] Test visual distinction between connected/non-connected

**Acceptance Criteria**:
- [ ] Selected person's connected family is visually highlighted
- [ ] Non-connected people are dimmed/muted

---

### 1.14.2 Star Brightness Based on Content (AC12)

**Status**: ❌ Not Implemented
**Location**: `src/visualization/constellation.ts`

**Implementation Plan**:
1. Calculate "biography weight" for each person
   - Notes count + Events count + Media count + Biography length
2. Map weight to brightness value (0.3 - 1.0 range)
3. Apply brightness to star material

**Code Changes**:
- [ ] Add `biographyWeight` calculation function
- [ ] Query content counts with person data
- [ ] Apply brightness to star mesh material
- [ ] Test with people having different content amounts

**Acceptance Criteria**:
- [ ] People with more content have brighter stars
- [ ] Empty profiles have dim but visible stars
- [ ] Brightness updates when content is added

---

### 1.14.3 Generation-Based Layout (AC13)

**Status**: ⚠️ Poor Implementation
**Location**: `src/components/constellation-canvas.tsx:47-65` (peopleToPlacelderPeople)

**Current Issue**: Uses simple spiral pattern, appears random

**Implementation Plan**:
1. Group people by generation (0 = self, -1 = parents, +1 = children)
2. Arrange in concentric circles or rings by generation
3. Position siblings near each other
4. Use consistent spacing

**Code Changes**:
- [ ] Rewrite `peopleToPlacelderPeople` with better layout algorithm
- [ ] Group by generation first
- [ ] Calculate positions within generation ring
- [ ] Maintain consistent spacing and angles

**Acceptance Criteria**:
- [ ] User (gen 0) is at center
- [ ] Parents (gen -1) are in ring above
- [ ] Children (gen +1) are in ring below
- [ ] Layout is visually organized, not random

---

### 1.14.4 Real-Time Stars During Onboarding (AC33)

**Status**: ❌ Not Implemented
**Location**: `src/components/onboarding-wizard.tsx`, constellation integration

**Implementation Plan**:
1. After each person is added during onboarding, refresh constellation
2. Show star appearing animation
3. Update layout incrementally

**Code Changes**:
- [ ] Call people refresh after each onboarding step
- [ ] Trigger constellation re-render
- [ ] Add star appearance animation (fade in, scale up)

**Acceptance Criteria**:
- [ ] When adding yourself, star appears immediately
- [ ] When adding parents, their stars appear
- [ ] Visual feedback for each person added

---

### 1.14.5 Camera Reveal Animation - "Aha Moment" (AC34)

**Status**: ❌ Not Implemented
**Location**: `src/app/(app)/constellation/page.tsx`, camera animation

**Implementation Plan**:
1. After onboarding completes, detect first visit to constellation
2. Start camera far away, looking at constellation
3. Smoothly zoom in to user's star
4. Create emotional "this is your family" moment

**Code Changes**:
- [ ] Add `hasCompletedOnboarding` and `hasSeenReveal` tracking
- [ ] Create camera reveal animation sequence
- [ ] Trigger on first constellation visit after onboarding
- [ ] Mark reveal as seen after animation completes

**Acceptance Criteria**:
- [ ] First visit after onboarding shows reveal animation
- [ ] Camera starts far, zooms to center on user
- [ ] Animation is smooth and emotionally impactful
- [ ] Only plays once per user

---

### 1.14.6 Account Deletion UI (AC - Phase 1.9)

**Status**: ❌ Not in UI
**Location**: `src/app/(app)/settings/page.tsx`

**Implementation Plan**:
1. Add "Danger Zone" section to settings page
2. Add "Delete Account" button with confirmation dialog
3. Implement 14-day grace period deletion
4. Send confirmation email

**Code Changes**:
- [ ] Add deletion section to settings page
- [ ] Create confirmation dialog with warning text
- [ ] Implement soft-delete with scheduled hard-delete
- [ ] Add account deletion GraphQL mutation

**Acceptance Criteria**:
- [ ] "Delete Account" button visible in settings
- [ ] Confirmation dialog explains 14-day recovery period
- [ ] Account marked for deletion (not immediately deleted)
- [ ] User logged out after requesting deletion

---

## Implementation Order

### Sprint 1: P0 Bug Fixes (Critical Path)
1. **1.13.2 Fix Notes** - Quick fix, unblocks notes feature
2. **1.13.3 Fix Media** - Quick fix, unblocks photos feature
3. **1.13.1 Fix Search** - May require DB investigation

### Sprint 2: P1 Bug Fixes
4. **1.13.4 Fix Onboarding** - Form state issue

### Sprint 3: Missing Features
5. **1.14.3 Generation Layout** - Improves visual organization
6. **1.14.1 Connected Highlighting** - Selection feedback
7. **1.14.2 Star Brightness** - Content visualization

### Sprint 4: Onboarding Polish
8. **1.14.4 Real-Time Stars** - Onboarding feedback
9. **1.14.5 Camera Reveal** - "Aha moment"

### Sprint 5: Account Management
10. **1.14.6 Account Deletion** - Settings completion

---

## Deferred Items

| Item | Reason | Target |
|------|--------|--------|
| Theme switching visual apply | Low priority, saves correctly | Phase 2 |
| Glowing star shader | Visual polish | Phase 1.12 |
| Constellation connection lines | Visual polish | Phase 1.12 |
| AC10: Connected people highlighting | Visual polish | Phase 1.12 |
| AC12: Star brightness based on content | Visual polish | Phase 1.12 |
| AC13: Generation-based mandala layout | Visual polish | Phase 1.12 |
| AC34: Camera reveal "aha moment" | Visual polish | Phase 1.12 |

---

## Success Metrics

### Minimum Viable for Beta
- [ ] All P0 bugs fixed (Search, Notes, Media working)
- [ ] Onboarding bug fixed
- [ ] Basic generation layout improved

### Full Completion
- [ ] All missing features implemented
- [ ] Account deletion available
- [ ] Visual polish features (brightness, highlighting)

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/note-editor.tsx` | Add `immediatelyRender: false` |
| `src/graphql/resolvers/media-resolvers.ts` | Fix prisma context |
| `src/graphql/resolvers/search-resolvers.ts` | Debug/fix search query |
| `src/components/onboarding-wizard.tsx` | Clear form state between steps |
| `src/components/constellation-canvas.tsx` | Improve layout algorithm |
| `src/visualization/constellation.ts` | Add highlighting, brightness |
| `src/app/(app)/settings/page.tsx` | Add account deletion section |

---

*Created: 2026-01-14*
