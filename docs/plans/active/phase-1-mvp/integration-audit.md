# Phase 1 MVP Integration Audit

**Date**: 2026-01-13
**Status**: Integration Incomplete
**Tests Passing**: 796

---

## Executive Summary

Phase 1 MVP has comprehensive test coverage but approximately **50% of features are not wired into the product**. The components, hooks, and resolvers exist and pass tests, but many are orphaned - never imported or rendered in the actual application.

### Critical Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| PersonProfilePanel not rendered | Notes, Events, Media inaccessible | **P0** |
| Onboarding flow disconnected | New users skip onboarding | **P0** |
| SearchBar disabled | Cannot search for people | **P1** |
| No navigation menu | Users can't discover features | **P1** |
| Selection not connected to 3D | Can't click stars to select | **P0** |

---

## Feature Integration Status

### Fully Integrated (Working End-to-End)

| Feature | Route | Components | Status |
|---------|-------|------------|--------|
| Authentication | `/login`, `/register` | LoginForm, RegisterForm | ✅ Complete |
| Settings | `/settings` | SettingsForm, SecuritySettings | ✅ Complete |
| 3D Rendering | `/constellation` | ConstellationCanvas | ✅ Renders (empty) |

### Implemented but Not Integrated

| Feature | Components Built | Tests | Integration Status |
|---------|-----------------|-------|-------------------|
| **Person Profile Panel** | PersonProfilePanel, tabs | 30+ | ❌ Never rendered |
| **Notes System** | NoteEditor, PersonNotesTab | 25+ | ❌ Orphaned (inside panel) |
| **Events System** | EventForm, PersonEventsTab | 25+ | ❌ Orphaned (inside panel) |
| **Media System** | MediaUploader, PersonMediaTab | 20+ | ❌ Orphaned (inside panel) |
| **Search** | SearchBar, useSearch | 15+ | ⚠️ Disabled (no callback) |
| **Onboarding** | OnboardingWizard | 25+ | ⚠️ Route exists, unreachable |
| **Selection Store** | useSelectionStore | 9 | ❌ Not connected to 3D |

---

## Detailed Gap Analysis

### 1. PersonProfilePanel Not Rendered

**Problem**: The entire content management UI is built but never mounted.

**Current State**:
```tsx
// src/app/(app)/constellation/page.tsx
export default function ConstellationPage() {
  return (
    <AppShell>
      <ConstellationCanvas />  // No PersonProfilePanel!
    </AppShell>
  );
}
```

**Required**:
```tsx
export default function ConstellationPage() {
  return (
    <AppShell onPersonSelect={handlePersonSelect}>
      <ConstellationCanvas onPersonClick={handlePersonSelect} />
      <PersonProfilePanel />  // Must add this
    </AppShell>
  );
}
```

**Affected Features**:
- Notes (NoteEditor, PersonNotesTab)
- Events (EventForm, PersonEventsTab)
- Media (MediaUploader, PersonMediaTab)
- Person details display
- Relationship management

**Files to Modify**:
- `src/app/(app)/constellation/page.tsx`
- `src/components/constellation-canvas.tsx` (add click handler)

---

### 2. Onboarding Flow Disconnected

**Problem**: New users go directly to empty constellation, bypassing onboarding.

**Current Flow**:
```
Register → /constellation (empty 3D scene)
Login → /constellation (no onboarding check)
```

**Required Flow**:
```
Register → /constellation → Check onboarding status → Redirect to /onboarding if not complete
OR
Register → /onboarding → After completion → /constellation
```

**Files to Modify**:
- `src/app/(auth)/register/page.tsx` - Redirect to `/onboarding` instead
- `src/app/(auth)/login/page.tsx` - Add onboarding status check
- OR `src/app/(app)/constellation/page.tsx` - Add useEffect to check/redirect

---

### 3. SearchBar Disabled

**Problem**: SearchBar only renders when `onPersonSelect` prop is passed, which never happens.

**Current Code** (`app-shell.tsx:49-54`):
```tsx
{user && onPersonSelect && (
  <SearchBar
    onSelect={onPersonSelect}
    className="w-64"
  />
)}
```

**Constellation Page** (`constellation/page.tsx`):
```tsx
<AppShell>  // No onPersonSelect prop!
  <ConstellationCanvas />
</AppShell>
```

