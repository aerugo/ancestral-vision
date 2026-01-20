# Phase 1.X.1: Integration Fixes

**Status**: Complete
**Priority**: P0 - Critical Blocker
**Parent Plan**: [../development-plan.md](../development-plan.md)
**Prerequisite**: Phase 1.X Integration (Complete)

---

## Objective

Fix critical integration gaps that prevent the Phase 1 MVP from being functional for new users. The primary issue is that onboarding collects person data but never persists it to the database.

---

## Background

The integration audit (2026-01-13) revealed that while 822 tests pass, the product is non-functional for new users because:

1. **Onboarding doesn't create people** - Data collected but never persisted
2. **PersonMediaTab not rendered** - Placeholder text instead of component
3. **No relationship management UI** - Hooks exist but no UI
4. **PersonForm is orphaned** - Never imported/rendered anywhere

### User Journey (Current - Broken)

```
Register → Onboarding (5 steps) → "COMPLETED" → Constellation page → EMPTY (no people)
                ↓
         savedData JSON (abandoned)
```

### User Journey (Expected - Fixed)

```
Register → Onboarding (5 steps) → Create People → Constellation page → See stars
                                       ↓
                              Person records in DB
                                       ↓
                              Relationships created
```

---

## Tasks

### Task 1: Fix Onboarding Data Persistence (P0 - BLOCKER)

**Goal**: When onboarding completes, create Person records from collected data

**File**: `src/graphql/resolvers/onboarding-resolvers.ts`

**Current behavior** (broken):
```typescript
completeOnboarding: async (_, __, { user }) => {
  // Only updates status, savedData is abandoned
  return prisma.onboardingProgress.update({
    where: { userId: user.id },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });
}
```

**Required behavior**:
```typescript
completeOnboarding: async (_, __, { user }) => {
  const progress = await prisma.onboardingProgress.findUnique({
    where: { userId: user.id },
  });

  const savedData = progress?.savedData as Record<string, unknown>;

  // 1. Create self person (generation 0)
  const selfData = savedData?.ADD_SELF as PersonData | undefined;
  let selfPerson = null;
  if (selfData?.givenName) {
    selfPerson = await prisma.person.create({
      data: {
        constellationId: user.constellationId,
        givenName: selfData.givenName,
        surname: selfData.surname,
        generation: 0,
      },
    });
  }

  // 2. Create parents (generation -1)
  const parentsData = savedData?.ADD_PARENTS as ParentData | undefined;
  // ... create father, mother, link relationships

  // 3. Create grandparents (generation -2)
  // ... create grandparents, link relationships

  // 4. Mark complete
  return prisma.onboardingProgress.update({
    where: { userId: user.id },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });
}
```

**Tests to add**:
- `it('should create self person from savedData.ADD_SELF')`
- `it('should create parents from savedData.ADD_PARENTS')`
- `it('should create parent-child relationships')`
- `it('should set correct generation numbers')`
- `it('should handle missing optional fields gracefully')`
- `it('should not create duplicate people on retry')`

**Acceptance criteria**:
- [ ] Self person created with generation 0
- [ ] Parents created with generation -1
- [ ] Grandparents created with generation -2
- [ ] Parent-child relationships created
- [ ] Spouse relationships created for married couples
- [ ] Empty/skipped steps handled gracefully
- [ ] Idempotent (safe to retry)

**Effort**: 3-4 hours

---

### Task 2: Render PersonMediaTab (P1)

**Goal**: Replace placeholder with actual media component

**File**: `src/components/person-profile-panel.tsx`

**Current** (line ~228):
```tsx
{activeTab === 'photos' && (
  <p className="text-sm text-muted-foreground">No photos uploaded yet.</p>
)}
```

**Required**:
```tsx
// Add import at top
import { PersonMediaTab } from './person-media-tab';

// Replace placeholder
{activeTab === 'photos' && selectedPersonId && (
  <PersonMediaTab personId={selectedPersonId} />
)}
```

