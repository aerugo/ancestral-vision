# Phase 5: Integration & GraphQL

**Status**: Pending
**Started**:
**Parent Plan**: [development-plan.md](../development-plan.md)

---

## Objective

Integrate all biography generation components into a unified flow and expose via GraphQL API with proper quota enforcement and suggestion workflow.

---

## Invariants Enforced in This Phase

- **INV-AI001**: AI Operations Require Quota Check - Check quota before generation
- **INV-AI002**: AI Operations Must Track Usage - Increment usage on success
- **INV-AI003**: AI Suggestions Require User Approval - Create AISuggestion record
- **INV-S002**: Constellation Isolation - Only access user's own data

---

## TDD Steps

### Step 5.1: Write Tests for Unified Biography Flow (RED)

Create `src/ai/flows/biography/index.test.ts`:

**Test Cases**:

1. `it('should check eligibility before generation')` - INV-AI007
2. `it('should return eligibility error if no sources')` - No notes/events
3. `it('should assemble source material')` - Gather notes, events
4. `it('should mine related context')` - Gather relative info
5. `it('should generate cited biography')` - Main generation
6. `it('should validate generated biography')` - Post-generation check
7. `it('should retry generation if validation fails')` - Self-correction
8. `it('should return error after max retries')` - Give up eventually

### Step 5.2: Implement Unified Biography Flow (GREEN)

Create `src/ai/flows/biography/index.ts`:

```typescript
import { checkBiographyEligibility, assembleSourceMaterial } from './eligibility';
import { findRelatives, extractRelatedContext } from './context-mining';
import { generateCitedBiography } from './generation';
import { validateBiography } from './validation';
import type { PersonDetails, CitedBiography, ValidationResult } from '@/ai/schemas/biography-v2';

export interface BiographyFlowResult {
  success: boolean;
  biography?: CitedBiography;
  validation?: ValidationResult;
  error?: {
    code: 'NOT_ELIGIBLE' | 'GENERATION_FAILED' | 'VALIDATION_FAILED' | 'MAX_RETRIES';
    message: string;
    details?: unknown;
  };
}

export interface BiographyFlowOptions {
  maxRetries?: number;
  constellationId: string;
}

const DEFAULT_MAX_RETRIES = 2;

export async function generateBiographyV2(
  personId: string,
  options: BiographyFlowOptions
): Promise<BiographyFlowResult> {
  // Step 1: Check eligibility
  const eligibility = await checkBiographyEligibility(personId);

  if (!eligibility.isEligible) {
    return {
      success: false,
      error: {
        code: 'NOT_ELIGIBLE',
        message: eligibility.reason || 'Person does not have enough source material',
        details: eligibility.missingRequirements,
      },
    };
  }

  // Step 2: Assemble source material
  const sourceMaterial = await assembleSourceMaterial(personId);

  // Step 3: Find and mine context from relatives
  const relatives = await findRelatives(personId, options.constellationId);
  const relatedContext = await extractRelatedContext(
    sourceMaterial.personDetails,
    relatives
  );

  // Step 4: Generate biography with citations
  const generationInput = {
    personDetails: sourceMaterial.personDetails,
    sourceMaterial,
    relatedContext,
  };

  let attempts = 0;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

  while (attempts <= maxRetries) {
    attempts++;

    try {
      const biography = await generateCitedBiography(generationInput);

      // Step 5: Validate the generated biography
      const validation = await validateBiography(biography, generationInput);

      if (validation.isValid) {
        return {
          success: true,
          biography,
          validation,
        };
      }

      // If validation failed and we have retries left, try again
      if (attempts <= maxRetries) {
        console.log(`Biography validation failed, retry ${attempts}/${maxRetries}`);
        continue;
      }

      // Out of retries, return the best effort with validation issues
      return {
        success: false,
        biography,
        validation,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Generated biography contains unverified claims',
          details: validation.issues,
        },
      };
    } catch (error) {
      if (attempts > maxRetries) {
        return {
          success: false,
          error: {
            code: 'GENERATION_FAILED',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    }
  }

  return {
    success: false,
    error: {
      code: 'MAX_RETRIES',
      message: `Failed to generate valid biography after ${maxRetries} attempts`,
    },
  };
}
```

### Step 5.3: Write Tests for GraphQL Mutation (RED)

Update `src/graphql/resolvers/ai.test.ts`:

**Test Cases**:

1. `it('should check quota before generation (INV-AI001)')` - Quota check first
2. `it('should reject if quota exhausted')` - QuotaExceededError
3. `it('should track usage on success (INV-AI002)')` - Usage incremented
4. `it('should NOT track usage on eligibility failure')` - No charge if ineligible
5. `it('should create AISuggestion on success (INV-AI003)')` - Suggestion created
6. `it('should include validation in suggestion metadata')` - Full context
7. `it('should reject for person not in constellation (INV-S002)')` - Access check
8. `it('should return eligibility error with requirements')` - Helpful error

