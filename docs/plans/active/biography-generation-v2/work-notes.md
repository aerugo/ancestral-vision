# Agentic Biography Generation v2 - Work Notes

**Feature**: Multi-step agentic biography generation with source verification
**Started**: 2026-01-20
**Branch**: `feat/plan`

---

## Session Log

### 2026-01-20 - Planning & Design

**Context Review Completed**:

- Read `docs/plans/CLAUDE.md` - understood planning protocol
- Read `.claude/agents/genkit-agent.md` - understood Genkit best practices
- Analyzed existing `src/ai/flows/biography.ts` - simple single-step flow
- Analyzed existing `src/ai/schemas/biography.ts` - basic input/output schemas
- Reviewed `prisma/schema.prisma` - understood Person, Note, Event relations

**Applicable Invariants**:

- INV-AI001: Must check quota before AI operations
- INV-AI002: Must track usage after successful operations
- INV-AI003: Must create suggestion, not modify Person directly
- INV-AI005: Must validate all AI inputs/outputs with Zod
- INV-S001: All API calls require authentication
- INV-S002: Constellation isolation - only access user's data

**Key Insights**:

1. Current implementation generates from person details only - completely ignores notes and events
2. No mechanism to prevent speculation or made-up information
3. Related people (parents, children, etc.) have valuable context that's currently unused
4. Genkit supports multi-step flows with tools - good for agentic architecture
5. Validation should be a separate step to allow independent testing and retry

**Completed**:

- [x] Reviewed requirements from user
- [x] Reviewed Genkit agent documentation
- [x] Reviewed planning protocol
- [x] Created spec.md with detailed requirements
- [x] Created development-plan.md with 6 phases
- [x] Designed multi-step agentic architecture
- [x] Created phases/phase-1.md - Eligibility & Source Assembly
- [x] Created phases/phase-2.md - Related Context Mining
- [x] Created phases/phase-3.md - Biography Generation with Citations
- [x] Created phases/phase-4.md - Factual Validation
- [x] Created phases/phase-5.md - Integration & GraphQL
- [x] Created phases/phase-6.md - Cleanup & Documentation

**Design Decisions Made**:

1. **5-step agentic flow**: Eligibility → Source Assembly → Context Mining → Generation → Validation
2. **Fail-fast on no sources**: Don't generate if no notes/events exist
3. **Validation as separate AI call**: Allows focused prompting and independent testing
4. **Citations as first-class data**: Every claim must have source reference
5. **Context mining for relatives**: Parents, children, siblings, spouses, co-parents

**Blockers/Issues**:

- None currently

**Next Steps**:

1. ~~Create detailed Phase 1 plan~~ ✓
2. Begin TDD implementation of eligibility check (Phase 1)
3. Implement source material assembly (Phase 1)

---

## Phase Progress

### Phase 1: Eligibility & Source Assembly

**Status**: Complete
**Started**: 2026-01-20
**Completed**: 2026-01-20

#### Results

- 38 tests passing (17 schema + 9 eligibility + 12 source assembly)
- Created `src/ai/schemas/biography-v2.ts` with PersonDetails, NoteSource, EventSource, SourceMaterial schemas
- SourceMaterialSchema enforces INV-AI007 (requires at least one note or event)
- Created `src/ai/flows/biography/eligibility.ts` - checks if person has source material
- Created `src/ai/flows/biography/source-assembly.ts` - gathers all source material
- All TypeScript types correct, no type errors
- Proper mocking pattern established using `vi.hoisted()`

### Phase 2: Related Context Mining

**Status**: Complete
**Started**: 2026-01-20
**Completed**: 2026-01-20

#### Results

- 17 new tests passing (10 findRelatives + 7 extractRelatedContext)
- Total AI tests now at 103 passing
- Extended `src/ai/schemas/biography-v2.ts` with RelatedContext, RelativeInfo, RelevantFact schemas
- Created `src/ai/flows/biography/context-mining.ts`:
  - `findRelatives()` - finds parents, children, siblings, spouses, co-parents
  - `extractRelatedContext()` - uses AI to extract relevant facts from relatives
- Relationship types supported: parent, child, sibling, spouse, coparent
- Deduplication ensures same person isn't counted multiple times
- Constellation isolation enforced (INV-S002)
- Soft-deleted relatives properly excluded
- AI call parses JSON response and validates with Zod (INV-AI005)

#### Key Implementation Notes

