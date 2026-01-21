# Biography Source Links - Development Plan

**Status**: Draft
**Created**: 2026-01-21
**Branch**: `feat/biography-source-links`
**Spec**: [spec.md](spec.md)

## Summary

Implement clickable source citations in AI-generated biographies, allowing users to view original notes, events, and relative biographies in a modal overlay. This builds trust by enabling source verification.

## Critical Invariants to Respect

Reference invariants from `docs/invariants/INVARIANTS.md`:

- **INV-AI005**: AI Outputs Use Zod Validation - All citation schemas must be validated
- **INV-AI007**: Biography Requires Source Material - Sources must exist before citation
- **INV-S002**: Constellation-Scoped Access - Modal must verify user access to sources

**New invariants introduced** (to be added to INVARIANTS.md after implementation):

- **NEW INV-AI008**: Citation IDs Must Be Valid - AI-generated citations must reference actual source IDs from the input material

## Current State Analysis

The biography generation flow tracks source IDs (`noteId`, `eventId`) through the entire pipeline, but:
1. The AI prompt formats citations as `[Note: title]` without IDs
2. The output schema only includes `sourcesUsed: string[]` (types, not IDs)
3. Displayed biographies show citations as plain text

### Files to Modify

| File | Current State | Planned Changes |
|------|---------------|-----------------|
| `src/ai/flows/biography/generation.ts` | Citations use `[Note: title]` format | Add IDs: `[Note:id:title]` format |
| `src/ai/schemas/biography.ts` | No citation output schema | Add `BiographyCitation` schema |
| `src/components/person-bio-tab.tsx` | Renders biography as plain text | Parse citations, render as clickable |
| `src/graphql/schema.ts` | No source content query | Add `sourceContent` query |
| `src/graphql/resolvers/` | No source content resolver | Add resolver with access check |

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/source-content-modal.tsx` | Modal for displaying source content |
| `src/hooks/use-source-content.ts` | Hook for fetching source content |
| `src/lib/citation-parser.ts` | Parse citation format from biography text |
| `src/lib/citation-parser.test.ts` | Unit tests for citation parsing |
| `src/ai/flows/biography/citation-validator.ts` | Validate AI citations against sources |
| `src/ai/flows/biography/citation-validator.test.ts` | Unit tests for citation validation |

## Solution Design

```
┌─────────────────────────────────────────────────────────────────┐
│                    Biography Generation Flow                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Source Assembly          Context Mining           Generation   │
│  ┌──────────────┐       ┌──────────────┐       ┌─────────────┐ │
│  │ notes[]      │       │ relatives[]  │       │   AI Call   │ │
│  │ • noteId     │──────▶│ • facts[]    │──────▶│             │ │
│  │ • content    │       │   • sourceId │       │  Prompt:    │ │
│  │              │       │              │       │  [Note:id:] │ │
│  │ events[]     │       └──────────────┘       │  [Event:id:]│ │
│  │ • eventId    │                              │             │ │
│  │ • title      │                              └──────┬──────┘ │
│  └──────────────┘                                     │        │
│                                                       ▼        │
│                                              ┌─────────────┐   │
│                           Validation ◀───────│  Output:    │   │
│                           (INV-AI008)        │  biography  │   │
│                                              │  citations[]│   │
│                                              └─────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Biography Display Flow                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Biography Text          Citation Parser        Rendered Bio    │
│  ┌──────────────┐       ┌──────────────┐       ┌─────────────┐ │
│  │ "Born in     │       │ parseCites() │       │ <p>Born in  │ │
│  │ 1920 [Note:  │──────▶│              │──────▶│ 1920        │ │
│  │ abc:Birth]"  │       │ → [{type,    │       │ <Citation   │ │
│  │              │       │    id,label}]│       │   type=note │ │
│  └──────────────┘       └──────────────┘       │   id=abc /> │ │
│                                                │ </p>        │ │
│                                                └──────┬──────┘ │
│                                                       │        │
│                                                       ▼        │
│                                              ┌─────────────┐   │
│                                              │ Modal       │   │
│                                              │ ┌─────────┐ │   │
│                                              │ │ Source  │ │   │
│                                              │ │ Content │ │   │
│                                              │ └─────────┘ │   │
│                                              └─────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Citation Format**: Use `[Type:ID:Label]` pattern for machine parseability while remaining human-readable in raw text
2. **Validation Strategy**: Post-generation validation checks that all cited IDs exist in the source material passed to the AI
3. **Modal Loading**: Fetch content on-demand rather than pre-loading all sources
4. **Relative Citations**: Use `[Biography:personId:relationship:fact]` for facts from relatives

