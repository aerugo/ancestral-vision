# Phase 0: Foundation - Work Notes

**Feature**: Technical foundation for Ancestral Vision
**Started**: 2026-01-12
**Branch**: `feature/phase-0-foundation`

---

## Session Log

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

**Status**: Pending
**Started**:
**Completed**:

---

### Phase 0.6: UI Foundation

**Status**: Pending
**Started**:
**Completed**:

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

### Modified

- (none yet)

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
