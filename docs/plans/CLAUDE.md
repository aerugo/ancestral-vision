# AI Agent Implementation Planning Guide

This directory is where AI agents create and track implementation plans for features and modules.

**Tech Stack Reference**: See [07_technology_decisions.md](../../plans/grand_plan/07_technology_decisions.md)
**Invariants Reference**: See [docs/invariants/INVARIANTS.md](../invariants/INVARIANTS.md)
**Development Principles**: See [13_development.md](../../plans/grand_plan/13_development.md)

---

## Directory Structure

```
docs/plans/
├── CLAUDE.md                    # This file - planning protocol
├── active/                      # Plans currently being implemented
│   └── <feature-name>/
│       ├── spec.md              # Feature specification (required)
│       ├── development-plan.md  # Phased implementation plan (required)
│       ├── work-notes.md        # Progress tracking and session notes (required)
│       └── phases/
│           ├── phase-1.md       # Detailed plan for phase 1
│           ├── phase-2.md       # Detailed plan for phase 2
│           └── ...
├── completed/                   # Finished plans (for reference)
│   └── <feature-name>/
│       └── ...
└── templates/
    ├── spec-template.md
    ├── development-plan-template.md
    ├── phase-template.md
    └── work-notes-template.md
```

---

## Starting a New Implementation

### 1. Understand the Project Context

Before writing any code:

- **Read `docs/invariants/INVARIANTS.md`** to understand ALL project invariants (INV-D, INV-S, INV-A, INV-U)
- **Read `.claude/CLAUDE.md`** for project conventions and code style
- **Review relevant `.claude/agents/`** guides for specialized patterns
- **Study existing implementations** that solve similar problems
- **Analyze the current state** of files you'll modify—understand what exists before changing it

### 2. Create the Feature Specification

Save to `docs/plans/active/<feature-name>/spec.md`:

```markdown
# Feature: <Name>

**Status**: Draft | Approved | In Progress | Complete
**Created**: <date>
**User Stories**: US-x.x, US-x.x (from 04_user_stories.md)

## Goal

<One sentence describing the outcome>

## Background

<Context: why this feature is needed, what problem it solves>

## Acceptance Criteria

- [ ] AC1: <Specific, testable criterion>
- [ ] AC2: <Specific, testable criterion>
- [ ] AC3: <Specific, testable criterion>

## Technical Requirements

### Database Changes
- <Table/column additions or modifications>
- <New indexes needed>

### API Changes
- <New queries or mutations>
- <Schema modifications>

### UI Changes
- <New pages or components>
- <User interactions>

## Dependencies

- <What must exist before this can be built>
- <External services or APIs required>

## Out of Scope

- <What this feature explicitly does NOT include>
- <Future enhancements deferred>

## Security Considerations

- <Auth requirements>
- <Privacy implications>
- <Data protection needs>

## Open Questions

- [ ] Q1: <Unresolved question>
- [ ] Q2: <Unresolved question>
```

### 3. Create the Development Plan

Save to `docs/plans/active/<feature-name>/development-plan.md`:

