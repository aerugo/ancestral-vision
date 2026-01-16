# Template Mode for Visual Testing - Development Plan

**Status**: Complete
**Created**: 2026-01-15
**Branch**: `feature/template-mode`
**Spec**: [spec.md](spec.md)

## Summary

Implement a `--template` flag for the dev server that automatically seeds the database with data from `data/example-genealogy.json` and bypasses authentication/onboarding, enabling rapid visual testing of the 3D constellation.

## Critical Invariants to Respect

Reference invariants from `docs/invariants/INVARIANTS.md`:

- **INV-D001**: Person IDs are globally unique UUIDs - Template import preserves original IDs from JSON
- **INV-D002**: A person cannot be their own ancestor - JSON data already validated
- **INV-S001**: All API endpoints require authentication except health/share - Template mode bypasses via mock auth, development only

**New invariants introduced** (to be added to INVARIANTS.md after implementation):

- **NEW INV-D010**: Template Mode Development Only - Template mode MUST only be available when NODE_ENV=development

## Current State Analysis

### Current Development Workflow
1. Start `npm run dev`
2. Register with Firebase emulator
3. Complete onboarding wizard (add self, parents, grandparents)
4. View constellation with 3-4 people

### Problem
- Visual testing requires rich data (100+ people, relationships)
- Manual data entry is time-consuming
- Each dev session requires repeat setup

### Solution
- `--template` flag auto-seeds database with example genealogy
- Mock auth bypasses Firebase for immediate access
- Onboarding marked complete to skip wizard

### Files to Modify

| File | Current State | Planned Changes |
|------|---------------|-----------------|
| `package.json` | Standard dev script | Add `dev:template` script |
| `src/lib/auth.ts` | Firebase-only auth | Add template mode check |
| `src/components/providers/auth-provider.tsx` | Firebase auth state | Template mode mock user |
| `src/store/auth-store.ts` | Persists Firebase token | Support template token |
| `src/app/(app)/constellation/page.tsx` | Redirects if not auth'd | Skip redirect in template mode |

### Files to Create

| File | Purpose |
|------|---------|
| `prisma/seed-template.ts` | Seed script for template data |
| `prisma/seed-template.test.ts` | Tests for template seeding |
| `src/lib/template-mode.ts` | Template mode detection utilities |
| `src/lib/template-mode.test.ts` | Tests for template mode utils |
| `scripts/dev-template.sh` | Shell script to start template mode |

## Solution Design

