# Phase 2: Related Context Mining

**Status**: Complete
**Started**: 2026-01-20
**Completed**: 2026-01-20
**Parent Plan**: [development-plan.md](../development-plan.md)

---

## Objective

Extract relevant context from related people (parents, children, siblings, spouses, co-parents) to enrich biography generation while maintaining source attribution.

---

## Invariants Enforced in This Phase

- **INV-AI005**: AI Outputs Use Zod Validation - Context notes validated with schema
- **INV-S002**: Constellation Isolation - Only access relatives in same constellation

---

## TDD Steps

### Step 2.1: Write Schemas for Related Context (RED → GREEN)

Create `RelatedContextSchema` in `src/ai/schemas/biography-v2.ts`:

```typescript
export const RelatedContextSchema = z.object({
  relationshipType: z.enum(['parent', 'child', 'sibling', 'spouse', 'coparent']),
  personId: z.string(),
  personName: z.string(),
  relevantFacts: z.array(z.object({
    fact: z.string(),
    source: z.enum(['biography', 'note', 'event']),
    sourceId: z.string().optional(),
    relevanceReason: z.string(),
  })),
});

export const RelatedContextArraySchema = z.array(RelatedContextSchema);
```

### Step 2.2: Write Tests for Relative Lookup (RED)

Create `src/ai/flows/biography/context-mining.test.ts`:

**Test Cases**:

1. `it('should find all parents')` - Returns parent relationships
2. `it('should find all children')` - Returns child relationships
3. `it('should find all siblings')` - Via shared parents
4. `it('should find all spouses')` - Returns spouse relationships
5. `it('should find co-parents')` - People with shared children
6. `it('should exclude relatives from other constellations')` - INV-S002
7. `it('should handle person with no relatives')` - Returns empty array

### Step 2.3: Implement Relative Lookup (GREEN)

Create `src/ai/flows/biography/context-mining.ts`:

```typescript
export interface RelativeInfo {
  relationshipType: 'parent' | 'child' | 'sibling' | 'spouse' | 'coparent';
  personId: string;
  personName: string;
  biography?: string;
  notes: NoteSource[];
  events: EventSource[];
}

export async function findRelatives(
  personId: string,
  constellationId: string
): Promise<RelativeInfo[]> {
  // Implementation queries:
  // - Parents: ParentChildRelationship where child = person
  // - Children: ParentChildRelationship where parent = person
  // - Siblings: People with same parents
  // - Spouses: SpouseRelationship where person1 or person2 = person
  // - Co-parents: Other parents of person's children
}
```

### Step 2.4: Write Tests for AI Context Extraction (RED)

**Test Cases**:

1. `it('should extract relevant facts from relative biography')` - Filters by relevance
2. `it('should extract relevant facts from relative notes')` - Includes note citations
3. `it('should extract relevant facts from shared events')` - Events involving both
4. `it('should include relevance reason for each fact')` - Explains why included
5. `it('should filter out marginal information')` - Only highly relevant facts
6. `it('should handle relative with no content')` - Returns empty facts

### Step 2.5: Implement AI Context Extraction (GREEN)

```typescript
export async function extractRelatedContext(
  personDetails: PersonDetails,
  relatives: RelativeInfo[]
): Promise<RelatedContext[]> {
  const ai = getAI();
  const model = getDefaultModel();

  const results: RelatedContext[] = [];

  for (const relative of relatives) {
    // Skip relatives with no content
    if (!relative.biography && relative.notes.length === 0 && relative.events.length === 0) {
      continue;
    }

    const prompt = buildContextMiningPrompt(personDetails, relative);

    const response = await ai.generate({
      model,
      prompt,
      output: { schema: RelatedContextSchema },
      config: { temperature: 0.3 }, // Low temperature for factual extraction
    });

    if (response.output && response.output.relevantFacts.length > 0) {
      results.push(response.output);
    }
  }

  return results;
}

function buildContextMiningPrompt(person: PersonDetails, relative: RelativeInfo): string {
  return `
You are analyzing family history information to find facts relevant to a specific person.

TARGET PERSON: ${person.displayName}
RELATIONSHIP: ${relative.relationshipType}
RELATIVE: ${relative.personName}

RELATIVE'S INFORMATION:
${relative.biography ? `Biography: ${relative.biography}` : ''}
${relative.notes.map(n => `Note "${n.title}": ${n.content}`).join('\n')}
${relative.events.map(e => `Event "${e.title}": ${e.description || 'No description'}`).join('\n')}

INSTRUCTIONS:
1. Extract ONLY facts that are directly relevant to ${person.displayName}
2. Include facts that ${person.displayName} likely experienced or was affected by
3. Exclude facts that are only about ${relative.personName} and not ${person.displayName}
4. For each fact, explain WHY it's relevant to ${person.displayName}
5. Cite the source (biography, specific note, or specific event)

IMPORTANT: Only include highly relevant facts. If a fact is marginally relevant, exclude it.
If nothing is highly relevant, return an empty relevantFacts array.
`;
}
```

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/ai/schemas/biography-v2.ts` | MODIFY | Add RelatedContext schemas |
| `src/ai/flows/biography/context-mining.ts` | CREATE | Relative lookup and context extraction |
| `src/ai/flows/biography/context-mining.test.ts` | CREATE | Context mining tests |

---

## Completion Criteria

- [x] All test cases pass (~12 tests) - **17 tests passing**
- [x] Type check passes
- [x] Lint passes
- [x] Relatives correctly identified by type
- [x] Context extraction focuses on relevant facts only
- [x] Source attribution preserved in context notes
- [x] Marginal information filtered out