```markdown
# <Feature Name> - Development Plan

**Status**: In Progress
**Created**: <date>
**Branch**: `feature/<feature-name>`
**Spec**: [spec.md](spec.md)

## Summary

<1-2 sentence description of what this implementation accomplishes>

## Critical Invariants to Respect

Reference invariants from `docs/invariants/INVARIANTS.md` by their canonical IDs:

- **INV-Dxxx**: <Name> - <How it applies to this implementation>
- **INV-Sxxx**: <Name> - <How it applies to this implementation>
- **INV-Axxx**: <Name> - <How it applies to this implementation>

**New invariants introduced** (to be added to INVARIANTS.md after implementation):

- **NEW INV-xxx**: <Proposed Name> - <Description and rationale>

## Current State Analysis

<Describe what exists now and what problem you're solving>

### Files to Modify

| File | Current State | Planned Changes |
|------|---------------|-----------------|
| `src/...` | ... | ... |
| `prisma/schema.prisma` | ... | ... |

### Files to Create

| File | Purpose |
|------|---------|
| `src/...` | ... |
| `src/.../...test.ts` | ... |

## Solution Design

<Describe the solution approach>

```
<ASCII diagram showing architecture/data flow if helpful>
```

### Key Design Decisions

1. **<Decision>**: <Rationale>
2. **<Decision>**: <Rationale>

## Phase Overview

| Phase | Description | TDD Focus | Est. Tests |
|-------|-------------|-----------|------------|
| 1 | <description> | <what tests verify> | X tests |
| 2 | <description> | <what tests verify> | X tests |
| ... | ... | ... | ... |

## Phase 1: <Name>

**Goal**: <Clear objective>
**Detailed Plan**: [phases/phase-1.md](phases/phase-1.md)

### Deliverables

1. <File or component>
2. <File or component>

### TDD Approach

1. Write failing tests for <behavior>
2. Implement <component> to pass tests
3. Refactor for clarity

### Success Criteria

- [ ] All tests pass
- [ ] Type check passes (`npx tsc --noEmit`)
- [ ] Lint passes (`npm run lint`)
- [ ] <Specific criterion>

## Phase 2: <Name>

...

## Testing Strategy

### Unit Tests (co-located with source)

- `src/<module>/<file>.test.ts`: <what it tests>

### Integration Tests

- `tests/integration/<feature>.test.ts`: <what it tests>

### Invariant Tests

- `tests/invariants/<category>.test.ts`: <which INV-xxx it enforces>

## Documentation Updates

After implementation is complete:

- [ ] `docs/invariants/INVARIANTS.md` - Add new invariants (if any)
- [ ] `docs/invariants/<category>.md` - Add detailed invariant docs
- [ ] API documentation (if schema changed)
- [ ] README updates (if user-facing)

## Progress Tracking

| Phase | Status | Started | Completed | Notes |
|-------|--------|---------|-----------|-------|
| Phase 1 | Pending | | | |
| Phase 2 | Pending | | | |
| ... | ... | | | |
```

### 4. Create Work Notes

Save to `docs/plans/active/<feature-name>/work-notes.md`:

```markdown
# <Feature Name> - Work Notes

**Feature**: <brief description>
**Started**: <date>
**Branch**: `feature/<feature-name>`

---

## Session Log

### <date> - <Session Focus>

**Context Review Completed**:

- Read `docs/invariants/INVARIANTS.md` - identified applicable invariants: INV-Dxxx, INV-Sxxx
- Read `.claude/agents/<agent>.md` - understood patterns for <what>
- Analyzed `src/<file>` - understood <what>

**Applicable Invariants**:

- INV-Dxxx: <how it constrains this work>
- INV-Sxxx: <how it constrains this work>

**Key Insights**:

- <insight that affects implementation>

**Completed**:

- [x] <task>
- [x] <task>

**Blockers/Issues**:

- <issue and how it was resolved>

**Next Steps**:

1. <next task>
2. <next task>

---

### <next date> - <Session Focus>

...

---

## Phase Progress

### Phase 1: <Name>

**Status**: Pending | In Progress | Complete
**Started**: <date>
**Completed**: <date or blank>

#### Test Results

```
<paste test output summary>
```

#### Results

- <what was accomplished>
- <files created/modified>

#### Notes

- <decisions made>
- <issues encountered>

---

## Key Decisions

### Decision 1: <Title>

**Date**: <date>
**Context**: <why this decision was needed>
**Decision**: <what was decided>
**Rationale**: <why this approach>
**Alternatives Considered**: <what else was considered>

---

## Files Modified

### Created

- `<path>` - <purpose>

### Modified

- `<path>` - <what changed>

---

## Documentation Updates Required

### INVARIANTS.md Changes

- [ ] Add INV-xxx: <New Invariant Name> (if introducing new invariant)
- [ ] Update existing INV-xxx (if clarifying/extending)

### Other Documentation

- [ ] <doc file> - <what to add>
```

### 5. Create Phase Plans

For each phase, create `docs/plans/active/<feature-name>/phases/phase-X.md`:

```markdown
# Phase X: <Name>

**Status**: Pending | In Progress | Complete
**Started**: <date>
**Parent Plan**: [development-plan.md](../development-plan.md)

---

## Objective

<What this phase accomplishes>

---

## Invariants Enforced in This Phase

- **INV-Dxxx**: <How tests in this phase verify this invariant>
- **INV-Sxxx**: <How tests in this phase verify this invariant>

---

## TDD Steps

### Step X.1: Write Failing Tests (RED)

Create `src/<module>/<file>.test.ts`:

**Test Cases**:

1. `it('should <behavior>')` - <what it verifies>
2. `it('should <behavior>')` - <what it verifies>

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { SomeClass } from './some-class';
import { createTestData } from '@/tests/factories';

describe('SomeClass', () => {
  describe('someMethod', () => {
    it('should <expected behavior>', () => {
      // Arrange
      const input = createTestData({ ... });

      // Act
      const result = someMethod(input);

      // Assert
      expect(result).toEqual(...);
    });

    it('should reject <invalid case>', () => {
      // Arrange
      const invalidInput = createTestData({ ... });

      // Act & Assert
      expect(() => someMethod(invalidInput)).toThrow(/pattern/i);
    });
  });
});
```

### Step X.2: Implement to Pass Tests (GREEN)

Create/modify `src/<module>/<file>.ts`:

```typescript
export class SomeClass {
  public someMethod(input: InputType): OutputType {
    // Minimal implementation to pass tests
  }
}
```

### Step X.3: Refactor

- Ensure complete type annotations (no implicit `any`)
- Add JSDoc comments for public APIs
- Extract helper functions if needed
- Optimize for readability

---

## Implementation Details

<Specific technical details for this phase>

### Edge Cases to Handle

- <edge case 1>
- <edge case 2>

### Error Handling

- <error scenario>: <how to handle>

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/<path>` | CREATE | <purpose> |
| `src/<path>.test.ts` | CREATE | <what it tests> |
| `src/<path>` | MODIFY | <what changes> |

---

## Verification

```bash
# Run specific tests
npx vitest src/<module>/<file>.test.ts

# Run all tests
npm test

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

---

## Completion Criteria

- [ ] All test cases pass
- [ ] Type check passes
- [ ] Lint passes
- [ ] No `any` types introduced
- [ ] JSDoc comments on public APIs
- [ ] Handles all edge cases
- [ ] Invariants INV-xxx verified by tests
```

---

## Execution Workflow

### Starting Each Session

1. **Read `work-notes.md`** to understand current state
2. **Review the current phase plan** in `phases/phase-X.md`
3. **Re-read `docs/invariants/INVARIANTS.md`** if working on invariant-sensitive code
4. **Check which tests are passing/failing**: `npm test`
5. **Continue from the documented next step**

### Working Through Each Phase

1. **Create the detailed phase plan** in `phases/phase-X.md` before starting
2. **Follow strict TDD**:
   - Write failing tests first (RED)
   - Implement minimal code to pass (GREEN)
   - Refactor while keeping tests green (REFACTOR)
3. **Update `work-notes.md` continuously**:
   - What was completed
   - Decisions made and rationale
   - Issues encountered and resolutions
   - Next steps when resuming
4. **Run test suites at major milestones**

### Completing a Phase

1. **Verify all phase tests pass**: `npm test`
2. **Run type checking**: `npx tsc --noEmit`
3. **Run linting**: `npm run lint`
4. **Update phase status** in `development-plan.md`
5. **Add completion notes** to `work-notes.md`
6. **Create next phase plan** in `phases/phase-X+1.md`

### Completing the Implementation

1. **Run full test suite**: `npm test`
2. **Verify all invariants are preserved**
3. **Update `docs/invariants/INVARIANTS.md`**:
   - Add any new invariants with appropriate INV-xxx ID
   - Update version number and date
4. **Update other documentation** as needed
5. **Final review checklist**:
   - [ ] All tests pass
   - [ ] Type checking passes
   - [ ] Linting passes
   - [ ] Invariants documented (if new)
   - [ ] Work notes complete
6. **Move plan to `completed/`** directory

---

## Invariant Management

### Referencing Existing Invariants

Always reference invariants by their canonical ID from `docs/invariants/INVARIANTS.md`:

```markdown
## Critical Invariants to Respect

