# Template Mode for Visual Testing - Work Notes

**Feature**: Template mode for rapid visual testing of 3D constellation
**Started**: 2026-01-15
**Branch**: `feature/template-mode`

---

## Session Log

### 2026-01-15 - Planning Session

**Context Review Completed**:

- Read `docs/plans/CLAUDE.md` - Understood planning protocol and TDD requirements
- Read `prisma/seed.ts` - Understood existing seeding approach for test data
- Analyzed `data/example-genealogy.json` - Large dataset with 119 persons, relationships
- Analyzed `src/lib/auth.ts` - Firebase token verification, user creation
- Analyzed `src/components/providers/auth-provider.tsx` - Firebase auth state management
- Analyzed `src/app/(app)/constellation/page.tsx` - Auth and onboarding redirects

**Applicable Invariants**:

- INV-D001: Person IDs are globally unique UUIDs - Template import must preserve IDs
- INV-S001: Auth required except health/share - Must bypass safely for dev only

**Key Insights**:

1. **JSON Structure**: `data/example-genealogy.json` contains:
   - `metadata.centeredPersonId` - The person to center the constellation on
   - `persons[]` - Array of person objects with rich biographical data
   - `parent_child_links[]` - Parent-child relationships
   - `spouse_links[]` - Spouse relationships

2. **Field Mapping Required**: JSON uses snake_case (`given_name`), Prisma uses camelCase (`givenName`)

3. **Auth Architecture**: Firebase token verification happens server-side in `verifyAuthToken()`. Template mode needs to:
   - Bypass Firebase on client (mock auth state)
   - Provide mock token for GraphQL requests
   - Or: Create special server-side handling for template user

4. **Onboarding Check**: Constellation page checks `onboarding?.status` and redirects if not COMPLETED

**Completed**:

- [x] Analyzed existing codebase architecture
- [x] Created spec.md with acceptance criteria
- [x] Created development-plan.md with 3 phases
- [x] Created work-notes.md (this file)

**Next Steps**:

1. Create phase-1.md for template seed script
2. Create phase-2.md for auth bypass mechanism
3. Create phase-3.md for dev server integration
4. Begin Phase 1 implementation with TDD

---

## Phase Progress

### Phase 1: Template Seed Script

**Status**: Complete
**Started**: 2026-01-15
**Completed**: 2026-01-15

#### Implementation

- Created `src/lib/genealogy-import.ts` with JSON parsing utilities
- Created `src/lib/genealogy-import.test.ts` with 24 unit tests
- Created `prisma/seed-template.ts` with database seeding
- Created `prisma/seed-template.test.ts` with 11 integration tests

#### Test Results

```
✓ src/lib/genealogy-import.test.ts (24 tests)
✓ prisma/seed-template.test.ts (11 tests)
Total: 35 tests passing
```

#### Issues Resolved

1. JSON uses `child_links` not `parent_child_links` - Updated interface
2. Missing `createdBy` field on relationships - Added to creation calls
3. FuzzyDate/Place types needed Prisma.InputJsonValue casting

---

### Phase 2: Auth Bypass Mechanism

**Status**: Complete
**Started**: 2026-01-15
**Completed**: 2026-01-15

#### Implementation

- Created `src/lib/template-mode.ts` with detection utilities
- Created `src/lib/template-mode.test.ts` with 9 unit tests
- Modified `src/components/providers/auth-provider.tsx` for mock auth
- Modified `src/lib/auth.ts` for server-side template token

#### Test Results

```
✓ src/lib/template-mode.test.ts (9 tests)
Total: 44 tests passing
```

---

### Phase 3: Dev Server Integration

**Status**: Complete
**Started**: 2026-01-15
**Completed**: 2026-01-15

#### Implementation

- Created `scripts/dev-template.sh` shell script
- Added npm scripts to package.json:
  - `dev:template` - Start dev server with template mode
  - `seed:template` - Run seed script
  - `seed:template:force` - Force reseed
- Updated seed-template.ts with FORCE_RESEED support

---

## Key Decisions

### Decision 1: Mock Auth vs Firebase Emulator

**Date**: 2026-01-15
**Context**: Template mode needs to bypass authentication for rapid testing
**Decision**: Use mock auth that injects user state directly, bypassing Firebase entirely
**Rationale**:
- Simpler setup (no Firebase emulator required)
- Faster startup (no Firebase SDK initialization)
- Clearer separation of template mode behavior
**Alternatives Considered**:
- Firebase emulator with pre-created user (rejected: requires emulator setup)
- Service account bypass (rejected: security concerns even in dev)

### Decision 2: Preserve Original JSON IDs

**Date**: 2026-01-15
**Context**: Should we generate new UUIDs or use IDs from the JSON file?
**Decision**: Preserve original IDs from JSON
**Rationale**:
- Maintains referential integrity with relationships
- Enables idempotent seeding (same IDs each run)
- Simplifies debugging (predictable IDs)
**Alternatives Considered**:
- Generate new UUIDs (rejected: would require relationship ID remapping)

### Decision 3: Environment Variable Detection

**Date**: 2026-01-15
**Context**: How should template mode be signaled to the application?
**Decision**: Use `NEXT_PUBLIC_TEMPLATE_MODE=true` environment variable
**Rationale**:
- Works on both client and server (NEXT_PUBLIC_ prefix)
- Clear and explicit opt-in
- Easy to set via npm script
**Alternatives Considered**:
- URL parameter (rejected: would expose mode to users)
- localStorage flag (rejected: persists unexpectedly)

---

## Files Modified

### Created

- `docs/plans/active/template-mode/spec.md` - Feature specification
- `docs/plans/active/template-mode/development-plan.md` - Implementation plan
- `docs/plans/active/template-mode/work-notes.md` - This file
- `docs/plans/active/template-mode/phases/phase-1.md` - Phase 1 detail
- `docs/plans/active/template-mode/phases/phase-2.md` - Phase 2 detail
- `docs/plans/active/template-mode/phases/phase-3.md` - Phase 3 detail
- `src/lib/genealogy-import.ts` - JSON parsing utilities
- `src/lib/genealogy-import.test.ts` - 24 unit tests
- `src/lib/template-mode.ts` - Template mode detection
- `src/lib/template-mode.test.ts` - 9 unit tests
- `prisma/seed-template.ts` - Database seeding script
- `prisma/seed-template.test.ts` - 11 integration tests
- `scripts/dev-template.sh` - Shell script for template mode

### Modified

- `package.json` - Added dev:template, seed:template scripts
- `src/components/providers/auth-provider.tsx` - Template mode mock auth
- `src/lib/auth.ts` - Template token handling

### Deleted

*None*

---

## Documentation Updates Required

### INVARIANTS.md Changes

- [ ] Add INV-D010: Template Mode Development Only

### Other Documentation

- [ ] README.md - Add template mode section
- [ ] CONTRIBUTING.md - Document visual testing workflow

---

*Template version: 1.0*
