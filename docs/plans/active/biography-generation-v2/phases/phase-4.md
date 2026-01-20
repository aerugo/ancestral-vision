# Phase 4: Factual Validation

**Status**: Pending
**Started**:
**Parent Plan**: [development-plan.md](../development-plan.md)

---

## Objective

Validate the generated biography against source material to ensure no speculation or fabrication, flagging any claims that cannot be verified.

---

## Invariants Enforced in This Phase

- **INV-AI006**: Biography Content Must Be Source-Verified - Validation catches unverified claims
- **INV-AI005**: AI Outputs Use Zod Validation - Validation results use Zod schema

---

## TDD Steps

### Step 4.1: Write Schemas for Validation Results (RED → GREEN)

Add to `src/ai/schemas/biography-v2.ts`:

```typescript
export const ValidationIssueSchema = z.object({
  sentenceIndex: z.number(),
  sentence: z.string(),
  issueType: z.enum([
    'unsupported_claim', // Claim has no source backing
    'speculative_language', // Uses "might have", "probably", etc. inappropriately
    'fabricated_detail', // Detail not found in any source
    'misattribution', // Citation doesn't match source content
    'date_inconsistency', // Dates don't match sources
    'relationship_error', // Relationship claim not in sources
  ]),
  description: z.string(),
  severity: z.enum(['error', 'warning', 'info']),
  suggestedFix: z.string().optional(),
});

export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  issues: z.array(ValidationIssueSchema),
  verifiedClaimCount: z.number(),
  unverifiedClaimCount: z.number(),
  confidenceScore: z.number().min(0).max(1),
});
```

### Step 4.2: Write Tests for Claim Extraction (RED)

Create `src/ai/flows/biography/validation.test.ts`:

**Test Cases**:

1. `it('should extract factual claims from biography')` - Parse sentences into claims
2. `it('should identify date claims')` - "born in 1920"
3. `it('should identify location claims')` - "lived in London"
4. `it('should identify relationship claims')` - "married to Jane"
5. `it('should identify occupation claims')` - "worked as a farmer"
6. `it('should ignore non-factual statements')` - "was beloved by many"

### Step 4.3: Implement Claim Extraction (GREEN)

Create `src/ai/flows/biography/validation.ts`:

```typescript
export interface ExtractedClaim {
  sentenceIndex: number;
  claimText: string;
  claimType: 'date' | 'location' | 'relationship' | 'occupation' | 'event' | 'other';
  citedSource?: Citation;
}

export async function extractClaims(biography: CitedBiography): Promise<ExtractedClaim[]> {
  const claims: ExtractedClaim[] = [];

  for (let i = 0; i < biography.sentences.length; i++) {
    const sentence = biography.sentences[i];

    // Each sentence may contain multiple claims
    // The citations should map to specific claims
    for (const citation of sentence.citations) {
      claims.push({
        sentenceIndex: i,
        claimText: sentence.sentence,
        claimType: inferClaimType(citation),
        citedSource: citation,
      });
    }
  }

  return claims;
}

function inferClaimType(citation: Citation): ExtractedClaim['claimType'] {
  if (citation.sourceType === 'person_detail') {
    switch (citation.fieldName) {
      case 'birthDate':
      case 'deathDate':
        return 'date';
      case 'birthPlace':
      case 'deathPlace':
        return 'location';
      case 'occupation':
        return 'occupation';
      default:
        return 'other';
    }
  }

  if (citation.sourceType === 'event') {
    return 'event';
  }

  if (citation.sourceType === 'relative_context') {
    return 'relationship';
  }

  return 'other';
}
```

### Step 4.4: Write Tests for Source Verification (RED)

**Test Cases**:

1. `it('should verify date claim against person details')` - birthDate matches
2. `it('should verify location claim against person details')` - birthPlace matches
3. `it('should verify claim against note content')` - Note contains the info
4. `it('should verify claim against event content')` - Event matches
5. `it('should flag claim not found in cited source')` - Misattribution
6. `it('should flag speculative language')` - "might have", "probably"
7. `it('should flag fabricated details')` - Details not in any source

### Step 4.5: Implement Source Verification (GREEN)

