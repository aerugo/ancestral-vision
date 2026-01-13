# Phase 0: Foundation - Work Notes

**Feature**: Technical foundation for Ancestral Vision
**Started**: 2026-01-12
**Branch**: `feature/phase-0-foundation`

---

## Session Log

### 2026-01-13 - Phase 0.6 UI Foundation Complete

**Context**: Implemented Phase 0.6 (UI Foundation) following strict TDD principles.

**Completed**:

1. **shadcn/ui Setup**:
   - Created `components.json` configuration
   - Updated `globals.css` with CSS variables for dark theme
   - Updated `tailwind.config.ts` with shadcn colors and border-radius
   - Added `cn()` utility function to `src/lib/utils.ts`

2. **UI Components Created**:
   - Button, Input, Label, Card, DropdownMenu, Avatar
   - All using Radix UI primitives with class-variance-authority

3. **Landing Page (4 tests)**:
   - Displays app title and description
   - "Get Started" button links to /register
   - "Sign In" button links to /login

4. **Login Page (7 tests)**:
   - Email and password form with Zod validation
   - Shows error messages for invalid input
   - Redirects to /constellation on success
   - Links to /register for new users

5. **Register Page (5 tests)**:
   - Email, password, confirm password form
   - Validates password match and minimum length
   - Redirects to /constellation on success

6. **App Shell (7 tests)**:
   - Navigation bar with app title
   - User menu when authenticated (avatar, settings, sign out)
   - Sign In button when not authenticated
   - Canvas container for 3D content

7. **Providers Aggregation (5 tests)**:
   - ThemeProvider (next-themes)
   - AuthProvider (Firebase Auth)
   - QueryProvider (TanStack Query)
   - Proper nesting order

**Test Results**:

```
Test Files  22 passed (22)
Tests       187 passed (187)
```

**Invariants Enforced**:

- INV-U001: Dark theme is default (cosmic aesthetic)
- INV-U002: All pages accessible via keyboard navigation
- INV-U003: Form validation uses Zod schemas

**Success Criteria Met**:

- [x] All UI component tests pass
- [x] Landing page renders correctly
- [x] Login/register forms validate input
- [x] App shell displays user state
- [x] Type check passes

---

### 2026-01-13 - Phase 0.5 State Management Complete

**Context**: Implemented Phase 0.5 (State Management) following strict TDD principles.

**Completed**:

1. **Dependencies Installed**:
   - zustand (client state)
   - @tanstack/react-query (server state)
   - graphql-request (GraphQL client)

2. **Zustand Stores Created (28 tests)**:
   - `src/store/auth-store.ts` - Auth state (user, token, isAuthenticated)
   - `src/store/ui-store.ts` - UI state (theme, viewMode, selectedPerson, panel, camera)
   - Both stores use persist middleware for localStorage

3. **GraphQL Client Created (5 tests)**:
   - `src/lib/graphql-client.ts` - Client with auth header middleware
   - Automatically includes Bearer token from auth store

4. **TanStack Query Hooks Created (23 tests)**:
   - `src/hooks/use-me.ts` - Current user query
   - `src/hooks/use-constellation.ts` - Constellation query and create mutation
   - `src/hooks/use-people.ts` - People queries and create mutation

5. **QueryProvider Component Created (3 tests)**:
   - `src/components/providers/query-provider.tsx` - TanStack Query provider
   - Configured with sensible defaults (staleTime, gcTime, retry)

**Test Results**:

```
Test Files  17 passed (17)
Tests       159 passed (159)
```

**Invariants Enforced**:

- INV-A005: TanStack Query is the only way to fetch server data
- INV-A006: Zustand stores handle only client/UI state
- INV-A007: GraphQL client automatically includes auth token

**Success Criteria Met**:

- [x] All store tests pass
- [x] All hook tests pass
- [x] Auth store persists token
- [x] UI store persists theme preference
- [x] GraphQL client includes auth header
- [x] Type check passes

---

### 2026-01-12 - TDD Completion Plan Created

**Context Review Completed**:

- Reviewed implementation status of phases 0.1-0.4
- Identified divergences from original plan
- Created comprehensive TDD completion plan

**Key Findings from Implementation Review**:

1. **Phase 0.1 (~55% complete)**:
   - Missing: `.env.local.example` template
   - Missing: `tests/setup/config.test.ts` validation tests
   - Issue: Vitest environment set to `node` instead of `jsdom`

