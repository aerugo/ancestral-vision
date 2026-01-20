# Feature: Agentic Biography Generation v2

**Status**: Draft
**Created**: 2026-01-20
**Phase**: 2.2.1 (replaces simple Phase 2.2 implementation)
**User Stories**: US-3.9 (Generate Biography from Notes)

## Goal

Implement a multi-step agentic biography generation system that synthesizes person details, notes, and events into factual biographical narratives without any speculation or made-up information.

## Background

The initial Phase 2.2 implementation created a simple biography generation flow that only used person details (name, dates, places). This approach has several problems:

1. **No source material**: Generates biographies even when no notes or events exist
2. **Prone to speculation**: AI may fill in gaps with plausible but unverified information
3. **Missing context**: Doesn't leverage related people's information
4. **No validation**: No mechanism to verify generated content against source material

The enhanced system addresses all these issues with a multi-step agentic workflow that prioritizes factual accuracy over narrative completeness.

## Acceptance Criteria

### Core Requirements

- [ ] AC1: Biography generation is DISABLED when person has no notes AND no events
- [ ] AC2: Generated biography ONLY contains information traceable to source material
- [ ] AC3: Context from related people is mined and incorporated appropriately
- [ ] AC4: Output includes source citations for every factual claim
- [ ] AC5: Validation step rejects biographies containing unverifiable statements

### Workflow Requirements

- [ ] AC6: Multi-step agentic flow follows Genkit best practices
- [ ] AC7: Each step is independently testable
- [ ] AC8: Failed validation returns detailed feedback, not silent rejection
- [ ] AC9: Quota is consumed ONLY after successful biography generation

### Quality Requirements

- [ ] AC10: No hallucinated dates, places, events, or relationships
- [ ] AC11: Uncertain information is explicitly marked as such
- [ ] AC12: Context from relatives only includes highly relevant information
- [ ] AC13: Final biography maintains warm, family history tone

## Technical Requirements

### AI Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Step 1: Eligibility Check                         │
│  - Verify person has at least 1 note OR 1 event                     │
│  - Return error with guidance if no source material                  │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  Step 2: Source Material Assembly                    │
│  - Gather person details, all notes, all events                     │
│  - Structure into SourceMaterial object with citations              │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  Step 3: Related Context Mining                      │
│  For each: parents, children, siblings, spouses, co-parents         │
│  - Analyze their biographies, notes, events                         │
│  - Extract ONLY information highly relevant to core person          │
│  - Generate focused context notes with source attribution           │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  Step 4: Biography Generation                        │
│  - Use person details + notes + events as PRIMARY source            │
│  - Use related context as SUPPLEMENTARY source                      │
│  - Generate narrative with inline source citations                  │
│  - Flag any uncertain statements                                     │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  Step 5: Factual Validation                          │
│  - Parse generated biography for factual claims                     │
│  - Verify each claim against source material                        │
│  - Reject if ANY unverifiable claims found                          │
│  - Return validation report with specific issues                     │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Step 6: Create Suggestion                        │
│  - Store validated biography as AISuggestion (INV-AI003)            │
│  - Include source citations and confidence metadata                  │
│  - Consume quota (INV-AI001, INV-AI002)                             │
└─────────────────────────────────────────────────────────────────────┘
```

### Database Requirements

No schema changes required. Uses existing:
- `Person` with `biography`, notes, events relations
- `Note` for person's notes
- `Event` with participants
- `AISuggestion` for storing generated biography
- `UsageTracking` for quota

### API Changes

Modify existing `generateBiography` mutation to use new flow:
- Returns error if no source material available
- Returns validation errors if generated content fails validation
- Returns success with suggestionId and source citations

### New Schemas (Zod)

```typescript
// Source material structure
SourceMaterialSchema = z.object({
  personDetails: PersonDetailsSchema,
  notes: z.array(NoteSchema),
  events: z.array(EventSchema),
});

// Related context structure
RelatedContextSchema = z.object({
  relationshipType: z.enum(['parent', 'child', 'sibling', 'spouse', 'coparent']),
  personName: z.string(),
  relevantFacts: z.array(z.object({
    fact: z.string(),
    source: z.string(),
    relevanceReason: z.string(),
  })),
});

// Validated biography output
ValidatedBiographySchema = z.object({
  biography: z.string(),
  citations: z.array(z.object({
    claim: z.string(),
    sourceType: z.enum(['note', 'event', 'personDetail', 'relatedContext']),
    sourceId: z.string(),
    sourceExcerpt: z.string(),
  })),
  uncertainStatements: z.array(z.object({
    statement: z.string(),
    reason: z.string(),
  })),
});

// Validation result
ValidationResultSchema = z.object({
  isValid: z.boolean(),
  issues: z.array(z.object({
    claim: z.string(),
    issue: z.enum(['unverifiable', 'contradicts_source', 'speculation']),
    explanation: z.string(),
  })),
});
```

## Dependencies

- Phase 2.1 AI Infrastructure (complete)
- Existing Phase 2.2 biography flow (to be replaced)
- Person with notes/events relations (exists)
- AISuggestion model (exists from Phase 2.2)

## Out of Scope

- Tone selection (formal/storytelling/factual) - deferred to Phase 2.2.2
- UI components for generation - separate task
- Batch biography generation
- Regeneration with different parameters
- Biography editing suggestions

## Security Considerations

- User must own the constellation containing the person (existing check)
- Related people must be in same constellation (privacy boundary)
- Generated content is stored as suggestion, not applied directly (INV-AI003)
- No external data sources - only user's own content

## Open Questions

- [x] Q1: How to handle related people in different constellations?
  - **Answer**: Only mine context from people in same constellation
- [x] Q2: Should validation be done by same model or different model?
  - **Answer**: Same model with different prompt for consistency
- [x] Q3: How many related people to include in context mining?
  - **Answer**: All direct relations (parents, children, siblings, spouses, co-parents)
- [ ] Q4: Should failed validation allow partial biography (valid parts only)?
  - **Tentative**: No - require full re-generation to maintain narrative coherence
