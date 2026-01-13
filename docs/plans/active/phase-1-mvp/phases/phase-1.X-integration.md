# Phase 1.X: Integration

**Status**: Pending
**Priority**: P0 - Critical
**Parent Plan**: [../development-plan.md](../development-plan.md)

---

## Objective

Wire all Phase 1 MVP components together into a functional product. Connect the constellation canvas to person selection, enable the profile panel, integrate search, and establish the onboarding flow.

---

## Background

The audit (`../integration-audit.md`) revealed that ~50% of MVP features are orphaned:
- PersonProfilePanel never rendered
- Selection store not connected to 3D canvas
- SearchBar disabled (no callback)
- Onboarding unreachable after signup

**All the pieces exist and are tested. They just need to be connected.**

---

## Existing Assets (Ready to Wire)

| Asset | Location | Status |
|-------|----------|--------|
| `ConstellationSelection` | `src/visualization/selection.ts` | Raycasting ready |
| `CameraAnimator` | `src/visualization/camera-animation.ts` | Animation ready |
| `useSelectionStore` | `src/store/selection-store.ts` | Store ready |
| `PersonProfilePanel` | `src/components/person-profile-panel.tsx` | Component ready |
| `SearchBar` | `src/components/search-bar.tsx` | Component ready |
| `OnboardingWizard` | `src/components/onboarding-wizard.tsx` | Component ready |
| `usePeople` | `src/hooks/use-people.ts` | Hook ready |
| `useOnboarding` | `src/hooks/use-onboarding.ts` | Hook ready |

---

## Integration Tasks

### Task 1: Wire Constellation Canvas to Real Data

**Goal**: Replace placeholder data with real people from API

**Current** (`constellation-canvas.tsx`):
```tsx
const placeholderPeople = generatePlaceholderPeople(10);
const constellation = createConstellationMesh(placeholderPeople);
```

**Required**:
```tsx
// Use usePeople hook to fetch real data
const { data: people } = usePeople();
// Pass to constellation mesh when available
useEffect(() => {
  if (people && people.length > 0) {
    const constellation = createConstellationMesh(people);
    scene.add(constellation);
  }
}, [people]);
```

**Files**:
- `src/components/constellation-canvas.tsx` - Add usePeople, remove placeholder

**Tests**:
- `it('should fetch people on mount')`
- `it('should render constellation with real data')`
- `it('should show empty state when no people')`

---

### Task 2: Add Click Handler for Star Selection

**Goal**: Click a star → select person → open panel

**Current**: No click handler

**Required**:
1. Create ConstellationSelection instance
2. Add click event listener to canvas
3. On click, raycast to find person
4. Call `selectPerson()` from selection store
5. Animate camera to selected star

**Implementation**:
```tsx
// In ConstellationCanvas
const selectionRef = useRef<ConstellationSelection | null>(null);
const animatorRef = useRef<CameraAnimator | null>(null);
const { selectPerson } = useSelectionStore();

// On init
selectionRef.current = new ConstellationSelection(camera, scene);
animatorRef.current = new CameraAnimator(camera);

// Click handler
const handleClick = (event: MouseEvent) => {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  const personId = selectionRef.current?.getIntersectedPerson(x, y);
  if (personId) {
    selectPerson(personId, []); // TODO: fetch connected IDs
    // Animate camera to star position
  }
};

canvas.addEventListener('click', handleClick);
```

**Files**:
- `src/components/constellation-canvas.tsx` - Add selection and click handler

**Tests**:
- `it('should call selectPerson when star clicked')`
- `it('should not select when clicking empty space')`
- `it('should animate camera to selected star')`

---

### Task 3: Render PersonProfilePanel in Constellation Page

**Goal**: Show profile panel when person is selected

**Current** (`constellation/page.tsx`):
```tsx
<AppShell>
  <ConstellationCanvas />
</AppShell>
```

**Required**:
```tsx
import { PersonProfilePanel } from '@/components/person-profile-panel';
import { useSelectionStore } from '@/store/selection-store';

export default function ConstellationPage() {
  const { selectedPersonId, isPanelOpen } = useSelectionStore();

  return (
    <AppShell onPersonSelect={handleSearchSelect}>
      <ConstellationCanvas />
      {isPanelOpen && selectedPersonId && (
        <PersonProfilePanel />
      )}
    </AppShell>
  );
}
```

**Files**:
- `src/app/(app)/constellation/page.tsx` - Add PersonProfilePanel

**Tests**:
- `it('should render PersonProfilePanel when isPanelOpen is true')`
- `it('should hide PersonProfilePanel when isPanelOpen is false')`
- `it('should show panel after selecting a person')`

---

### Task 4: Enable SearchBar

**Goal**: Pass onPersonSelect callback to AppShell to enable search

**Current** (`constellation/page.tsx`):
```tsx
<AppShell>  // No onPersonSelect
```

**Required**:
```tsx
const handleSearchSelect = (personId: string) => {
  selectPerson(personId, []);
  // Optionally animate camera to person
};

<AppShell onPersonSelect={handleSearchSelect}>
```

**Files**:
- `src/app/(app)/constellation/page.tsx` - Pass callback

**Tests**:
- `it('should render SearchBar when onPersonSelect provided')`
- `it('should select person when search result clicked')`

