# Phase 6: Cleanup & Documentation

**Status**: Pending
**Started**:
**Parent Plan**: [development-plan.md](../development-plan.md)

---

## Objective

Deprecate old biography flow, clean up dead code, add documentation, and ensure all invariants are properly documented.

---

## TDD Steps

### Step 6.1: Deprecate Old Biography Flow

**Tasks**:

1. Mark `src/ai/flows/biography.ts` as deprecated
2. Add deprecation warning to old `generateBiography` function
3. Update imports in resolvers to use new flow
4. Remove old mocks from tests

**Test Cases**:

1. `it('should warn when using deprecated flow')` - Console warning
2. `it('should redirect deprecated calls to new flow')` - Compatibility

### Step 6.2: Remove Old Code (After Verification)

Only after confirming no external dependencies:

1. Remove `src/ai/flows/biography.ts` (old flow)
2. Remove `src/ai/flows/biography.test.ts` (old tests)
3. Update `src/ai/schemas/biography.ts` to export v2 as default
4. Clean up old schema exports

### Step 6.3: Update Documentation

Create `docs/features/biography-generation.md`:

```markdown
# Biography Generation

## Overview

Ancestral Vision uses AI to generate factual biographies for ancestors
based on documented sources. The system enforces strict source verification
to prevent speculation or fabrication.

## Requirements

A person must have at least one of the following to enable biography generation:
- Notes attached to their profile
- Events they participated in

Persons with only basic details (name, dates) are not eligible.

## How It Works

### 1. Eligibility Check
Before generation begins, the system verifies the person has sufficient
source material. If not, the user is prompted to add notes or events.

### 2. Source Assembly
The system gathers all available source material:
- Person details (name, dates, places, occupation)
- Notes attached to the person
- Events the person participated in

### 3. Context Mining
Related persons are analyzed to find relevant context:
- Parents, children, siblings
- Spouses and co-parents
- Only facts likely important to the subject are included

### 4. Generation
AI generates a biography with explicit citations for every claim.
Each sentence must reference its source material.

### 5. Validation
The generated biography is validated to ensure:
- Every claim has a valid citation
- Citations match actual source content
- No speculative language
- No fabricated details

### 6. User Approval
The biography is presented as a suggestion. The user must:
- Review the generated content
- Approve to apply it to the profile
- Or reject and optionally request regeneration

## Invariants

| Code | Rule |
|------|------|
| INV-AI006 | Every claim must cite its source |
| INV-AI007 | Generation requires notes or events |

## API

### Check Eligibility
```graphql
query {
  biographyEligibility(personId: "...") {
    isEligible
    reason
    missingRequirements
  }
}
```

### Generate Biography
```graphql
mutation {
  generateBiography(personId: "...") {
    suggestionId
    biography
    wordCount
    isValid
    confidenceScore
    sourceSummary {
      personDetailsUsed
      notesUsed
      eventsUsed
      relativeContextUsed
    }
  }
}
```

### Approve/Reject Suggestion
```graphql
mutation {
  approveAISuggestion(suggestionId: "...")
  rejectAISuggestion(suggestionId: "...")
}
```
```

### Step 6.4: Update Invariants Documentation

Add to `docs/invariants.md`:

```markdown
## AI Content Verification (Phase 2.2.1)

### INV-AI006: Biography Content Must Be Source-Verified

Every factual claim in a generated biography must cite its source.
Sources include:
- Person details (birthDate, deathDate, etc.)
- Notes (by ID)
- Events (by ID)
- Related person context (by person name)

The validation phase checks that citations are valid and match actual content.

### INV-AI007: Biography Requires Source Material

Biography generation is only available for persons with at least one:
- Note attached to their profile
- Event they participated in

Persons with only basic details are not eligible. This prevents
the AI from generating speculative content.
```

### Step 6.5: Add JSDoc to All New Code

Ensure all exported functions have JSDoc comments:

```typescript
/**
 * Check if a person is eligible for AI biography generation.
 *
 * A person is eligible if they have at least one note or event.
 * Persons with only basic details (name, dates) are not eligible.
 *
 * @param personId - The ID of the person to check
 * @returns Eligibility status with reason and missing requirements
 *
 * @invariant INV-AI007 - Biography Requires Source Material
 */
export async function checkBiographyEligibility(
  personId: string
): Promise<BiographyEligibility> {
  // ...
}
```

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/ai/flows/biography.ts` | DELETE | Remove deprecated flow |
| `src/ai/flows/biography.test.ts` | DELETE | Remove deprecated tests |
| `docs/features/biography-generation.md` | CREATE | User/developer documentation |
| `docs/invariants.md` | MODIFY | Add new invariants |
| `src/ai/flows/biography/*.ts` | MODIFY | Add JSDoc comments |

---

## Completion Criteria

- [ ] Old biography flow removed
- [ ] All imports updated to new flow
- [ ] Feature documentation written
- [ ] Invariants documented
- [ ] All exported functions have JSDoc
- [ ] No TypeScript errors
- [ ] All tests pass
- [ ] No unused exports

---

## Final Checklist

Before marking Phase 2.2.1 complete:

- [ ] ~69 tests added and passing
- [ ] All 5 new invariants enforced (INV-AI006, INV-AI007)
- [ ] Old flow deprecated and removed
- [ ] Documentation complete
- [ ] GraphQL schema updated
- [ ] No speculation in generated biographies
- [ ] Source citations on every claim