1. **Prisma Relations**: Person.events is EventParticipant[], used `primaryEvents` for Event[]
2. **Genkit API**: Uses `response.text` with JSON parsing, not `response.output`
3. **Mock Pattern**: All mocks use `vi.hoisted()` for proper Vitest hoisting
4. **Parallel Processing**: `extractRelatedContext()` processes relatives in parallel with `p-limit` (max 5 concurrent) for rate limit safety
5. **Retry Middleware**: `getRetryMiddleware()` in genkit.ts provides exponential backoff (3 retries, 1s→2s→4s) for transient failures

---

## Key Decisions

### Decision 1: Multi-Step Agentic Flow vs Single AI Call

**Date**: 2026-01-20
**Context**: Need to decide between one large AI call or multiple focused calls
**Decision**: Use multi-step flow with separate AI calls for context mining, generation, and validation
**Rationale**:
- Focused prompts produce better results
- Independent testing of each step
- Easier debugging when issues arise
- Can retry individual steps if needed
**Alternatives Considered**:
- Single large prompt with all instructions (rejected: too complex, hard to debug)
- Two-step (generate + validate) (rejected: misses context mining opportunity)

### Decision 2: Fail on No Source Material

**Date**: 2026-01-20
**Context**: What to do when person has no notes or events
**Decision**: Return error with guidance, don't generate anything
**Rationale**:
- Without source material, any biography would be speculation
- User guidance helps them understand what to add
- Prevents low-quality/hallucinated content
**Alternatives Considered**:
- Generate minimal bio from person details only (rejected: prone to speculation)
- Generate placeholder text (rejected: not useful, wastes quota)

### Decision 3: Same Constellation Boundary for Related Context

**Date**: 2026-01-20
**Context**: Should we mine context from relatives in other users' constellations?
**Decision**: Only mine context from people in same constellation
**Rationale**:
- Respects privacy boundaries (INV-S002)
- User has full control over what context is used
- Avoids complex permission checking
**Alternatives Considered**:
- Mine from connected constellations (rejected: privacy concerns)
- Mine from matched people (rejected: too complex for initial implementation)

---

## Files Modified

### Created

**Planning:**
- `docs/plans/active/biography-generation-v2/spec.md` - Feature specification
- `docs/plans/active/biography-generation-v2/development-plan.md` - Implementation plan
- `docs/plans/active/biography-generation-v2/work-notes.md` - This file
- `docs/plans/active/biography-generation-v2/phases/phase-1.md` - Eligibility & Source Assembly
- `docs/plans/active/biography-generation-v2/phases/phase-2.md` - Related Context Mining
- `docs/plans/active/biography-generation-v2/phases/phase-3.md` - Biography Generation with Citations
- `docs/plans/active/biography-generation-v2/phases/phase-4.md` - Factual Validation
- `docs/plans/active/biography-generation-v2/phases/phase-5.md` - Integration & GraphQL
- `docs/plans/active/biography-generation-v2/phases/phase-6.md` - Cleanup & Documentation

**Phase 1 Implementation:**
- `src/ai/schemas/biography-v2.ts` - New comprehensive Zod schemas
- `src/ai/schemas/biography-v2.test.ts` - Schema validation tests (17 tests)
- `src/ai/flows/biography/eligibility.ts` - Eligibility checking
- `src/ai/flows/biography/eligibility.test.ts` - Eligibility tests (9 tests)
- `src/ai/flows/biography/source-assembly.ts` - Source material gathering
- `src/ai/flows/biography/source-assembly.test.ts` - Source assembly tests (12 tests)

**Phase 2 Implementation:**
- `src/ai/schemas/biography-v2.ts` - Extended with RelatedContext, RelativeInfo, RelevantFact schemas (13 new tests)
- `src/ai/flows/biography/context-mining.ts` - findRelatives() and extractRelatedContext()
- `src/ai/flows/biography/context-mining.test.ts` - Context mining tests (17 tests)

### To Be Modified

- `src/ai/schemas/biography.ts` - Add new schemas
- `src/ai/flows/biography.ts` - Replace with multi-step flow
- `src/graphql/resolvers/ai-resolvers.ts` - Update to use new flow
- `src/graphql/schema.ts` - Add AI types

---

## Documentation Updates Required

### INVARIANTS.md Changes

- [ ] Add INV-AI006: Biography Content Must Be Source-Verified
- [ ] Add INV-AI007: Biography Requires Source Material

### Other Documentation

- [ ] Update roadmap Phase 2.2 status
- [ ] API documentation for generateBiography
