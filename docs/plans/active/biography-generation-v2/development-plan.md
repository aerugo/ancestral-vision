# Agentic Biography Generation v2 - Development Plan

**Status**: In Progress
**Created**: 2026-01-20
**Branch**: `feat/plan`
**Spec**: [spec.md](spec.md)

## Summary

Replace the simple Phase 2.2 biography generation with a multi-step agentic flow that ensures factual accuracy by requiring source material, mining context from relatives, and validating output against sources.

## Critical Invariants to Respect

- **INV-AI001**: AI Operations Require Quota Check - Check quota before generation
- **INV-AI002**: AI Operations Must Track Usage - Consume quota only on success
- **INV-AI003**: AI Suggestions Require User Approval - Store as suggestion, don't modify Person directly
- **INV-AI005**: AI Outputs Use Zod Validation - All inputs/outputs validated with Zod schemas
- **INV-S001**: All API Endpoints Require Authentication - Verify user owns constellation
- **INV-S002**: Constellation Isolation - Only access data within user's constellation

**New invariants introduced**:

- **NEW INV-AI006**: Biography Content Must Be Source-Verified - All factual claims in generated biographies must be traceable to notes, events, or person details
- **NEW INV-AI007**: Biography Requires Source Material - Biography generation disabled for people without notes or events

## Current State Analysis

### What Exists (Phase 2.2 simple implementation)

| Component | Status | Location |
|-----------|--------|----------|
| Biography Zod schemas | ✅ Exists | `src/ai/schemas/biography.ts` |
| Biography flow | ✅ Exists (simple) | `src/ai/flows/biography.ts` |
| GraphQL resolver | ⚠️ Exists (not in schema) | `src/ai/resolvers/ai-resolvers.ts` |
| AISuggestion model | ✅ Exists | `prisma/schema.prisma` |
| Tests | ✅ 27 tests passing | Multiple files |

### Problems with Current Implementation

1. **Generates from person details only** - ignores notes and events
2. **No source requirement** - generates even with no content
3. **No validation** - can produce speculative content
4. **No related context** - misses important family context

### Files to Modify

| File | Current State | Planned Changes |
|------|---------------|-----------------|
| `src/ai/schemas/biography.ts` | Basic input/output schemas | Add SourceMaterial, RelatedContext, ValidationResult schemas |
| `src/ai/flows/biography.ts` | Simple single-step generation | Replace with multi-step agentic flow |
| `src/graphql/resolvers/ai-resolvers.ts` | Basic generateBiography mutation | Update to use new flow, handle eligibility errors |
| `src/graphql/schema.ts` | Missing AI types | Add BiographyGenerationResult, AISuggestion types |

### Files to Create

| File | Purpose |
|------|---------|
| `src/ai/flows/biography/index.ts` | Main orchestration flow |
| `src/ai/flows/biography/eligibility.ts` | Step 1: Check source material exists |
| `src/ai/flows/biography/source-assembly.ts` | Step 2: Gather and structure sources |
| `src/ai/flows/biography/context-mining.ts` | Step 3: Extract relevant context from relatives |
| `src/ai/flows/biography/generation.ts` | Step 4: Generate biography with citations |
| `src/ai/flows/biography/validation.ts` | Step 5: Verify claims against sources |
| `src/ai/flows/biography/*.test.ts` | Tests for each step |

## Solution Design

### Agentic Flow Architecture

```
generateBiographyFlow (orchestrator)
    │
    ├── checkEligibility(personId)
    │   └── Returns: { eligible: boolean, reason?: string }
    │
    ├── assembleSourceMaterial(personId)
    │   └── Returns: SourceMaterial { personDetails, notes[], events[] }
    │
    ├── mineRelatedContext(personId, sourceMaterial)
    │   └── For each relative type:
    │       └── AI: Extract relevant facts → RelatedContext[]
    │
    ├── generateBiographyWithCitations(sourceMaterial, relatedContext)
    │   └── AI: Generate narrative with inline citations
    │       └── Returns: DraftBiography { text, citations[] }
    │
    └── validateAgainstSources(draftBiography, sourceMaterial)
        └── AI: Verify each claim
            └── Returns: ValidationResult { isValid, issues[] }
```

### Key Design Decisions

1. **Separate AI calls for context mining and generation**: Allows focused prompts and better results
2. **Validation as separate step**: Can be retried or adjusted independently
3. **Citations as first-class data**: Every claim must have explicit source reference
4. **Fail-fast on validation**: Don't return partially valid biographies

## Phase Overview

| Phase | Description | TDD Focus | Est. Tests |
|-------|-------------|-----------|------------|
| 1 | Eligibility & Source Assembly | Data gathering, eligibility rules | ~15 tests |
| 2 | Related Context Mining | AI extraction of relevant facts | ~12 tests |
| 3 | Biography Generation with Citations | AI generation with source tracking | ~15 tests |
| 4 | Factual Validation | Claim verification against sources | ~12 tests |
| 5 | Integration & GraphQL | End-to-end flow, schema updates | ~10 tests |
| 6 | Cleanup Old Implementation | Remove simple flow, update docs | ~5 tests |

**Total Estimated Tests**: ~69 new/modified tests

---

## Phase 1: Eligibility & Source Assembly

**Goal**: Implement eligibility checking and source material gathering
**Detailed Plan**: [phases/phase-1.md](phases/phase-1.md)

### Deliverables

1. `src/ai/schemas/biography-v2.ts` - New comprehensive Zod schemas
2. `src/ai/flows/biography/eligibility.ts` - Eligibility check function
3. `src/ai/flows/biography/source-assembly.ts` - Source material assembly
4. Tests for all new functionality

