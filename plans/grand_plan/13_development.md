# Ancestral Vision: Development Principles & Protocols

> **Status**: COMPLETE - Development workflow and principles defined

This document defines the development methodology for Ancestral Vision, optimized for AI-augmented development with Claude Code.

---

## Development Philosophy

Ancestral Vision is built by a **solo developer with AI agent orchestration**. This requires:

1. **Rigorous documentation** - Agents need context to perform well
2. **Spec-driven development** - Plans before code
3. **Test-driven development** - Tests validate agent output
4. **Invariants enforcement** - Prevent regressions
5. **MCP integration** - Agents interact with infrastructure directly

---

## The Five Development Patterns

### Pattern 1: Document All Project INVARIANTS

Invariants are rules that must **never** be broken. They are checked by tests and enforced by CI.

**Location**: `docs/invariants/`

**Structure**:
```
docs/invariants/
├── INVARIANTS.md           # Master list of all invariants
├── data-integrity.md       # Database/data invariants
├── security.md             # Security invariants
├── api-contracts.md        # API invariants
└── ui-ux.md                # UX invariants
```

**Example INVARIANTS.md**:
```markdown
# Project Invariants

These rules must NEVER be broken. All invariants have corresponding tests.

## Data Integrity

- INV-D001: Person IDs are globally unique UUIDs
- INV-D002: A person cannot be their own ancestor
- INV-D003: Birth date cannot be after death date
- INV-D004: Parent must be 14-60 years older than child at birth
- INV-D005: Soft-deleted entities remain queryable for 30 days

## Security

- INV-S001: All API endpoints require authentication except /api/health and share links
- INV-S002: Users can only access their own constellation data
- INV-S003: Privacy levels are always enforced (private, connections, public)
- INV-S004: Firebase JWT tokens are validated on every request
- INV-S005: Rate limits are enforced per user

## API Contracts

- INV-A001: GraphQL schema changes are additive only (no breaking changes)
- INV-A002: All mutations return the modified entity
- INV-A003: Pagination uses cursor-based approach
- INV-A004: Error responses include error code and message

## UX

- INV-U001: Onboarding can always be resumed from any step
- INV-U002: Data export is always available (GEDCOM, JSON)
- INV-U003: Undo is available for destructive actions (30-day soft delete)
```

**Invariant Test Pattern**:
```typescript
// tests/invariants/data-integrity.test.ts
import { describe, it, expect } from 'vitest';

describe('Data Integrity Invariants', () => {
  describe('INV-D002: Person cannot be own ancestor', () => {
    it('should reject circular parent relationship', async () => {
      const person = await createPerson({ id: 'p1' });

      await expect(
        createParentChild({ parentId: 'p1', childId: 'p1' })
      ).rejects.toThrow(/circular/i);
    });

    it('should reject indirect circular ancestry', async () => {
      // A -> B -> C -> A should be rejected
      await createParentChild({ parentId: 'a', childId: 'b' });
      await createParentChild({ parentId: 'b', childId: 'c' });

      await expect(
        createParentChild({ parentId: 'c', childId: 'a' })
      ).rejects.toThrow(/circular/i);
    });
  });
});
```

---

### Pattern 2: Claude Code Configuration (.claude Files)

Configure Claude Code with style guides, conventions, and specialized agents.

**Structure**:
```
.claude/
├── settings.json           # Project-wide Claude settings
├── CLAUDE.md               # Main instructions for Claude
├── agents/
│   ├── typescript-stylist.md
│   ├── test-engineer.md
│   ├── threejs-engineer.md
│   ├── graphql-architect.md
│   ├── prisma-specialist.md
│   └── infrastructure-ops.md
└── prompts/
    ├── plan-template.md
    ├── feature-request.md
    └── bug-report.md
```