2. **Phase 0.2 (~125% complete - over-delivered)**:
   - Complete Prisma schema implemented (16 models vs. planned 3)
   - Missing: Schema validation tests (`src/lib/prisma.test.ts`)
   - Missing: Seed script (`prisma/seed.ts`)

3. **Phase 0.3 (0% complete)**:
   - Entirely skipped - no Firebase Auth implementation

4. **Phase 0.4 (0% complete)**:
   - Entirely skipped - no GraphQL API implementation

**Completed**:

- [x] Created `completion-plan.md` with strict TDD approach
- [x] Documented ~55 tests to be written
- [x] Defined RED → GREEN → REFACTOR steps for each component
- [x] Included full code examples for tests and implementations

**Next Steps**:

1. Begin Phase 0.1 completion (config tests, env template)
2. Add Phase 0.2 tests and seed script
3. Implement Phase 0.3 Firebase Auth (TDD)
4. Implement Phase 0.4 GraphQL API (TDD)

**Reference**: [completion-plan.md](completion-plan.md)

---

### 2026-01-12 - Initial Planning

**Context Review Completed**:

- Read `docs/plans/grand_plan/01_summary.md` - Understood project vision (3D genealogy constellation)
- Read `docs/plans/grand_plan/02_pitch.md` - Understood value propositions and differentiators
- Read `docs/plans/grand_plan/07_technology_decisions.md` - Full tech stack decisions
- Read `docs/plans/grand_plan/08_data_model.md` - Complete data model with Prisma schema preview
- Read `docs/plans/grand_plan/11_deployment_operations.md` - GCP infrastructure plan
- Read `docs/plans/grand_plan/12_roadmap.md` - Phase 0 deliverables and success criteria
- Read `docs/plans/CLAUDE.md` - Planning protocol for AI agents
- Explored codebase - confirmed no implementation code exists yet

**Key Insights**:

1. **Two reference prototypes exist**:
   - `family-constellations/` - Working TypeScript/Three.js 3D engine (~6,500 lines)
   - `ancestral-synth/` - Python AI generation (for later phases)

2. **Clear tech stack decisions made**:
   - Frontend: Next.js 15+, React 19, TanStack Query, Zustand, Tailwind, shadcn/ui
   - Backend: GraphQL Yoga in Next.js API routes, Prisma + PostgreSQL
   - Auth: Firebase Auth
   - 3D: Three.js with WebGPU (WebGL fallback)
   - Infra: GCP (Cloud Run, Cloud SQL, Cloud Storage)

3. **Phase 0 scope from roadmap** (12_roadmap.md):
   - Infrastructure setup (GCP projects, Cloud Run, Cloud SQL, Cloud Storage)
   - Development environment (Docker Compose PostgreSQL, Firebase Emulator)
   - Application foundation (Next.js, GraphQL Yoga, Prisma schema)
   - 3D foundation (Three.js integration, camera controls, placeholder scene)

4. **Success criteria** (from roadmap):
   - Can register, login, logout via Firebase Auth
   - Can deploy to Cloud Run (dev environment)
   - Basic 3D scene renders with placeholder constellation
   - GraphQL playground accessible at /api/graphql
   - All CI checks pass (lint, typecheck, test)

**Applicable Invariants**:

Since this is Phase 0, we're establishing invariants rather than respecting existing ones. Key constraints come from:

- `07_technology_decisions.md` - Tech stack choices are decided
- `08_data_model.md` - Data model structure is defined
- `10_security_privacy.md` - Security requirements are specified
- `13_development.md` - TDD and type safety required

**Completed**:

- [x] Created planning directory structure
- [x] Created spec.md with acceptance criteria
- [x] Created development-plan.md with 8 sub-phases
- [x] Created work-notes.md (this file)

**Next Steps**:

1. Create detailed phase plans for each sub-phase (0.1 through 0.8)
2. Begin Phase 0.1 (Project Setup) implementation
3. Follow strict TDD - write tests before implementation

---

## Phase Progress

### Phase 0.1: Project Setup

**Status**: Pending
**Started**:
**Completed**:

#### Test Results

```
(not yet run)
```

#### Results

- (pending)

#### Notes

- (pending)

---

### Phase 0.2: Database & Prisma

**Status**: Pending
**Started**:
**Completed**:

---

### Phase 0.3: Firebase Auth

**Status**: Pending
**Started**:
**Completed**:

---

### Phase 0.4: GraphQL API

