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

---

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

---

## Phase 2: <Name>

**Goal**: <Clear objective>
**Detailed Plan**: [phases/phase-2.md](phases/phase-2.md)

### Deliverables

1. <File or component>
2. <File or component>

### TDD Approach

1. Write failing tests for <behavior>
2. Implement <component> to pass tests
3. Refactor for clarity

### Success Criteria

- [ ] All tests pass
- [ ] Type check passes
- [ ] Lint passes
- [ ] <Specific criterion>

---

## Testing Strategy

### Unit Tests (co-located with source)

- `src/<module>/<file>.test.ts`: <what it tests>
- `src/<module>/<file>.test.ts`: <what it tests>

### Integration Tests

- `tests/integration/<feature>.test.ts`: <what it tests>

### Invariant Tests

- `tests/invariants/<category>.test.ts`: <which INV-xxx it enforces>

### E2E Tests (if applicable)

- `tests/e2e/<flow>.test.ts`: <user flow it tests>

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

---

*Template version: 1.0*