**CLAUDE.md Template**:
```markdown
# Ancestral Vision Development Guide

## Project Overview
Ancestral Vision is a genealogy platform with 3D constellation visualization.

## Tech Stack
- Frontend: Next.js 14+, React, TypeScript, Tailwind CSS, shadcn/ui
- 3D: Three.js with WebGPU/WebGL
- API: GraphQL Yoga
- Database: PostgreSQL + Prisma
- Auth: Firebase Auth
- AI: Genkit + Vertex AI
- Deployment: Google Cloud Run

## Development Workflow

### Before Starting Work
1. Read the relevant plan in `docs/plans/`
2. Review invariants in `docs/invariants/INVARIANTS.md`
3. Check existing tests for context

### While Working
1. Follow TDD: Write tests first
2. Run tests frequently: `npm test`
3. Type check: `npx tsc --noEmit`
4. Lint: `npm run lint`

### After Completing Work
1. Ensure all tests pass
2. Update plan with any divergence
3. Document any new invariants

## Key Files
- `prisma/schema.prisma` - Database schema
- `src/graphql/schema.graphql` - API schema
- `src/types/` - TypeScript type definitions
- `docs/invariants/` - Project invariants

## Code Style
- Use explicit `public`/`private` on class members
- Private members use `_` prefix
- Complete type annotations always
- No `any` types
- Prefer interfaces over type aliases for objects
```

**Agent File Format** (per Claude Code documentation):
```markdown
---
name: agent-name
description: When to use this agent proactively
tools: Read, Edit, Glob, Grep, Bash
model: sonnet
---

# Agent Title

## Role
One-paragraph description of expertise.

## When to Use
Bullet list of scenarios.

## Key Files
Files this agent should read first.

## Patterns
Code patterns and examples.

## Verification
Commands to verify work.
```

**Required Agents for Ancestral Vision**:

| Agent | Purpose | Model |
|-------|---------|-------|
| `typescript-stylist` | Type safety, code style | sonnet |
| `test-engineer` | Test design and implementation | sonnet |
| `threejs-engineer` | 3D visualization, shaders | sonnet |
| `graphql-architect` | Schema design, resolvers | sonnet |
| `prisma-specialist` | Database schema, migrations | sonnet |
| `infrastructure-ops` | GCP, deployment, MCP | opus |
| `genkit-agent` | AI flows, Vertex AI | sonnet |

---

### Pattern 3: MCP Servers for Infrastructure

Use MCP (Model Context Protocol) servers to give agents direct access to infrastructure.

**Required MCP Servers**:

| Server | Purpose | Operations |
|--------|---------|------------|
| `@anthropic/mcp-gcloud` | GCP operations | Cloud Run, Cloud SQL, Storage, Secrets |
| `@anthropic/mcp-postgres` | Database queries | SELECT, migrations, debugging |
| `@anthropic/mcp-firebase` | Auth management | Users, tokens, emulator |

**MCP Configuration** (`.claude/mcp.json`):
```json
{
  "servers": {
    "gcloud": {
      "command": "npx",
      "args": ["@anthropic/mcp-gcloud"],
      "env": {
        "GOOGLE_CLOUD_PROJECT": "${GOOGLE_CLOUD_PROJECT}",
        "GOOGLE_APPLICATION_CREDENTIALS": "${GOOGLE_APPLICATION_CREDENTIALS}"
      }
    },
    "postgres": {
      "command": "npx",
      "args": ["@anthropic/mcp-postgres"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}"
      }
    },
    "firebase": {
      "command": "npx",
      "args": ["@anthropic/mcp-firebase"],
      "env": {
        "FIREBASE_PROJECT": "${FIREBASE_PROJECT}"
      }
    }
  }
}
```

**Agent Usage Pattern**:
```markdown
When debugging a production issue:

1. Use MCP to query Cloud Logging:
   `gcloud logging read "resource.type=cloud_run_revision" --limit=50`

2. Use MCP to check database state:
   `SELECT * FROM "Person" WHERE id = 'xxx' LIMIT 1`

3. Use MCP to verify Cloud Run deployment:
   `gcloud run services describe ancestral-vision-api`
```

