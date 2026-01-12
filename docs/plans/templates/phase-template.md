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
3. `it('should reject <invalid case>')` - <what it verifies>

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

    it('should handle edge case <description>', () => {
      // Arrange
      const edgeInput = createTestData({ ... });

      // Act
      const result = someMethod(edgeInput);

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

**Run tests to confirm RED**:

```bash
npx vitest src/<module>/<file>.test.ts
```

### Step X.2: Implement to Pass Tests (GREEN)

Create/modify `src/<module>/<file>.ts`:

```typescript
/**
 * <Brief description of the class/function>
 */
export class SomeClass {
  private _someField: SomeType;

  constructor(config: ConfigType) {
    this._someField = config.field;
  }

  /**
   * <Description of the method>
   * @param input - <Parameter description>
   * @returns <Return value description>
   * @throws <When it throws>
   */
  public someMethod(input: InputType): OutputType {
    // Minimal implementation to pass tests
    if (!this._isValid(input)) {
      throw new Error('Invalid input: <reason>');
    }
    return this._process(input);
  }

  private _isValid(input: InputType): boolean {
    // Validation logic
  }

  private _process(input: InputType): OutputType {
    // Core logic
  }
}
```

**Run tests to confirm GREEN**:

```bash
npx vitest src/<module>/<file>.test.ts
```

### Step X.3: Refactor

While keeping tests green:

- [ ] Ensure complete type annotations (no implicit `any`)
- [ ] Add JSDoc comments for public APIs
- [ ] Use `private _` prefix for private members
- [ ] Use explicit `public` for public methods
- [ ] Extract helper functions if needed
- [ ] Optimize for readability
- [ ] Check for code duplication

**Run full verification**:

```bash
npx vitest src/<module>/<file>.test.ts
npx tsc --noEmit
npm run lint
```

---

## Implementation Details

<Specific technical details for this phase>

### Data Structures

```typescript
interface SomeInterface {
  field1: string;
  field2: number;
  optional?: boolean;
}
```

### Edge Cases to Handle

- <edge case 1>: <how to handle>
- <edge case 2>: <how to handle>

### Error Handling

- <error scenario 1>: <how to handle>
- <error scenario 2>: <how to handle>

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/<path>.ts` | CREATE | <purpose> |
| `src/<path>.test.ts` | CREATE | <what it tests> |
| `src/types/index.ts` | MODIFY | Add new interfaces |
| `src/<path>.ts` | MODIFY | <what changes> |

---

## Verification

```bash
# Run phase-specific tests
npx vitest src/<module>/<file>.test.ts

# Run all tests
npm test

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Check for any types (should be empty)
grep -r "any" src/<module>/ --include="*.ts" | grep -v "test"
```

---

## Completion Criteria

- [ ] All test cases pass
- [ ] Type check passes (`npx tsc --noEmit`)
- [ ] Lint passes (`npm run lint`)
- [ ] No `any` types introduced
- [ ] Private members use `_` prefix
- [ ] Public methods use `public` keyword
- [ ] JSDoc comments on public APIs
- [ ] Handles all edge cases
- [ ] Invariants INV-xxx verified by tests
- [ ] Work notes updated

---

## Notes

<Any additional notes, issues encountered, or decisions made during implementation>

---

*Template version: 1.0*