**Tests to add**:
- `it('should render PersonMediaTab when photos tab is active')`
- `it('should pass personId to PersonMediaTab')`

**Acceptance criteria**:
- [ ] PersonMediaTab imported
- [ ] PersonMediaTab rendered when photos tab active
- [ ] personId prop passed correctly

**Effort**: 15-30 minutes

---

### Task 3: Add Relationship Management UI (P1)

**Goal**: Allow users to add parents, children, and spouses from profile panel

**Files**:
- `src/components/person-profile-panel.tsx` - Add buttons
- `src/components/add-relationship-dialog.tsx` - New dialog component

**Implementation options**:

**Option A: Inline buttons with dialogs (Recommended)**
```tsx
// In PersonProfilePanel, after family members section
<div className="flex gap-2 mt-4">
  <Button variant="outline" size="sm" onClick={() => setAddingRelation('parent')}>
    + Add Parent
  </Button>
  <Button variant="outline" size="sm" onClick={() => setAddingRelation('child')}>
    + Add Child
  </Button>
  <Button variant="outline" size="sm" onClick={() => setAddingRelation('spouse')}>
    + Add Spouse
  </Button>
</div>

{addingRelation && (
  <AddRelationshipDialog
    personId={selectedPersonId}
    relationshipType={addingRelation}
    onClose={() => setAddingRelation(null)}
  />
)}
```

**Option B: Dropdown menu**
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="sm">+ Add Family Member</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={() => setAddingRelation('parent')}>
      Add Parent
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => setAddingRelation('child')}>
      Add Child
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => setAddingRelation('spouse')}>
      Add Spouse
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**AddRelationshipDialog component**:
```tsx
interface AddRelationshipDialogProps {
  personId: string;
  relationshipType: 'parent' | 'child' | 'spouse';
  onClose: () => void;
}

export function AddRelationshipDialog({ personId, relationshipType, onClose }: Props) {
  // Options:
  // 1. Create new person inline (PersonQuickForm)
  // 2. Search existing people to link

  const createParentChild = useCreateParentChildRelationship();
  const createSpouse = useCreateSpouseRelationship();
  const createPerson = useCreatePerson();

  // Form with PersonQuickForm for new person
  // Or search existing people
  // Create relationship on submit
}
```

**Tests to add**:
- `it('should show Add Parent/Child/Spouse buttons')`
- `it('should open dialog when button clicked')`
- `it('should create relationship and person on submit')`
- `it('should refresh family members after creation')`

**Acceptance criteria**:
- [ ] Add Parent button visible and functional
- [ ] Add Child button visible and functional
- [ ] Add Spouse button visible and functional
- [ ] Dialog allows creating new person or selecting existing
- [ ] Relationship created correctly
- [ ] Panel refreshes to show new family member

**Effort**: 4-5 hours

---

### Task 4: Add Manual Person Creation (P2)

**Goal**: Allow adding people outside of onboarding flow

**Files**:
- `src/components/app-shell.tsx` or `src/app/(app)/constellation/page.tsx`
- `src/components/add-person-dialog.tsx` - New dialog

**Implementation**:
```tsx
// In AppShell or constellation page header
{user && (
  <Button variant="outline" size="sm" onClick={() => setAddingPerson(true)}>
    + Add Person
  </Button>
)}

{addingPerson && (
  <AddPersonDialog onClose={() => setAddingPerson(false)} />
)}
```

**AddPersonDialog**:
```tsx
export function AddPersonDialog({ onClose }: { onClose: () => void }) {
  const createPerson = useCreatePerson();

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Person</DialogTitle>
        </DialogHeader>
        <PersonForm
          onSubmit={async (data) => {
            await createPerson.mutateAsync(data);
            onClose();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
```

**Tests to add**:
- `it('should show Add Person button when authenticated')`
- `it('should open PersonForm dialog when clicked')`
- `it('should create person and close dialog on submit')`
- `it('should add new star to constellation')`