**Testing in Production** (with MCP):
```markdown
For production debugging:

1. Agent connects via MCP to production PostgreSQL (read-only)
2. Agent queries logs via Cloud Logging MCP
3. Agent proposes fix in development branch
4. Human reviews and approves deployment
5. Agent deploys via Cloud Build trigger
```

---

### Pattern 4: Strict Test-Driven Development (TDD)

Every feature follows the TDD cycle: **Red → Green → Refactor**

**TDD Workflow**:

```
1. Write failing test(s) that define expected behavior
2. Run tests - confirm they fail (Red)
3. Write minimal code to pass tests
4. Run tests - confirm they pass (Green)
5. Refactor while keeping tests green
6. Commit
```

**Test Categories**:

| Category | Location | Purpose | Run Frequency |
|----------|----------|---------|---------------|
| Unit | `*.test.ts` next to source | Test functions/classes in isolation | Every save |
| Integration | `tests/integration/` | Test module interactions | Pre-commit |
| E2E | `tests/e2e/` | Test user flows | Pre-merge |
| Invariants | `tests/invariants/` | Verify invariants hold | CI pipeline |

**Test File Structure**:
```typescript
// src/graph/graph.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { FamilyGraph } from './graph';
import { createTestFamily } from '@/tests/factories';

describe('FamilyGraph', () => {
  // Group by feature/method
  describe('constructor', () => {
    it('should create nodes for all people', () => {
      // Arrange
      const data = createTestFamily({ peopleCount: 5 });

      // Act
      const graph = new FamilyGraph(data);

      // Assert
      expect(graph.nodeCount).toBe(5);
    });
  });

  describe('getAncestors', () => {
    it('should return empty array for person with no parents', () => {
      // ...
    });

    it('should return parents and grandparents', () => {
      // ...
    });

    it('should respect maxGenerations parameter', () => {
      // ...
    });
  });
});
```

**Coverage Requirements**:

| Component | Minimum Coverage |
|-----------|------------------|
| GraphQL Resolvers | 90% |
| Database Operations | 90% |
| Business Logic | 85% |
| Utilities | 80% |
| UI Components | 70% |
| 3D Rendering | 50% (visual testing) |

**CI Test Gates**:
```yaml
# In CI pipeline
test:
  - npm run test:unit
  - npm run test:integration
  - npm run test:invariants
  - npx vitest --coverage --coverage.thresholds.lines=80
```

---

### Pattern 5: Spec-Driven Development

Every feature starts with a specification before any code is written.

**Plan Structure**:
```
docs/plans/
├── CLAUDE.md               # Plan template and workflow
├── active/
│   └── feature-name/
│       ├── spec.md         # Feature specification
│       ├── development.md  # Implementation plan
│       └── progress.md     # Progress tracking
├── completed/
│   └── feature-name/
│       └── ...
└── templates/
    ├── spec-template.md
    └── development-template.md
```

**Plan Template (docs/plans/CLAUDE.md)**:
```markdown
# Development Plan Protocol

## Creating a New Feature Plan

1. Create directory: `docs/plans/active/{feature-name}/`
2. Copy templates from `docs/plans/templates/`
3. Fill in spec.md with requirements
4. Fill in development.md with implementation phases
5. Begin implementation following TDD

## Spec Template Structure

### Feature: {Name}

**Goal**: One sentence describing the outcome.

**User Stories**: Which US-x.x stories does this address?

**Acceptance Criteria**:
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

**Technical Requirements**:
- Database changes
- API changes
- UI changes

**Dependencies**:
- What must exist before this can be built?

**Out of Scope**:
- What this feature explicitly does NOT include

## Development Plan Structure

### Phase 1: {Name}

**Goal**: What this phase accomplishes.

**Tasks**:
1. Task with test requirement
2. Task with test requirement

**Tests to Write First**:
- Test 1 description
- Test 2 description

**Definition of Done**:
- [ ] All tests pass
- [ ] Code reviewed
- [ ] Documentation updated

### Phase 2: {Name}
...

## During Implementation

When agent stops, ask:
"Did you follow the plan so far, or did you diverge? If you diverged, how and why?"

If divergence is acceptable, continue.
If divergence cut corners, create new phase to address it.

## Resuming Work

"Keep implementing the plan in docs/plans/active/{feature}/development.md
adhering to strict TDD principles and following the protocol defined in
docs/plans/CLAUDE.md"

## Feature Requests from Agents

If an agent identifies needed infrastructure or fixes:

1. Agent writes request to `docs/requests/{request-name}.md`
2. Another agent instance handles the request
3. After merge, original agent continues:
   "Good news! A maintainer implemented your request. Merge main to your
   working branch and revise the plan to use this update."
```