### Step 5.4: Update GraphQL Mutation (GREEN)

Update `src/graphql/resolvers/ai-resolvers.ts`:

```typescript
import { generateBiographyV2 } from '@/ai/flows/biography';
import { checkAndConsumeQuota, QuotaExceededError } from '@/ai/quota';
import { prisma } from '@/lib/prisma';
import { GraphQLError } from 'graphql';

export const aiMutations = {
  generateBiography: async (
    _parent: unknown,
    args: { personId: string },
    context: GraphQLContext
  ): Promise<BiographyGenerationResult> => {
    const authUser = requireAuth(context);

    // Get the person and verify access (INV-S002)
    const person = await prisma.person.findFirst({
      where: {
        id: args.personId,
        constellation: {
          ownerId: authUser.id,
        },
        deletedAt: null,
      },
      include: {
        constellation: true,
      },
    });

    if (!person) {
      throw new GraphQLError('Person not found or access denied', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Generate biography (will check eligibility first)
    const result = await generateBiographyV2(person.id, {
      constellationId: person.constellation.id,
    });

    // If not eligible, return error WITHOUT consuming quota
    if (!result.success && result.error?.code === 'NOT_ELIGIBLE') {
      throw new GraphQLError(result.error.message, {
        extensions: {
          code: 'NOT_ELIGIBLE',
          missingRequirements: result.error.details,
        },
      });
    }

    // Check and consume quota for actual generation (INV-AI001, INV-AI002)
    try {
      await checkAndConsumeQuota(authUser.id);
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        throw new GraphQLError('AI operation quota exceeded', {
          extensions: { code: 'QUOTA_EXCEEDED' },
        });
      }
      throw error;
    }

    // Handle generation/validation failure
    if (!result.success) {
      throw new GraphQLError(result.error?.message || 'Biography generation failed', {
        extensions: {
          code: result.error?.code || 'GENERATION_FAILED',
          details: result.error?.details,
        },
      });
    }

    // Create AI suggestion instead of directly modifying person (INV-AI003)
    const suggestion = await prisma.aISuggestion.create({
      data: {
        type: 'BIOGRAPHY',
        status: 'PENDING',
        personId: person.id,
        userId: authUser.id,
        payload: {
          biography: result.biography!.fullText,
          sentences: result.biography!.sentences,
        },
        metadata: {
          wordCount: result.biography!.wordCount,
          sourceSummary: result.biography!.sourceSummary,
          validation: result.validation,
        },
      },
    });

    return {
      suggestionId: suggestion.id,
      biography: result.biography!.fullText,
      wordCount: result.biography!.wordCount,
      isValid: result.validation!.isValid,
      confidenceScore: result.validation!.confidenceScore,
      sourceSummary: result.biography!.sourceSummary,
    };
  },
};
```

### Step 5.5: Write Tests for GraphQL Schema (RED)

**Test Cases**:

1. `it('should have generateBiography mutation')` - Schema has mutation
2. `it('should return BiographyGenerationResult type')` - Proper return type

### Step 5.6: Update GraphQL Schema (GREEN)

Update `src/graphql/schema/ai.graphql`:

```graphql
type BiographyGenerationResult {
  suggestionId: ID!
  biography: String!
  wordCount: Int!
  isValid: Boolean!
  confidenceScore: Float!
  sourceSummary: BiographySourceSummary!
}

type BiographySourceSummary {
  personDetailsUsed: [String!]!
  notesUsed: [ID!]!
  eventsUsed: [ID!]!
  relativeContextUsed: [ID!]!
}

type BiographyEligibility {
  isEligible: Boolean!
  reason: String
  missingRequirements: [String!]
}

extend type Mutation {
  """
  Generate a biography for a person using AI.
  Returns a suggestion that must be approved before being applied.
  """
  generateBiography(personId: ID!): BiographyGenerationResult!
}

extend type Query {
  """
  Check if a person is eligible for biography generation.
  """
  biographyEligibility(personId: ID!): BiographyEligibility!
}
```

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/ai/flows/biography/index.ts` | CREATE | Unified biography flow |
| `src/ai/flows/biography/index.test.ts` | CREATE | Integration tests |
| `src/graphql/resolvers/ai-resolvers.ts` | MODIFY | Update generateBiography mutation |
| `src/graphql/resolvers/ai.test.ts` | MODIFY | Add new tests |
| `src/graphql/schema/ai.graphql` | MODIFY | Update schema |

---

## Completion Criteria

- [ ] All test cases pass (~10 tests)
- [ ] Type check passes
- [ ] Lint passes
- [ ] Unified flow orchestrates all phases
- [ ] Retry logic works for validation failures
- [ ] Quota checked AFTER eligibility (no charge if ineligible)
- [ ] AISuggestion created with full metadata
- [ ] GraphQL schema properly typed
- [ ] Access control enforced