**Status**: Pending
**Started**:
**Completed**:

---

### Phase 0.5: State Management

**Status**: Complete
**Started**: 2026-01-13
**Completed**: 2026-01-13

#### Test Results

```
src/store/auth-store.test.ts (10 tests) ✓
src/store/ui-store.test.ts (18 tests) ✓
src/lib/graphql-client.test.ts (5 tests) ✓
src/hooks/use-constellation.test.tsx (7 tests) ✓
src/hooks/use-me.test.tsx (4 tests) ✓
src/hooks/use-people.test.tsx (8 tests) ✓
src/components/providers/query-provider.test.tsx (3 tests) ✓
```

#### Files Created

- `src/store/auth-store.ts` - Auth state with persistence
- `src/store/auth-store.test.ts` - 10 tests
- `src/store/ui-store.ts` - UI state with persistence
- `src/store/ui-store.test.ts` - 18 tests
- `src/store/index.ts` - Store exports
- `src/lib/graphql-client.ts` - GraphQL client with auth headers
- `src/lib/graphql-client.test.ts` - 5 tests
- `src/hooks/use-constellation.ts` - Constellation queries/mutations
- `src/hooks/use-constellation.test.tsx` - 7 tests
- `src/hooks/use-me.ts` - Current user query
- `src/hooks/use-me.test.tsx` - 4 tests
- `src/hooks/use-people.ts` - People queries/mutations
- `src/hooks/use-people.test.tsx` - 8 tests
- `src/hooks/index.ts` - Hook exports
- `src/components/providers/query-provider.tsx` - TanStack Query provider
- `src/components/providers/query-provider.test.tsx` - 3 tests

---

### Phase 0.6: UI Foundation

**Status**: Complete
**Started**: 2026-01-13
**Completed**: 2026-01-13

#### Test Results

```
src/app/page.test.tsx (4 tests) ✓
src/app/(auth)/login/page.test.tsx (7 tests) ✓
src/app/(auth)/register/page.test.tsx (5 tests) ✓
src/components/app-shell.test.tsx (7 tests) ✓
src/components/providers/providers.test.tsx (5 tests) ✓
```

#### Files Created

- `components.json` - shadcn/ui configuration
- `src/lib/utils.ts` - cn() utility for class merging
- `src/components/ui/button.tsx` - Button component
- `src/components/ui/input.tsx` - Input component
- `src/components/ui/label.tsx` - Label component
- `src/components/ui/card.tsx` - Card components
- `src/components/ui/dropdown-menu.tsx` - Dropdown menu component
- `src/components/ui/avatar.tsx` - Avatar component
- `src/app/page.tsx` - Landing page with CTA buttons
- `src/app/page.test.tsx` - Landing page tests (4 tests)
- `src/app/(auth)/login/page.tsx` - Login page with form validation
- `src/app/(auth)/login/page.test.tsx` - Login page tests (7 tests)
- `src/app/(auth)/register/page.tsx` - Register page with form validation
- `src/app/(auth)/register/page.test.tsx` - Register page tests (5 tests)
- `src/components/app-shell.tsx` - App shell with nav and canvas container
- `src/components/app-shell.test.tsx` - App shell tests (7 tests)
- `src/components/providers/theme-provider.tsx` - Theme provider wrapper
- `src/components/providers/index.tsx` - Providers aggregation
- `src/components/providers/providers.test.tsx` - Providers tests (5 tests)

#### Files Modified

- `src/app/globals.css` - Added shadcn CSS variables for dark theme
- `tailwind.config.ts` - Added shadcn colors and border-radius
- `src/app/layout.tsx` - Updated to use Providers with dark theme

---

### Phase 0.7: 3D Foundation

**Status**: Pending
**Started**:
**Completed**:

---

### Phase 0.8: CI/CD & Deployment

**Status**: Pending
**Started**:
**Completed**:

---

## Key Decisions

### Decision 1: Sub-phase Structure

**Date**: 2026-01-12
**Context**: Phase 0 is large (entire foundation). How to break it down?
**Decision**: 8 sub-phases with clear dependencies
**Rationale**: Each sub-phase is independently testable and deployable
**Alternatives Considered**:
- Single monolithic phase (rejected - too large to track)
- Feature-based phases (rejected - infrastructure has dependencies)

### Decision 2: WebGPU vs WebGL First