**Feature Request Template**:
```markdown
# Feature Request: {Title}

**Requested by**: Agent working on {feature}
**Date**: YYYY-MM-DD
**Priority**: Critical | High | Medium | Low

## Problem
Description of the issue or missing capability.

## Proposed Solution
How to solve it.

## Impact
What feature work is blocked by this.

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Notes
Any additional context.
```

---

## Multi-Agent Coordination

### Agent Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        MULTI-AGENT WORKFLOW                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────┐         ┌────────────┐         ┌────────────┐          │
│  │  Human     │────────>│  Plan      │────────>│  Implement │          │
│  │  (Request) │         │  (Spec)    │         │  (TDD)     │          │
│  └────────────┘         └────────────┘         └─────┬──────┘          │
│                                                       │                  │
│                              ┌────────────────────────┼──────────┐      │
│                              │                        ▼          │      │
│                              │              ┌────────────┐       │      │
│                              │              │ Agent      │       │      │
│                              │              │ Needs Help │       │      │
│                              │              └─────┬──────┘       │      │
│                              │                    │              │      │
│                    ┌─────────┴─────────┐    ┌────┴────┐   ┌────┴────┐ │
│                    │                   │    │         │   │         │ │
│                    ▼                   ▼    ▼         │   ▼         │ │
│            ┌────────────┐      ┌────────────┐        │ ┌──────────┐ │ │
│            │ Feature    │      │ Technical  │        │ │ Continue │ │ │
│            │ Request    │      │ Debt Fix   │        │ │ (Resume) │ │ │
│            └─────┬──────┘      └─────┬──────┘        │ └────┬─────┘ │ │
│                  │                   │               │      │       │ │
│                  ▼                   ▼               │      │       │ │
│            ┌────────────┐      ┌────────────┐        │      │       │ │
│            │ Agent 2    │      │ Agent 2    │        │      │       │ │
│            │ Implements │      │ Fixes      │        │      │       │ │
│            └─────┬──────┘      └─────┬──────┘        │      │       │ │
│                  │                   │               │      │       │ │
│                  └─────────┬─────────┘               │      │       │ │
│                            │                         │      │       │ │
│                            ▼                         │      │       │ │
│                     ┌────────────┐                   │      │       │ │
│                     │ Merge &    │                   │      │       │ │
│                     │ Continue   │<──────────────────┘      │       │ │
│                     └─────┬──────┘                          │       │ │
│                           │                                 │       │ │
│                           └────────────>────────────────────┘       │ │
│                                                                      │ │
│                                                                      │ │
│                            ┌────────────┐                            │ │
│                            │  Human     │                            │ │
│                            │  Review    │<───────────────────────────┘ │
│                            └─────┬──────┘                              │
│                                  │                                     │
│                                  ▼                                     │
│                            ┌────────────┐                              │
│                            │  Deploy    │                              │
│                            │  (CI/CD)   │                              │
│                            └────────────┘                              │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Handoff Commands

**Start new feature**:
```
Plan this feature according to the template in docs/plans/CLAUDE.md
and then implement adhering to strict TDD principles.
```

**Check progress**:
```
Did you follow the plan so far, or did you diverge?
If you diverged, how and why?
```