```
┌─────────────────────────────────────────────────────────────────┐
│                    Template Mode Flow                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   npm run dev:template                                          │
│         │                                                        │
│         ▼                                                        │
│   ┌─────────────┐    ┌─────────────────┐                        │
│   │ Set ENV var │───▶│ Run seed script │                        │
│   │ TEMPLATE=1  │    │ seed-template   │                        │
│   └─────────────┘    └────────┬────────┘                        │
│                               │                                  │
│                               ▼                                  │
│                      ┌────────────────┐                         │
│                      │ Check if user  │                         │
│                      │ exists         │                         │
│                      └───────┬────────┘                         │
│                              │                                   │
│              ┌───────────────┴───────────────┐                  │
│              ▼                               ▼                   │
│        ┌──────────┐                   ┌──────────────┐          │
│        │  Exists  │                   │ Not exists   │          │
│        │  Skip    │                   │ Create user  │          │
│        └──────────┘                   │ + data       │          │
│                                       └──────────────┘          │
│                               │                                  │
│                               ▼                                  │
│                      ┌────────────────┐                         │
│                      │ Start Next.js  │                         │
│                      │ dev server     │                         │
│                      └────────┬───────┘                         │
│                               │                                  │
│                               ▼                                  │
│   Browser loads /constellation                                   │
│         │                                                        │
│         ▼                                                        │
│   ┌─────────────────┐                                           │
│   │ AuthProvider    │                                           │
│   │ detects TEMPLATE│                                           │
│   │ mode, sets mock │                                           │
│   │ user            │                                           │
│   └────────┬────────┘                                           │
│            │                                                     │
│            ▼                                                     │
│   ┌─────────────────┐                                           │
│   │ Constellation   │                                           │
│   │ renders with    │                                           │
│   │ 119 people      │                                           │
│   └─────────────────┘                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Environment Variable Based**: Use `NEXT_PUBLIC_TEMPLATE_MODE=true` to signal template mode, detectable on both client and server
2. **Idempotent Seeding**: Seed script checks if template user exists before creating, safe to run multiple times
3. **Mock Auth on Client**: Template mode injects mock user directly into auth state, no Firebase calls
4. **Preserve Original IDs**: Import preserves person IDs from JSON to maintain referential integrity

## Phase Overview

| Phase | Description | TDD Focus | Est. Tests |
|-------|-------------|-----------|------------|
| 1 | Template Seed Script | Import JSON, create user/constellation/people | ~15 tests |
| 2 | Auth Bypass Mechanism | Template mode detection, mock auth | ~10 tests |
| 3 | Dev Server Integration | npm scripts, environment setup | ~5 tests |

## Phase 1: Template Seed Script

**Goal**: Create a Prisma seed script that imports `data/example-genealogy.json` into the database

**Detailed Plan**: [phases/phase-1.md](phases/phase-1.md)

### Deliverables

1. `prisma/seed-template.ts` - Template data seeding script
2. `prisma/seed-template.test.ts` - Tests for seed script
3. `src/lib/genealogy-import.ts` - JSON parsing and transformation utilities
4. `src/lib/genealogy-import.test.ts` - Tests for import utilities

### TDD Approach

1. Write failing tests for JSON parsing (metadata extraction, person mapping)
2. Implement `parseGenealogyJson()` function
3. Write failing tests for database seeding (user creation, person import)
4. Implement `seedTemplateData()` function
5. Refactor for clarity

### Success Criteria

- [ ] All tests pass
- [ ] Type check passes (`npx tsc --noEmit`)
- [ ] Lint passes (`npm run lint`)
- [ ] Running `npx ts-node prisma/seed-template.ts` creates template user with full genealogy

## Phase 2: Auth Bypass Mechanism

**Goal**: Enable client-side mock authentication when template mode is active

**Detailed Plan**: [phases/phase-2.md](phases/phase-2.md)

### Deliverables

1. `src/lib/template-mode.ts` - Template mode detection utilities
2. `src/lib/template-mode.test.ts` - Tests for utilities
3. Modified `src/components/providers/auth-provider.tsx` - Template mode support

### TDD Approach

1. Write failing tests for template mode detection
2. Implement `isTemplateMode()` and `getTemplateUser()` functions
3. Write failing tests for auth provider template mode behavior
4. Modify auth provider to support template mode
5. Refactor for clarity

### Success Criteria

- [ ] All tests pass
- [ ] Template mode correctly detected from environment
- [ ] Mock user injected when template mode active
- [ ] Regular auth flow unchanged when template mode inactive

## Phase 3: Dev Server Integration

**Goal**: Create npm scripts and environment configuration for template mode

**Detailed Plan**: [phases/phase-3.md](phases/phase-3.md)

### Deliverables

1. Modified `package.json` - Add `dev:template` script
2. `scripts/dev-template.sh` - Shell script for template mode startup
3. Documentation in README or CONTRIBUTING.md

### TDD Approach

1. Write integration test that verifies template mode starts correctly
2. Create shell script that sets environment and runs seed + dev
3. Add npm script entry
4. Verify end-to-end workflow

### Success Criteria

- [ ] `npm run dev:template` starts dev server with template mode
- [ ] Template user created if not exists
- [ ] Browser loads directly to /constellation with 119 people
- [ ] Regular `npm run dev` unchanged

## Testing Strategy

### Unit Tests (co-located with source)

- `src/lib/genealogy-import.test.ts`: JSON parsing, field mapping
- `src/lib/template-mode.test.ts`: Environment detection, mock user generation

### Integration Tests

- `prisma/seed-template.test.ts`: Database seeding, relationship creation

### E2E Tests (optional, manual verification acceptable)

- Visual verification that constellation renders correctly with template data

## Documentation Updates

After implementation is complete:

- [ ] `docs/invariants/INVARIANTS.md` - Add INV-D010 (Template Mode Development Only)
- [ ] README.md - Add section on template mode for development
- [ ] CONTRIBUTING.md - Document visual testing workflow

## Progress Tracking

| Phase | Status | Started | Completed | Notes |
|-------|--------|---------|-----------|-------|
| Phase 1 | Complete | 2026-01-15 | 2026-01-15 | Template seed script (35 tests) |
| Phase 2 | Complete | 2026-01-15 | 2026-01-15 | Auth bypass (9 tests) |
| Phase 3 | Complete | 2026-01-15 | 2026-01-15 | Dev server integration |

---

*Template version: 1.0*