### TDD Approach

1. Write failing tests for eligibility (no notes/events → ineligible)
2. Write failing tests for source assembly (gather notes, events, details)
3. Implement eligibility check
4. Implement source assembly
5. Refactor for clarity

### Success Criteria

- [ ] All tests pass
- [ ] Eligibility correctly identifies people with no source material
- [ ] Source assembly gathers all notes, events, and person details
- [ ] Zod schemas validate all data structures

---

## Phase 2: Related Context Mining

**Goal**: Extract relevant context from related people
**Detailed Plan**: [phases/phase-2.md](phases/phase-2.md)

### Deliverables

1. `src/ai/flows/biography/context-mining.ts` - Context extraction
2. Prompts for context mining (focused, relevant facts only)
3. Tests for context mining with mocked AI responses

### TDD Approach

1. Write failing tests for relative lookup (parents, children, siblings, spouses, co-parents)
2. Write failing tests for context extraction (relevant facts only)
3. Implement relative lookup
4. Implement AI-powered context extraction
5. Refactor for clarity

### Success Criteria

- [ ] All direct relatives found correctly
- [ ] Context mining focuses on relevant facts only
- [ ] Source attribution preserved in context notes
- [ ] Marginal information filtered out

---

## Phase 3: Biography Generation with Citations

**Goal**: Generate biography that cites sources for every claim
**Detailed Plan**: [phases/phase-3.md](phases/phase-3.md)

### Deliverables

1. `src/ai/flows/biography/generation.ts` - Biography generation with citations
2. Prompts enforcing citation requirements
3. Tests for generation with mocked AI responses

### TDD Approach

1. Write failing tests for biography structure (citations required)
2. Write failing tests for source prioritization (person > relatives)
3. Implement generation with citation tracking
4. Verify citation format consistency
5. Refactor for clarity

### Success Criteria

- [ ] Every factual claim has a citation
- [ ] Person's own notes/events prioritized over relative context
- [ ] Warm, family history tone maintained
- [ ] Uncertain statements explicitly marked

---

## Phase 4: Factual Validation

**Goal**: Verify generated content against source material
**Detailed Plan**: [phases/phase-4.md](phases/phase-4.md)

### Deliverables

1. `src/ai/flows/biography/validation.ts` - Claim verification
2. Prompts for validation (detect speculation, contradictions)
3. Tests for validation with various scenarios

### TDD Approach

1. Write failing tests for claim extraction
2. Write failing tests for source verification
3. Write failing tests for speculation detection
4. Implement claim extraction
5. Implement verification against sources
6. Refactor for clarity

### Success Criteria

- [ ] Unverifiable claims detected
- [ ] Contradictions with sources detected
- [ ] Speculation detected and rejected
- [ ] Detailed validation report generated

---

## Phase 5: Integration & GraphQL

**Goal**: Wire everything together, expose via GraphQL
**Detailed Plan**: [phases/phase-5.md](phases/phase-5.md)

### Deliverables

1. `src/ai/flows/biography/index.ts` - Main orchestration flow
2. Updated GraphQL schema with AI types
3. Updated resolver using new flow
4. End-to-end integration tests

### TDD Approach

1. Write failing tests for full flow orchestration
2. Write failing tests for GraphQL integration
3. Implement orchestration flow
4. Update GraphQL schema and resolver
5. Verify end-to-end flow

### Success Criteria

- [ ] Full flow executes correctly
- [ ] GraphQL mutation accessible and working
- [ ] Eligibility errors returned with guidance
- [ ] Validation failures returned with details
- [ ] Quota consumed only on success

---

## Phase 6: Cleanup & Documentation

**Goal**: Remove old implementation, update documentation
**Detailed Plan**: [phases/phase-6.md](phases/phase-6.md)

### Deliverables

1. Remove or deprecate old `src/ai/flows/biography.ts`
2. Update INVARIANTS.md with new INV-AI006, INV-AI007
3. Update existing tests to use new flow
4. Documentation updates

### Success Criteria

- [ ] Old flow removed or deprecated
- [ ] All tests pass with new implementation
- [ ] Invariants documented
- [ ] No dead code remaining

---

## Testing Strategy

### Unit Tests (co-located with source)

- `src/ai/flows/biography/eligibility.test.ts`: Eligibility rules
- `src/ai/flows/biography/source-assembly.test.ts`: Source gathering
- `src/ai/flows/biography/context-mining.test.ts`: Context extraction
- `src/ai/flows/biography/generation.test.ts`: Biography generation
- `src/ai/flows/biography/validation.test.ts`: Claim verification

### Integration Tests

- `src/ai/flows/biography/index.test.ts`: Full flow orchestration
- `src/graphql/resolvers/ai.test.ts`: GraphQL integration

### Invariant Tests

- Test INV-AI006: Biography contains only verifiable claims
- Test INV-AI007: Biography generation requires source material

---

## Documentation Updates

After implementation is complete:

- [ ] `docs/invariants/INVARIANTS.md` - Add INV-AI006, INV-AI007
- [ ] `docs/plans/grand_plan/12_roadmap.md` - Update Phase 2.2 status
- [ ] API documentation for generateBiography mutation

---

## Progress Tracking

| Phase | Status | Started | Completed | Notes |
|-------|--------|---------|-----------|-------|
| Phase 1 | Pending | | | Eligibility & Source Assembly |
| Phase 2 | Pending | | | Related Context Mining |
| Phase 3 | Pending | | | Biography Generation |
| Phase 4 | Pending | | | Factual Validation |
| Phase 5 | Pending | | | Integration & GraphQL |
| Phase 6 | Pending | | | Cleanup & Documentation |