**Resume work**:
```
Keep implementing the plan in docs/plans/active/{feature}/development.md
adhering to strict TDD principles and following the protocol defined in
docs/plans/CLAUDE.md
```

**Handle blocker**:
```
Write a feature request for the maintainers, according to the protocol
defined in docs/requests/CLAUDE.md
```

**After fix merged**:
```
Good news! A maintainer implemented your request in the codebase.
Merge the main branch to your working branch and resolve any merge conflicts,
then revisit the plan in docs/plans/active/{feature}/development.md and
any remaining sub-phases and revise what needs to be revised to make use
of this update.
```

---

## Directory Structure

```
ancestral-vision/
├── .claude/
│   ├── settings.json
│   ├── CLAUDE.md
│   ├── mcp.json
│   └── agents/
│       ├── typescript-stylist.md
│       ├── test-engineer.md
│       ├── threejs-engineer.md
│       ├── graphql-architect.md
│       ├── prisma-specialist.md
│       ├── infrastructure-ops.md
│       └── genkit-agent.md
├── docs/
│   ├── invariants/
│   │   ├── INVARIANTS.md
│   │   ├── data-integrity.md
│   │   ├── security.md
│   │   ├── api-contracts.md
│   │   └── ui-ux.md
│   ├── plans/
│   │   ├── CLAUDE.md
│   │   ├── active/
│   │   ├── completed/
│   │   └── templates/
│   └── requests/
│       ├── CLAUDE.md
│       └── {request-name}.md
├── tests/
│   ├── factories/           # Test data factories
│   ├── integration/         # Integration tests
│   ├── e2e/                 # End-to-end tests
│   └── invariants/          # Invariant tests
├── src/
│   └── ... (co-located unit tests)
└── plans/
    └── grand_plan/          # This planning documentation
```

---

## Code Review Protocol

Even with AI agents, all code is reviewed before merge.

### Review Checklist

```markdown
## Code Review Checklist

### Tests
- [ ] New tests written for new functionality
- [ ] Tests pass locally
- [ ] Edge cases covered
- [ ] Invariants not violated

### Types
- [ ] No `any` types introduced
- [ ] Complete type annotations
- [ ] Interfaces defined for new shapes

### Security
- [ ] No secrets in code
- [ ] Auth checks in place
- [ ] Input validation present

### Performance
- [ ] No N+1 queries
- [ ] Appropriate indexes exist
- [ ] No memory leaks

### Documentation
- [ ] Plan updated with any divergence
- [ ] New invariants documented
- [ ] API changes documented
```

### Review Commands

```bash
# Before review
npm run lint
npm run typecheck
npm test
npm run test:e2e

# Check coverage
npx vitest --coverage

# Check for any types
grep -r "any" src/ --include="*.ts" | grep -v "test"
```

---

## CI/CD Integration

### Pipeline Gates

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Unit tests
        run: npm test

      - name: Integration tests
        run: npm run test:integration

      - name: Invariant tests
        run: npm run test:invariants

      - name: Coverage check
        run: npx vitest --coverage --coverage.thresholds.lines=80

      - name: Build
        run: npm run build
```

### Deployment Protection

- All tests must pass before deploy
- Human approval required for production
- Automatic rollback on health check failure

---

## Decision Summary

| Pattern | Implementation | Tooling |
|---------|----------------|---------|
| Invariants | `docs/invariants/` + tests | Vitest |
| Claude Config | `.claude/` directory | Claude Code |
| MCP Servers | GCP, Postgres, Firebase | MCP protocol |
| TDD | Co-located tests, 80%+ coverage | Vitest, Playwright |
| Spec-Driven | `docs/plans/` with templates | Markdown |

---

## References

- [07_technology_decisions.md](07_technology_decisions.md) - Tech stack
- [11_deployment_operations.md](11_deployment_operations.md) - CI/CD pipeline
- [12_roadmap.md](12_roadmap.md) - Development phases
- Reference prototype agents: `reference_prototypes/family-constellations/.claude/`

---

*Status: Complete - All development principles defined 2026-01-12*