**Required**: Pass `onPersonSelect` to AppShell from constellation page.

---

### 4. Selection Store Not Connected

**Problem**: Selection store exists but nothing writes to it from 3D interaction.

**Store** (`src/store/selection-store.ts`):
```typescript
interface SelectionState {
  selectedPersonId: string | null;
  isPanelOpen: boolean;
  selectPerson: (id: string | null) => void;
  openPanel: () => void;
  closePanel: () => void;
}
```

**Usage**: Only in `PersonProfilePanel` (which isn't rendered)

**Missing**: Click handler in ConstellationCanvas to call `selectPerson(id)`

---

### 5. No Navigation Menu

**Problem**: Users can only access Settings via dropdown. No way to:
- Return to constellation from settings
- Access onboarding manually
- Discover features

**Current Navigation**:
- Logo → `/` (landing page, not dashboard)
- User dropdown → Settings, Sign out

**Required Navigation**:
- Home/Dashboard link → `/constellation`
- Settings link (existing)
- Help/Tour link → `/onboarding` (optional restart)

---

## Integration Work Required

### Phase 1.X: Integration Sprint

| Task | Effort | Files |
|------|--------|-------|
| Wire PersonProfilePanel to constellation page | 2-4 hrs | `constellation/page.tsx` |
| Add 3D click handler for selection | 2-4 hrs | `constellation-canvas.tsx`, `constellation.ts` |
| Connect selection store to panel | 1-2 hrs | `constellation/page.tsx` |
| Pass onPersonSelect to AppShell | 30 min | `constellation/page.tsx` |
| Fix post-auth redirect to include onboarding | 1-2 hrs | `register/page.tsx`, `login/page.tsx` |
| Add navigation improvements | 2-4 hrs | `app-shell.tsx` |
| Integration tests for full flow | 4-8 hrs | New test files |

**Estimated Total**: 12-24 hours

---

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│                     WORKING (Green)                          │
├─────────────────────────────────────────────────────────────┤
│  Login/Register → Auth Provider → Constellation Page         │
│                                                              │
│  Settings Page → SettingsForm → GraphQL → Database          │
│               → SecuritySettings → Firebase Auth             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     ORPHANED (Red)                           │
├─────────────────────────────────────────────────────────────┤
│  ❌ 3D Click → Selection Store → PersonProfilePanel          │
│                                  ├─ PersonNotesTab           │
│                                  │   └─ NoteEditor           │
│                                  ├─ PersonEventsTab          │
│                                  │   └─ EventForm            │
│                                  ├─ PersonMediaTab           │
│                                  │   └─ MediaUploader        │
│                                  └─ PersonRelationshipsTab   │
│                                                              │
│  ❌ SearchBar (disabled - no callback)                       │
│                                                              │
│  ⚠️ OnboardingWizard (route exists, unreachable)            │
└─────────────────────────────────────────────────────────────┘
```

---

## Verification Commands

After integration work is complete:

```bash
# Manual test checklist:
# 1. Register new account
# 2. Should redirect to onboarding
# 3. Complete onboarding steps
# 4. Should redirect to constellation with people
# 5. Click a star
# 6. Profile panel should open
# 7. Can view/add notes, events, media
# 8. Search bar should be visible and functional
# 9. Can navigate to settings and back

# Run all tests
npm test

# Type check
npx tsc --noEmit
```

---

## Recommendations

### Option A: Integration Phase (Recommended)
Add a **Phase 1.X: Integration** before continuing to 1.10-1.12. This ensures the core product is usable before adding billing and polish.

### Option B: Include in Phase 1.12 Polish
Fold integration work into the polish phase, but risks shipping an incomplete product.

### Option C: Immediate Fix
Pause remaining phases and fix integration immediately before proceeding.

---

## Conclusion

The TDD approach has produced well-tested components, but integration testing and end-to-end flows were not part of the phase plans. The core product experience (viewing and managing people in the constellation) is **not functional** despite passing 796 tests.

**Recommendation**: Address integration gaps as **Phase 1.X** before continuing to Subscription (1.10), Export (1.11), and Polish (1.12).

---

*Audit completed: 2026-01-13*
