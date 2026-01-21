# Feature: Biography Source Links

**Status**: Draft
**Created**: 2026-01-21
**User Stories**: US-2.3 (AI-Generated Content), US-1.2 (View Family Stories)

## Goal

Enable users to click on citations in generated biographies to view the original source material (notes, events, or relative biographies) in a modal overlay.

## Background

Currently, AI-generated biographies include text citations like `[Note: Research findings]` or `[Event: Marriage]`, but these are not interactive. Users have no way to verify the source material or see the full context behind a cited fact. This creates a trust gap between the generated content and its sources.

Following Genkit best practices, citations should:
1. Be machine-parseable (not just human-readable)
2. Include unique identifiers for traceability
3. Allow users to verify AI-generated claims against sources

## Acceptance Criteria

- [ ] AC1: Generated biographies include parseable citations with source IDs (e.g., `[Note:abc123:Research findings]`)
- [ ] AC2: Citations in displayed biographies are rendered as clickable links
- [ ] AC3: Clicking a citation opens a modal showing the full source content
- [ ] AC4: Modal displays appropriate content type (rich text for notes, structured data for events, plain text for biographies)
- [ ] AC5: Source IDs in citations are validated to ensure they reference accessible sources
- [ ] AC6: The system gracefully handles citations to deleted or inaccessible sources

## Technical Requirements

### Database Changes

- None required. Source IDs (noteId, eventId) already exist.

### API Changes

- **New Query**: `sourceContent(type: SourceType!, id: ID!): SourceContent` - Fetches source content for modal display
- **Modified**: Biography generation output schema to include structured source references

### AI Changes

- Modify prompt format to include source IDs: `[Note:${noteId}:${title}]`
- Add structured output schema for sources used
- Validate that AI-generated source IDs match actual source material

### UI Changes

- **New Component**: `SourceContentModal` - Displays notes, events, or biographies in a modal
- **Modified**: Biography display to parse citations and render as clickable `<button>` elements
- **New Hook**: `useSourceContent` - Fetches source content on demand

## Design

### Citation Format

Current format (not parseable):
```
[Note: Research findings]
[Event: Marriage]
[From parent: occupation information]
```

New format (parseable with IDs):
```
[Note:abc123:Research findings]
[Event:def456:Marriage]
[Biography:ghi789:parent:occupation information]
```

Pattern: `[Type:ID:Description]`

### Modal Content Types

| Source Type | Content Display |
|-------------|-----------------|
| Note | Rich text (Tiptap JSON → HTML), title, privacy level, date |
| Event | Title, date (fuzzy), location, description, participants |
| Biography | Person name, relationship, biography text excerpt |

### Structured Output Schema

```typescript
interface BiographyCitation {
  type: 'note' | 'event' | 'biography';
  id: string;           // noteId, eventId, or personId
  label: string;        // Human-readable description
  startIndex?: number;  // Position in biography text
  endIndex?: number;    // End position in biography text
}

interface GeneratedBiographyWithSources {
  biography: string;
  wordCount: number;
  confidence: number;
  sourcesUsed: string[];
  citations: BiographyCitation[];  // NEW: Structured citation list
}
```

## Dependencies

- Existing biography generation flow (`src/ai/flows/biography/`)
- Existing note/event data models
- Custom dialog pattern from existing components

## Out of Scope

- Inline editing of source content from the modal
- Creating new notes/events from the modal
- Citation highlighting in the biography text (visual emphasis)
- Exporting biographies with hyperlinked sources

## Security Considerations

- **INV-S002**: Modal must only display sources the user has access to
- **Auth**: Source content query must verify user belongs to same constellation
- Source IDs should be opaque UUIDs (already the case)

## Performance Considerations

- Modal content loaded on-demand (not pre-fetched)
- Citations parsed client-side with regex (fast)
- Consider caching recently viewed sources in React Query

## Open Questions

- [x] Q1: Should we support clicking citations in the preview mode before accepting? **Decision: Yes, helps users evaluate quality**
- [x] Q2: How to handle citations to content from relatives (cross-person)? **Decision: Use Biography type with personId**
- [ ] Q3: Should the AI return citation positions for highlighting? **Defer to future enhancement**

## References

- [Genkit RAG Documentation](https://genkit.dev/docs/rag/) - Source attribution patterns
- [Genkit Structured Output](https://genkit.dev/docs/models/) - Schema-based outputs
- [User Stories](../../../plans/grand_plan/04_user_stories.md)
- [Data Model](../../../plans/grand_plan/08_data_model.md)

---

*Template version: 1.0*