## Phase Overview

| Phase | Description | TDD Focus | Est. Tests |
|-------|-------------|-----------|------------|
| 1 | Citation format and parsing | Citation parser unit tests | 8 tests |
| 2 | AI prompt and output changes | Citation validation tests | 6 tests |
| 3 | Source content GraphQL API | Resolver integration tests | 5 tests |
| 4 | UI: Modal and clickable citations | Component tests | 4 tests |

---

## Phase 1: Citation Format and Parsing

**Goal**: Create a robust citation parser that extracts structured data from biography text
**Detailed Plan**: [phases/phase-1.md](phases/phase-1.md)

### Deliverables

1. `src/lib/citation-parser.ts` - Parse `[Type:ID:Label]` citations
2. `src/lib/citation-parser.test.ts` - Comprehensive unit tests
3. `src/types/citation.ts` - TypeScript types for citations

### TDD Approach

1. Write failing tests for citation parsing edge cases
2. Implement parser to pass tests
3. Add tests for malformed citations, escaping, edge cases

### Success Criteria

- [ ] All tests pass
- [ ] Type check passes (`npx tsc --noEmit`)
- [ ] Parser handles: Note, Event, Biography types
- [ ] Parser handles: Missing IDs, malformed syntax gracefully

---

## Phase 2: AI Prompt and Output Changes

**Goal**: Modify biography generation to produce parseable citations with IDs
**Detailed Plan**: [phases/phase-2.md](phases/phase-2.md)

### Deliverables

1. `src/ai/flows/biography/generation.ts` - Updated prompt with ID format
2. `src/ai/schemas/biography.ts` - Citation output schema
3. `src/ai/flows/biography/citation-validator.ts` - Validate citations against sources
4. `src/ai/flows/biography/citation-validator.test.ts` - Validation tests

### TDD Approach

1. Write failing tests for citation validation
2. Modify prompt format to include IDs
3. Add validation step after generation
4. Update output schema

### Success Criteria

- [ ] All tests pass
- [ ] Generated biographies include valid source IDs
- [ ] Invalid citations are logged/filtered
- [ ] Existing E2E test still passes

---

## Phase 3: Source Content GraphQL API

**Goal**: Create API for fetching source content to display in modal
**Detailed Plan**: [phases/phase-3.md](phases/phase-3.md)

### Deliverables

1. `src/graphql/schema.ts` - Add `sourceContent` query and types
2. `src/graphql/resolvers/source-resolvers.ts` - Resolver with access check
3. `src/hooks/use-source-content.ts` - React Query hook

### TDD Approach

1. Write failing tests for resolver access control
2. Implement resolver with constellation-scoped access
3. Create React Query hook

### Success Criteria

- [ ] All tests pass
- [ ] Query returns appropriate content type
- [ ] Access denied for cross-constellation sources
- [ ] Deleted sources handled gracefully

---

## Phase 4: UI - Modal and Clickable Citations

**Goal**: Render citations as clickable elements that open a content modal
**Detailed Plan**: [phases/phase-4.md](phases/phase-4.md)

### Deliverables

1. `src/components/source-content-modal.tsx` - Modal component
2. `src/components/person-bio-tab.tsx` - Updated to parse/render citations
3. `src/components/citation-link.tsx` - Clickable citation component

### TDD Approach

1. Create modal component with loading/error states
2. Implement citation rendering in bio tab
3. Wire up click handler to open modal

### Success Criteria

- [ ] Modal displays note content (rich text)
- [ ] Modal displays event content (structured)
- [ ] Modal displays biography content (plain text)
- [ ] Citations clickable in view and preview modes

---

## Testing Strategy

### Unit Tests (co-located with source)

- `src/lib/citation-parser.test.ts`: Citation parsing
- `src/ai/flows/biography/citation-validator.test.ts`: Validation logic

### Integration Tests

- `src/graphql/resolvers/source-resolvers.test.ts`: Access control

### E2E Tests

- `scripts/test-biography-e2e.ts`: Updated to verify citation format

## Documentation Updates

After implementation is complete:

- [ ] `docs/invariants/INVARIANTS.md` - Add INV-AI008
- [ ] API documentation for `sourceContent` query
- [ ] Update biography generation docs

## Progress Tracking

| Phase | Status | Started | Completed | Notes |
|-------|--------|---------|-----------|-------|
| Phase 1 | Pending | | | Citation parsing |
| Phase 2 | Pending | | | AI prompt changes |
| Phase 3 | Pending | | | GraphQL API |
| Phase 4 | Pending | | | UI components |

---

*Template version: 1.0*