```typescript
export async function verifyClaimAgainstSource(
  claim: ExtractedClaim,
  input: BiographyGenerationInput
): Promise<ValidationIssue | null> {
  const { citedSource } = claim;

  if (!citedSource) {
    return {
      sentenceIndex: claim.sentenceIndex,
      sentence: claim.claimText,
      issueType: 'unsupported_claim',
      description: 'Claim has no citation',
      severity: 'error',
    };
  }

  // Verify the citation matches actual source content
  switch (citedSource.sourceType) {
    case 'person_detail':
      return verifyPersonDetailClaim(claim, input.personDetails, citedSource);

    case 'note':
      return verifyNoteClaim(claim, input.sourceMaterial.notes, citedSource);

    case 'event':
      return verifyEventClaim(claim, input.sourceMaterial.events, citedSource);

    case 'relative_context':
      return verifyRelativeContextClaim(claim, input.relatedContext, citedSource);
  }
}

function verifyPersonDetailClaim(
  claim: ExtractedClaim,
  personDetails: PersonDetails,
  citation: Citation
): ValidationIssue | null {
  const fieldName = citation.fieldName!;
  const actualValue = personDetails[fieldName as keyof PersonDetails];

  if (actualValue === undefined || actualValue === null) {
    return {
      sentenceIndex: claim.sentenceIndex,
      sentence: claim.claimText,
      issueType: 'fabricated_detail',
      description: `Person detail '${fieldName}' not found in source`,
      severity: 'error',
      suggestedFix: 'Remove this claim or find an alternative source',
    };
  }

  // For complex verification, we'd use AI to check semantic match
  // For now, verify the field exists
  return null;
}

function verifyNoteClaim(
  claim: ExtractedClaim,
  notes: NoteSource[],
  citation: Citation
): ValidationIssue | null {
  const note = notes.find(n => n.id === citation.sourceId);

  if (!note) {
    return {
      sentenceIndex: claim.sentenceIndex,
      sentence: claim.claimText,
      issueType: 'misattribution',
      description: `Note '${citation.sourceId}' not found`,
      severity: 'error',
    };
  }

  // Verify the excerpt actually appears in the note
  if (citation.excerpt && !note.content.includes(citation.excerpt)) {
    return {
      sentenceIndex: claim.sentenceIndex,
      sentence: claim.claimText,
      issueType: 'misattribution',
      description: `Cited excerpt not found in note content`,
      severity: 'warning',
    };
  }

  return null;
}
```

### Step 4.6: Write Tests for Full Validation Flow (RED)

**Test Cases**:

1. `it('should return valid for fully verified biography')` - All claims check out
2. `it('should return invalid for biography with fabricated claims')` - Has errors
3. `it('should calculate confidence score based on verification rate')` - Score logic
4. `it('should aggregate all issues')` - Multiple issues collected
5. `it('should categorize issues by severity')` - Error vs warning vs info

### Step 4.7: Implement Full Validation Flow (GREEN)

```typescript
export async function validateBiography(
  biography: CitedBiography,
  input: BiographyGenerationInput
): Promise<ValidationResult> {
  const claims = await extractClaims(biography);
  const issues: ValidationIssue[] = [];
  let verifiedCount = 0;
  let unverifiedCount = 0;

  // Check for speculative language
  const speculativePatterns = [
    /\bmight have\b/i,
    /\bprobably\b/i,
    /\bperhaps\b/i,
    /\bpossibly\b/i,
    /\blikely\b/i,
    /\bmay have\b/i,
    /\bcould have\b/i,
  ];

  for (let i = 0; i < biography.sentences.length; i++) {
    const sentence = biography.sentences[i];

    for (const pattern of speculativePatterns) {
      if (pattern.test(sentence.sentence)) {
        issues.push({
          sentenceIndex: i,
          sentence: sentence.sentence,
          issueType: 'speculative_language',
          description: `Contains speculative language: ${pattern.source}`,
          severity: 'warning',
          suggestedFix: 'Rephrase to be more definitive or remove the claim',
        });
      }
    }
  }

  // Verify each claim
  for (const claim of claims) {
    const issue = await verifyClaimAgainstSource(claim, input);

    if (issue) {
      issues.push(issue);
      if (issue.severity === 'error') {
        unverifiedCount++;
      } else {
        verifiedCount++; // Warnings still count as verified
      }
    } else {
      verifiedCount++;
    }
  }

  const totalClaims = verifiedCount + unverifiedCount;
  const confidenceScore = totalClaims > 0 ? verifiedCount / totalClaims : 0;

  // Biography is valid if no errors (warnings are acceptable)
  const hasErrors = issues.some(i => i.severity === 'error');

  return {
    isValid: !hasErrors,
    issues,
    verifiedClaimCount: verifiedCount,
    unverifiedClaimCount: unverifiedCount,
    confidenceScore,
  };
}
```

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/ai/schemas/biography-v2.ts` | MODIFY | Add validation result schemas |
| `src/ai/flows/biography/validation.ts` | CREATE | Claim extraction and verification |
| `src/ai/flows/biography/validation.test.ts` | CREATE | Validation tests |

---

## Completion Criteria

- [ ] All test cases pass (~12 tests)
- [ ] Type check passes
- [ ] Lint passes
- [ ] Claims correctly extracted from biography
- [ ] Each claim type properly verified against sources
- [ ] Speculative language detected and flagged
- [ ] Fabricated details detected as errors
- [ ] Confidence score accurately reflects verification rate
- [ ] Validation result schema enforced
