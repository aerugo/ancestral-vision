# Biography Source Links - Work Notes

**Feature**: Clickable source citations in AI-generated biographies
**Started**: 2026-01-21
**Branch**: `feat/biography-source-links`

---

## Session Log

### 2026-01-21 - Session 1: Planning

**Context Review Completed**:

- Read `src/ai/flows/biography/generation.ts` - Current prompt format uses `[Note: title]` without IDs
- Read `src/ai/schemas/biography.ts` - Source IDs tracked (noteId, eventId) but not in output
- Read `src/components/person-bio-tab.tsx` - Biography rendered as plain text
- Analyzed existing modal patterns - Custom dialog with backdrop, no shadcn/ui Dialog
- Researched Genkit documentation - Citations handled via prompt engineering with document metadata

**Applicable Invariants**:

- INV-AI005: AI Outputs Use Zod Validation - All citation schemas must be validated
- INV-AI007: Biography Requires Source Material - Sources must exist before citation
- INV-S002: Constellation-Scoped Access - Modal must verify user access to sources

**Key Insights**:

1. **Source IDs already exist**: The flow tracks `noteId` and `eventId` through source assembly and context mining
2. **Prompt change needed**: Current format `[Note: ${n.title}]` should become `[Note:${n.noteId}:${n.title}]`
3. **Related context uses sourceId**: The `RelevantFact` schema already has `sourceId?: string`
4. **Genkit best practice**: Include document metadata (IDs) in prompts, let AI cite with those IDs
5. **Custom dialog pattern**: Follow existing pattern from `add-person-dialog.tsx`

**Current Source Reference in Prompt** (generation.ts line 159):
```javascript
.map((n) => `- [Note: ${n.title ?? 'Untitled'}] ${n.content}`)
```

Should become:
```javascript
.map((n) => `- [Note:${n.noteId}:${n.title ?? 'Untitled'}] ${n.content}`)
```

**Completed**:

- [x] Explored biography generation flow
- [x] Explored UI modal patterns
- [x] Researched Genkit citation best practices
- [x] Created spec.md
- [x] Created development-plan.md
- [x] Created work-notes.md

**Blockers/Issues**:

- None

**Next Steps**:

1. Get plan approval
2. Create feature branch
3. Start Phase 1: Citation parser implementation

---

## Key Decisions

### Decision 1: Citation Format

**Date**: 2026-01-21
**Context**: Need a citation format that is both human-readable and machine-parseable
**Decision**: Use `[Type:ID:Label]` format (e.g., `[Note:abc123:Birth certificate]`)
**Rationale**:
- Maintains readability when viewed as plain text
- Single regex can parse all fields
- ID is required, label is for display
- Colons unlikely in source titles (can escape if needed)

**Alternatives Considered**:
- JSON in text: `{"type":"note","id":"abc"}` - Harder to read, breaks narrative flow
- HTML-style: `<cite data-id="abc">text</cite>` - AI may not generate consistently
- Markdown links: `[text](source://abc)` - Requires URL parsing

### Decision 2: Relative Context Citations

**Date**: 2026-01-21
**Context**: Facts from relatives can come from their biography, notes, or events
**Decision**: Use `[Biography:personId:relationship:fact]` format for relative-sourced facts
**Rationale**:
- PersonId allows fetching the relative's content
- Relationship provides context (parent, sibling, etc.)
- Can display the relevant section of relative's biography

---

## Files to Create/Modify

### Phase 1 Files
- `src/types/citation.ts` - TypeScript types
- `src/lib/citation-parser.ts` - Parser implementation
- `src/lib/citation-parser.test.ts` - Unit tests

### Phase 2 Files
- `src/ai/flows/biography/generation.ts` - Update prompt format
- `src/ai/schemas/biography.ts` - Add citation schema
- `src/ai/flows/biography/citation-validator.ts` - Validation logic
- `src/ai/flows/biography/citation-validator.test.ts` - Tests

### Phase 3 Files
- `src/graphql/schema.ts` - Add sourceContent query
- `src/graphql/resolvers/source-resolvers.ts` - New resolver
- `src/hooks/use-source-content.ts` - React Query hook

### Phase 4 Files
- `src/components/source-content-modal.tsx` - Modal component
- `src/components/citation-link.tsx` - Clickable citation
- `src/components/person-bio-tab.tsx` - Update to render citations

---

## Research Notes

### Genkit RAG Best Practices

From [genkit.dev/docs/rag](https://genkit.dev/docs/rag/):

> "You now have the potential to cite references in your LLM's responses."

Key points:
- Documents can include custom metadata (like IDs)
- Citation responsibility delegated to prompt engineering
- Context-aware prompting: "Use only the context provided"
- Metadata (like filePath) persists through retrieval

### Existing Citation Pattern in generation.ts

Current prompt instructions (lines 200-207):
```
1. Write a warm, engaging biographical narrative (300-500 words)
2. Only include facts that are directly supported by the source material above
3. Include citations in brackets like [Note: title], [Event: title], or [From parent: fact]
4. Do NOT invent or speculate about details not in the sources
```

Will need to update instruction 3 to explain new format.

---

*Template version: 1.0*
