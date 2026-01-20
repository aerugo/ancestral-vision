# Phase 3: Biography Generation with Citations

**Status**: Pending
**Started**:
**Parent Plan**: [development-plan.md](../development-plan.md)

---

## Objective

Generate biographies that explicitly cite sources for every claim, using person details, notes, events, and mined context from relatives.

---

## Invariants Enforced in This Phase

- **INV-AI005**: AI Outputs Use Zod Validation - Biography output validated with schema
- **INV-AI006**: Biography Content Must Be Source-Verified - Every claim cites its source

---

## TDD Steps

### Step 3.1: Write Schemas for Cited Biography (RED → GREEN)

Create additional schemas in `src/ai/schemas/biography-v2.ts`:

```typescript
export const CitationSchema = z.object({
  sourceType: z.enum(['person_detail', 'note', 'event', 'relative_context']),
  sourceId: z.string().optional(), // ID of note, event, or relative context
  fieldName: z.string().optional(), // For person_detail: 'birthDate', 'deathDate', etc.
  relativeName: z.string().optional(), // For relative_context: which relative
  excerpt: z.string(), // The specific text/data being cited
});

export const CitedSentenceSchema = z.object({
  sentence: z.string(),
  citations: z.array(CitationSchema).min(1), // Every sentence must have at least one citation
});

export const CitedBiographySchema = z.object({
  sentences: z.array(CitedSentenceSchema),
  fullText: z.string(), // The complete biography as plain text
  wordCount: z.number(),
  sourceSummary: z.object({
    personDetailsUsed: z.array(z.string()), // Which fields were used
    notesUsed: z.array(z.string()), // Note IDs
    eventsUsed: z.array(z.string()), // Event IDs
    relativeContextUsed: z.array(z.string()), // Relative person IDs
  }),
});
```

### Step 3.2: Write Tests for Biography Prompt Builder (RED)

Create `src/ai/flows/biography/generation.test.ts`:

**Test Cases**:

1. `it('should include all person details in prompt')` - Name, dates, places
2. `it('should include all notes with IDs in prompt')` - For citation tracking
3. `it('should include all events with IDs in prompt')` - For citation tracking
4. `it('should include related context with source attribution')` - From Phase 2
5. `it('should instruct AI to cite every claim')` - Explicit instructions
6. `it('should instruct AI not to speculate')` - Anti-speculation rules

### Step 3.3: Implement Biography Prompt Builder (GREEN)

Create `src/ai/flows/biography/generation.ts`:

```typescript
export interface BiographyGenerationInput {
  personDetails: PersonDetails;
  sourceMaterial: SourceMaterial;
  relatedContext: RelatedContext[];
}

export function buildBiographyPrompt(input: BiographyGenerationInput): string {
  const { personDetails, sourceMaterial, relatedContext } = input;

  return `
You are writing a factual biography for a genealogical record.
You MUST cite sources for EVERY claim you make.
You MUST NOT speculate or invent any information.
If information is uncertain, state the uncertainty explicitly.

SUBJECT: ${personDetails.displayName}

PRIMARY SOURCES (cite these first):

PERSON DETAILS:
${formatPersonDetails(personDetails)}

NOTES (cite by note ID):
${sourceMaterial.notes.map(n => `[NOTE:${n.id}] "${n.title}": ${n.content}`).join('\n')}

EVENTS (cite by event ID):
${sourceMaterial.events.map(e => `[EVENT:${e.id}] "${e.title}" (${formatEventDate(e)}): ${e.description || 'No description'}`).join('\n')}

CONTEXT FROM RELATIVES (secondary sources, cite by relative name):
${relatedContext.map(rc => `
[RELATIVE:${rc.personName}] (${rc.relationshipType}):
${rc.relevantFacts.map(f => `- ${f.fact} (from ${f.source})`).join('\n')}
`).join('\n')}

INSTRUCTIONS:
1. Write a cohesive narrative biography of 150-300 words
2. Every sentence must be based on the sources above
3. Use [SOURCE_TYPE:ID] notation for citations within the text
4. Do NOT make up dates, places, relationships, or events
5. If something is implied but not stated, use phrases like "likely" or "possibly"
6. Focus on what IS known, not what might be
7. Prioritize primary sources (notes, events) over relative context

