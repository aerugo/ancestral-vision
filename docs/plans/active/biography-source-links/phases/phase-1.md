# Phase 1: Citation Format and Parsing

**Goal**: Create a robust citation parser that extracts structured data from biography text
**Status**: Pending
**Estimated Tests**: 8

## Context

Before we can display clickable citations, we need a reliable way to:
1. Define the citation format
2. Parse citations from biography text
3. Extract structured data (type, ID, label)
4. Handle edge cases gracefully

## Citation Format Specification

### Standard Format

```
[Type:ID:Label]
```

Where:
- **Type**: `Note` | `Event` | `Biography`
- **ID**: UUID of the source (noteId, eventId, or personId)
- **Label**: Human-readable description

### Examples

```
[Note:abc123-def456:Birth certificate]
[Event:789xyz:Marriage to Jane]
[Biography:person123:parent:occupation as farmer]
```

### Biography Type Extended Format

For facts from relatives, include relationship:
```
[Biography:personId:relationship:label]
```

Example: `[Biography:abc123:parent:worked as a blacksmith]`

## Deliverables

### 1. Types (`src/types/citation.ts`)

```typescript
export type CitationType = 'Note' | 'Event' | 'Biography';

export interface ParsedCitation {
  type: CitationType;
  id: string;
  label: string;
  relationship?: string;  // Only for Biography type
  raw: string;            // Original matched text
  startIndex: number;     // Position in source text
  endIndex: number;       // End position in source text
}

export interface CitationParseResult {
  citations: ParsedCitation[];
  textSegments: TextSegment[];  // For rendering
}

export interface TextSegment {
  type: 'text' | 'citation';
  content: string;
  citation?: ParsedCitation;
}
```

### 2. Parser (`src/lib/citation-parser.ts`)

```typescript
/**
 * Parse citations from biography text.
 * Returns structured data for each citation found.
 */
export function parseCitations(text: string): CitationParseResult;

/**
 * Convert biography text to segments for rendering.
 * Alternates between text and citation segments.
 */
export function segmentBiography(text: string): TextSegment[];

/**
 * Validate a citation ID matches expected format (UUID).
 */
export function isValidCitationId(id: string): boolean;
```

### 3. Tests (`src/lib/citation-parser.test.ts`)

Test cases:
1. Parse single Note citation
2. Parse single Event citation
3. Parse Biography citation with relationship
4. Parse multiple citations in text
5. Handle citation at start of text
6. Handle citation at end of text
7. Handle adjacent citations
8. Handle malformed citations (missing parts) - should skip
9. Handle escaped brackets
10. Return empty array for text without citations

## Implementation Details

### Regex Pattern

```typescript
// Pattern: [Type:ID:Label] or [Biography:ID:Relationship:Label]
const CITATION_REGEX = /\[(?<type>Note|Event|Biography):(?<id>[^:\]]+)(?::(?<extra>[^\]]+))?\]/g;
```

For Biography type, `extra` contains `relationship:label`.

### Segmentation Algorithm

```typescript
function segmentBiography(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const citations = parseCitations(text);

  let lastIndex = 0;
  for (const citation of citations.citations) {
    // Add text before citation
    if (citation.startIndex > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, citation.startIndex),
      });
    }
    // Add citation
    segments.push({
      type: 'citation',
      content: citation.label,
      citation,
    });
    lastIndex = citation.endIndex;
  }
  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }
  return segments;
}
```

## TDD Workflow

### Step 1: Write Failing Tests

```typescript
describe('parseCitations', () => {
  it('parses a single Note citation', () => {
    const text = 'Born in 1920 [Note:abc123:Birth cert] in Ohio.';
    const result = parseCitations(text);

    expect(result.citations).toHaveLength(1);
    expect(result.citations[0]).toEqual({
      type: 'Note',
      id: 'abc123',
      label: 'Birth cert',
      raw: '[Note:abc123:Birth cert]',
      startIndex: 13,
      endIndex: 37,
    });
  });

  // ... more tests
});
```

### Step 2: Implement Parser

Start with simplest case (single citation), then extend.

### Step 3: Refactor

Clean up regex, add documentation, handle edge cases.

## Success Criteria

- [ ] All 10+ test cases pass
- [ ] Type check passes (`npx tsc --noEmit`)
- [ ] Parser handles all three citation types
- [ ] Malformed citations are skipped (not throw)
- [ ] Segmentation preserves all text content
- [ ] 100% code coverage on parser

## Estimated Effort

- Types: 15 min
- Parser implementation: 45 min
- Tests: 30 min
- Edge cases: 30 min

**Total: ~2 hours**

---

## Notes

- Keep parser pure and synchronous - no I/O
- Don't validate IDs against database here (that's Phase 2)
- Consider future: might want to highlight citations in text