- **INV-D001**: Person IDs are globally unique UUIDs
- **INV-D002**: A person cannot be their own ancestor
- **INV-S001**: All API endpoints require authentication except health/share
```

### Introducing New Invariants

If your implementation introduces a constraint that must be maintained project-wide:

1. **Document it in your development plan** as a proposed new invariant
2. **Create tests that enforce the invariant**
3. **Add to `docs/invariants/INVARIANTS.md`** after implementation:
   - Use appropriate category prefix (INV-D for data, INV-S for security, etc.)
   - Use next available number in that category
   - Include: Rule, Requirements, Where it applies
4. **Create detailed documentation** in `docs/invariants/<category>.md`

---

## TDD Principles

### Red-Green-Refactor Cycle

1. **RED**: Write a test that fails (defines expected behavior)
2. **GREEN**: Write minimal code to make the test pass
3. **REFACTOR**: Clean up while keeping tests green

### Test Categories

| Category | Location | Purpose | When to Run |
|----------|----------|---------|-------------|
| Unit | `src/**/*.test.ts` | Test functions/classes in isolation | Every save |
| Integration | `tests/integration/` | Test module interactions | Pre-commit |
| E2E | `tests/e2e/` | Test user flows | Pre-merge |
| Invariants | `tests/invariants/` | Enforce project invariants | CI pipeline |

### Test File Conventions

- Co-locate unit tests with source: `src/graph/graph.ts` → `src/graph/graph.test.ts`
- Use factory functions for test data (see `tests/factories/`)
- Use descriptive test names: `it('should calculate generation 0 for root person')`
- Follow AAA pattern: Arrange, Act, Assert

---

## Agent Handoff Commands

### Start New Feature

```
Plan this feature according to the template in docs/plans/CLAUDE.md
and then implement adhering to strict TDD principles.
```

### Check Progress

```
Did you follow the plan so far, or did you diverge?
If you diverged, how and why?
```

### Resume Work

```
Keep implementing the plan in docs/plans/active/<feature>/development-plan.md
adhering to strict TDD principles and following the protocol defined in
docs/plans/CLAUDE.md
```

### Handle Blocker

```
Write a feature request for the maintainers, according to the protocol
defined in docs/requests/CLAUDE.md
```

### After Fix Merged

```
Good news! A maintainer implemented your request in the codebase.
Merge the main branch to your working branch and resolve any merge conflicts,
then revisit the plan in docs/plans/active/<feature>/development-plan.md and
revise what needs to be revised to make use of this update.
```

---

## Checklists

### Pre-Implementation Checklist

- [ ] Read `docs/invariants/INVARIANTS.md` for all invariants
- [ ] Read `.claude/CLAUDE.md` for project conventions
- [ ] Read relevant `.claude/agents/` for specialized patterns
- [ ] Identify all applicable invariants (list by INV-xxx)
- [ ] Analyze current state of files to modify
- [ ] Study similar existing implementations
- [ ] Create spec.md
- [ ] Create development-plan.md (with invariants section)
- [ ] Create work-notes.md
- [ ] Create first phase plan

### Phase Completion Checklist

- [ ] All phase tests pass
- [ ] Type checking passes (`npx tsc --noEmit`)
- [ ] Linting passes (`npm run lint`)
- [ ] Work notes updated with session log
- [ ] Phase status updated in development plan

### Implementation Completion Checklist

- [ ] All tests pass (unit + integration + invariants)
- [ ] Type checking passes
- [ ] Linting passes
- [ ] `docs/invariants/INVARIANTS.md` updated (if new invariants)
- [ ] Other documentation updated
- [ ] Work notes reflect final state
- [ ] Plan moved to `completed/` directory

---

*Last Updated: 2026-01-12*