**Acceptance criteria**:
- [ ] Add Person button visible in header/toolbar
- [ ] Dialog opens with PersonForm
- [ ] Person created on submit
- [ ] Dialog closes after successful creation
- [ ] Constellation updates with new star

**Effort**: 2-3 hours

---

## File Changes Summary

| File | Changes |
|------|---------|
| `src/graphql/resolvers/onboarding-resolvers.ts` | Add person creation logic in completeOnboarding |
| `src/components/person-profile-panel.tsx` | Import PersonMediaTab, add relationship buttons |
| `src/components/add-relationship-dialog.tsx` | New file - relationship creation dialog |
| `src/components/add-person-dialog.tsx` | New file - person creation dialog |
| `src/components/app-shell.tsx` OR `src/app/(app)/constellation/page.tsx` | Add Person button |

---

## Test Plan

### Unit Tests (TDD)

For each task, write tests first following RED → GREEN → REFACTOR:

**Task 1 Tests** (`onboarding-resolvers.test.ts`):
```typescript
describe('completeOnboarding', () => {
  it('should create self person from savedData.ADD_SELF');
  it('should create parents from savedData.ADD_PARENTS');
  it('should create grandparents from savedData.ADD_GRANDPARENTS');
  it('should create parent-child relationships');
  it('should create spouse relationships for couples');
  it('should handle missing optional data');
  it('should be idempotent');
});
```

**Task 2 Tests** (`person-profile-panel.test.tsx`):
```typescript
describe('PersonProfilePanel media tab', () => {
  it('should render PersonMediaTab when photos tab active');
  it('should pass personId to PersonMediaTab');
});
```

**Task 3 Tests** (`person-profile-panel.test.tsx`, `add-relationship-dialog.test.tsx`):
```typescript
describe('Relationship management', () => {
  it('should show relationship buttons');
  it('should open AddRelationshipDialog');
  it('should create relationship on submit');
});
```

**Task 4 Tests** (`add-person-dialog.test.tsx`):
```typescript
describe('AddPersonDialog', () => {
  it('should render PersonForm');
  it('should call createPerson on submit');
  it('should close on success');
});
```

### Integration Test (Manual Verification)

Complete user journey test:
1. Register new account
2. Complete onboarding (add self, parents)
3. Verify stars appear in constellation
4. Click star → verify panel opens with correct data
5. Add note → verify it saves
6. Upload photo → verify it appears
7. Add child → verify relationship created
8. Search for person → verify found

---

## Success Criteria

- [ ] New users see their family in constellation after onboarding
- [ ] PersonMediaTab functional (upload, view, delete)
- [ ] Users can add parents/children/spouses from panel
- [ ] Users can add new people manually
- [ ] All existing 822+ tests still pass
- [ ] New tests for all added functionality
- [ ] No regressions in existing features

---

## Dependencies

- Phase 1.1-1.9 complete (all components exist)
- Phase 1.X complete (selection, panel wiring)
- No external dependencies

---

## Estimated Effort

| Task | Effort | Priority |
|------|--------|----------|
| Task 1: Onboarding persistence | 3-4 hours | P0 |
| Task 2: Render PersonMediaTab | 30 minutes | P1 |
| Task 3: Relationship UI | 4-5 hours | P1 |
| Task 4: Manual person creation | 2-3 hours | P2 |
| Testing & verification | 1-2 hours | - |
| **Total** | **11-15 hours** | - |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Onboarding savedData format varies | Medium | High | Validate data structure, handle missing fields |
| Duplicate person creation on retry | Medium | Medium | Add idempotency check before creating |
| Relationship type validation | Low | Medium | Use TypeScript types, validate in resolver |
| Media upload integration issues | Low | Low | Already tested in isolation |

---

## Notes

- Task 1 is the critical path - all other features are blocked until people can be created
- Consider adding a "Skip to constellation" option in onboarding for testing
- May want to add a "seed demo data" feature for development