OUTPUT FORMAT:
For each sentence, provide the sentence text followed by its citations.
`;
}

function formatPersonDetails(details: PersonDetails): string {
  const lines: string[] = [];

  if (details.givenName) lines.push(`[DETAIL:givenName] Given name: ${details.givenName}`);
  if (details.surname) lines.push(`[DETAIL:surname] Surname: ${details.surname}`);
  if (details.gender) lines.push(`[DETAIL:gender] Gender: ${details.gender}`);
  if (details.birthDate) lines.push(`[DETAIL:birthDate] Birth date: ${formatFuzzyDate(details.birthDate)}`);
  if (details.deathDate) lines.push(`[DETAIL:deathDate] Death date: ${formatFuzzyDate(details.deathDate)}`);
  if (details.birthPlace) lines.push(`[DETAIL:birthPlace] Birth place: ${details.birthPlace.name}`);
  if (details.deathPlace) lines.push(`[DETAIL:deathPlace] Death place: ${details.deathPlace.name}`);
  if (details.occupation) lines.push(`[DETAIL:occupation] Occupation: ${details.occupation}`);
  if (details.biography) lines.push(`[DETAIL:existingBio] Existing biography: ${details.biography}`);

  return lines.join('\n');
}
```

### Step 3.4: Write Tests for Biography Generation Flow (RED)

**Test Cases**:

1. `it('should generate biography with citations for each sentence')` - Core functionality
2. `it('should use person details as primary citations')` - Birth, death, etc.
3. `it('should cite notes when using note content')` - Note ID in citation
4. `it('should cite events when using event content')` - Event ID in citation
5. `it('should cite relative context as secondary source')` - Relative name in citation
6. `it('should validate output against CitedBiographySchema')` - INV-AI005
7. `it('should track which sources were actually used')` - Source summary
8. `it('should reject generation if no citations possible')` - Edge case

### Step 3.5: Implement Biography Generation Flow (GREEN)

```typescript
export async function generateCitedBiography(
  input: BiographyGenerationInput
): Promise<CitedBiography> {
  const ai = getAI();
  const model = getDefaultModel();

  const prompt = buildBiographyPrompt(input);

  const response = await ai.generate({
    model,
    prompt,
    output: { schema: CitedBiographySchema },
    config: {
      temperature: 0.3, // Low temperature for factual content
    },
  });

  if (!response.output) {
    throw new Error('Failed to generate biography');
  }

  // Validate that all citations reference actual sources
  validateCitations(response.output, input);

  return response.output;
}

function validateCitations(
  biography: CitedBiography,
  input: BiographyGenerationInput
): void {
  const validNoteIds = new Set(input.sourceMaterial.notes.map(n => n.id));
  const validEventIds = new Set(input.sourceMaterial.events.map(e => e.id));
  const validRelativeNames = new Set(input.relatedContext.map(rc => rc.personName));
  const validDetailFields = new Set([
    'givenName', 'surname', 'gender', 'birthDate', 'deathDate',
    'birthPlace', 'deathPlace', 'occupation', 'existingBio'
  ]);

  for (const sentence of biography.sentences) {
    for (const citation of sentence.citations) {
      switch (citation.sourceType) {
        case 'note':
          if (!validNoteIds.has(citation.sourceId!)) {
            throw new Error(`Invalid note citation: ${citation.sourceId}`);
          }
          break;
        case 'event':
          if (!validEventIds.has(citation.sourceId!)) {
            throw new Error(`Invalid event citation: ${citation.sourceId}`);
          }
          break;
        case 'relative_context':
          if (!validRelativeNames.has(citation.relativeName!)) {
            throw new Error(`Invalid relative citation: ${citation.relativeName}`);
          }
          break;
        case 'person_detail':
          if (!validDetailFields.has(citation.fieldName!)) {
            throw new Error(`Invalid person detail citation: ${citation.fieldName}`);
          }
          break;
      }
    }
  }
}
```

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/ai/schemas/biography-v2.ts` | MODIFY | Add citation and cited biography schemas |
| `src/ai/flows/biography/generation.ts` | CREATE | Biography prompt builder and generation flow |
| `src/ai/flows/biography/generation.test.ts` | CREATE | Generation tests |

---

## Completion Criteria

- [ ] All test cases pass (~15 tests)
- [ ] Type check passes
- [ ] Lint passes
- [ ] Every sentence has at least one citation
- [ ] Citations reference valid sources
- [ ] Source summary accurately tracks used sources
- [ ] Low temperature used for factual content
- [ ] Anti-speculation instructions included in prompt