**Date**: 2026-01-12
**Context**: Which 3D renderer to implement first?
**Decision**: WebGPU-first with automatic WebGL fallback
**Rationale**: Per 07_technology_decisions.md F7 - WebGPU is the future, and Three.js r171+ has built-in fallback
**Alternatives Considered**:
- WebGL only (rejected - doesn't leverage modern capabilities)
- Separate implementations (rejected - unnecessary complexity)

---

## Files Modified

### Created

- `docs/plans/active/phase-0-foundation/spec.md` - Feature specification
- `docs/plans/active/phase-0-foundation/development-plan.md` - Phased implementation plan
- `docs/plans/active/phase-0-foundation/work-notes.md` - This file
- `docs/plans/active/phase-0-foundation/phases/` - Directory for phase plans

**Phase 0.5 Files**:
- `src/store/auth-store.ts` - Auth state management
- `src/store/auth-store.test.ts` - Auth store tests
- `src/store/ui-store.ts` - UI state management
- `src/store/ui-store.test.ts` - UI store tests
- `src/store/index.ts` - Store exports
- `src/lib/graphql-client.ts` - GraphQL client with auth
- `src/lib/graphql-client.test.ts` - GraphQL client tests
- `src/hooks/use-me.ts` - Current user hook
- `src/hooks/use-me.test.tsx` - useMe tests
- `src/hooks/use-constellation.ts` - Constellation hooks
- `src/hooks/use-constellation.test.tsx` - Constellation hook tests
- `src/hooks/use-people.ts` - People hooks
- `src/hooks/use-people.test.tsx` - People hook tests
- `src/hooks/index.ts` - Hook exports
- `src/components/providers/query-provider.tsx` - TanStack Query provider
- `src/components/providers/query-provider.test.tsx` - QueryProvider tests

**Phase 0.6 Files**:
- `components.json` - shadcn/ui configuration
- `src/lib/utils.ts` - cn() utility function
- `src/components/ui/button.tsx` - Button component
- `src/components/ui/input.tsx` - Input component
- `src/components/ui/label.tsx` - Label component
- `src/components/ui/card.tsx` - Card components
- `src/components/ui/dropdown-menu.tsx` - Dropdown menu component
- `src/components/ui/avatar.tsx` - Avatar component
- `src/app/page.tsx` - Landing page
- `src/app/page.test.tsx` - Landing page tests
- `src/app/(auth)/login/page.tsx` - Login page
- `src/app/(auth)/login/page.test.tsx` - Login page tests
- `src/app/(auth)/register/page.tsx` - Register page
- `src/app/(auth)/register/page.test.tsx` - Register page tests
- `src/components/app-shell.tsx` - App shell component
- `src/components/app-shell.test.tsx` - App shell tests
- `src/components/providers/theme-provider.tsx` - Theme provider
- `src/components/providers/index.tsx` - Providers aggregation
- `src/components/providers/providers.test.tsx` - Providers tests

### Modified

- `package.json` - Added zustand, @tanstack/react-query, graphql-request, radix-ui components, react-hook-form, zod, next-themes, clsx, tailwind-merge, class-variance-authority
- `src/app/globals.css` - Added shadcn CSS variables
- `tailwind.config.ts` - Added shadcn colors and border-radius
- `src/app/layout.tsx` - Updated to use Providers

---

## Documentation Updates Required

### INVARIANTS.md Changes

After Phase 0 implementation:

- [ ] Create `docs/invariants/INVARIANTS.md` with initial structure
- [ ] Add INV-D001: Person IDs are globally unique UUIDs (v4)
- [ ] Add INV-D002: User IDs are Firebase UIDs (string, not UUID)
- [ ] Add INV-D003: Every Person belongs to exactly one Constellation
- [ ] Add INV-S001: All GraphQL mutations require authenticated user
- [ ] Add INV-S002: Users can only access their own Constellation
- [ ] Add INV-A001: WebGPURenderer must be initialized with `await renderer.init()`
- [ ] Add INV-A002: Use `renderer.setAnimationLoop()` not `requestAnimationFrame()`

### Other Documentation

- [ ] `README.md` - Add setup instructions after Phase 0
- [ ] `.claude/agents/` - Update if new patterns emerge

---

## Blockers & Issues

(None currently)

---

## References

- [Development Plan](development-plan.md)
- [Spec](spec.md)
- [Tech Decisions](../../grand_plan/07_technology_decisions.md)
- [Data Model](../../grand_plan/08_data_model.md)
- [Roadmap](../../grand_plan/12_roadmap.md)