---

### Task 5: Fix Post-Auth Redirect to Onboarding

**Goal**: New users go to onboarding before constellation

**Option A: Redirect in auth pages**:
```tsx
// register/page.tsx
const onSuccess = async () => {
  // Check onboarding status
  const status = await checkOnboardingStatus();
  if (status !== 'COMPLETED' && status !== 'SKIPPED') {
    router.push('/onboarding');
  } else {
    router.push('/constellation');
  }
};
```

**Option B: Redirect in constellation page** (simpler):
```tsx
// constellation/page.tsx
const { data: onboarding, isLoading } = useOnboarding();

useEffect(() => {
  if (!isLoading && onboarding?.status !== 'COMPLETED' &&
      onboarding?.status !== 'SKIPPED') {
    router.push('/onboarding');
  }
}, [onboarding, isLoading]);
```

**Recommended**: Option B - keeps auth pages simple, centralizes logic

**Files**:
- `src/app/(app)/constellation/page.tsx` - Add onboarding check

**Tests**:
- `it('should redirect to onboarding if not completed')`
- `it('should stay on constellation if onboarding completed')`
- `it('should stay on constellation if onboarding skipped')`

---

### Task 6: Improve Navigation

**Goal**: Users can navigate between features

**Current AppShell**:
- Logo → `/` (landing, not dashboard)
- User dropdown → Settings, Sign out

**Required Changes**:
1. Logo → `/constellation` (when logged in)
2. Add "Home" or constellation icon link
3. Consider adding breadcrumbs or back navigation in settings

**Files**:
- `src/components/app-shell.tsx` - Update navigation

**Tests**:
- `it('should link to constellation when logged in')`
- `it('should link to landing when logged out')`

---

## TDD Approach

### Step 1: Write Integration Test Suite (RED)

Create `src/app/(app)/constellation/page.integration.test.tsx`:

```typescript
describe('Constellation Page Integration', () => {
  describe('Data Loading', () => {
    it('should fetch people on mount');
    it('should show loading state while fetching');
    it('should render stars for each person');
  });

  describe('Selection', () => {
    it('should open panel when star clicked');
    it('should show correct person in panel');
    it('should close panel when close button clicked');
  });

  describe('Search', () => {
    it('should render search bar');
    it('should select person from search results');
  });

  describe('Onboarding Redirect', () => {
    it('should redirect to onboarding if not completed');
    it('should not redirect if onboarding completed');
  });
});
```

### Step 2: Implement Integration (GREEN)

1. Update constellation page with all integrations
2. Update ConstellationCanvas with click handler
3. Pass callbacks through component tree

### Step 3: Refactor

1. Extract common selection logic to custom hook
2. Optimize re-renders with useMemo/useCallback
3. Add loading states and error handling

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/app/(app)/constellation/page.tsx` | Add PersonProfilePanel, selection store, onboarding check, search callback |
| `src/components/constellation-canvas.tsx` | Add usePeople, click handler, selection, camera animation |
| `src/components/app-shell.tsx` | Update navigation links |

## Files to Create

| File | Purpose |
|------|---------|
| `src/app/(app)/constellation/page.integration.test.tsx` | Integration tests |
| `src/hooks/use-constellation-selection.ts` | Optional: Extract selection logic |

---

## Success Criteria

- [ ] Constellation renders real people data
- [ ] Clicking a star selects the person
- [ ] Profile panel opens with correct person data
- [ ] Notes/Events/Media tabs work in panel
- [ ] Camera animates to selected star
- [ ] SearchBar is visible and functional
- [ ] Search results select person and open panel
- [ ] New users redirect to onboarding
- [ ] Completed onboarding users stay on constellation
- [ ] Navigation allows returning to constellation from settings
- [ ] All 796+ tests still pass
- [ ] Integration tests pass

---

## Estimated Effort

| Task | Effort |
|------|--------|
| Task 1: Wire real data | 1-2 hours |
| Task 2: Click handler | 2-3 hours |
| Task 3: Render panel | 1 hour |
| Task 4: Enable search | 30 minutes |
| Task 5: Onboarding redirect | 1-2 hours |
| Task 6: Navigation | 1 hour |
| Integration tests | 3-4 hours |
| **Total** | **10-14 hours** |

---

## Dependencies

- Phase 1.1-1.9 complete (all components exist)
- No external dependencies

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| State sync issues between 3D and React | Use refs for 3D state, Zustand for shared state |
| Performance with many people | Implement frustum culling, limit raycast checks |
| Mobile touch handling | Test on touch devices, may need separate phase |

---

## Post-Integration Verification

After completion, manually verify:

1. **New User Flow**:
   - Register → Redirects to onboarding
   - Complete onboarding → Redirects to constellation
   - Stars appear for added people

2. **Returning User Flow**:
   - Login → Constellation with existing people
   - Click star → Panel opens
   - Edit note → Saves correctly

3. **Search Flow**:
   - Type name → Results appear
   - Click result → Person selected, panel opens

4. **Navigation Flow**:
   - From constellation → Settings works
   - From settings → Can return to constellation
   - Logo → Goes to constellation (not landing)

---

*Created: 2026-01-13*
